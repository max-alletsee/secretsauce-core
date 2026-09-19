# Stage 7 Remaining Plugins Specification & Architecture Design

**Date:** 2026-09-18  
**Status:** Approved  
**Scope:** Completion of the remaining 5 Stage 7 core plugins: `ai-provider`, `translator`, `recipe-importer`, `meal-planner-ai`, and `shopping-list`.

---

## 1. Executive Summary

SecretSauce core previously implemented 6 of the 11 Stage 7 core plugins (`core-members`, `core-recipes`, `shortlist`, `core-timeline`, `cook-tracker`, `ratings`, plus foundational plugins `units` and `recurring`).

This specification defines the architecture, database schemas, public service contracts, event handlers, intent providers, UI contributions, offline/outbox behaviors, and testing strategy for the remaining 5 plugins:
1. **`ai-provider`**: Multi-provider AI engine normalizing across Google GenAI (`google-genai`), OpenAI API, and OpenRouter API into a unified, typed structured-output interface (`api.complete(schema, prompt, images=None)`), managing encrypted credentials, audit call logging, and optional monthly budget caps.
2. **`translator`**: Autonomous recipe translation engine reacting to recipe creation/updates with strict provenance rules (`origin == 'plugin:translator'`, never overwriting human edits).
3. **`recipe-importer`**: Multimodal recipe import engine handling URLs, photos of recipes, and Web Share Target incoming links via background jobs with live progress.
4. **`meal-planner-ai`**: AI-driven recipe suggestion pool synthesizer respecting dietary constraints, allergies, and member preferences, presenting a detached suggestions UI for manual scheduling.
5. **`shopping-list`**: Grocery aggregation engine with category normalization across schedule windows and recurring pantry staples, interactive `/shopping` route, outbox-backed optimistic check toggles, export intent hub (`copy-markdown`, `print`), and rebuild command.

---

## 2. Plugin 1: `ai-provider` (Core AI Engine & Provider Normalization)

### 2.1 Manifest & Configuration
- **ID:** `ai-provider`
- **Name:** AI Provider
- **Version:** `1.0.0`
- **Core:** `true`
- **Schema:** `1`
- **Config Schema:**
  - `provider`: Enum `["gemini", "openai", "openrouter"]`, default `"gemini"`.
  - `model`: String, default `"gemini-3.8-flash"` (for OpenAI: default `"gpt-4o-mini"`; for OpenRouter: default `"google/gemini-2.5-flash"`).
  - `api_key`: String with `secret: true` (encrypted at rest via `KeyManager`).
  - `base_url`: String or `null` (optional custom endpoint, defaults to official endpoint per provider).
  - `monthly_budget`: Number or `null` (default `10.0`, USD limit).
  - `enforce_budget`: Boolean (default `false`). When `false`, calls proceed even if `monthly_budget` is exceeded, logging usage without blocking.

### 2.2 Database Schema (`0001_initial.sql`)
```sql
CREATE TABLE IF NOT EXISTS plugin_ai_provider_calls (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    call_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_summary TEXT,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_estimate REAL NOT NULL DEFAULT 0.0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 1,
    error_message TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_calls_created_at
    ON plugin_ai_provider_calls(created_at);
```

### 2.3 Provider Normalization Architecture (Pi-Inspired)
Borrowed from Pi's clean multi-provider engine, `ai-provider` shields consumers (`translator`, `recipe-importer`, `meal-planner-ai`, `shopping-list`) from vendor-specific payload shapes, authentication formats, and response differences.

Registered under `ctx.services.register("ai-provider", service)` and alias `ctx.services.register("ai", service)`:

```python
class AIProviderService:
    async def complete(
        self,
        schema: type[BaseModel] | dict,
        prompt: str,
        images: list[bytes | tuple[bytes, str]] | None = None,
        call_type: str = "generic",
        calling_plugin: str = "ai-provider",
    ) -> Any:
        ...
```

#### Provider Drivers:
1. **`GeminiDriver` (`provider == "gemini"`):**
   - Uses `google.genai` SDK (`client.aio.models.generate_content`).
   - Converts schema to `GenerateContentConfig(response_mime_type="application/json", response_schema=schema)`.
   - Attaches images via `types.Part.from_bytes(data=raw_bytes, mime_type=mime)`.
2. **`OpenAIDriver` (`provider == "openai"`):**
   - Uses `httpx.AsyncClient` calling `{base_url}/chat/completions` (default `https://api.openai.com/v1/chat/completions`).
   - Uses Structured Outputs JSON schema:
     `response_format: {"type": "json_schema", "json_schema": {"name": "response", "strict": True, "schema": schema_dict}}`.
   - Normalizes images into base64 data URLs: `{"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}`.
   - Headers: `Authorization: Bearer {api_key}`.
3. **`OpenRouterDriver` (`provider == "openrouter"`):**
   - Targets `{base_url}/chat/completions` (default `https://openrouter.ai/api/v1/chat/completions`).
   - Same payload shape as `OpenAIDriver` with Structured Outputs schema.
   - Additional headers: `HTTP-Referer: https://secretsauce.food`, `X-Title: SecretSauce`.

#### Common Lifecycle Across All Drivers:
1. **Budget Check:** If `enforce_budget == True` and `monthly_budget > 0`, checks month-to-date sum of `cost_estimate`. If exceeded, raises `BudgetExceededError` (HTTP 429).
2. **Execution & Timing:** Measures wall-clock `latency_ms`.
3. **Usage Extraction:** Extracts token usage (`input_tokens`, `output_tokens`) from standard provider metadata.
4. **Cost Estimation:** Calculates estimated USD cost using provider-specific rate table.
5. **Auditing:** Inserts call record into `plugin_ai_provider_calls`.
6. **Output Parsing:** Returns instance of Pydantic `schema` (or dict).
7. **Mock Driver Support:** Allows injecting a test mock driver for deterministic, offline pytest suites without external keys or network calls.

### 2.4 Endpoints & UI Contribution
- **Endpoints:**
  - `GET /api/x/ai-provider/usage`: Returns monthly spend, token totals, budget limit, and the latest 20 call logs.
  - `POST /api/x/ai-provider/test`: Verifies configured API credentials and returns connectivity status.
- **UI Contribution (`AISettings.vue`):**
  - Settings section registered via `ss.settings.section({ id: "ai-provider", title: "AI & Intelligence", component: AISettings, order: 20 })`.
  - Provider selector (`Gemini`, `OpenAI`, `OpenRouter`), model input, encrypted API key field.
  - Budget progress bar, token counters, and recent call audit log table.

---

## 3. Plugin 2: `translator` (Automated Recipe Translation)

### 3.1 Manifest & Configuration
- **ID:** `translator`
- **Name:** Recipe Translator
- **Version:** `1.0.0`
- **Core:** `true`
- **Requires:** `["ai-provider"]`
- **Config Schema:**
  - `target_languages`: Array of ISO language strings (e.g. `["de", "es", "fr"]`), default `["de"]`.

### 3.2 Provenance Rules & Event Handlers
- **Subscribed Events:** `recipe:created`, `recipe:updated`.
- **Filtering Rules:**
  - If `event.origin == "plugin:translator"`, ignore (prevents recursion).
  - Source recipe row: `(group_id, language)`.
- **Target Language Evaluation:**
  For each $L \in \text{target\_languages}$ where $L \ne \text{source.language}$:
  - Check existing recipe row with ID `<group_id>_<L>`:
    - **Human Edit Preservation:** If row exists and `row.origin == "member"`, **do nothing** (human edits are never overwritten by automated translation).
    - **Update Translation:** If row exists and `row.origin == "plugin:translator"`, update the row with retranslated content and keep `origin = "plugin:translator"`.
    - **Create Translation:** If row does not exist, create `<group_id>_<L>` with translated content and `origin = "plugin:translator"`.
- **AI Structured Output (`RecipeTranslationSchema`):**
  - Translates `title`, `description`, ingredient names and `raw_text` (preserving numeric quantities and units), and step `instruction` texts into target language $L$.
- **Commands:**
  - `retranslate-all`: Scans all recipe groups in `recipes` and triggers translation updates for all configured target languages.

---

## 4. Plugin 3: `recipe-importer` (URL, Photo & Share Import)

### 4.1 Manifest & Configuration
- **ID:** `recipe-importer`
- **Name:** Recipe Importer
- **Version:** `1.0.0`
- **Core:** `true`
- **Requires:** `["ai-provider"]`

### 4.2 Background Jobs & Execution
1. **URL Scraping Job (`import_url`):**
   - Fetches HTML via `httpx.AsyncClient` with user-agent headers.
   - Calls normalized `ai.complete(RecipeImportSchema, prompt)` with extracted page content.
   - Emits job progress: 10% (fetching) $\to$ 40% (analyzed) $\to$ 80% (recipe structured) $\to$ 100% (saved).
   - Creates recipe via `ctx.recipes.create(...)` with `origin = "plugin:recipe-importer"`.
   - Sets source attribution: `ctx.attributes.set("recipe", group_id, "source_url", url)`.
2. **Photo OCR/Parsing Job (`import_photo`):**
   - Receives image file bytes (JPEG/PNG/WebP).
   - Calls normalized `ai.complete(RecipeImportSchema, prompt, images=[(image_bytes, mime_type)])`.
   - Emits job progress and creates recipe row.

### 4.3 Intent Hub Providers & Offline Behavior
- **Intent Hub `recipe:create`:**
  - Provider `import-url`:
    - `title`: "Import from URL"
    - `order`: 20
    - `kind`: "ui"
    - `isAvailable`: `() => ss.store.online.value` (disabled when offline)
    - Modal with URL input, "Import" action, progress tracker, and navigation to created recipe upon completion.
  - Provider `import-photo`:
    - `title`: "Import from Photo"
    - `order`: 30
    - `kind`: "ui"
    - `isAvailable`: `() => ss.store.online.value`
    - Modal with file upload/camera snapshot, progress tracker, and navigation upon completion.
- **Intent Hub `share:receive` (Web Share Target):**
  - Provider `import-shared`:
    - `order`: 10
    - Automatically triggered when user lands on `/share` with `{ title, text, url }`. If `url` is present, initiates `import-url` workflow directly.
- **Slot Contribution:**
  - `recipe.detail.footer`: Renders `ImportedSourceAttribution.vue` with context `{ recipe }`. Reads attribute `recipe.source_url` and displays "Imported from <domain>" link.

---

## 5. Plugin 4: `meal-planner-ai` (AI Meal Suggestion Pool Engine)

### 5.1 Manifest & Configuration
- **ID:** `meal-planner-ai`
- **Name:** Meal Planner (AI)
- **Version:** `1.0.0`
- **Core:** `true`
- **Requires:** `["ai-provider"]`
- **Config Schema:**
  - `system_prompt`: String, default custom family guidance instructions.
  - `suggestion_count`: Integer (default 7, range 1 to 21).

### 5.2 Context Gathering & Synthesis
The suggestion engine gathers:
1. **Member Preferences:** Dietary restrictions, allergies, disliked foods, favorite cuisines.
2. **Household Ratios:** Default servings and serving ratios.
3. **Recipe Library Context:** List of existing recipes (titles, tags, rating scores from `ratings.score`, and shortlisted flags).
4. **AI Generation:** Calls `ai.complete(MealSuggestionsSchema, prompt)`.
   - Returns a clean list of candidate recipe suggestions (`recipe_id`, `title`, suggested meal type, suggested servings).
   - **No justifications or verbose explanations required.**
5. **Detached Suggestions Pool (No Auto-Scheduling):** Suggestions are **not** automatically locked into date or meal slots. Instead, they form a suggestions pool in their own UI element from which the user selects meals and assigns them to desired days/meals.

### 5.3 Intent Hub & UI Element
- **Provider on `timeline:assist`:**
  - `id`: `suggest-week`
  - `title`: "AI Recipe Suggestions"
  - `order`: 10
  - `kind`: "ui"
- **UI Element (`MealSuggestionsDrawer.vue`):**
  - Standalone suggestions panel/drawer.
  - Each candidate card shows the recipe title and tags with an "Assign to Day" button.
  - Tapping "Assign to Day" opens a date/meal-type selector dialog to schedule the meal (`POST /api/schedule` or outbox).

---

## 6. Plugin 5: `shopping-list` (Aggregated Grocery Lists & Outbox Sync)

### 6.1 Manifest & Configuration
- **ID:** `shopping-list`
- **Name:** Shopping List
- **Version:** `1.0.0`
- **Core:** `true`
- **Schema:** `1`
- **Requires:** `["ai-provider?"]` (optional AI normalization)
- **Config Schema:**
  - `default_days_ahead`: Integer (default 7).
  - `group_by_category`: Boolean (default true).

### 6.2 Data Sources for Aggregation
The shopping list aggregates ingredients from two explicit, concrete sources:
1. **Scheduled Meals (`ScheduleRepo` + `RecipeRepo`):**
   - Queries `schedule` between `date_from` and `date_to`.
   - Includes:
     - Manually scheduled meals (`origin = 'member'`).
     - Weekly recurring meals materialized by the `recurring` plugin (`origin = 'plugin:recurring'`, stored in `schedule` from `plugin_recurring_rules`).
   - Scales each ingredient quantity by `servings_override / recipe.servings`.
2. **Household Recurring Pantry Staples (`plugin_shopping_list_staples`):**
   - Stored in a dedicated plugin table `plugin_shopping_list_staples`:
     - `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `quantity REAL`, `unit TEXT`, `category TEXT NOT NULL DEFAULT 'Pantry'`, `enabled INTEGER NOT NULL DEFAULT 1`.
   - Represents items household members regularly keep in stock (e.g. Milk, Eggs, Butter, Olive Oil).
   - When generating or rebuilding a shopping list, all active staples (`enabled = 1`) are merged into the list.

### 6.3 Database Schema (`0001_initial.sql`)
```sql
CREATE TABLE IF NOT EXISTS plugin_shopping_list_lists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date_from TEXT,
    date_to TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_shopping_list_items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES plugin_shopping_list_lists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    category TEXT NOT NULL DEFAULT 'Other',
    detail TEXT,
    checked INTEGER NOT NULL DEFAULT 0,
    origin TEXT NOT NULL DEFAULT 'auto',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_shopping_list_staples (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    category TEXT NOT NULL DEFAULT 'Pantry',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_list ON plugin_shopping_list_items(list_id);
```

### 6.4 Aggregation & Normalization Engine
1. **Schedule & Staples Collection:**
   - Fetches scheduled recipe ingredients for `[date_from, date_to]`.
   - Fetches active staples from `plugin_shopping_list_staples`.
2. **Merging & Categorization:**
   - Normalizes ingredient aliases using `UnitsService` (standardizing units and ingredient names).
   - Merges identical ingredients with compatible units, summing quantities and appending recipe titles to `detail` (e.g. "250g for Pizza, 150g for Pancakes").
   - Categorizes into standard supermarket aisles: `Produce`, `Dairy & Eggs`, `Meat & Fish`, `Bakery`, `Pantry`, `Frozen`, `Beverages`, `Other`.
   - If `ai-provider` is available, complex/unrecognized ingredients can optionally be normalized using the AI service.

### 6.5 Frontend Route, Outbox & Optimistic UI
- **Route `/shopping` (`ShoppingPage.vue`):**
  - Navigation registration: `{ label: "Shopping", icon: "shopping-cart", path: "/shopping", order: 25 }`.
  - Renders grocery items grouped by aisle category.
  - Interactive item checkbox:
    - Instantly updates local reactive state.
    - Enqueues `PUT /api/x/shopping-list/items/{id}/checked` with `{"checked": boolean}` into `ss.outbox`.
    - Handles rollback on outbox `failed` notification.
  - Adding ad-hoc / manual items via text input (`POST /api/x/shopping-list/items`).
  - Staples management dialog ("Manage Pantry Staples") to add/edit recurring household staples.
- **Intent Hub `shopping:export`:**
  - Provider `copy-markdown`: Formats items into Markdown list (`- [ ] 200g Butter (Dairy & Eggs)`) and copies to clipboard with notification.
  - Provider `print`: Opens browser print dialog with print-specific stylesheet.
- **Slot `shopping.item.actions`:** Context `{ item }` allowing extension actions on each grocery row.
- **Command `rebuild`:** Background job that clears auto-generated items and recomputes the list from the current schedule window and staples.

---

## 7. Testing Strategy (TDD)

### 7.1 Backend Tests (`uv run pytest`)
1. `tests/test_plugin_ai_provider.py`:
   - Verification of `complete()` with structured schemas across Gemini, OpenAI, and OpenRouter drivers.
   - Cost logging and token accumulation in `plugin_ai_provider_calls`.
   - Optional budget enforcement (allows exceeding when `enforce_budget=False`, raises 429 when `enforce_budget=True`).
   - Usage API `/api/x/ai-provider/usage`.
2. `tests/test_plugin_translator.py`:
   - Reaction to `recipe:created` and `recipe:updated` events.
   - Provenance rules: auto-creates translated rows with `origin = "plugin:translator"`.
   - Never overwrites rows with `origin = "member"`.
   - `retranslate-all` command execution.
3. `tests/test_plugin_recipe_importer.py`:
   - URL import job execution and progress milestones.
   - Multimodal photo import job.
   - Attribution attribute recording in `entity_attributes`.
4. `tests/test_plugin_meal_planner_ai.py`:
   - Member preferences, allergies, and recipe library synthesis.
   - Generation of candidate suggestion pool without direct slot locking.
5. `tests/test_plugin_shopping_list.py`:
   - Ingredient scaling and aggregation across schedule entries + pantry staples.
   - Checkbox toggle endpoint and optimistic update.
   - Manual ad-hoc items addition and deletion.
   - Rebuild command execution.

### 7.2 Frontend Tests (`pnpm --prefix shell test`)
1. `shell/tests/plugins/ai-provider.spec.ts`:
   - AISettings component renders provider selector, usage gauge, budget progress, and audit logs.
2. `shell/tests/plugins/recipe-importer.spec.ts`:
   - Import URL modal, Import Photo modal, online gating with `ss.store.online`, and `recipe.detail.footer` attribution slot.
3. `shell/tests/plugins/meal-planner-ai.spec.ts`:
   - Suggestions drawer rendering candidate recipes and day assignment trigger.
4. `shell/tests/plugins/shopping-list.spec.ts`:
   - Shopping page rendering, category grouping, outbox enqueue on checkbox toggle, staples management, and export providers.

---

## 8. Documentation Artifacts

1. `docs/PLUGINS_STAGE_7.md`: Comprehensive reference guide for all 11 Stage 7 core plugins.
2. Updates to `docs/PLUGIN_DEVELOPER_GUIDE.md` and `docs/API_REFERENCE.md`.

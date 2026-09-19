# Core Plugins Reference

SecretSauce Core ships with a suite of built-in plugins running in-process with the FastAPI kernel and Vue 3 frontend shell. All core plugins strictly follow the `core-` naming standard across directory names, manifest metadata, API route prefixes, and SQLite database tables.

---

## 1. Core Plugin Standard & Conventions

All core plugins located at `secretsauce/plugins/core/` follow uniform architectural rules:

1. **Directory Name:** `secretsauce/plugins/core/core-<name>/`
2. **Plugin ID & Name:** `PLUGIN["id"] = "core-<name>"`, `PLUGIN["name"] = "core-<name>"`
3. **Core Flag:** `PLUGIN["core"] = True`
4. **Route Prefix:** `/api/x/core-<name>`
5. **Database Tables:** `plugin_core_<name>_*`
6. **Frontend Package:** `@secretsauce/plugin-core-<name>`
7. **Bundle Output:** `<plugin>/ui/dist/` copied to `<plugin>/ui.js` and `<plugin>/ui.css`

### Active Core Plugins Catalog

| Plugin ID | Description | Dependencies | Table(s) |
|---|---|---|---|
| `core-recipes` | Base recipes repository, scaling, tags, and multilingual groups | None | (Core noun tables) |
| `core-members` | Household members, avatar management, and dietary restrictions | None | (Core noun tables) |
| `core-timeline` | Household timeline journal, meal logs, notes, and activity | None | (Core noun tables) |
| `core-cook-tracker` | Tracks cook timestamps, cook count, and last cooked dates | `core-timeline` | `plugin_core_cook_tracker_history` |
| `core-ratings` | Star ratings and family votes on recipes | None | `plugin_core_ratings_votes` |
| `core-recurring` | Recurring schedule rules (e.g., Taco Tuesday, Pizza Friday) | None | `plugin_core_recurring_rules` |
| `core-shortlist` | Household recipe shortlist / favorites filter | None | `plugin_core_shortlist_entries` |
| `core-units` | Unit conversion and measurement standardization engine | None | In-memory unit tables |
| `core-ai-provider` | Multi-LLM provider driver (Gemini, OpenAI, OpenRouter), budget controls & usage tracking | None | `plugin_core_ai_provider_usage` |
| `core-recipe-importer` | AI-assisted extraction from Web URLs, raw text, or photos | `core-ai-provider` | `plugin_core_recipe_importer_history` |
| `core-translator` | Multilingual recipe translation preserving measurements and terminology | `core-ai-provider` | `plugin_core_translator_history` |
| `core-meal-planner-ai` | Smart meal candidate suggestion pool generation without locking schedule | `core-ai-provider` | `plugin_core_meal_planner_plans`, `plugin_core_meal_planner_suggestions` |
| `core-shopping-list` | Dynamic shopping list aggregation with serving scaling, staples, and manual items | None | `plugin_core_shopping_list_staples`, `plugin_core_shopping_list_items`, `plugin_core_shopping_list_checked_state` |

---

## 2. Stage 7 AI & Productivity Plugins

### 2.1 `core-ai-provider`

Unified AI abstraction service registered as `k.services.get("core-ai-provider")`.

#### Capabilities
- **Multi-Driver Architecture:**
  - `gemini`: Native SDK integration using `google.genai` (`google-genai>=1.0.0`), default model: `gemini-3.8-flash`.
  - `openai`: Direct JSON Schema structured output with `gpt-4o-mini` or custom models.
  - `openrouter`: Flexible multi-model gateway via OpenRouter HTTP API.
- **Unified Interface:**
  ```python
  await ai_svc.complete(
      schema=MyPydanticModel,
      prompt="Extract recipe details...",
      images=[{"base64": "...", "mime_type": "image/jpeg"}], # optional multimodal input
      call_type="recipe_import",
      calling_plugin="core-recipe-importer",
  )
  ```
- **Usage & Budget Controls:**
  - Records token usage, prompt tokens, completion tokens, estimated cost, timestamp, and calling plugin in `plugin_core_ai_provider_usage`.
  - Optional monthly budget enforcement (`enforce_budget = True`, `monthly_budget = 10.00`). If monthly usage exceeds budget, requests raise HTTP 402 / `BudgetExceededError`.

#### Endpoints
- `GET /api/x/core-ai-provider/settings`: Retrieve active AI provider, model, and budget configuration.
- `PATCH /api/x/core-ai-provider/settings`: Update settings (active provider, api keys, budget caps).
- `GET /api/x/core-ai-provider/usage`: View aggregate and historical token/cost usage.
- `POST /api/x/core-ai-provider/test`: Validate provider connectivity with a ping prompt.

---

### 2.2 `core-recipe-importer`

Extracts structured recipes from unstructured inputs and automatically drafts or saves them to the recipe noun.

#### Features
- **URL Scraper & Parser:** Fetches webpage HTML, cleans scripts and styles, and uses AI schema completion to extract structured ingredients, steps, and metadata.
- **Raw Text Parser:** Parses free-form text, emails, or pasted notes into standardized recipes.
- **Image / OCR Parser:** Analyzes cookbook photos, screenshots, and handwritten recipe cards using multimodal vision models.
- **Background Jobs:** Long-running web scraping can run asynchronously via `ctx.jobs.register("import-url")`.

#### Endpoints
- `POST /api/x/core-recipe-importer/parse-url`: `{ url: str, auto_save?: bool }`
- `POST /api/x/core-recipe-importer/parse-text`: `{ text: str, auto_save?: bool }`
- `POST /api/x/core-recipe-importer/parse-image`: `{ image_base64: str, mime_type?: str, auto_save?: bool }`
- `GET /api/x/core-recipe-importer/history`: Audit log of previous imports.

---

### 2.3 `core-translator`

Provides multilingual recipe localization while maintaining recipe group linkage.

#### Features
- **Recipe Group Synced Localization:** Recipes in SecretSauce belong to a `group_id`. Translations are saved under the *same* `group_id` with a distinct `language` code (e.g., `es`, `fr`, `de`), allowing members to toggle between languages seamlessly.
- **Accurate Culinary Translation:** Preserves metric/imperial units and culinary terms.
- **Background Bulk Translation:** Includes `translate-all` and `translate-recipe` background jobs.

#### Endpoints
- `POST /api/x/core-translator/translate`: `{ recipe_id: str, target_language: str }`
- `POST /api/x/core-translator/translate-all`: `{ target_language: str }`
- `GET /api/x/core-translator/history`: Translation execution log.

---

### 2.4 `core-meal-planner-ai`

AI-assisted meal planning that honors household restrictions and creates flexible candidate pools.

#### Design Principles
- **Unassigned Candidate Suggestion Pool:** The planner **does not** automatically lock meals to fixed calendar dates. Instead, it generates an unassigned candidate pool of suggestions.
- **Family Context Aware:** Reads library recipes and member dietary restrictions to formulate suggestions with explicit reasoning and confidence scores.
- **Explicit User Commitment:** Users review candidate cards in the candidate pool, choose an assigned date / meal slot, and click "Add to Schedule", which commits the entry into `schedule_entries`.
- **Dismissal Flow:** Users can dismiss unsuited suggestions.

#### Endpoints
- `POST /api/x/core-meal-planner-ai/generate`: `{ days: int, prompt?: str, meal_types?: list[str] }`
- `GET /api/x/core-meal-planner-ai/plans`: List past meal plan runs.
- `GET /api/x/core-meal-planner-ai/plans/{plan_id}`: Inspect specific plan suggestions.
- `POST /api/x/core-meal-planner-ai/suggestions/{id}/accept`: `{ date: str, meal_type: str, servings?: float }`
- `POST /api/x/core-meal-planner-ai/suggestions/{id}/dismiss`: Dismiss suggestion.

---

### 2.5 `core-shopping-list`

Dynamic shopping list aggregator aggregating scheduled meals, servings scaling, pantry staples, and custom manual items.

#### Features
- **Serving-Scaled Meal Aggregation:**
  - Inspects scheduled meals across a date range (`from_date` to `to_date`).
  - Fetches recipe ingredients and multiplies quantities by `servings_override / default_servings`.
  - Aggregates duplicate ingredients across meals into a single entry with combined quantity and itemized source breakdowns.
- **Pantry Staples Engine:**
  - Maintains household pantry staples in `plugin_core_shopping_list_staples`.
  - Staples with `always_include = 1` are automatically injected into the shopping list.
- **Categorization:** Categorizes items into `Produce`, `Dairy & Eggs`, `Meat & Seafood`, `Pantry`, `Bakery`, and `Other`.
- **Idempotent Checkbox Toggling:**
  - Checkbox states are stored by item key in `plugin_core_shopping_list_checked_state`.
  - Toggles use idempotent POST requests compatible with offline outbox queuing.
- **Manual Items:** Users can add and remove one-off ad-hoc items.

#### Endpoints
- `GET /api/x/core-shopping-list`: Query aggregated list (`?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`).
- `POST /api/x/core-shopping-list/toggle`: Idempotent toggle (`{ key: str, checked: bool }`).
- `GET /api/x/core-shopping-list/staples`: List pantry staples.
- `POST /api/x/core-shopping-list/staples`: Create pantry staple (`{ name, default_quantity, unit, always_include }`).
- `DELETE /api/x/core-shopping-list/staples/{id}`: Delete pantry staple.
- `POST /api/x/core-shopping-list/items`: Add manual shopping item.
- `DELETE /api/x/core-shopping-list/items/{id}`: Remove manual item.

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
| `core-timeline` | Live vertical day feed, default/extra/skipped day slots and meal dialogs | None | `plugin_core_timeline_day_slots` plus core noun tables |
| `core-cook-tracker` | Tracks cook timestamps, cook count, and last cooked dates | `core-timeline` | `plugin_core_cook_tracker_history` |
| `core-ratings` | Star ratings and family votes on recipes | None | `plugin_core_ratings_votes` |
| `core-recurring` | Automatically scheduled weekly meals with retained removal history | `core-timeline?` (optional) | `plugin_core_recurring_rules`, `plugin_core_recurring_materialized` |
| `core-shortlist` | Household recipe shortlist / favorites filter | None | `plugin_core_shortlist_entries` |
| `core-units` | Unit conversion and measurement standardization engine | None | In-memory unit tables |
| `core-ai-provider` | Multi-LLM provider driver (Gemini, OpenAI, OpenRouter), budget controls & usage tracking | None | `plugin_core_ai_provider_usage` |
| `core-recipe-importer` | AI-assisted extraction from Web URLs, raw text, or photos | `core-ai-provider` | `plugin_core_recipe_importer_history` |
| `core-translator` | Multilingual recipe translation preserving measurements and terminology | `core-ai-provider` | `plugin_core_translator_history` |
| `core-meal-planner-ai` | Smart meal candidate suggestion pool generation without locking schedule | `core-ai-provider` | `plugin_core_meal_planner_plans`, `plugin_core_meal_planner_suggestions` |
| `core-shopping-list` | Dynamic shopping list aggregation with serving scaling, staples, and manual items | None | `plugin_core_shopping_list_staples`, `plugin_core_shopping_list_items`, `plugin_core_shopping_list_checked_state` |

---

## UI and scheduling contracts

Core UI plugins use the host's global PrimeVue controls and shared `ss` context (see [Shell Architecture](SHELL_ARCHITECTURE.md) and [Plugin Developer Guide](PLUGIN_DEVELOPER_GUIDE.md)); they do not install private design systems. All four light presets cover recipe list/detail/editor/import, Timeline dialogs, Journal, Shopping, and Settings/member/recurring forms.

- **Recipes:** card/grid search and shortlist filter, real ingredient/step editors, explicit recipe intents, AI extraction preview before saving. Shortlist controls do not accidentally navigate the card. Cover images use the assets API with `entity_type=recipe`, the recipe **group id** as `entity_id`, and `slot=cover`. Editor/detail/list resolve cover metadata instead of assuming a `cover_asset_id` Recipe API field. Save a new recipe before adding its cover; uploads save immediately and independently of form edits. Optional media loading falls back to recipe text when asset metadata is unavailable offline. Recipe-group deletion and normal asset GC retain their existing cleanup responsibilities.
- **Members:** picker in the header and reactive Settings section with editable portion size/preferences; no custom color picker. Avatars derive a stable palette color from member ids; stored `avatar_color` remains accepted for backward compatibility. The final member cannot be deleted (409).
- **Timeline:** initially today−2 through today+6, with expandable past summaries, explicit earlier/more controls, ordered household slots, additional day-only slots, skipped empty defaults, and inline Add meal/Add another meal. Recipe search, shortlist, servings and quick notes share the Add dialog. Cooked status and recurrence badges are visible on meal cards. Legacy strings map case-insensitively to canonical ids first, then labels; unmatched strings remain visible in synthetic slots. Household/event/slot changes refresh the feed; large windows use bounded API chunks. Phone planning widgets are collapsed accordion panels, not a column crowding the feed.
- **Day slots:** schema 1 stores overrides keyed by `(date, meal_type)`; defaults come from household configuration. `core-timeline` registers a `TimelineSlotsService` as `ctx.services.get('core-timeline')`, exposing `slots_for(from_date, to_date, conn=None)`. Slots are `{ id, label, kind: 'default' | 'extra', skipped }`. HTTP routes require a session cookie, validate strict ISO dates and ranges up to 92 inclusive days, and push `core-timeline:slots-changed` only after commit. See [API Reference](API_REFERENCE.md) for write conflicts and deletion semantics.
- **Recurring:** schema 2 adds tracking `(rule_id, date, entry_id)` with primary key `(rule_id, date)` and no schedule-entry foreign key, so deleting one occurrence does not erase history or resurrect that meal on the next hourly round/restart. Rule creation immediately materializes the next 14 days (including today) in the rule transaction and returns `created`. Empty, unskipped slots are eligible; existing planned meals win. With Timeline disabled, household defaults still work. Schema-1 recurring entries are backfilled during materialization. Deleting a rule atomically removes future unedited tracked entries (revision 1), preserves today/past, edited/manual meals and entries still tracked by another existing rule, and returns 404 for a missing rule. The UI offers Add recurring meal in Settings and a headless “Repeat every <weekday>” meal action for non-recurring recipe entries, with explicit JS Sunday-zero → Python Monday-zero mapping. There is no Materialize Now button, `/materialize` endpoint or materialize command.

These behaviors have real lifespan/HTTP/background tests and compiled-bundle browser tests; the theme matrix also checks page/console errors and 390px overflow. The overhaul does not add drag/drop slot reordering, phone bottom tabs, dark mode, a new-string i18n migration, or a kernel schedule/journal redesign.

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
- `POST /api/x/core-meal-planner-ai/generate`: `{ days?: int, meal_types?: str[], start_date?: str, prompt?: str } (default meal types: `["dinner"]`)`. Start dates and resulting horizons are validated before outbound AI work or persistence.
- `GET /api/x/core-meal-planner-ai/plans`: List past meal plan runs.
- `GET /api/x/core-meal-planner-ai/plans/{plan_id}`: Inspect specific plan suggestions.
- `POST /api/x/core-meal-planner-ai/suggestions/{id}/accept`: `{ date: str, meal_type: str, servings?: float }`
- `POST /api/x/core-meal-planner-ai/suggestions/{id}/dismiss`: Dismiss suggestion.

The planner widget resolves the selected day's Timeline slots (including dates outside its initial loaded window), uses canonical slot ids, refreshes on slot changes, and excludes skipped slots. Acceptance remains atomic and single-use.

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

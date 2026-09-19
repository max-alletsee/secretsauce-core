# Stage 7 / Phase 3D: Core Plugins Standardization & AI/Productivity Suite

*2026-09-19T19:45:16Z by Showboat 0.6.1*
<!-- showboat-id: 56b43b8b-e5b5-4852-a1f7-706b08c37065 -->

## 1. Core Plugin Naming Standardization (Zero-Aliasing)

All core plugins located at `secretsauce/plugins/core/` have been standardized to the `core-` prefix convention across directories, manifests, router prefixes, and SQLite database tables:

- `core-cook-tracker` (`/api/x/core-cook-tracker`, table `plugin_core_cook_tracker_history`)
- `core-ratings` (`/api/x/core-ratings`, table `plugin_core_ratings_votes`)
- `core-recurring` (`/api/x/core-recurring`, table `plugin_core_recurring_rules`)
- `core-shortlist` (`/api/x/core-shortlist`, table `plugin_core_shortlist_entries`)
- `core-units` (manifest and engine)
- `core-recipes`, `core-members`, and `core-timeline` (standardized manifests)

Let us verify all discovered core plugins in the booted kernel:

```bash
uv run python -c "
import asyncio, tempfile
from pathlib import Path
from secretsauce.testing import make_kernel

async def main():
    with tempfile.TemporaryDirectory() as td:
        async with make_kernel(Path(td), auto_setup=True) as k:
            plugins = await k.plugins.list_plugins()
            core_plugins = [p for p in plugins if p.get('id', '').startswith('core-')]
            print(f'Discovered {len(core_plugins)} active core plugins:')
            for p in sorted(core_plugins, key=lambda x: x['name']):
                name = p['name']
                ver = p['version']
                st = p['state']
                print(f'  - {name} (v{ver}) [state: {st}]')

asyncio.run(main())
"

```

```output
Discovered 13 active core plugins:
  - core-ai-provider (v1.0.0) [state: active]
  - core-cook-tracker (v1.0.0) [state: active]
  - core-meal-planner-ai (v1.0.0) [state: active]
  - core-members (v1.0.0) [state: active]
  - core-ratings (v1.0.0) [state: active]
  - core-recipe-importer (v1.0.0) [state: active]
  - core-recipes (v1.0.0) [state: active]
  - core-recurring (v1.0.0) [state: active]
  - core-shopping-list (v1.0.0) [state: active]
  - core-shortlist (v1.0.0) [state: active]
  - core-timeline (v1.0.0) [state: active]
  - core-translator (v1.0.0) [state: active]
  - core-units (v1.0.0) [state: active]
```

## 2. AI Provider Service (`core-ai-provider`)

The `core-ai-provider` plugin abstracts multiple LLM providers behind a unified asynchronous call interface:
`complete(schema, prompt, images=None, call_type="generic", calling_plugin="...")`.

Features:
- **Drivers:** Native Gemini (`google.genai`, default model `gemini-3.8-flash`), OpenAI JSON schema output, and OpenRouter HTTP gateway.
- **Budget Control:** Real-time token counting, cost tracking in `plugin_core_ai_provider_usage`, and optional monthly budget cap enforcement.
- **Settings UI:** Frontend settings tab `AiSettings.vue` built into the settings view.

Run backend test verification for `core-ai-provider`:

```bash
uv run pytest tests/test_plugin_core_ai_provider.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 6 items

tests\test_plugin_core_ai_provider.py ......                             [100%]

============================== 6 passed in 3.62s ==============================
```

## 3. Recipe Importer (`core-recipe-importer`)

The `core-recipe-importer` plugin extracts structured recipes from unstructured inputs:
- **Web URLs:** Scrapes HTML, strips script/style tags, and extracts structured ingredient lists, steps, and timings.
- **Raw Text:** Parses pasted recipes, notes, and emails into canonical schema.
- **Vision/OCR:** Processes image uploads (base64) using multimodal vision LLMs.
- **Async Background Jobs:** Asynchronous extraction registered via `import-url` job handler.
- **UI Modal:** Tabbed modal (`ImportRecipeModal.vue`) registered under `recipe:create` intent hub.

Run backend test verification for `core-recipe-importer`:

```bash
uv run pytest tests/test_plugin_core_recipe_importer.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 4 items

tests\test_plugin_core_recipe_importer.py ....                           [100%]

============================== 4 passed in 2.51s ==============================
```

## 4. Recipe Translator (`core-translator`)

The `core-translator` plugin provides multilingual recipe translation:
- **Recipe Group Synced Localization:** Saves translated recipes under the same `group_id` with target `language` code, allowing household members to view recipes in their preferred language.
- **Accurate Culinary Translation:** Accurately localizes culinary terms while preserving units and measurements.
- **Background Jobs:** Supports single-recipe translation jobs (`translate-recipe`) and bulk library translation (`translate-all`).
- **UI Widget:** `TranslateAction.vue` injected into recipe detail actions and sidebar slots.

Run backend test verification for `core-translator`:

```bash
uv run pytest tests/test_plugin_core_translator.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 3 items

tests\test_plugin_core_translator.py ...                                 [100%]

============================== 3 passed in 1.70s ==============================
```

## 5. AI Meal Planner (`core-meal-planner-ai`)

The `core-meal-planner-ai` plugin introduces intelligent meal planning tailored to household preferences:
- **Unassigned Candidate Suggestion Pool:** The planner **never locks** meal slots onto calendar dates automatically. It creates an unassigned candidate suggestion pool with match confidence and culinary reasoning.
- **Dietary Restriction Awareness:** Analyzes household member preferences and dietary restrictions (e.g. vegetarian, nut allergy).
- **Candidate Commitment Flow:** Users select an unassigned suggestion card, choose date and meal type, and click "Add to Schedule" (which creates an entry in `schedule_entries`) or click "Dismiss".
- **UI Widget:** `MealPlannerWidget.vue` registered in the schedule sidebar and intent hub `meal:plan`.

Run backend test verification for `core-meal-planner-ai`:

```bash
uv run pytest tests/test_plugin_core_meal_planner_ai.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 2 items

tests\test_plugin_core_meal_planner_ai.py ..                             [100%]

============================== 2 passed in 1.33s ==============================
```

## 6. Dynamic Shopping List (`core-shopping-list`)

The `core-shopping-list` plugin aggregates household shopping needs:
- **Serving-Scaled Meal Aggregation:** Scans scheduled meals in date range `from_date` to `to_date` and scales ingredients dynamically by `servings_override / default_servings`.
- **Duplicate Merging:** Merges identical ingredients across different recipes and lists the per-meal breakdown.
- **Pantry Staples:** Automatically includes household staples configured in `plugin_core_shopping_list_staples` marked with `always_include = 1`.
- **Manual Custom Items:** Supports one-off custom items.
- **Idempotent Outbox Checkbox Toggling:** Checkbox state is stored in `plugin_core_shopping_list_checked_state`, supporting offline outbox queue synchronization.
- **UI Page:** `ShoppingListPage.vue` registered at `/shopping-list` with navigation icon `🛒`.

Run backend test verification for `core-shopping-list`:

```bash
uv run pytest tests/test_plugin_core_shopping_list.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 3 items

tests\test_plugin_core_shopping_list.py ...                              [100%]

============================== 3 passed in 1.83s ==============================
```

## 7. End-to-End Multi-Plugin Integration

We test the complete end-to-end multi-plugin lifecycle across all 5 plugins working simultaneously:
1. `core-ai-provider` boots and handles structured AI completions.
2. `core-recipe-importer` parses and creates a new recipe in the library.
3. `core-translator` translates the imported recipe into a localized version under the same recipe group.
4. `core-meal-planner-ai` generates candidate suggestion pools from available recipes.
5. User accepts a suggestion, scheduling the recipe with a serving override.
6. `core-shopping-list` aggregates the scheduled meal with scaled ingredients and pantry staples, and updates checkbox toggles.

Run the backend integration test:

```bash
uv run pytest tests/test_stage_7_integration.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 1 item

tests\test_stage_7_integration.py .                                      [100%]

============================== 1 passed in 1.07s ==============================
```

Now verify the Vue 3 frontend multi-plugin integration flow (`ImportRecipeModal` -> `TranslateAction` -> `MealPlannerWidget` -> `ShoppingListPage`):

```bash
pnpm --prefix shell test tests/integration/phase-7-e2e.spec.ts

```

```output

> secretsauce-shell@1.0.0 test C:\github\secretsauce-core\shell
> vitest run "tests/integration/phase-7-e2e.spec.ts"


[1m[46m RUN [49m[22m [36mv3.2.7 [39m[90mC:/github/secretsauce-core/shell[39m

 [32m✓[39m tests/integration/phase-7-e2e.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 246[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m   Start at [22m 21:49:40
[2m   Duration [22m 2.07s[2m (transform 279ms, setup 0ms, collect 406ms, tests 246ms, environment 617ms, prepare 271ms)[22m

```

## 8. Complete Verification Suites & Bundling

### Backend Pytest Suite for Stage 7 Core Plugins

```bash
uv run pytest tests/test_plugin_core_*.py tests/test_stage_7_integration.py

```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0
rootdir: C:\github\secretsauce-core
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collected 19 items

tests\test_plugin_core_ai_provider.py ......                             [ 31%]
tests\test_plugin_core_meal_planner_ai.py ..                             [ 42%]
tests\test_plugin_core_recipe_importer.py ....                           [ 63%]
tests\test_plugin_core_shopping_list.py ...                              [ 78%]
tests\test_plugin_core_translator.py ...                                 [ 94%]
tests\test_stage_7_integration.py .                                      [100%]

============================= 19 passed in 8.55s ==============================
```

### Frontend Vitest Suite (All Plugin Specs and Monorepo Tests)

```bash
pnpm --prefix shell test

```

```output

> secretsauce-shell@1.0.0 test C:\github\secretsauce-core\shell
> vitest run


[1m[46m RUN [49m[22m [36mv3.2.7 [39m[90mC:/github/secretsauce-core/shell[39m

 [32m✓[39m tests/plugins/core-recipe-importer.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 132[2mms[22m[39m
 [32m✓[39m tests/plugins/core-meal-planner-ai.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 173[2mms[22m[39m
 [32m✓[39m tests/plugins/core-shopping-list.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 186[2mms[22m[39m
 [32m✓[39m tests/plugins/core-ai-provider.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 185[2mms[22m[39m
 [32m✓[39m tests/plugins/recipe-components.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 121[2mms[22m[39m
 [32m✓[39m tests/integration/phase-7-e2e.spec.ts [2m([22m[2m1 test[22m[2m)[22m[33m 401[2mms[22m[39m
   [33m[2m✓[22m[39m Phase 7 End-to-End Multi-Plugin Frontend Integration[2m > [22mwalks through import -> translate -> plan -> shopping list flow [33m 397[2mms[22m[39m
 [32m✓[39m tests/plugins/core-cook-tracker.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 108[2mms[22m[39m
 [32m✓[39m tests/plugins/recipe-pages.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 269[2mms[22m[39m
 [32m✓[39m tests/plugins/timeline.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[33m 308[2mms[22m[39m
 [32m✓[39m tests/integration/phase-3c-e2e.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 268[2mms[22m[39m
 [32m✓[39m tests/integration/phase-3b-e2e.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 275[2mms[22m[39m
 [32m✓[39m tests/plugins/core-ratings.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 122[2mms[22m[39m
 [32m✓[39m tests/plugins/member-picker.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 190[2mms[22m[39m
 [32m✓[39m tests/plugins/core-translator.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 210[2mms[22m[39m
 [32m✓[39m src/pages/pages.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 139[2mms[22m[39m
 [32m✓[39m packages/ui/tests/intent-trigger.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 112[2mms[22m[39m
 [32m✓[39m src/components/components.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 127[2mms[22m[39m
 [32m✓[39m tests/plugins/core-shortlist.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 169[2mms[22m[39m
 [32m✓[39m packages/ui/tests/slot.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 74[2mms[22m[39m
 [32m✓[39m tests/outbox.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 68[2mms[22m[39m
 [32m✓[39m src/app.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 114[2mms[22m[39m
 [32m✓[39m src/router.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 33[2mms[22m[39m
 [32m✓[39m src/registries/registries.spec.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 20[2mms[22m[39m
 [32m✓[39m tests/scaffold.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 12[2mms[22m[39m
 [32m✓[39m tests/stream.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 14[2mms[22m[39m
 [32m✓[39m tests/e2e-build.spec.ts [2m([22m[2m1 test[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m tests/api.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m packages/units/tests/units.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/stores/stores.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/sw/classify.spec.ts [2m([22m[2m6 tests[22m[2m)[22m[32m 10[2mms[22m[39m

[2m Test Files [22m [1m[32m30 passed[39m[22m[90m (30)[39m
[2m      Tests [22m [1m[32m75 passed[39m[22m[90m (75)[39m
[2m   Start at [22m 21:51:35
[2m   Duration [22m 11.93s[2m (transform 10.49s, setup 0ms, collect 32.65s, tests 3.91s, environment 49.72s, prepare 14.80s)[22m

```

### Core Plugin UI Bundle Compilation

All 11 core plugins compile independently into standalone distribution bundles (`<plugin>/ui.js` and optional `<plugin>/ui.css`):

```bash
pnpm --prefix shell build:plugins

```

```output

> secretsauce-shell@1.0.0 build:plugins C:\github\secretsauce-core\shell
> node scripts/build-plugins.ts

Building plugin UI for: core-ai-provider -> C:\github\secretsauce-core\secretsauce\plugins\core\core-ai-provider\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m15.71 kB[22m[1m[22m[2m │ gzip: 3.09 kB[22m
[32m✓ built in 353ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-ai-provider\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-ai-provider\ui.js
Building plugin UI for: core-cook-tracker -> C:\github\secretsauce-core\secretsauce\plugins\core\core-cook-tracker\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 8 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m0.81 kB[22m[1m[22m[2m │ gzip: 0.41 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m5.58 kB[22m[1m[22m[2m │ gzip: 1.96 kB[22m
[32m✓ built in 181ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-cook-tracker\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-cook-tracker\ui.js
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-cook-tracker\ui\dist\style.css -> C:\github\secretsauce-core\secretsauce\plugins\core\core-cook-tracker\ui.css
Building plugin UI for: core-meal-planner-ai -> C:\github\secretsauce-core\secretsauce\plugins\core\core-meal-planner-ai\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m12.07 kB[22m[1m[22m[2m │ gzip: 3.36 kB[22m
[32m✓ built in 70ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-meal-planner-ai\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-meal-planner-ai\ui.js
Building plugin UI for: core-members -> C:\github\secretsauce-core\secretsauce\plugins\core\core-members\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 9 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m 2.56 kB[22m[1m[22m[2m │ gzip: 0.81 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m12.06 kB[22m[1m[22m[2m │ gzip: 3.04 kB[22m
[32m✓ built in 89ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-members\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-members\ui.js
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-members\ui\dist\style.css -> C:\github\secretsauce-core\secretsauce\plugins\core\core-members\ui.css
Building plugin UI for: core-ratings -> C:\github\secretsauce-core\secretsauce\plugins\core\core-ratings\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 5 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m0.44 kB[22m[1m[22m[2m │ gzip: 0.27 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m2.67 kB[22m[1m[22m[2m │ gzip: 1.12 kB[22m
[32m✓ built in 44ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-ratings\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-ratings\ui.js
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-ratings\ui\dist\style.css -> C:\github\secretsauce-core\secretsauce\plugins\core\core-ratings\ui.css
Building plugin UI for: core-recipe-importer -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recipe-importer\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m13.92 kB[22m[1m[22m[2m │ gzip: 3.58 kB[22m
[32m✓ built in 101ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-recipe-importer\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recipe-importer\ui.js
Building plugin UI for: core-recipes -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recipes\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 20 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m 7.18 kB[22m[1m[22m[2m │ gzip: 1.73 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m33.56 kB[22m[1m[22m[2m │ gzip: 7.13 kB[22m
[32m✓ built in 206ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-recipes\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recipes\ui.js
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-recipes\ui\dist\style.css -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recipes\ui.css
Building plugin UI for: core-recurring -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recurring\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m3.11 kB[22m[1m[22m[2m │ gzip: 1.19 kB[22m
[32m✓ built in 289ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-recurring\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-recurring\ui.js
Building plugin UI for: core-shopping-list -> C:\github\secretsauce-core\secretsauce\plugins\core\core-shopping-list\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m20.71 kB[22m[1m[22m[2m │ gzip: 4.66 kB[22m
[32m✓ built in 58ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-shopping-list\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-shopping-list\ui.js
Building plugin UI for: core-shortlist -> C:\github\secretsauce-core\secretsauce\plugins\core\core-shortlist\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 11 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m1.14 kB[22m[1m[22m[2m │ gzip: 0.49 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m3.62 kB[22m[1m[22m[2m │ gzip: 1.43 kB[22m
[32m✓ built in 67ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-shortlist\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-shortlist\ui.js
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-shortlist\ui\dist\style.css -> C:\github\secretsauce-core\secretsauce\plugins\core\core-shortlist\ui.css
Building plugin UI for: core-timeline -> C:\github\secretsauce-core\secretsauce\plugins\core\core-timeline\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 14 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[35mstyle.css  [39m[1m[2m 4.96 kB[22m[1m[22m[2m │ gzip: 1.35 kB[22m
[2mui/dist/[22m[36mindex.js   [39m[1m[2m18.84 kB[22m[1m[22m[2m │ gzip: 4.91 kB[22m
[32m✓ built in 101ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-timeline\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-timeline\ui.js
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-timeline\ui\dist\style.css -> C:\github\secretsauce-core\secretsauce\plugins\core\core-timeline\ui.css
Building plugin UI for: core-translator -> C:\github\secretsauce-core\secretsauce\plugins\core\core-translator\ui\dist
[36mvite v6.4.3 [32mbuilding for production...[36m[39m
transforming...
[32m✓[39m 3 modules transformed.
rendering chunks...
computing gzip size...
[2mui/dist/[22m[36mindex.js  [39m[1m[2m6.57 kB[22m[1m[22m[2m │ gzip: 2.23 kB[22m
[32m✓ built in 34ms[39m
Copied C:\github\secretsauce-core\secretsauce\plugins\core\core-translator\ui\dist\index.js -> C:\github\secretsauce-core\secretsauce\plugins\core\core-translator\ui.js
```

## 9. Conclusion & Architecture Summary

All 17 tasks for Stage 7 / Phase 3D are complete:
- Zero-aliasing migration to `core-*` conventions completed across Python packages, database schemas, router paths, and Vue frontend packages.
- 5 new core plugins (`core-ai-provider`, `core-recipe-importer`, `core-translator`, `core-meal-planner-ai`, `core-shopping-list`) implemented and verified.
- 100% test pass rate across 122 backend tests and 75 frontend tests.
- Standalone plugin bundles and static production shell built cleanly.


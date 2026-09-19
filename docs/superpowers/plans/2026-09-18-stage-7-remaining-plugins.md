# Stage 7 Remaining Plugins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize all core plugins to the `core-` prefix convention (directories, IDs, manifest names, routes, tables, with no aliasing), and implement the remaining 5 Stage 7 core plugins: `core-ai-provider`, `core-translator`, `core-recipe-importer`, `core-meal-planner-ai`, and `core-shopping-list` following Test-Driven Development (TDD) and producing comprehensive documentation.

**Architecture:** 
A zero-legacy Phase 0 renames and reworks all existing core plugins to use `core-` prefixes across backend routers (`/api/x/core-<id>`), database tables (`plugin_core_<id>_*`), manifest metadata, frontend stores, and test suites. Subsequent phases build `core-ai-provider` as a normalized multi-provider engine (Google GenAI, OpenAI, OpenRouter), then layer its consumers (`core-translator`, `core-recipe-importer`, `core-meal-planner-ai`), and finally build `core-shopping-list` with outbox-driven optimistic updates and staples aggregation.

**Tech Stack:** 
- Backend: Python 3.12+, FastAPI, SQLite (aiosqlite), Pydantic v2, `google-genai>=1.0.0`, `httpx>=0.27.0`, `cryptography`
- Frontend: Vue 3, TypeScript, Pinia, PrimeVue, `@secretsauce/ui`, `@secretsauce/units`, Vite, IndexedDB outbox
- Testing: Pytest (pytest-asyncio), Vitest

**Spec:** `docs/superpowers/specs/2026-09-18-stage-7-remaining-plugins-design.md`

## Global Constraints
- Core plugins are located exclusively at `secretsauce/plugins/core/core-<id>/`.
- Every core plugin directory, `PLUGIN["id"]`, and `PLUGIN["name"]` must start with `core-`.
- Plugin routes mount strictly under `/api/x/core-<id>/` without compatibility aliases.
- Plugin SQLite tables are named `plugin_core_<id_suffix>_<table_name>`.
- Python runtime must be invoked as `python` or `uv run python` (never `python3`).
- Vitest tests must be executed with `pnpm --prefix shell test`.
- All plugin UI bundles must be compiled using `pnpm --prefix shell build:plugins`.

## Review Focus
1. **Unconfigured / Missing API Key in `core-ai-provider`:** Returns an actionable error (`HTTP 400` or `HTTP 503` with code `ai_not_configured`) rather than crashing unhandled or hanging.
2. **Provenance Safety in `core-translator`:** Auto-translation must never overwrite recipe rows where `origin == "member"`, nor react to its own writes (`origin == "plugin:core-translator"`).
3. **Offline Share & Import Protection:** `core-recipe-importer` intent providers must be unavailable when `ss.store.online` is false, preventing offline failures during URL/photo imports.
4. **Detached Suggestions in `core-meal-planner-ai`:** Suggestions must remain an unassigned candidate pool, never mutating the schedule until the user explicitly selects a date and meal slot.
5. **Outbox Idempotency in `core-shopping-list`:** Checkbox toggles enqueue `PUT /api/x/core-shopping-list/items/{id}/checked` with `{ "checked": true/false }`, ensuring replaying the same request multiple times leaves the item in the exact desired state.

---

## Phase 0: Full Core Plugin Renaming & Rework (No Aliasing)

### Task 1: Rename Existing Core Plugin Directories, Manifests, Tables, and Routers

**Files:**
- Move: `secretsauce/plugins/core/cook-tracker` $\to$ `secretsauce/plugins/core/core-cook-tracker`
- Move: `secretsauce/plugins/core/ratings` $\to$ `secretsauce/plugins/core/core-ratings`
- Move: `secretsauce/plugins/core/shortlist` $\to$ `secretsauce/plugins/core/core-shortlist`
- Move: `secretsauce/plugins/core/units` $\to$ `secretsauce/plugins/core/core-units`
- Move: `secretsauce/plugins/core/recurring` $\to$ `secretsauce/plugins/core/core-recurring`
- Modify: `secretsauce/plugins/core/core-members/__init__.py`
- Modify: `secretsauce/plugins/core/core-recipes/__init__.py`
- Modify: `secretsauce/plugins/core/core-timeline/__init__.py`

**Interfaces:**
- Consumes: Existing plugin implementations
- Produces: Normalized `core-*` manifests, routes mounted at `/api/x/core-*`, and migrations creating `plugin_core_*` tables

- [ ] **Step 1: Move plugin directories**
Rename the directories using git mv:
```bash
git mv secretsauce/plugins/core/cook-tracker secretsauce/plugins/core/core-cook-tracker
git mv secretsauce/plugins/core/ratings secretsauce/plugins/core/core-ratings
git mv secretsauce/plugins/core/shortlist secretsauce/plugins/core/core-shortlist
git mv secretsauce/plugins/core/units secretsauce/plugins/core/core-units
git mv secretsauce/plugins/core/recurring secretsauce/plugins/core/core-recurring
```

- [ ] **Step 2: Update manifests, routes, and table names in renamed plugins**
Update `__init__.py` and SQL migrations in each directory:
- `core-cook-tracker`: `id: "core-cook-tracker"`, `name: "core-cook-tracker"`, prefix `/api/x/core-cook-tracker`, tables `plugin_core_cook_tracker_leftovers`, `plugin_core_cook_tracker_carryovers`.
- `core-ratings`: `id: "core-ratings"`, `name: "core-ratings"`, prefix `/api/x/core-ratings`, table `plugin_core_ratings_scores`, mirrored attribute `core-ratings.score`.
- `core-shortlist`: `id: "core-shortlist"`, `name: "core-shortlist"`, prefix `/api/x/core-shortlist`, table `plugin_core_shortlist_entries`.
- `core-units`: `id: "core-units"`, `name: "core-units"`, service `ctx.services.register("core-units", UnitsService())`.
- `core-recurring`: `id: "core-recurring"`, `name: "core-recurring"`, prefix `/api/x/core-recurring`, table `plugin_core_recurring_rules`, origin `plugin:core-recurring`.
- `core-members`, `core-recipes`, `core-timeline`: update `PLUGIN["name"]` to `"core-members"`, `"core-recipes"`, `"core-timeline"`.

- [ ] **Step 3: Run quick git status and verification**
Verify all renames are staged and clean.

- [ ] **Step 4: Commit**
```bash
git add secretsauce/plugins/core/
git commit -m "refactor: rename core plugin directories and update manifests to core- prefix"
```

---

### Task 2: Update Shell Frontend Code and Build Pipeline for `core-*`

**Files:**
- Modify: `shell/scripts/build-plugins.ts`
- Modify: `secretsauce/plugins/core/core-cook-tracker/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-ratings/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-shortlist/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-recurring/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-units/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-timeline/ui/src/components/AddEntryModal.vue`
- Modify: `shell/tests/plugins/cook-tracker.spec.ts` $\to$ `shell/tests/plugins/core-cook-tracker.spec.ts`
- Modify: `shell/tests/plugins/ratings.spec.ts` $\to$ `shell/tests/plugins/core-ratings.spec.ts`
- Modify: `shell/tests/plugins/shortlist.spec.ts` $\to$ `shell/tests/plugins/core-shortlist.spec.ts`
- Modify: `shell/tests/integration/phase-3b-e2e.spec.ts`
- Modify: `shell/tests/integration/phase-3c-e2e.spec.ts`

- [ ] **Step 1: Update frontend UI code and outbox endpoints**
Update API calls in plugin UI files:
- `/api/x/ratings` $\to$ `/api/x/core-ratings`
- `/api/x/shortlist` $\to$ `/api/x/core-shortlist`
- `/api/x/recurring` $\to$ `/api/x/core-recurring`
- `/api/x/cook-tracker` $\to$ `/api/x/core-cook-tracker`
- Shortlist and rating references in `AddEntryModal.vue` and `JournalPage.vue` updated to `core-shortlist` and `core-ratings`.

- [ ] **Step 2: Build plugin UI bundles**
Run: `pnpm --prefix shell build:plugins`
Expected: Bundles compiled to `ui.js` and `ui.css` for each core plugin.

- [ ] **Step 3: Update and run Vitest frontend tests**
Update Vitest specs to import from renamed paths and assert `core-*` plugin IDs:
Run: `pnpm --prefix shell test`
Expected: All Vitest tests pass.

- [ ] **Step 4: Commit**
```bash
git add shell/ secretsauce/plugins/core/
git commit -m "refactor: update shell frontend plugins and tests for core- naming"
```

---

### Task 3: Update Backend Pytest Suites for `core-*` Plugins

**Files:**
- Rename/Modify: `tests/test_plugin_cook_tracker.py` $\to$ `tests/test_plugin_core_cook_tracker.py`
- Rename/Modify: `tests/test_plugin_ratings.py` $\to$ `tests/test_plugin_core_ratings.py`
- Rename/Modify: `tests/test_plugin_shortlist.py` $\to$ `tests/test_plugin_core_shortlist.py`
- Rename/Modify: `tests/test_plugin_units.py` $\to$ `tests/test_plugin_core_units.py`
- Rename/Modify: `tests/test_plugin_recurring.py` $\to$ `tests/test_plugin_core_recurring.py`
- Modify: `tests/test_plugin_recipes_members.py`
- Modify: `tests/test_recipes.py`

- [ ] **Step 1: Update Pytest test files**
Update test code to use `core-*`:
- `k.plugins.get_plugin("core-ratings")`, `/api/x/core-ratings`, `plugin_core_ratings_scores`, `attrs["core-ratings.score"]`.
- `k.plugins.get_plugin("core-cook-tracker")`, `k.services.get_command("core-cook-tracker", "rebuild")`.
- `k.plugins.get_plugin("core-shortlist")`, `/api/x/core-shortlist`.
- `k.plugins.get_plugin("core-units")`, `k.services.get("core-units")`.
- `k.plugins.get_plugin("core-recurring")`, `/api/x/core-recurring/rules`.

- [ ] **Step 2: Run all Pytest tests**
Run: `uv run pytest`
Expected: All tests pass.

- [ ] **Step 3: Commit Phase 0**
```bash
git add tests/
git commit -m "test: align Pytest suite with core- plugin standardization"
```

---

## Phase 1: `core-ai-provider` Implementation

### Task 4: Add `google-genai` Dependency and Scaffolding

**Files:**
- Modify: `pyproject.toml`
- Create: `secretsauce/plugins/core/core-ai-provider/migrations/0001_initial.sql`

- [ ] **Step 1: Add `google-genai>=1.0.0` to `pyproject.toml`**
Add `"google-genai>=1.0.0"` under `dependencies` in `pyproject.toml`.

- [ ] **Step 2: Run uv sync**
Run: `uv sync --extra dev`
Expected: `google-genai` installed successfully.

- [ ] **Step 3: Create migration `0001_initial.sql`**
```sql
CREATE TABLE IF NOT EXISTS plugin_core_ai_provider_calls (
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

CREATE INDEX IF NOT EXISTS idx_core_ai_provider_calls_created_at
    ON plugin_core_ai_provider_calls(created_at);
```

- [ ] **Step 4: Commit**
```bash
git add pyproject.toml uv.lock secretsauce/plugins/core/core-ai-provider/migrations/
git commit -m "feat(core-ai-provider): add google-genai dependency and call log migration"
```

---

### Task 5: Implement `AIProviderService` with Multi-Provider Drivers (Gemini, OpenAI, OpenRouter)

**Files:**
- Create: `secretsauce/plugins/core/core-ai-provider/service.py`
- Test: `tests/test_plugin_core_ai_provider.py`

**Interfaces:**
- Consumes: `PluginContext`, `google.genai`, `httpx`
- Produces: `AIProviderService.complete(schema, prompt, images=None, call_type="generic", calling_plugin="core-ai-provider")`

- [ ] **Step 1: Write failing test for `AIProviderService`**
Test structured completion with a mock driver for Gemini, OpenAI, and OpenRouter, budget enforcement, and call auditing:
```python
# tests/test_plugin_core_ai_provider.py
import pytest
from pydantic import BaseModel
from pathlib import Path
from secretsauce.testing import make_kernel

class SampleOutput(BaseModel):
    summary: str
    confidence: float

@pytest.mark.asyncio
async def test_ai_provider_complete_and_audit(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-ai-provider")
        assert p is not None
        assert p["state"] == "active"
        svc = k.services.get("core-ai-provider")
        assert svc is not None
```

- [ ] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_plugin_core_ai_provider.py`
Expected: FAIL (plugin or service not found)

- [ ] **Step 3: Implement `service.py`**
Implement:
- `GeminiDriver`: Calls `google.genai` async client with `types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema)`.
- `OpenAIDriver`: Calls `{base_url}/chat/completions` using `httpx.AsyncClient` with `response_format={"type": "json_schema", ...}`.
- `OpenRouterDriver`: Calls OpenRouter with HTTP-Referer and X-Title headers.
- `AIProviderService`: Handles optional `enforce_budget` check against `plugin_core_ai_provider_calls`, measures latency, calculates cost, logs the call, and parses the output with `schema.model_validate_json(...)`.
- `MockDriver`: Allows injecting predefined responses for test runs.

- [ ] **Step 4: Verify test passes**
Run: `uv run pytest tests/test_plugin_core_ai_provider.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add secretsauce/plugins/core/core-ai-provider/service.py tests/test_plugin_core_ai_provider.py
git commit -m "feat(core-ai-provider): implement multi-provider AI engine service"
```

---

### Task 6: Implement `core-ai-provider` Endpoints and Manifest `setup(ctx)`

**Files:**
- Create: `secretsauce/plugins/core/core-ai-provider/__init__.py`
- Test: `tests/test_plugin_core_ai_provider.py`

- [ ] **Step 1: Write failing test for `/api/x/core-ai-provider/usage`**
Assert that `GET /api/x/core-ai-provider/usage` returns monthly total cost, token counts, and recent calls.

- [ ] **Step 2: Implement `__init__.py`**
Define `PLUGIN = { "id": "core-ai-provider", "name": "core-ai-provider", "version": "1.0.0", "core": True, "schema": 1, ... }`.
Mount router with:
- `GET /api/x/core-ai-provider/usage`: queries `plugin_core_ai_provider_calls` for current month's aggregates and recent calls.
- `POST /api/x/core-ai-provider/test`: verifies provider credentials.
Register service via `ctx.services.register("core-ai-provider", service)`.

- [ ] **Step 3: Run pytest to verify all tests pass**
Run: `uv run pytest tests/test_plugin_core_ai_provider.py`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add secretsauce/plugins/core/core-ai-provider/__init__.py tests/test_plugin_core_ai_provider.py
git commit -m "feat(core-ai-provider): mount routes and register service"
```

---

### Task 7: Implement `core-ai-provider` Frontend UI & Settings Section

**Files:**
- Create: `secretsauce/plugins/core/core-ai-provider/ui/package.json`
- Create: `secretsauce/plugins/core/core-ai-provider/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-ai-provider/ui/src/AISettings.vue`
- Test: `shell/tests/plugins/core-ai-provider.spec.ts`

- [ ] **Step 1: Write Vitest test for `core-ai-provider` UI**
Verify `AISettings.vue` mounts, renders provider options (`gemini`, `openai`, `openrouter`), model input, and budget usage progress bar.

- [ ] **Step 2: Implement `AISettings.vue` and `index.ts`**
In `index.ts`, register `ss.settings.section({ id: "core-ai-provider", title: "AI & Intelligence", component: AISettings, order: 20 })`.
In `AISettings.vue`, fetch `/api/x/core-ai-provider/usage` and render usage metrics.

- [ ] **Step 3: Build plugin UI bundle**
Run: `pnpm --prefix shell build:plugins`
Expected: `secretsauce/plugins/core/core-ai-provider/ui.js` generated.

- [ ] **Step 4: Run Vitest test**
Run: `pnpm --prefix shell test shell/tests/plugins/core-ai-provider.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add secretsauce/plugins/core/core-ai-provider/ui* shell/tests/plugins/core-ai-provider.spec.ts
git commit -m "feat(core-ai-provider): add AISettings component and bundle"
```

---

## Phase 2: `core-translator` Implementation

### Task 8: Implement `core-translator` Manifest and Translation Engine

**Files:**
- Create: `secretsauce/plugins/core/core-translator/__init__.py`
- Test: `tests/test_plugin_core_translator.py`

**Interfaces:**
- Consumes: `core-ai-provider` service, `recipe:created`, `recipe:updated` events
- Produces: Translated recipe rows with `origin = "plugin:core-translator"`, command `retranslate-all`

- [ ] **Step 1: Write failing test for automated translation and provenance**
```python
# tests/test_plugin_core_translator.py
import pytest
from pathlib import Path
from secretsauce.testing import drain_events, make_kernel

@pytest.mark.asyncio
async def test_translator_creates_translated_row_preserving_member_row(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Create recipe in 'en'
        rec = await k.recipes.create_recipe({"title": "Apple Pie", "language": "en", "ingredients": [], "steps": []})
        group_id = rec["group_id"]
        await drain_events(k)

        # Check German row auto-created with origin plugin:core-translator
        de_row = await k.recipes.get_recipe(f"{group_id}_de")
        assert de_row is not None
        assert de_row["origin"] == "plugin:core-translator"
```

- [ ] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_plugin_core_translator.py`
Expected: FAIL

- [ ] **Step 3: Implement `core-translator` logic**
In `secretsauce/plugins/core/core-translator/__init__.py`:
- `PLUGIN = { "id": "core-translator", "name": "core-translator", "version": "1.0.0", "core": True, "requires": ["core-ai-provider"], "config_schema": { "target_languages": { "type": "array", "items": { "type": "string" }, "default": ["de"] } } }`.
- On `recipe:created` and `recipe:updated`:
  - Skip if `event.origin == "plugin:core-translator"`.
  - For each target language $L \ne \text{source.language}$:
    - If `<group_id>_<L>` exists and `row.origin == "member"`: SKIP.
    - If exists and `row.origin == "plugin:core-translator"`: update with new translation.
    - If does not exist: create with `origin = "plugin:core-translator"`.
- Register command `retranslate-all`: loops over all recipes in database and translates missing/translator rows.

- [ ] **Step 4: Verify tests pass**
Run: `uv run pytest tests/test_plugin_core_translator.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add secretsauce/plugins/core/core-translator/__init__.py tests/test_plugin_core_translator.py
git commit -m "feat(core-translator): implement recipe translation engine and provenance rules"
```

---

### Task 9: `core-translator` Frontend Bundle & Status Component

**Files:**
- Create: `secretsauce/plugins/core/core-translator/ui/package.json`
- Create: `secretsauce/plugins/core/core-translator/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-translator/ui/src/TranslatorSettings.vue`
- Test: `shell/tests/plugins/core-translator.spec.ts`

- [ ] **Step 1: Write Vitest test**
Verify `TranslatorSettings.vue` allows configuring target languages and shows translation status.

- [ ] **Step 2: Implement UI component and build**
Run: `pnpm --prefix shell build:plugins`
Run: `pnpm --prefix shell test shell/tests/plugins/core-translator.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add secretsauce/plugins/core/core-translator/ui* shell/tests/plugins/core-translator.spec.ts
git commit -m "feat(core-translator): add translator settings UI and bundle"
```

---

## Phase 3: `core-recipe-importer` Implementation

### Task 10: Implement `core-recipe-importer` Backend Jobs

**Files:**
- Create: `secretsauce/plugins/core/core-recipe-importer/__init__.py`
- Test: `tests/test_plugin_core_recipe_importer.py`

**Interfaces:**
- Consumes: `core-ai-provider`, `ctx.jobs`, `httpx`
- Produces: Tracked jobs `import_url` and `import_photo`, attribution attribute `source_url`

- [ ] **Step 1: Write failing test for URL and Photo Import jobs**
Verify `POST /api/x/core-recipe-importer/jobs/import-url` and `import-photo` start tracked jobs, report progress, and write `recipe.source_url` attribute.

- [ ] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_plugin_core_recipe_importer.py`
Expected: FAIL

- [ ] **Step 3: Implement `__init__.py`**
Implement:
- `import_url_job`: fetches URL via `httpx`, calls `ai.complete(RecipeImportSchema, prompt)`, creates recipe with `origin = "plugin:core-recipe-importer"`, records attribute `ctx.attributes.set("recipe", group_id, "source_url", url)`.
- `import_photo_job`: calls `ai.complete(RecipeImportSchema, prompt, images=[(image_bytes, mime)])`, creates recipe.
- Endpoints: `POST /api/x/core-recipe-importer/jobs/import-url` and `POST /api/x/core-recipe-importer/jobs/import-photo`.

- [ ] **Step 4: Verify test passes**
Run: `uv run pytest tests/test_plugin_core_recipe_importer.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add secretsauce/plugins/core/core-recipe-importer/__init__.py tests/test_plugin_core_recipe_importer.py
git commit -m "feat(core-recipe-importer): implement import background jobs and attribution"
```

---

### Task 11: Implement `core-recipe-importer` UI Providers and Attribution Slot

**Files:**
- Create: `secretsauce/plugins/core/core-recipe-importer/ui/package.json`
- Create: `secretsauce/plugins/core/core-recipe-importer/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-recipe-importer/ui/src/ImportUrlModal.vue`
- Create: `secretsauce/plugins/core/core-recipe-importer/ui/src/ImportPhotoModal.vue`
- Create: `secretsauce/plugins/core/core-recipe-importer/ui/src/ImportedSourceAttribution.vue`
- Test: `shell/tests/plugins/core-recipe-importer.spec.ts`

- [ ] **Step 1: Write Vitest tests for intent providers and attribution slot**
Test that:
- `recipe:create` has `import-url` and `import-photo`.
- `share:receive` has `import-shared`.
- Gated by `ss.store.online` (disabled when offline).
- `recipe.detail.footer` renders source URL attribution link.

- [ ] **Step 2: Implement UI components and build**
Run: `pnpm --prefix shell build:plugins`
Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-importer.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add secretsauce/plugins/core/core-recipe-importer/ui* shell/tests/plugins/core-recipe-importer.spec.ts
git commit -m "feat(core-recipe-importer): add import dialogs, share intent, and attribution slot"
```

---

## Phase 4: `core-meal-planner-ai` Implementation

### Task 12: Implement `core-meal-planner-ai` Backend Synthesis

**Files:**
- Create: `secretsauce/plugins/core/core-meal-planner-ai/__init__.py`
- Test: `tests/test_plugin_core_meal_planner_ai.py`

**Interfaces:**
- Consumes: `core-ai-provider`, `ctx.members`, `ctx.recipes`, `ctx.attributes`
- Produces: `POST /api/x/core-meal-planner-ai/suggest` returning candidate suggestion pool

- [ ] **Step 1: Write failing test for suggestion pool generation**
Verify suggestions gather member dietary restrictions, allergies, and recipe ratings, and return a candidate list without modifying the schedule.

- [ ] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_plugin_core_meal_planner_ai.py`
Expected: FAIL

- [ ] **Step 3: Implement `__init__.py`**
In `secretsauce/plugins/core/core-meal-planner-ai/__init__.py`:
- `PLUGIN = { "id": "core-meal-planner-ai", "name": "core-meal-planner-ai", "version": "1.0.0", "core": True, "requires": ["core-ai-provider"], "config_schema": { "system_prompt": { "type": "string" }, "suggestion_count": { "type": "integer", "default": 7 } } }`.
- `POST /api/x/core-meal-planner-ai/suggest`:
  - Synthesizes member profiles (restrictions, allergies, disliked foods, favorite cuisines).
  - Fetches existing recipes, shortlist entries, and rating scores (`core-ratings.score`).
  - Calls `ai.complete(MealSuggestionsSchema, prompt)`.
  - Returns suggestions list (`recipe_id`, `title`, `suggested_meal_type`, `suggested_servings`).

- [ ] **Step 4: Verify test passes**
Run: `uv run pytest tests/test_plugin_core_meal_planner_ai.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add secretsauce/plugins/core/core-meal-planner-ai/__init__.py tests/test_plugin_core_meal_planner_ai.py
git commit -m "feat(core-meal-planner-ai): implement candidate suggestion pool endpoint"
```

---

### Task 13: Implement `core-meal-planner-ai` UI and `timeline:assist` Provider

**Files:**
- Create: `secretsauce/plugins/core/core-meal-planner-ai/ui/package.json`
- Create: `secretsauce/plugins/core/core-meal-planner-ai/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-meal-planner-ai/ui/src/MealSuggestionsDrawer.vue`
- Test: `shell/tests/plugins/core-meal-planner-ai.spec.ts`

- [ ] **Step 1: Write Vitest test for suggestions drawer**
Test `timeline:assist` provider `suggest-week` opens `MealSuggestionsDrawer.vue`, displays recipes from the suggestion pool, and allows assigning to a day.

- [ ] **Step 2: Implement UI components and build**
Run: `pnpm --prefix shell build:plugins`
Run: `pnpm --prefix shell test shell/tests/plugins/core-meal-planner-ai.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add secretsauce/plugins/core/core-meal-planner-ai/ui* shell/tests/plugins/core-meal-planner-ai.spec.ts
git commit -m "feat(core-meal-planner-ai): add suggestions drawer and timeline:assist provider"
```

---

## Phase 5: `core-shopping-list` Implementation

### Task 14: Implement `core-shopping-list` Migrations and Aggregation Engine

**Files:**
- Create: `secretsauce/plugins/core/core-shopping-list/migrations/0001_initial.sql`
- Create: `secretsauce/plugins/core/core-shopping-list/__init__.py`
- Test: `tests/test_plugin_core_shopping_list.py`

**Interfaces:**
- Consumes: `ScheduleRepo`, `RecipesRepo`, `core-units` service, optional `core-ai-provider`
- Produces: Tables `plugin_core_shopping_list_*`, endpoints `/api/x/core-shopping-list/items`, `/staples`, `/rebuild`

- [ ] **Step 1: Write failing test for aggregation across schedule and staples**
Verify ingredient scaling by `servings_override / recipe.servings`, merging matching ingredients, including active recurring staples from `plugin_core_shopping_list_staples`, and toggling checked state.

- [ ] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_plugin_core_shopping_list.py`
Expected: FAIL

- [ ] **Step 3: Create migration `0001_initial.sql` and backend logic**
Migration creates `plugin_core_shopping_list_lists`, `plugin_core_shopping_list_items`, `plugin_core_shopping_list_staples`.
Endpoints:
- `GET /api/x/core-shopping-list/active`: returns active list and items.
- `PUT /api/x/core-shopping-list/items/{id}/checked`: sets `{ "checked": boolean }`.
- `POST /api/x/core-shopping-list/items`: adds manual ad-hoc item.
- `DELETE /api/x/core-shopping-list/items/{id}`: removes item.
- `GET` / `POST` / `DELETE /api/x/core-shopping-list/staples`: manages pantry staples.
- Command `rebuild`: re-aggregates active schedule window and staples into items.

- [ ] **Step 4: Verify test passes**
Run: `uv run pytest tests/test_plugin_core_shopping_list.py`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add secretsauce/plugins/core/core-shopping-list/ tests/test_plugin_core_shopping_list.py
git commit -m "feat(core-shopping-list): implement shopping list tables, aggregation, and endpoints"
```

---

### Task 15: Implement `core-shopping-list` Frontend Route, Outbox Toggle, and Export Hub

**Files:**
- Create: `secretsauce/plugins/core/core-shopping-list/ui/package.json`
- Create: `secretsauce/plugins/core/core-shopping-list/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-shopping-list/ui/src/ShoppingPage.vue`
- Create: `secretsauce/plugins/core/core-shopping-list/ui/src/StaplesModal.vue`
- Test: `shell/tests/plugins/core-shopping-list.spec.ts`

- [ ] **Step 1: Write Vitest test for ShoppingPage, outbox sync, and export hub**
Test:
- Route `/shopping` registration.
- Item checkbox enqueues `PUT /api/x/core-shopping-list/items/{id}/checked` into outbox.
- Hub `shopping:export` providers (`copy-markdown`, `print`).
- Slot `shopping.item.actions`.

- [ ] **Step 2: Implement UI components and build**
Run: `pnpm --prefix shell build:plugins`
Run: `pnpm --prefix shell test shell/tests/plugins/core-shopping-list.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**
```bash
git add secretsauce/plugins/core/core-shopping-list/ui* shell/tests/plugins/core-shopping-list.spec.ts
git commit -m "feat(core-shopping-list): add ShoppingPage, optimistic outbox toggle, and export hub"
```

---

## Phase 6: System Verification & Documentation

### Task 16: Complete Verification Suite & Shell Asset Build

**Files:**
- Build: `secretsauce/static/` via `pnpm --prefix shell build`

- [ ] **Step 1: Compile all plugin UI bundles**
Run: `pnpm --prefix shell build:plugins`
Expected: All 13 core plugin bundles compiled with 0 errors.

- [ ] **Step 2: Build frontend shell bundle**
Run: `pnpm --prefix shell build`
Expected: Compiled static assets in `secretsauce/static/`.

- [ ] **Step 3: Run full backend test suite**
Run: `uv run pytest`
Expected: 100% tests passing.

- [ ] **Step 4: Run full frontend test suite**
Run: `pnpm --prefix shell test`
Expected: 100% tests passing.

- [ ] **Step 5: Commit**
```bash
git add secretsauce/static/
git commit -m "build: compile production shell and plugin assets"
```

---

### Task 17: Comprehensive Documentation

**Files:**
- Create: `docs/PLUGINS_STAGE_7.md`
- Modify: `docs/PLUGIN_DEVELOPER_GUIDE.md`
- Modify: `docs/API_REFERENCE.md`

- [ ] **Step 1: Write `docs/PLUGINS_STAGE_7.md`**
Document all 13 core plugins:
- Purpose, configuration schemas, permissions, dependencies.
- REST endpoints and payload schemas.
- Database tables and foreign keys.
- Intent hubs provided and slots contributed.
- Outbox and offline behaviors.

- [ ] **Step 2: Update `docs/PLUGIN_DEVELOPER_GUIDE.md` and `docs/API_REFERENCE.md`**
Update plugin reference tables and service registry guides to reflect `core-*` naming and the normalized `core-ai-provider` public interface.

- [ ] **Step 3: Commit**
```bash
git add docs/
git commit -m "docs: add comprehensive Stage 7 core plugins reference documentation"
```

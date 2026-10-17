# Make It Magic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Make It Magic" AI recipe adaptation feature, allowing home cooks to transform recipes from within the Recipe Edit page using Ottolenghi *SIMPLE*-inspired actions (or custom user-defined prompts), review highlighted diffs in-place, and apply changes or save as a new recipe.

**Architecture:** A core backend plugin (`core-recipe-magic`) registered under `/api/x/core-recipe-magic` that interfaces with `core-ai-provider` for schema-enforced LLM adaptations and stores configurable action-prompt pairs in household plugin settings. A corresponding Vue 3 frontend plugin compiled into `ui.js` integrates into `RecipeEditPage` with a PrimeVue dialog, live diff preview, dual-save options ("Apply to Editor" vs "Save as New Recipe"), and a Household Settings management view.

**Tech Stack:** FastAPI, Pydantic, aiosqlite, Vue 3, PrimeVue 4, PrimeIcons, Vitest, Pytest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-make-it-magic-design.md`

## Global Constraints

- **Python Runtime:** Always use `python` or `uv run python`. Never invoke `python3`.
- **Python Package & Test Runner:** Always use `uv run pytest`.
- **Node & Package Manager:** Frontend operations must target `shell/`: `pnpm --prefix shell <cmd>`.
- **Plugin UI compilation:** Modify plugin UI under `secretsauce/plugins/core/core-recipe-magic/ui/`, then compile via `pnpm --prefix shell build:plugins`.
- **Shell compilation:** When modifying `shell/src/`, compile via `pnpm --prefix shell build`.
- **Database Transactions:** Backend transactions must use `ctx.db` or `db.transaction()` re-entrantly.
- **Visual Aesthetic:** Strictly follow SecretSauce's PrimeVue design system, theme tokens (`var(--p-surface-*)`, `var(--p-primary-color)`), PrimeIcons, and SVG wand icon. No emojis in the UI.

## Review Focus

1. **AI Provider Availability:** When `core-ai-provider` is missing, unconfigured, or disabled, `POST /api/x/core-recipe-magic/adapt` returns a structured 503 error with code `"unavailable"`, and the UI displays a helpful alert with a link to AI settings instead of failing silently or crashing.
2. **Dual-Save Integrity:** "Apply to Editor" updates local Vue form refs without persisting to the database until the user explicitly saves, whereas "Save as New Recipe" persists immediately as a new recipe via `POST /api/recipes` with an adjusted title and navigates to it, leaving the original recipe completely untouched.
3. **Empty or Minimal Recipes:** Triggering the adaptation with an empty title or zero ingredients gracefully displays a client-side warning ("Add ingredients before adapting") rather than sending invalid payloads to the LLM.
4. **Action Prompt Customization Persistence:** Custom action additions, prompt edits, reordering, deletions, and "Reset to Defaults" persist correctly across server restarts and household reload.
5. **Schema Fidelity:** LLM structured responses match `RecipeAdaptationResponse` with numeric quantities, valid units, and instructions, avoiding hallucinated types or markdown formatting blocks.

---

### Task 1: Backend Plugin Core Scaffolding & Action Management API

**Files:**
- Create: `secretsauce/plugins/core/core-recipe-magic/__init__.py`
- Test: `tests/test_plugin_recipe_magic.py`

**Interfaces:**
- Consumes: `PluginContext` from `secretsauce.plugins.context`
- Produces:
  - `GET /api/x/core-recipe-magic/actions` -> `list[dict]`
  - `PUT /api/x/core-recipe-magic/actions` -> `list[dict]`
  - `POST /api/x/core-recipe-magic/actions/reset` -> `list[dict]`

- [ ] **Step 1: Write the failing tests for action management**

```python
# tests/test_plugin_recipe_magic.py
import pytest
from httpx import AsyncClient
from secretsauce.testing import make_kernel
from secretsauce.boot import build_app

@pytest.mark.asyncio
async def test_get_default_actions():
    kernel = await make_kernel(plugins=["core-ai-provider", "core-recipe-magic"])
    app = build_app(kernel)
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get("/api/x/core-recipe-magic/actions")
        assert resp.status_code == 200
        actions = resp.json()
        assert len(actions) >= 5
        ids = [a["id"] for a in actions]
        assert "vegetarian" in ids
        assert "ten-ingredients" in ids
        assert "fast" in ids
        assert "pantry-friendly" in ids
        assert "easy-prep" in ids

@pytest.mark.asyncio
async def test_update_and_reset_actions():
    kernel = await make_kernel(plugins=["core-ai-provider", "core-recipe-magic"])
    app = build_app(kernel)
    async with AsyncClient(app=app, base_url="http://test") as client:
        custom_actions = [
            {"id": "spicy", "title": "Make it spicy", "description": "Add heat", "prompt": "Make it hot"}
        ]
        put_resp = await client.put("/api/x/core-recipe-magic/actions", json=custom_actions)
        assert put_resp.status_code == 200
        assert put_resp.json() == custom_actions

        get_resp = await client.get("/api/x/core-recipe-magic/actions")
        assert get_resp.json() == custom_actions

        reset_resp = await client.post("/api/x/core-recipe-magic/actions/reset")
        assert reset_resp.status_code == 200
        assert len(reset_resp.json()) >= 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_recipe_magic.py -v`  
Expected: FAIL (module/route not found)

- [ ] **Step 3: Implement `core-recipe-magic` plugin scaffolding and action routes**

Implement `secretsauce/plugins/core/core-recipe-magic/__init__.py`:
- Define `PLUGIN` metadata (`id="core-recipe-magic"`, `requires=["core-ai-provider"]`, `ui="ui.js"`)
- Define `DEFAULT_ACTIONS` containing Ottolenghi *SIMPLE* actions.
- Store customized actions in household plugin settings (`ctx.db` or household config table).
- Register `APIRouter(prefix="/api/x/core-recipe-magic", tags=["core-recipe-magic"])`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_plugin_recipe_magic.py -v`  
Expected: PASS

- [ ] **Step 5: Commit changes**

Git commit: `git add secretsauce/plugins/core/core-recipe-magic tests/test_plugin_recipe_magic.py && git commit -m "feat(magic): add core-recipe-magic backend plugin with action management API"`

---

### Task 2: Backend AI Adaptation Endpoint (`POST /api/x/core-recipe-magic/adapt`)

**Files:**
- Modify: `secretsauce/plugins/core/core-recipe-magic/__init__.py`
- Test: `tests/test_plugin_recipe_magic.py`

**Interfaces:**
- Consumes: `ai_svc.complete(schema=..., prompt=..., call_type=...)` from `core-ai-provider`
- Produces: `POST /api/x/core-recipe-magic/adapt` returning `RecipeAdaptationResponse`

- [ ] **Step 1: Write failing tests for recipe adaptation**

```python
# In tests/test_plugin_recipe_magic.py
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_adapt_recipe_success():
    kernel = await make_kernel(plugins=["core-ai-provider", "core-recipe-magic"])
    ai_mock = AsyncMock()
    ai_mock.complete.return_value = {
        "title": "Vegetarian Shepherd's Pie",
        "description": "Lentil-based shepherd's pie",
        "servings": 4,
        "prep_time_minutes": 20,
        "cook_time_minutes": 40,
        "tags": ["vegetarian", "comfort-food"],
        "ingredients": [
            {"name": "brown lentils", "quantity": 250, "unit": "g", "notes": "rinsed"}
        ],
        "steps": [
            {"instruction": "Simmer lentils with aromatics.", "timer_minutes": 25}
        ],
        "adaptation_summary": "Replaced ground beef with brown lentils and mushrooms."
    }
    kernel.services.register("core-ai-provider", ai_mock)
    app = build_app(kernel)

    async with AsyncClient(app=app, base_url="http://test") as client:
        payload = {
            "action_id": "vegetarian",
            "recipe": {
                "title": "Classic Shepherd's Pie",
                "ingredients": [{"name": "ground beef", "quantity": 500, "unit": "g"}],
                "steps": [{"instruction": "Brown meat."}]
            }
        }
        resp = await client.post("/api/x/core-recipe-magic/adapt", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Vegetarian Shepherd's Pie"
        assert "adaptation_summary" in data
        assert len(data["ingredients"]) == 1

@pytest.mark.asyncio
async def test_adapt_recipe_ai_unavailable():
    kernel = await make_kernel(plugins=["core-ai-provider", "core-recipe-magic"])
    # No AI provider registered or available
    kernel.services._services.pop("core-ai-provider", None)
    app = build_app(kernel)

    async with AsyncClient(app=app, base_url="http://test") as client:
        payload = {
            "action_id": "vegetarian",
            "recipe": {"title": "Sample", "ingredients": [], "steps": []}
        }
        resp = await client.post("/api/x/core-recipe-magic/adapt", json=payload)
        assert resp.status_code == 503
        assert resp.json()["detail"]["code"] == "unavailable"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_recipe_magic.py::test_adapt_recipe_success -v`  
Expected: FAIL (404/not found)

- [ ] **Step 3: Implement `POST /api/x/core-recipe-magic/adapt` with Pydantic schema**

- Define `AdaptedIngredient`, `AdaptedStep`, and `RecipeAdaptationResponse`.
- Define `AdaptRecipeRequest(action_id: str, custom_prompt: str | None = None, recipe: dict)`.
- Lookup action prompt from configured actions or use `custom_prompt`.
- Check `ctx.services.get("core-ai-provider")`; if missing or inactive, raise HTTPException(503, detail={"code": "unavailable", "message": "AI Provider is not configured"}).
- Build structured prompt and call `ai_svc.complete(schema=RecipeAdaptationResponse, ...)`.
- Return validated output.

- [ ] **Step 4: Run backend tests to verify they pass**

Run: `uv run pytest tests/test_plugin_recipe_magic.py -v`  
Expected: PASS

- [ ] **Step 5: Commit changes**

Git commit: `git add secretsauce/plugins/core/core-recipe-magic tests/test_plugin_recipe_magic.py && git commit -m "feat(magic): implement AI recipe adaptation endpoint with structured schema"`

---

### Task 3: Recipe Edit Page Slot & "Make It Magic" Toolbar Trigger

**Files:**
- Modify: `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue`
- Test: `shell/tests/plugins/recipe-edit-magic-trigger.spec.ts`

**Interfaces:**
- Consumes: Recipe edit form state (`title`, `servings`, `prepTime`, `cookTime`, `tags`, `ingredients`, `steps`, `targetId`)
- Produces: Slot contribution point `<Slot name="recipe.edit.actions" :context="{ ... }" />` and direct toolbar integration

- [ ] **Step 1: Write the failing unit test for `RecipeEditPage` slot/trigger**

```typescript
// shell/tests/plugins/recipe-edit-magic-trigger.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeEditPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue'

describe('RecipeEditPage Magic Wand Trigger', () => {
  it('renders slot recipe.edit.actions with form context', async () => {
    // verify slot or wand button renders when mounted with harness
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/recipe-edit-magic-trigger.spec.ts`  
Expected: FAIL

- [ ] **Step 3: Add `<Slot name="recipe.edit.actions">` and wand button hook in `RecipeEditPage.vue`**

- In `secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue`:
  - Add `<Slot name="recipe.edit.actions" :context="{ targetId, title, description, servings, prepTime, cookTime, tags, ingredients, steps, applyAdaptation: onApplyAdaptation }" />` in the top action bar.
  - Implement `onApplyAdaptation(adapted: any)` to update the form refs with the adapted values.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --prefix shell test shell/tests/plugins/recipe-edit-magic-trigger.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit changes**

Git commit: `git add secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue shell/tests/plugins/recipe-edit-magic-trigger.spec.ts && git commit -m "feat(recipes): add recipe.edit.actions slot to RecipeEditPage"`

---

### Task 4: Frontend Plugin UI: Transformation Modal (`MagicWandDialog.vue`)

**Files:**
- Create: `secretsauce/plugins/core/core-recipe-magic/ui/package.json`
- Create: `secretsauce/plugins/core/core-recipe-magic/ui/src/index.ts`
- Create: `secretsauce/plugins/core/core-recipe-magic/ui/src/MagicWandButton.vue`
- Create: `secretsauce/plugins/core/core-recipe-magic/ui/src/MagicWandDialog.vue`
- Create: `secretsauce/plugins/core/core-recipe-magic/ui/src/diff.ts`
- Test: `shell/tests/plugins/core-recipe-magic.spec.ts`

**Interfaces:**
- Consumes: `useSecretSauce()`, `/api/x/core-recipe-magic/actions`, `/api/x/core-recipe-magic/adapt`, `/api/recipes`
- Produces:
  - Plugin registration contributing `MagicWandButton` into `recipe.edit.actions` slot.
  - In-place diff review and dual-save ("Apply to Editor" vs "Save as New Recipe").

- [ ] **Step 1: Write failing component tests for `MagicWandDialog.vue`**

```typescript
// shell/tests/plugins/core-recipe-magic.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MagicWandDialog from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/MagicWandDialog.vue'

describe('MagicWandDialog', () => {
  it('renders available action buttons and runs adapt on click', async () => {
    // mock ss.api.get('/api/x/core-recipe-magic/actions')
    // mock ss.api.post('/api/x/core-recipe-magic/adapt')
    // click action -> shows diff -> click Apply to Editor
  })

  it('saves as new recipe when Save as New Recipe is clicked', async () => {
    // mock ss.api.post('/api/recipes')
    // click Save as New Recipe -> calls POST /api/recipes -> notifies & navigates
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-magic.spec.ts`  
Expected: FAIL

- [ ] **Step 3: Implement `diff.ts`, `MagicWandDialog.vue`, and `MagicWandButton.vue`**

- `diff.ts`: Helper to compare original and adapted ingredient lists and step instructions, identifying added, removed, and modified items.
- `MagicWandButton.vue`: Button with SVG magic wand icon, opens `MagicWandDialog`.
- `MagicWandDialog.vue`:
  - PrimeVue `<Dialog>` with action buttons.
  - Loading state (`ProgressSpinner` + message).
  - AI adaptation explanation callout.
  - Diff view with highlighted items.
  - In-place edit inputs for ingredients, steps, and timings.
  - "Apply to Editor" button (calls `props.context.applyAdaptation(adaptedRecipe)` and closes dialog).
  - "Save as New Recipe" button (posts to `/api/recipes`, notifies success, navigates to `/recipes/${newId}`).
  - "Cancel" button (closes dialog).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-magic.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit changes**

Git commit: `git add secretsauce/plugins/core/core-recipe-magic/ui shell/tests/plugins/core-recipe-magic.spec.ts && git commit -m "feat(magic): implement MagicWandDialog with diff review and dual-save"`

---

### Task 5: Frontend Settings Section (`MagicSettings.vue`)

**Files:**
- Create: `secretsauce/plugins/core/core-recipe-magic/ui/src/MagicSettings.vue`
- Modify: `secretsauce/plugins/core/core-recipe-magic/ui/src/index.ts`
- Test: `shell/tests/plugins/core-recipe-magic-settings.spec.ts`

**Interfaces:**
- Consumes: `/api/x/core-recipe-magic/actions`, `/api/x/core-recipe-magic/actions/reset`
- Produces: `ss.settings.section({ id: 'core-recipe-magic', title: 'Recipe Magic', component: MagicSettings })`

- [ ] **Step 1: Write failing tests for `MagicSettings.vue`**

```typescript
// shell/tests/plugins/core-recipe-magic-settings.spec.ts
import { describe, it, expect, vi } from 'vitest'
import MagicSettings from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/MagicSettings.vue'

describe('MagicSettings', () => {
  it('loads actions and allows editing prompts', async () => {
    // test reorder, edit, delete, add custom action, and reset
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-magic-settings.spec.ts`  
Expected: FAIL

- [ ] **Step 3: Implement `MagicSettings.vue`**

- Form list displaying all actions.
- Reorder buttons (`pi pi-arrow-up`, `pi pi-arrow-down`).
- Inline editing of action title, description, and detailed LLM prompt instructions.
- Delete action button (`pi pi-trash`).
- Add action modal/dialog (`pi pi-plus`).
- "Reset to Ottolenghi SIMPLE Defaults" button (`pi pi-refresh`) with confirmation dialog.
- Persist updates to `PUT /api/x/core-recipe-magic/actions`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-magic-settings.spec.ts`  
Expected: PASS

- [ ] **Step 5: Commit changes**

Git commit: `git add secretsauce/plugins/core/core-recipe-magic/ui/src/MagicSettings.vue shell/tests/plugins/core-recipe-magic-settings.spec.ts && git commit -m "feat(magic): add MagicSettings prompt management interface"`

---

### Task 6: Plugin Build, Verification & End-to-End Test

**Files:**
- Create: `shell/e2e/recipe-magic.spec.ts`
- Test: Vitest, Pytest, Playwright suites

**Interfaces:**
- Runs full production bundle build (`build:plugins` and `build`)
- Executes complete E2E workflow in browser

- [ ] **Step 1: Compile plugin UI bundle and verify dist output**

Run: `pnpm --prefix shell build:plugins`  
Expected: Produces `secretsauce/plugins/core/core-recipe-magic/ui/dist/ui.js` and `secretsauce/plugins/core/core-recipe-magic/ui.js` without errors.

- [ ] **Step 2: Compile shell bundle**

Run: `pnpm --prefix shell build`  
Expected: Produces `secretsauce/static/` assets without errors.

- [ ] **Step 3: Write Playwright E2E test**

```typescript
// shell/e2e/recipe-magic.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Recipe Magic Transformation Flow', () => {
  test('adapts recipe in edit mode and applies to editor', async ({ page }) => {
    // Navigate to recipe edit page
    // Click "Make it Magic" button
    // Select "Make it vegetarian"
    // Verify diff modal shows adapted ingredients
    // Click "Apply to Editor"
    // Verify form fields update with new vegetarian ingredients
    // Save recipe
  })

  test('adapts recipe and saves directly as a new recipe', async ({ page }) => {
    // Click "Make it Magic" -> Select "10 ingredients or less"
    // Click "Save as New Recipe"
    // Verify redirection to new recipe detail view with forked title
  })
})
```

- [ ] **Step 4: Run complete backend and frontend test suites**

Run:
1. `uv run pytest`
2. `pnpm --prefix shell test`
3. `pnpm --prefix shell test:e2e`

Expected: ALL tests pass.

- [ ] **Step 5: Commit changes**

Git commit: `git add shell/e2e/recipe-magic.spec.ts && git commit -m "test(magic): add end-to-end Playwright tests for recipe magic transformation"`

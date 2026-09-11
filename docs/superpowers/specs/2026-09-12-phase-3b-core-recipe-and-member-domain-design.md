# Phase 3B: Core Recipe & Member Domain (`core-members`, `core-recipes`, `shortlist`)

**Status:** Approved  
**Date:** 2026-09-12  
**Architecture Spec Reference:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md` (Sections 3.1, 4.3, 4.4, 6.7, 7.1, 7.3, 7.4, 7.5, 7.6, 8.8, 10, 13)

---

## 1. Overview & Goals

Phase 3B implements the foundational user-facing product domain of SecretSauce: browsing, creating, editing, and managing recipes with household member awareness and favorites.

The primary objectives are:
1. **Decouple AppHeader**: Remove the temporary hardcoded `<select class="member-select">` from `shell/src/components/AppHeader.vue`, allowing `shell.header.right` to host member switching cleanly via the slot API.
2. **`core-members` Plugin**:
   - Deliver the header member picker via slot `shell.header.right`.
   - Deliver full household member management (add, edit profile/dietary restrictions, delete) in Settings via `ss.settings.section`.
   - Synchronize the active member with `ss.store.currentMember`, `localStorage`, and the outgoing `x-actor-member` HTTP header for author provenance.
3. **`core-recipes` Plugin**:
   - Register top-level navigation `{ label: "Recipes", icon: "book", order: 10 }` and routes: `/recipes`, `/recipes/new`, `/recipes/:id`, and `/recipes/:id/edit`.
   - Deliver `/recipes` with trigram FTS search (`q`), tag filtering, sort options, and a dedicated `recipe:create` intent area.
   - Deliver `/recipes/:id` with multi-language tabs (`<group_id>_<language>`), "+ Add Translation", interactive serving scaling using `@secretsauce/units`, ingredient prep checklist, step-by-step instructions with timer chips, `recipe:actions` hub, and slots `recipe.detail.sidebar` and `recipe.detail.footer`.
   - Deliver structured ingredient row authoring (quantity, unit selector, ingredient name, notes) and step instruction authoring in `/recipes/new` and `/recipes/:id/edit`.
   - Declare hubs `recipe:create` (provider `manual`, order 100) and `recipe:actions` (providers `edit` order 10, `delete` order 999).
   - Declare slots `recipe.list.filters`, `recipe.card.actions`, `recipe.detail.sidebar`, and `recipe.detail.footer`.
4. **`shortlist` Plugin**:
   - Prove plugin-owned tables with `plugin_shortlist_entries` and foreign key cascading against `recipes(id)`.
   - Provide REST endpoints at `/api/x/shortlist` for member-specific favorite toggling.
   - Deliver `recipe.card.actions` slot contribution (star/favorite toggle button) and `recipe.list.filters` slot contribution ("★ Shortlist" filter chip).

---

## 2. Directory Layout

```text
secretsauce/plugins/core/
├── core-members/
│   ├── __init__.py                # PLUGIN manifest & setup()
│   ├── ui/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts           # Activates slot "shell.header.right" & settings section
│   │   │   ├── MemberPicker.vue   # Header member selector & active store sync
│   │   │   └── MemberSettings.vue # Add / edit / delete members in Settings
│   │   └── dist/ -> ui.js
│   └── ui.js
├── core-recipes/
│   ├── __init__.py                # PLUGIN manifest & setup()
│   ├── ui/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts           # Registers routes, nav, hubs, and slots
│   │   │   ├── pages/
│   │   │   │   ├── RecipeListPage.vue    # /recipes: search, tag chips, slot filters, intent area, card grid
│   │   │   │   ├── RecipeDetailPage.vue  # /recipes/:id: language tabs, scaler, steps, timers
│   │   │   │   └── RecipeEditPage.vue    # /recipes/new & /recipes/:id/edit: structured row editor
│   │   │   └── components/
│   │   │       ├── RecipeCard.vue        # Card with cover image, times, tags, card.actions slot
│   │   │       ├── IngredientRowList.vue # Structured rows: quantity, unit, name, notes
│   │   │       └── StepList.vue          # Instructions & timer builder
│   │   └── dist/ -> ui.js
│   └── ui.js
└── shortlist/
    ├── __init__.py                # PLUGIN manifest, setup(), and router at /api/x/shortlist
    ├── migrations/
    │   └── 0001_initial.sql       # plugin_shortlist_entries table
    ├── ui/
    │   ├── package.json
    │   ├── src/
    │   │   ├── index.ts           # Registers slot providers: recipe.card.actions & recipe.list.filters
    │   │   ├── ShortlistAction.vue# Favorite toggle star/heart on recipe cards
    │   │   └── ShortlistFilter.vue# "★ Shortlist" toggle chip in recipe list filter bar
    │   └── dist/ -> ui.js
    └── ui.js
```

---

## 3. Shell Header Decoupling

In `shell/src/components/AppHeader.vue`:
- Remove the temporary hardcoded `<select class="member-select">` and associated local handler.
- Keep `<Slot name="shell.header.right" />`.
- When `core-members` is active, it injects `MemberPicker.vue` into this slot.
- If `core-members` is deactivated, the header gracefully displays an empty right slot, adhering to Principle P3.

---

## 4. `core-members` Plugin Specification

### 4.1 Backend Manifest & Lifecycle
- **File**: `secretsauce/plugins/core/core-members/__init__.py`
- **Manifest**:
  ```python
  PLUGIN = {
      "id": "core-members",
      "name": "Household Members",
      "version": "1.0.0",
      "description": "Household member switching, active context, and profile management",
      "core": True,
      "ui": "ui.js",
  }

  async def setup(ctx):
      pass
  ```
- Relies directly on existing kernel routes `/api/members` and `MembersRepo`.

### 4.2 Frontend Bundle (`ui/src/index.ts`)
- **Registrations**:
  - `ss.slot('shell.header.right', MemberPicker, { order: 10 })`
  - `ss.settings.section({ id: 'members', title: 'Household Members', component: MemberSettings })`

### 4.3 `MemberPicker.vue`
- Observes `ss.store.currentMember` and queries `GET /api/members` on mount.
- Renders an interactive avatar button with initials and `m.avatar_color`.
- Clicking opens a popover listing household members.
- Selecting a member updates:
  1. `memberStore.setCurrentMember(m.id)`
  2. `localStorage.setItem('secretsauce:current_member_id', m.id)`
  3. The shell API client header `x-actor-member: <m.id>` so all subsequent mutations record proper author provenance.

### 4.4 `MemberSettings.vue`
- Lists all members with avatar badge, name, preferred language, serving ratio, and dietary chips.
- **Add Member**: Dialog prompting for Name, Avatar Color (palette), Preferred Language, Serving Ratio (default 1.0), Dietary Restrictions (vegetarian, vegan, gluten-free, dairy-free), and Allergies. Calls `POST /api/members`.
- **Edit Member**: In-place edit or modal updating member properties via `PATCH /api/members/{id}` passing current `revision`.
- **Delete Member**: Confirmation dialog calling `DELETE /api/members/{id}?revision=...`.
- Automatically refreshes members store upon save.

---

## 5. `core-recipes` Plugin Specification

### 5.1 Backend Manifest & Lifecycle
- **File**: `secretsauce/plugins/core/core-recipes/__init__.py`
- **Manifest**:
  ```python
  PLUGIN = {
      "id": "core-recipes",
      "name": "Recipes",
      "version": "1.0.0",
      "description": "Core recipe browsing, structured editing, and multi-language translations",
      "core": True,
      "ui": "ui.js",
  }

  async def setup(ctx):
      pass
  ```
- Leverages existing kernel routes `/api/recipes` and `RecipesRepo`.

### 5.2 Frontend Extension Registrations (`ui/src/index.ts`)
- **Navigation & Routes**:
  - `ss.route({ path: "/recipes", component: RecipeListPage, nav: { label: "Recipes", icon: "book", order: 10 } })`
  - `ss.route({ path: "/recipes/new", component: RecipeEditPage })`
  - `ss.route({ path: "/recipes/:id", component: RecipeDetailPage })`
  - `ss.route({ path: "/recipes/:id/edit", component: RecipeEditPage })`
- **Hubs**:
  - `recipe:create`: Declares provider `manual` (`order: 100`, headless navigation to `/recipes/new`).
  - `recipe:actions`: Declares provider `edit` (`order: 10`, navigates to `/recipes/:id/edit`) and provider `delete` (`order: 999`, prompts delete confirmation: offers deletion of current language row via `DELETE /api/recipes/{id}` or, if multiple language translations exist, deleting the whole recipe group via `DELETE /api/recipes/groups/{group_id}`).
- **Slots**:
  - Declares `recipe.list.filters`, `recipe.card.actions`, `recipe.detail.sidebar`, and `recipe.detail.footer`.

### 5.3 `RecipeListPage.vue` (`/recipes`)
- **Search & Intent Area**:
  - Top action bar featuring a search input with live debounce calling `GET /api/recipes?q=...`.
  - Prominent intent area: `<IntentTrigger hub="recipe:create" label="+ Add / Import Recipe" />`.
- **Filters & Sorting**:
  - `<Slot name="recipe.list.filters" />` for plugin-contributed filters (such as `shortlist`).
  - Tag filter chips populated dynamically from active recipe tags.
  - Sort dropdown: Title (A-Z), Prep Time, Cook Time, Newest.
- **Card Grid**: Responsive grid of `RecipeCard.vue` components.
- **Empty State Banner**: When no recipes are found, renders an inviting card featuring the `recipe:create` intent trigger.

### 5.4 `RecipeCard.vue`
- Shows cover thumbnail image (`/api/assets/{cover_asset_id}/file` or fallback placeholder).
- Shows title, prep time badge, cook time badge, and tags.
- Extensibility point: `<Slot name="recipe.card.actions" :context="{ recipe }" />`.
- Clicking card navigates to `/recipes/:id`.

### 5.5 `RecipeDetailPage.vue` (`/recipes/:id`)
- **Language Row Switcher**:
  - Displays tabs for all languages this recipe group exists in (`recipe.languages`, e.g. `[EN] [DE]`). Clicking a language switches route to `/recipes/<group_id>_<lang>`.
  - "+ Add Translation": Button navigating to `/recipes/new?group_id=<group_id>&copy_from=<id>` allowing easy translation into another household language.
- **Interactive Servings Scaler**:
  - Displays recipe's base servings with interactive `−` and `+` adjustment buttons.
  - Computes scale multiplier: `scale = currentServings / baseServings`.
  - Dynamically calculates scaled quantities for each ingredient and formats output via `@secretsauce/units`.
- **Ingredient Checklist**: Interactive checklist allowing cooks to tick off ingredients as they prepare.
- **Step-by-Step Instructions**: Numbered steps with timer buttons for steps specifying `timer_minutes`.
- **Actions Trigger**: `<IntentTrigger hub="recipe:actions" :context="{ recipe }" label="Actions" />`.
- **Slots**: `<Slot name="recipe.detail.sidebar" :context="{ recipe }" />` and `<Slot name="recipe.detail.footer" :context="{ recipe }" />`.

### 5.6 `RecipeEditPage.vue` (`/recipes/new` & `/recipes/:id/edit`)
- **Basic Fields**: Title, Description, Language (`en`, `de`), Prep Time (min), Cook Time (min), Base Servings (number), Tags, and Source (URL or book).
- **Cover Image Upload**: File picker uploading to `POST /api/assets` (`entity_type: "recipe"`).
- **Structured Ingredient Rows (`IngredientRowList.vue`)**:
  - Form row repeater with inputs: `Quantity` (number), `Unit` (dropdown of units from `units.json`), `Ingredient Name` (text), and `Notes` (text).
  - Add Row, Delete Row, and Move Up / Move Down buttons.
- **Step Instructions Builder (`StepList.vue`)**:
  - Numbered rows with Instruction text area and optional Timer (minutes) input.
  - Add Step, Delete Step, and Reorder buttons.
- **Save Handler**:
  - Calls `POST /api/recipes` on create or `PATCH /api/recipes/{id}` with `revision` on edit.
  - Prompts reload on 409 conflict.
  - Automatically triggers pre-commit normalization hooks registered by `units`.

---

## 6. `shortlist` Plugin Specification

### 6.1 Backend Manifest & Lifecycle
- **File**: `secretsauce/plugins/core/shortlist/__init__.py`
- **Manifest**:
  ```python
  PLUGIN = {
      "id": "shortlist",
      "name": "Recipe Shortlist",
      "version": "1.0.0",
      "description": "Quick favorites and shortlisted meals per household member",
      "core": True,
      "schema": 1,
      "dependencies": ["core-recipes", "core-members"],
      "ui": "ui.js",
  }
  ```

### 6.2 SQLite Migration (`migrations/0001_initial.sql`)
```sql
CREATE TABLE plugin_shortlist_entries (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    note TEXT,
    created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_plugin_shortlist_member_recipe ON plugin_shortlist_entries(member_id, recipe_id);
```

### 6.3 REST Router (`/api/x/shortlist`)
- `GET /api/x/shortlist`: Returns shortlist entries for `member_id` query param or active member in `x-actor-member` header.
- `POST /api/x/shortlist`: Body `{"recipe_id": string, "note": string | null}`. Inserts shortlist entry for active member.
- `DELETE /api/x/shortlist/{recipe_id}`: Removes recipe from active member's shortlist.

### 6.4 Frontend Slot Contributions (`ui/src/index.ts`)
- **Registrations**:
  - `ss.slot('recipe.card.actions', ShortlistAction, { order: 10 })`
  - `ss.slot('recipe.list.filters', ShortlistFilter, { order: 10 })`
  - `ss.slot('timeline.sidebar', ShortlistSidebar, { order: 20 })`
- **`ShortlistAction.vue` (`recipe.card.actions`)**:
  - Receives `context: { recipe: Recipe }`.
  - Renders star/heart icon button. Shows highlighted state when recipe is favorited by active member.
  - Tapping toggles state optimistically and calls `/api/x/shortlist`.
- **`ShortlistFilter.vue` (`recipe.list.filters`)**:
  - Renders toggle button/chip "★ Shortlist".
  - Toggling filters the recipe list to only display recipes present in the active member's shortlist.

---

## 7. Build Pipeline & Serving Integration

- Running `pnpm --prefix shell build:plugins` executes `shell/scripts/build-plugins.ts`, scanning `secretsauce/plugins/core/` and compiling each plugin's `ui/src/index.ts` into `ui.js`.
- The kernel serves each bundle at `GET /api/plugins/{id}/ui.js` with `Content-Type: application/javascript` and `Cache-Control: public, max-age=31536000, immutable`.
- Core plugins are bundled into the root distribution and discovered automatically on kernel boot.

---

## 8. Testing & Verification Strategy

1. **Backend Tests (`pytest`)**:
   - `tests/test_plugin_shortlist.py`: Validates schema migration, CRUD endpoints, foreign-key cascading on recipe deletion, and member isolation.
   - `tests/test_plugin_recipes_members.py`: Validates discovery and activation of `core-members`, `core-recipes`, and `shortlist` via `make_kernel(plugins=[...])`. Validates `units` plugin hook normalization on recipe create/update, and verifies UI bundle serving endpoints.
2. **Frontend Tests (`vitest`)**:
   - `MemberPicker.spec.ts`: Tests member avatar rendering, dropdown selection, `memberStore` update, and `localStorage` persistence.
   - `RecipeCard.spec.ts`: Tests card rendering and `recipe.card.actions` slot context passing.
   - `RecipeScaler.spec.ts`: Tests serving scaler multiplication and vulgar fraction formatting.
   - `IngredientRowList.spec.ts`: Tests adding, editing, deleting, and reordering structured ingredient rows.
   - `ShortlistAction.spec.ts`: Tests favorite toggle state and API mutation.
3. **End-to-End Build**:
   - All 92 existing Pytest tests and 35 existing Vitest tests must pass.
   - All new backend and frontend tests must pass cleanly.

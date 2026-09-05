# SecretSauce Architecture Design: Core + Plugins

**Date:** 2026-09-05  
**Status:** Approved  
**Target:** Transform `tmp` into a malleable, extensible core + plugin architecture  

---

## 1. Executive Summary & Vision

SecretSauce is transitioning from an opinionated, monolithic multi-tenant SaaS application into a **malleable, extensible personal/family meal planning platform** inspired by the architecture of the `pi` coding agent, Obsidian, and Home Assistant.

Instead of a centralized database storing all users' data together, SecretSauce is structured as **independent, isolated single-tenant instances** (one per family/household), each running in its own lightweight Podman sandbox with its own SQLite database. Each instance shares a solid, unopinionated backbone (the Kernel) while supporting independent, modular plugin configurations.

Instances can be:
1. **Self-hosted** with a single `podman run` command.
2. **Centrally provisioned** as a managed service on `secretsauce.food/<family>` for a nominal fee using a decoupled orchestrator.

---

## 2. Core Architectural Principles

The boundary between the kernel and plugins is strictly defined by three core principles:

1. **Truth is what a human authored; everything else is a projection.**  
   Only explicit human choices (recipes created/edited, planned dates, confirmed cooked/skipped meals, household preferences, manual checkmarks) represent canonical truth. AI suggestions, consolidated grocery lists, nutrition summaries, and carryover queues are **derived read models** (projections) that can be regenerated or wiped at any time without data loss.

2. **The kernel owns nouns; plugins own verbs.**  
   The kernel provides stable SQLite storage, entity schemas, validation, transactions, authentication, and lifecycle events for the core nouns (`Recipe`, `ScheduleEntry`, `CookJournal`, `HouseholdMember`, `Asset`).  
   Plugins own the actions and business logic: importing via AI scrapers, generating weekly suggestions, compiling shopping lists, tracking carryovers, or syncing to external calendars.

3. **Intent-Driven Action Hubs: The Core owns the intent and entrypoint; plugins contribute as providers.**  
   To prevent UI clutter (e.g. 5 competing import buttons on the recipes page), the core user interface provides unified **Intent Hubs** (e.g., `+ Add Recipe`, `••• Actions`, `Plan Week`). When triggered, the hub opens an action sheet or modal presenting the registered **Intent Providers**.  
   Furthermore, **Intent Hubs are first-class and extensible**: both the core and plugins can declare new hubs, allowing plugins to extend core workflows and extend one another.

---

## 3. Kernel Nouns & SQLite Data Model

### 3.1 Persistence & Concurrency
- **Engine:** SQLite 3 stored at `/data/secretsauce.db`.
- **Mode:** Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for concurrent read performance during background writes.
- **Foreign Keys:** Enforced (`PRAGMA foreign_keys = ON;`).
- **Full-Text Search:** Native SQLite **FTS5** table (`recipes_fts`) maintained via triggers for instant search across title, description, and ingredients without external dependencies.
- **Simplicity:** Recipe versioning is dropped in favor of a single mutable `recipes` record.

### 3.2 Canonical Noun Schemas

#### `recipes` (Single mutable record)
```sql
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,                       -- UUID v4
    title TEXT NOT NULL,
    description TEXT,
    ingredients JSON NOT NULL DEFAULT '[]',    -- [{"name": "Garlic", "quantity": 2, "unit": "cloves", "notes": "minced"}]
    steps JSON NOT NULL DEFAULT '[]',          -- [{"order": 1, "instruction": "Dice garlic."}]
    servings INTEGER NOT NULL DEFAULT 2,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    tags JSON NOT NULL DEFAULT '[]',           -- ["dinner", "italian", "quick"]
    source JSON,                               -- {"type": "url", "url": "..."} or {"type": "book", "title": "..."}
    image_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,                  -- ISO-8601 UTC
    updated_at TEXT NOT NULL
);
```
An FTS5 virtual table `recipes_fts` is automatically synced via `AFTER INSERT`, `AFTER UPDATE`, and `AFTER DELETE` triggers on `recipes`.

#### `schedule_entries` (Planned Meals Timeline)
```sql
CREATE TABLE schedule_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                        -- YYYY-MM-DD
    meal_type TEXT NOT NULL,                   -- 'breakfast', 'lunch', 'dinner', 'snack'
    entry_type TEXT NOT NULL DEFAULT 'recipe', -- 'recipe', 'note', 'leftover'
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    title TEXT,                                -- Custom title if entry_type != 'recipe'
    note TEXT,
    servings INTEGER NOT NULL DEFAULT 2,
    position INTEGER NOT NULL DEFAULT 0,       -- Multi-dish ordering within slot
    assigned_member_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_schedule_date ON schedule_entries(date);
```

#### `cook_journal` (Historical Log of What Happened)
```sql
CREATE TABLE cook_journal (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                        -- YYYY-MM-DD
    meal_type TEXT NOT NULL,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    title TEXT,
    status TEXT NOT NULL,                      -- 'cooked', 'skipped', 'leftover', 'dined_out'
    servings_actual INTEGER DEFAULT 2,
    cooked_by_member_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    notes TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    schedule_entry_id TEXT REFERENCES schedule_entries(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_journal_date ON cook_journal(date);
```

#### `household_members` (Local Household Identity)
```sql
CREATE TABLE household_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                        -- e.g. "Max", "Sarah"
    role TEXT NOT NULL DEFAULT 'member',       -- 'admin', 'member'
    avatar_color TEXT,
    dietary_restrictions JSON DEFAULT '[]',    -- ["vegetarian", "low-carb"]
    allergies JSON DEFAULT '[]',
    disliked_ingredients JSON DEFAULT '[]',
    default_servings INTEGER DEFAULT 2,
    created_at TEXT NOT NULL
);
```

#### `assets` (Media & Attachments)
```sql
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,                -- e.g. "uploads/2026/09/abc.webp"
    created_at TEXT NOT NULL
);
```

### 3.3 Kernel Extensibility Tables

#### `projections` (Generic Document Projection Store for Plugins)
```sql
CREATE TABLE projections (
    plugin_id TEXT NOT NULL,
    projection_key TEXT NOT NULL,              -- e.g. 'shopping_list:current', 'suggestions:active'
    data JSON NOT NULL,                        -- Arbitrary document state
    computed_at TEXT NOT NULL,
    expires_at TEXT,                           -- Optional TTL
    PRIMARY KEY (plugin_id, projection_key)
);
```

#### `plugin_states` (Plugin Registration & Configurations)
```sql
CREATE TABLE plugin_states (
    plugin_id TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    config JSON NOT NULL DEFAULT '{}',
    installed_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 3.4 Household Authentication
- **Access Control:** A master household passphrase set during initial setup, hashed with Argon2id and stored in a single-row `household_config` table.
- **Session:** Signed HTTP-only session cookie. The cookie's `Path` parameter is explicitly configured to match the application's `BASE_PATH` (e.g. `Path=/` or `Path=/alletsee/`) to prevent cookie leakage or session collisions in subfolder deployments.
- **Attribution:** Users select their active `household_member` profile in the frontend for attribution ("Cooked by Max", personalized dietary preferences for meal planning).

---

## 4. Kernel Plugin SDK & In-Process Event Bus

### 4.1 Plugin Directory Structure
Plugins can be built-in (`secretsauce/builtin_plugins/`) or user-installed in `/data/plugins/<plugin-id>/`.

```
my-plugin/
├── plugin.json          # Manifest metadata & config schema
├── plugin.py            # Python entrypoint subclassing BasePlugin
├── requirements.txt     # Optional python package dependencies
└── ui/
    └── dist/
        └── index.js     # Compiled ES module bundle for frontend UI
```

### 4.2 The Plugin Manifest (`plugin.json`)
```json
{
  "id": "recipe-importer",
  "name": "AI Recipe Importer",
  "version": "1.0.0",
  "description": "Extract recipes from web URLs and photos",
  "entrypoint": "plugin:RecipeImporterPlugin",
  "ui_entrypoint": "ui/dist/index.js",
  "config_schema": {
    "type": "object",
    "properties": {
      "ai_provider": { "type": "string", "enum": ["gemini", "ollama"], "default": "gemini" },
      "api_key": { "type": "string", "format": "password" }
    }
  }
}
```

### 4.3 The In-Process Event Bus
When a kernel noun is mutated, the transaction commits and an event is published to an asynchronous, in-memory event bus:

| Event | Emitted When | Payload |
|---|---|---|
| `recipe:created` | New recipe saved | Full recipe summary |
| `recipe:updated` | Recipe edited | Updated recipe summary & changed fields |
| `recipe:deleted` | Recipe removed | `{ "recipe_id": "..." }` |
| `schedule:entry_added` | Dish scheduled on timeline | Date, meal type, recipe_id, entry |
| `schedule:entry_updated` | Scheduled dish modified/moved | Date, meal type, updated entry |
| `schedule:entry_deleted` | Scheduled dish removed | Entry ID, date, meal type |
| `journal:meal_cooked` | Meal confirmed cooked | Date, recipe_id, status, ratings |
| `journal:meal_skipped` | Meal skipped / carryover | Date, recipe_id, status |
| `member:updated` | Member preferences changed | Member ID, updated dietary lists |

**Resilience Guarantee:** Event handlers execute as asynchronous tasks. If a plugin's listener raises an exception, the error is logged; it never rolls back the kernel transaction or affects other listeners.

### 4.4 The Python Plugin SDK (`PluginContext`)

```python
class BasePlugin:
    async def setup(self, ctx: "PluginContext") -> None:
        """Called on plugin activation."""
        pass

    async def teardown(self) -> None:
        """Called on shutdown or plugin disable."""
        pass
```

`ctx: PluginContext` provides:
- `ctx.events.on(event_name: str, handler: Callable)`: Subscribe to kernel events.
- `ctx.routes.mount_router(router: APIRouter)`: Expose REST endpoints under `/api/plugins/{plugin_id}/*`.
- `ctx.projections.set(key: str, data: dict, ttl: int | None = None)`: Persist derived projection state.
- `ctx.projections.get(key: str) -> dict | None`: Retrieve cached projection state.
- `ctx.kernel.recipes.get(id)` / `ctx.kernel.recipes.create(data)`: Read or write kernel nouns via validated service interfaces.
- `ctx.tasks.spawn(coro, name: str)`: Spawn managed background tasks with cancellation on teardown.
- `ctx.config`: Typed read access to the plugin's configuration.
- `ctx.logger`: Scoped logging (`secretsauce.plugin.{plugin_id}`).

---

## 5. Frontend Extension Architecture & Intent Hubs

### 5.1 Dynamic ESM Loading
The Vue 3 frontend shell is compiled as a static SPA. At runtime, the browser queries `GET {basePath}/api/plugins` for all enabled plugins with a UI entry point.

The frontend dynamically imports each plugin's bundle:
```ts
const module = await import(`${basePath}/api/plugins/${plugin.id}/ui.js`);
if (typeof module.activate === 'function') {
  module.activate(createExtensionContext(plugin.id));
}
```

External dependencies like `vue`, `pinia`, and `vue-router` are shared via browser import maps / `window.Vue` so plugin bundles remain tiny (<50KB).

### 5.2 First-Class Dynamic Intent Hubs & Providers
Rather than scattering buttons in arbitrary slots, the UI is organized around **Intents**:

```ts
export interface IntentHub {
  id: string;                      // e.g. 'recipe:create', 'pantry:add_item'
  title: string;                   // Display title for action modal
  description?: string;
  defaultProviderId?: string;
}

export interface IntentProvider {
  intent: string;                  // Target hub ID
  id: string;                      // Unique provider ID
  title: string;                   // Button / option label
  description?: string;            // Helpful subtitle
  icon?: string;                   // Icon identifier
  order?: number;                  // Sorting priority
  component?: Component;           // Modal / sheet content component
  execute?: (context: any) => Promise<void> | void; // Or direct action
}
```

#### Core Intent Hubs:
- `recipe:create` — Entrypoint: `+ Add Recipe` on Recipes page.
- `recipe:actions` — Entrypoint: `•••` Menu on Recipe detail.
- `timeline:assist` — Entrypoint: `🪄 Plan Week` on Timeline header.
- `entry:interact` — Entrypoint: Clicking a scheduled meal.
- `shopping:export` — Entrypoint: `Share` button on Shopping List.

#### Extensibility:
Any plugin can call `ctx.registerIntentHub(...)` to introduce a new workflow hub, render it via `<IntentHubTrigger intent="..." />`, and allow other plugins to register providers into it.

### 5.3 Named Slots & Navigation
For non-intent UI extension:
- `ctx.registerRoute(route: RouteRecordRaw)`: Adds full-page views (e.g. `/shopping-lists`).
- `ctx.registerNavItem(item: NavItem)`: Adds navigation icons to the primary sidebar/bottom bar.
- `ctx.registerSlot(slotName: string, component: Component)`: For embedded panels (e.g. `recipe-detail-bottom` for nutrition facts).
- `ctx.registerSettingsPanel(panel: SettingsPanel)`: Injects configuration UI into the Plugin Manager.

---

## 6. Migration & Decomposition of Existing Code (`tmp`)

| Existing `tmp` Component | New Architectural Location | Migration Strategy |
|---|---|---|
| `backend/app/models/recipe.py` | **Kernel Model** (`models/recipe.py`) | Drop `RecipeVersion` and circular foreign key. Store title, ingredients, steps, tags directly on `recipes`. Add FTS5 triggers. |
| `backend/app/models/meal_plan.py` | **Kernel Model** (`models/schedule.py`) | Retain `schedule_entries`. Replace `RecipeCookLog` and `CarryoverMeal` with unified `cook_journal`. |
| `backend/app/models/shopping_list.py` | **Removed from Kernel** | Shopping lists become pure projections computed and cached by the shopping list plugin. |
| `backend/app/models/user.py` | **Replaced** with `household_members.py` | Remove SaaS multi-tenancy `user_id` FK from all tables. Use simple household members and master passcode. |
| `backend/app/services/recipe_import_service.py` & `ai_service.py` | **Plugin:** `builtin_plugins/recipe-importer` | Move HTML parsing and Gemini AI prompts to plugin. Register providers for `recipe:create` intent hub. |
| `backend/app/services/meal_suggestion_service.py` | **Plugin:** `builtin_plugins/meal-planner` | Move AI meal planning prompt logic to plugin. Register provider for `timeline:assist` intent hub. |
| `backend/app/services/shopping.py` | **Plugin:** `builtin_plugins/shopping-list` | Move ingredient normalization and categorization to plugin. Subscribes to `schedule:*` events. Registers `/shopping-lists` route. |
| `backend/app/services/cook_log_service.py` | **Plugin:** `builtin_plugins/cook-tracker` | Move carryover flagging and meal logging to plugin. Subscribes to `journal:meal_cooked`. |
| `backend/alembic/` & PostgreSQL config | **Removed** | Replaced with clean SQLite initialization and light SQLite schema versioning. |

---

## 7. Packaging, Subfolder Hosting & Podman Deployment

### 7.1 Single-Container Architecture
- Built with **Podman** using an OCI Containerfile based on `python:3.12-slim`.
- Internal structure:
  - Uvicorn (FastAPI) serves backend APIs under `/api/*` and compiled Vue 3 static assets for frontend routes.
  - Data directory mounted at `/data` containing:
    - `/data/secretsauce.db` (SQLite database + WAL files)
    - `/data/uploads/` (recipe photos and media assets)
    - `/data/plugins/` (user-installed plugins)
    - `/data/config.json` (household settings)

### 7.2 Subfolder Deployment Support (`secretsauce.food/<family>`)
To support central hosted instances via subfolders instead of subdomains:
1. **Dynamic Base Path:**
   The instance reads an environment variable `BASE_PATH` (defaults to `/`).
   - FastAPI initializes with `root_path=settings.BASE_PATH`.
   - Vue router initializes with `createWebHistory(window.__SECRETSAUCE_BASE_PATH__ || '/')`.
2. **Path-Scoped Session Cookies:**
   Session cookies set `Path=settings.BASE_PATH; HttpOnly; SameSite=Lax; Secure`.
   A user logged into `secretsauce.food/alletsee/` will never send or conflict cookies with `secretsauce.food/smith/`.
3. **Asset & Plugin URL Resolution:**
   All frontend API calls and dynamic plugin ESM imports are prefixed with the runtime `basePath`.

### 7.3 Decoupled Central SaaS Orchestrator
The central hosting service operates strictly as an external control plane:
- Manages Stripe subscriptions and assigns subfolders (e.g. `/alletsee`).
- Spawns a dedicated `secretsauce-instance` Podman container per family.
- Configures the central reverse proxy (Caddy / Traefik / Nginx) to route `secretsauce.food/<family>/*` to that container.
- Zero multi-tenancy code exists inside SecretSauce itself.

### 7.4 Self-Hosting Command
```bash
podman run -d \
  --name secretsauce \
  -p 8080:8000 \
  -v ./my-data:/data:Z \
  -e HOUSEHOLD_NAME="Our Family" \
  ghcr.io/max-alletsee/secretsauce:latest
```

---

## 8. Verification & Testing Strategy

1. **Kernel Backend Tests (`pytest`):**
   - In-memory SQLite database tests for all noun CRUD operations.
   - FTS5 trigger verification (insert, update, delete search indexing).
   - EventBus delivery, async execution, and error isolation tests.
   - Plugin discovery, lifecycle (`setup`/`teardown`), and projection isolation.
2. **Frontend Tests (`vitest`):**
   - Unit tests for `IntentRegistry` (hub registration, provider sorting, execution).
   - Component rendering tests for `<IntentHubTrigger>`, `<IntentHubModal>`, and `<PluginSlot>`.
   - Dynamic ESM plugin activation mock tests.
3. **End-to-End Smoke Test:**
   - Booting instance with built-in plugins enabled.
   - Adding a recipe manually and via mock importer.
   - Scheduling a recipe on the timeline.
   - Verifying shopping list projection generates and tracks checked items.

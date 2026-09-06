# SecretSauce Architecture Design: Core + Plugins

**Date:** 2026-09-05  
**Status:** In Review (Revision 2 incorporating detailed feedback)  
**Target:** Transform `tmp` into a malleable, extensible core + plugin architecture  

---

## 1. Executive Summary & Vision

SecretSauce is transitioning from an opinionated, monolithic multi-tenant SaaS application into a **malleable, extensible personal/family meal planning platform** inspired by the architecture of the `pi` coding agent, Obsidian, and Home Assistant.

Instead of a centralized database storing all users' data together, SecretSauce is structured as **independent, isolated single-tenant instances** (one per household), running in lightweight Podman sandboxes with dedicated SQLite databases. Each instance shares a solid, unopinionated backbone (the Kernel) while supporting independent, modular plugin configurations.

Instances can be:
1. **Self-hosted** with a single `podman run` command.
2. **Centrally provisioned** as a managed service using a decoupled orchestrator.

---

## 2. Refined Architectural Principles

### Principle 1: Canonical Data vs. Projections & Provenance
- **Canonical Data = Accepted Decisions and Retained Observations.**  
  Canonical truth is not limited to raw human keystrokes; it includes decisions and observations accepted by the household—whether entered manually, confirmed from an AI import, or ingested through an authorized integration (e.g. barcode scan, external calendar import).
  - *The litmus test:* **"Will it be annoying or disruptive to lose it?"** If yes, it is durable canonical data. If it can be deterministically re-materialized on startup without user grief, it is a projection.
- **Provenance Tracking:** All canonical mutations record provenance: `actor_member_id`, `source_type` (`human` | `plugin` | `system` | `integration`), `source_id` (plugin ID or integration name), and timestamp. This eliminates event feedback loops and distinguishes draft suggestions from accepted recipes.
- **Hybrid Projections (e.g. Shopping Lists):** A shopping list is a **projected baseline** (aggregated from recipes and schedule entries) combined with **durable user adjustments** (custom added items, manual quantity overrides, and checkmarks) anchored by **stable item identities**.

### Principle 2: Shared Domain Contracts vs. Plugin Entities & Verbs
- **"The kernel owns shared domain contracts, cross-cutting persistence guarantees, and transaction boundaries; plugins may own additional durable entities, verbs, and workflows."**
- Plugins are not restricted to ephemeral caches. Plugins can own durable tables in SQLite, attach queryable metadata to kernel nouns, and introduce brand-new domain entities (pantry inventory, equipment, fermentation batches, timers).

### Principle 3: Intent-Driven Action Hubs & Malleable Entrypoints
- **"Action workflows are organized into Intent Hubs; both the Kernel and Plugins register as Intent Providers."**
- Core actions (e.g., "Write Manually" on `recipe:create`, or "View Recipe" on `entry:interact`) are registered as **ordinary providers** with default priority. Plugins can augment, reorder, or replace core providers.
- Both the Kernel and Plugins can declare new Intent Hubs. A plugin introducing a new domain (e.g. `pantry:add_item`) declares a hub, renders an `<IntentHubTrigger>`, and allows other downstream plugins to contribute providers.

---

## 3. Storage Architecture & Kernel Nouns

### 3.1 Three Storage Categories
1. **Kernel Canonical Records:** Core shared nouns essential to meal planning (`recipes`, `schedule_entries`, `cook_journal`, `household_members`, `assets`, `entity_attributes`).
2. **Plugin Durable Records:** Namespaced SQLite tables created and owned by plugins (`plugin_<plugin_id>_<table_name>`) with their own schema migrations and lifecycle hooks.
3. **Rebuildable Projections / Caches:** Ephemeral read-model documents stored in `projections` that can be dropped and reconstructed at any time via a plugin's `rebuild()` hook.

### 3.2 Concurrency, Integrity & Versioning
- **Engine:** SQLite 3 stored at `/data/secretsauce.db`.
- **Mode:** `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, `PRAGMA synchronous = NORMAL;`.
- **Optimistic Concurrency Control:** Every mutable entity has a `revision INTEGER NOT NULL DEFAULT 1`. Updates require `WHERE id = :id AND revision = :expected_revision`, bumping `revision = revision + 1`. Stale edits receive HTTP `409 Conflict`.
- **Schema Migrations:** Managed via `PRAGMA user_version` and a `kernel_migrations` table executing sequential SQL migration steps at boot.
- **Atomic Backup:** Backups use the SQLite Online Backup API (`sqlite3_backup_init`) or `VACUUM INTO` to guarantee consistent snapshots without stopping the WAL engine.

---

### 3.3 Kernel Noun Schemas

#### `recipes` (Single mutable record with stable item IDs)
```sql
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,                       -- UUID v4
    revision INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    -- Each ingredient has a stable UUID 'id' for stable annotations/nutrition/substitutions
    -- Structure: [{"id": "uuid", "raw_text": "2 cloves garlic, minced", "name": "Garlic", "quantity": 2.0, "quantity_text": "2", "unit": "cloves", "notes": "minced"}]
    ingredients JSON NOT NULL DEFAULT '[]',
    -- Each step has a stable UUID 'id' for timers, step photos, and annotations
    -- Structure: [{"id": "uuid", "order": 1, "instruction": "Dice garlic.", "timer_minutes": null}]
    steps JSON NOT NULL DEFAULT '[]',
    servings INTEGER NOT NULL DEFAULT 2,
    yield_text TEXT,                           -- e.g. "makes 1 loaf", "approx. 12 cookies"
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    tags JSON NOT NULL DEFAULT '[]',           -- ["dinner", "quick"]
    source JSON,                               -- {"type": "url", "url": "..."} or {"type": "book", "title": "..."}
    language TEXT NOT NULL DEFAULT 'en',       -- Primary authoring language
    translations JSON NOT NULL DEFAULT '{}',   -- {"de": {"title": "...", "description": "...", "ingredients": [...], "steps": [...]}}
    created_at TEXT NOT NULL,                  -- ISO-8601 UTC
    updated_at TEXT NOT NULL,
    created_by_actor_id TEXT,
    provenance JSON NOT NULL DEFAULT '{}'      -- {"source_type": "human"|"plugin", "source_id": "..."}
);
```

#### `recipes_fts` (SQLite FTS5 Full-Text Search)
An external content FTS5 table `recipes_fts(id, title, description, ingredients_text, tags_text)` is automatically synchronized via `AFTER INSERT`, `AFTER UPDATE`, and `AFTER DELETE` SQLite triggers on `recipes`.

#### `schedule_entries` (The Planned Timeline)
```sql
CREATE TABLE schedule_entries (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,                        -- YYYY-MM-DD
    meal_type TEXT NOT NULL,                   -- Configurable per household: 'breakfast', 'lunch', 'dinner', etc.
    entry_type TEXT NOT NULL DEFAULT 'recipe', -- 'recipe', 'note', 'leftover', or plugin-registered types
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    title TEXT,                                -- Custom title if entry_type != 'recipe'
    note TEXT,
    servings_override REAL,                    -- Nullable: if null, dynamically calculated from participating members
    position INTEGER NOT NULL DEFAULT 0,
    -- Roles: who is cooking, who is dining (for dietary aggregation and serving sizing)
    assigned_cook_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    participant_member_ids JSON NOT NULL DEFAULT '[]', -- JSON array of household_members.id
    leftover_lineage JSON,                     -- {"origin_journal_id": "...", "batch_date": "...", "remaining_servings": 2}
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    provenance JSON NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_schedule_date ON schedule_entries(date);
```

#### `cook_journal` (The Log of Observations & Outcomes)
```sql
CREATE TABLE cook_journal (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                        -- Planned or cooked date (YYYY-MM-DD)
    meal_type TEXT NOT NULL,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    schedule_entry_id TEXT REFERENCES schedule_entries(id) ON DELETE SET NULL,
    title TEXT,
    status TEXT NOT NULL,                      -- 'cooked', 'skipped', 'leftover', 'dined_out'
    servings_actual REAL,
    cooked_by_member_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    is_unresolved_carryover BOOLEAN NOT NULL DEFAULT 0, -- Set to 1 if skipped/leftover needing rescheduling
    resolved_by_entry_id TEXT REFERENCES schedule_entries(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    provenance JSON NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_journal_date ON cook_journal(date);
CREATE INDEX idx_journal_carryover ON cook_journal(is_unresolved_carryover) WHERE is_unresolved_carryover = 1;
```

#### `household_members` (Household Member Profiles & Serving Ratios)
```sql
CREATE TABLE household_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',       -- 'admin', 'member'
    avatar_color TEXT,
    serving_ratio REAL NOT NULL DEFAULT 1.0,   -- Default portion multiplier (e.g. 0.5 for child, 1.5 for large appetite)
    dietary_restrictions JSON NOT NULL DEFAULT '[]', -- ["vegetarian", "gluten-free"]
    allergies JSON NOT NULL DEFAULT '[]',            -- ["peanuts", "shellfish"]
    disliked_ingredients JSON NOT NULL DEFAULT '[]',
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```
*Total Planned Servings:* When a meal is scheduled without an explicit `servings_override`, the required servings are dynamically computed as the sum of `serving_ratio` for all members listed in `participant_member_ids` (or all household members if none specified).

#### `assets` (1:N Media Attachments with Garbage Collection)
```sql
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,                 -- 'recipe', 'step', 'journal', 'plugin'
    entity_id TEXT NOT NULL,                   -- Target noun ID
    attachment_slot TEXT NOT NULL DEFAULT 'primary', -- 'primary', 'step_photo', 'document'
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,                -- 'uploads/2026/09/<uuid>.<ext>'
    created_at TEXT NOT NULL
);
CREATE INDEX idx_assets_entity ON assets(entity_type, entity_id);
```
An asset garbage-collection worker scans for orphaned asset files on disk whose database records have been deleted and purges them safely.

#### `entity_attributes` (Extensible Noun Metadata for Plugins)
To allow plugins to attach queryable, filterable, and sortable data to kernel nouns (such as nutrition per recipe, favorites, cost estimates, last cooked dates, or pantry match scores) without modifying kernel tables:
```sql
CREATE TABLE entity_attributes (
    plugin_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,                 -- 'recipe', 'schedule_entry', 'cook_journal'
    entity_id TEXT NOT NULL,
    attribute_key TEXT NOT NULL,               -- e.g. 'calories', 'is_favorite', 'pantry_match_score'
    value_numeric REAL,                        -- Indexed for range/sort queries
    value_text TEXT,                           -- Indexed for exact match / prefix queries
    value_json JSON,                           -- For rich nested metadata
    updated_at TEXT NOT NULL,
    PRIMARY KEY (plugin_id, entity_type, entity_id, attribute_key)
);
CREATE INDEX idx_entity_attrs_query ON entity_attributes(entity_type, attribute_key, value_numeric);
CREATE INDEX idx_entity_attrs_lookup ON entity_attributes(entity_type, entity_id);
```

#### `projections` (Ephemeral Plugin Read-Models)
```sql
CREATE TABLE projections (
    plugin_id TEXT NOT NULL,
    projection_key TEXT NOT NULL,
    data JSON NOT NULL,
    computed_at TEXT NOT NULL,
    expires_at TEXT,
    PRIMARY KEY (plugin_id, projection_key)
);
```

#### `jobs` (Durable Background Tasks & AI Operations)
```sql
CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    job_type TEXT NOT NULL,                    -- e.g. 'recipe:import_url', 'meal_plan:generate'
    status TEXT NOT NULL,                      -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
    progress_percent INTEGER DEFAULT 0,
    stage_message TEXT,
    input_payload JSON NOT NULL DEFAULT '{}',
    result_payload JSON,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);
CREATE INDEX idx_jobs_status ON jobs(status);
```

---

## 4. Settings & Administration Architecture

### 4.1 Configuration Hierarchy & Ownership
Settings are strictly partitioned into two categories with clear precedence:

1. **Infrastructural Configuration (`/data/config.json` & Environment Variables):**
   - **Owned by:** Server administrator / host runner.
   - **Scope:** Process bootstrapping, networking, file paths, security flags.
   - **Keys:** `PORT`, `BASE_PATH`, `DATA_DIR`, `COOKIE_SECURE` (`true` | `false` | `auto`), `LOG_LEVEL`, `SHARED_AI_API_KEY`.
   - **Precedence:** Environment variables override `/data/config.json`.

2. **Household & Domain Configuration (`household_config` table in SQLite):**
   - **Owned by:** The household members via the Web Settings UI.
   - **Scope:** Meal types, default servings, active languages, enabled plugins, household passphrase hash.
   - **Schema:**
     ```sql
     CREATE TABLE household_config (
         key TEXT PRIMARY KEY,
         value JSON NOT NULL,
         updated_at TEXT NOT NULL
     );
     ```
   - **Standard Keys:**
     - `household_name`: `"The Alletsees"`
     - `passphrase_hash`: Argon2id hash of the master household password.
     - `available_meal_types`: `[{"id": "breakfast", "label": "Breakfast"}, {"id": "lunch", "label": "Lunch"}, {"id": "dinner", "label": "Dinner"}, {"id": "snack", "label": "Snack"}]`
     - `languages`: `{"primary": "en", "auto_translate": ["de"]}`
     - `enabled_plugins`: `["recipe-importer", "meal-planner", "shopping-list", "cook-tracker"]`

### 4.2 Settings & Admin User Interface
The Web UI provides a unified Settings view with three tabs:
1. **Household Profile:** Household name, member list, serving ratios, dietary restrictions/allergies, meal type editor.
2. **Languages & Translation:** Default language, target auto-translation languages, AI translation engine toggle.
3. **Plugin Manager:**
   - List installed plugins with version, description, and status toggle.
   - Schema upgrade notices (with migration runner button).
   - Per-plugin configuration forms dynamically rendered from each plugin's `config_schema`.
   - **Secrets Management:** Fields marked `"format": "password"` or `"secret": true` in `config_schema` are stored encrypted or write-only. They are **never returned in plain text** over API requests (masked as `••••••••`).

---

## 5. Kernel Plugin SDK, Events & Inter-Plugin Services

### 5.1 Plugin Packaging & Durable Table Ownership
Plugins can declare durable SQLite tables using the prefix `plugin_<plugin_id>_`.

```
my-plugin/
├── plugin.json          # Manifest, schema_version, dependencies, config schema
├── plugin.py            # Entrypoint implementing BasePlugin
├── migrations/          # SQLite migrations (0001_initial.sql, 0002_add_field.sql)
└── ui/
    └── dist/
        ├── index.js     # Compiled ESM bundle
        └── style.css    # Scoped styles
```

#### Manifest (`plugin.json`)
```json
{
  "id": "shopping-list",
  "name": "Smart Shopping List",
  "version": "1.2.0",
  "min_kernel_version": "1.0.0",
  "schema_version": 2,
  "dependencies": {
    "required": [],
    "optional": ["shared-ai-provider"]
  },
  "entrypoint": "plugin:ShoppingListPlugin",
  "ui_entrypoint": "ui/dist/index.js",
  "config_schema": {
    "type": "object",
    "properties": {
      "group_by_category": { "type": "boolean", "default": true }
    }
  }
}
```

### 5.2 Plugin Lifecycle Hooks
Every plugin implements lifecycle hooks:
```python
class BasePlugin:
    async def install(self, ctx: PluginContext) -> None:
        """Run on first installation to initialize durable tables."""
        pass

    async def upgrade(self, ctx: PluginContext, from_version: int, to_version: int) -> None:
        """Apply sequential migrations from migrations/*.sql."""
        pass

    async def setup(self, ctx: PluginContext) -> None:
        """Called on app boot or plugin activation."""
        pass

    async def on_config_changed(self, ctx: PluginContext, new_config: dict) -> None:
        """Hot-reload configuration without full teardown."""
        pass

    async def rebuild(self, ctx: PluginContext) -> None:
        """Recompute all projections from kernel canonical records."""
        pass

    async def teardown(self) -> None:
        """Clean up tasks and resources."""
        pass

    async def uninstall(self, ctx: PluginContext) -> None:
        """Prompted option: clean up durable tables or preserve them."""
        pass
```

### 5.3 Extension Mechanisms: Policy Hooks vs. Event Outbox

#### 1. Synchronous Pre-Commit Policy Hooks (`before:*`)
To allow plugins to validate, enrich, or veto a mutation *before* it commits to SQLite:
- `ctx.hooks.on_before("recipe:create", handler)`
- `ctx.hooks.on_before("schedule:delete", handler)`
- A handler can mutate the data (e.g. normalize ingredient units, auto-tag) or raise a `PolicyVetoError("Allergen warning: dish contains peanuts")` to abort the transaction.

#### 2. Reliable Transactional Event Outbox (`after:*`)
To prevent lost events during crashes and guarantee delivery:
1. When a kernel mutation commits, an event envelope is written to an SQLite table `event_outbox` **in the same database transaction**:
   ```sql
   CREATE TABLE event_outbox (
       id TEXT PRIMARY KEY,
       event_name TEXT NOT NULL,
       entity_type TEXT NOT NULL,
       entity_id TEXT NOT NULL,
       revision INTEGER NOT NULL,
       actor_id TEXT,
       source_type TEXT NOT NULL,             -- 'human', 'plugin', 'system'
       source_id TEXT,
       payload JSON NOT NULL,
       created_at TEXT NOT NULL,
       dispatched BOOLEAN NOT NULL DEFAULT 0
   );
   ```
2. The async event dispatcher picks up pending rows, invokes subscriber callbacks, and marks them dispatched.
3. Event envelopes carry `source_type` and `source_id` to prevent recursive event feedback loops.

#### Standard Event Vocabulary:
- **Recipes:** `recipe:created`, `recipe:updated`, `recipe:deleted`
- **Schedule:** `schedule:entry_created`, `schedule:entry_updated`, `schedule:entry_deleted`
- **Journal:** `journal:entry_created`, `journal:entry_updated`, `journal:entry_deleted` (handles marking cooked, unmarking cooked, skipping, logging leftovers, and corrections)
- **Members:** `member:created`, `member:updated`, `member:deleted`
- **Assets:** `asset:uploaded`, `asset:deleted`
- **Plugins:** `plugin:enabled`, `plugin:disabled`, `plugin:upgraded`
- **Custom Plugin Events:** Plugins can emit their own namespaced events via `ctx.events.emit("pantry:item_expired", payload)`.

### 5.4 Inter-Plugin Services & Shared AI Service
To eliminate redundant API keys and centralize token quotas:
- The Kernel provides a **Shared Capability / Service Registry**:
  - `ctx.services.register(interface_name: str, implementation: Any)`
  - `ctx.services.get(interface_name: str) -> Any | None`
- **Shared AI Service (`shared-ai-provider`):**
  - Registered as a standard service implementing `AIServiceInterface`.
  - Configured once in Settings (Gemini, Anthropic, OpenAI, or local Ollama).
  - Provides structured schema outputs (Pydantic), token counting, call logging, and rate limiting.
  - Consumed by `recipe-importer`, `meal-planner`, and automatic translation workers.

### 5.5 Plugin Python Dependencies & Trust Model
- **Virtual Environment:** User-installed plugins under `/data/plugins/<id>/` have an isolated virtualenv located at `/data/plugins/<id>/.venv` created on installation.
- **Trust Model:** SecretSauce is a self-contained family application. In-process Python plugins run with full access to the SQLite connection and local environment. Custom plugin installation is restricted to household admins.

---

## 6. Frontend Extension Architecture & Intent Contracts

### 6.1 Unified Import Maps & Asset Loading
To eliminate ambiguity between runtime import maps and `window.Vue`:
- **Contract:** The frontend uses standard **Browser Import Maps** injected into `<head>`:
  ```html
  <script type="importmap">
  {
    "imports": {
      "vue": "/static/vendor/vue.esm-browser.prod.js",
      "pinia": "/static/vendor/pinia.esm-browser.prod.js",
      "vue-router": "/static/vendor/vue-router.esm-browser.prod.js",
      "@secretsauce/ui": "/static/vendor/secretsauce-ui.esm.js"
    }
  }
  </script>
  ```
- **CSS Delivery:** Plugin manifests specify optional `"style": "ui/dist/style.css"`, which the frontend dynamically links into the document on plugin activation.
- **Cache Invalidation:** Plugin URLs include the plugin version and content hash: `/api/plugins/{id}/ui.js?v={version}_{hash}`.
- **Server-Sent Events (SSE):** The frontend maintains an SSE stream (`GET {basePath}/api/events/stream`) to receive live notifications for job progress (`jobs`), projection recomputations, and data changes.

### 6.2 Typed Intent Hubs & Provider Contracts

#### Intent Hub Definition
```ts
export interface IntentHub<TContext = any, TResult = any> {
  id: string;                               // e.g. 'recipe:create', 'entry:interact'
  type: 'workflow' | 'action_menu';        // 'workflow' = multi-step creator, 'action_menu' = context action list
  title: string;
  description?: string;
  defaultProviderId?: string;
  contextSchema?: Record<string, any>;     // JSON Schema for typed contract validation
}
```

#### Intent Provider Definition
```ts
export interface IntentProvider<TContext = any, TResult = any> {
  intent: string;                          // Target Intent Hub ID
  id: string;                              // Unique provider ID
  title: string;
  description?: string;
  icon?: string;
  order: number;                           // Lower number = higher priority
  
  // Provider Availability Predicate
  isAvailable?: (context: TContext) => boolean;
  disabledReason?: (context: TContext) => string | null;

  // Discriminated execution type: UI-driven OR Headless
  kind: 'ui' | 'headless';
  component?: Component;                   // Rendered inside modal/sheet if kind === 'ui'
  execute?: (context: TContext) => Promise<TResult> | TResult; // Direct action if kind === 'headless'
}
```

#### Standard Core Intent Hubs (With Core Default Providers)
| Intent Hub ID | Type | Default Core Providers (Malleable) | Plugin Providers |
|---|---|---|---|
| `recipe:create` | `workflow` | `manual` (Blank Recipe Card, order: 100) | `import-url`, `import-photo`, `ai-generate` |
| `recipe:actions` | `action_menu` | `edit` (order: 10), `delete` (order: 999) | `scale-servings`, `export-pdf`, `nutrition-facts` |
| `timeline:assist` | `workflow` | none (opens helper sheet) | `ai-weekly-suggestions`, `pantry-clearance-planner` |
| `entry:interact` | `action_menu` | `view-recipe` (order: 10), `remove-slot` (order: 999) | `mark-cooked`, `log-leftover`, `reschedule` |
| `shopping:export` | `action_menu` | `copy-markdown` (order: 50), `print` (order: 60) | `send-to-bring`, `send-to-reminders` |

*Zero-Plugin Experience:* If all plugins are disabled, the core actions (`manual` recipe creation, timeline viewing, basic entry editing) remain 100% functional.

---

## 7. Migration & Decomposition of Existing Code (`tmp`)

### 7.1 Data Migration Mapping

| Monolithic Entity (`tmp`) | Target Architecture Location | Transformation & Migration Rule |
|---|---|---|
| `recipes` + `recipe_versions` | **Kernel `recipes`** | Flatten to latest `RecipeVersion`. Copy `ingredients`, `steps`, `servings`, `tags`. Drop `use_alter=True` circular FK. Assign stable UUIDs to each ingredient and step. Populate `recipes_fts`. |
| `meal_plans` + `meal_plan_entries` | **Kernel `schedule_entries`** | Flatten meal plan dates directly to `schedule_entries(date, meal_type, recipe_id)`. Calculate `participant_member_ids`. |
| `carryover_meals` + `recipe_cook_logs` | **Kernel `cook_journal`** | Unified into `cook_journal`. Unresolved carryovers migrated with `is_unresolved_carryover = 1`. Cook logs converted to `status = 'cooked'`. |
| `users` | **Kernel `household_members`** | Multi-tenant users converted to household members with `serving_ratio = 1.0`. Passwords migrated to single master household passphrase in `household_config`. |
| `shopping_lists` + `shopping_list_items` | **Plugin `shopping-list` durable table** | Transformed into `plugin_shopping_list_items` with stable item IDs and user checkmarks. Baseline is projected from schedule. |
| `shortlist_entries` | **Plugin `meal-planner` durable table** | Transformed into `plugin_meal_planner_shortlist(member_id, recipe_id, created_at)`. |
| `import_tasks` | **Kernel `jobs`** | Converted to universal `jobs` table records with status, progress, and payload. |
| Image files in `uploads/` | **Kernel `assets`** | Registered in `assets` table with `entity_type = 'recipe'`. |

---

## 8. Packaging, Deployment & Hosting Security

### 8.1 Single-Container Podman Packaging
- **Containerfile:** Based on `python:3.12-slim`.
- **Server:** Uvicorn running FastAPI.
- **SPA Serving & Routing:**
  - FastAPI serves API routes under `{BASE_PATH}/api/*`.
  - For non-API routes, FastAPI serves `index.html` via a dynamic templated route that injects:
    ```html
    <script>window.__SECRETSAUCE_BASE_PATH__ = "{{ base_path }}";</script>
    ```
  - This ensures deep links (e.g. `/shopping-lists` or `/recipes/123`) survive browser refreshes under any path prefix.
- **Cookie Security:**
  - `COOKIE_SECURE`: Configurable (`true` | `false` | `auto`). Default is `auto`: if incoming request `scheme == "https"`, sets `Secure`; if plain HTTP (local Podman port 8080), omits `Secure` so login works seamlessly.

### 8.2 Hosting Boundaries & Managed SaaS Architecture

#### Browser Isolation & Origin Security
Because browsers enforce same-origin policy by **domain name**, hosting multiple households under subfolders (`secretsauce.food/familya` and `secretsauce.food/familyb`) shares the same browser origin (`secretsauce.food`). An arbitrary JavaScript plugin running in Family A's instance could make authenticated requests or inspect shared localStorage.

To maintain strict security:
1. **Curated Plugins for Subfolder Hosting:**
   When running under subfolders on `secretsauce.food/<family>`, instances are restricted to verified, first-party plugins. Custom untrusted user plugins are disabled on the shared domain.
2. **Subdomains for Full Plugin Malleability:**
   For users who want to run arbitrary third-party plugins in managed hosting, the orchestrator provisions a dedicated subdomain (`family.secretsauce.food`).
3. **Cookie Path Scoping:**
   Session cookies use unique cookie names per household (`ss_session_<family_id>`) in addition to `Path={BASE_PATH}; SameSite=Lax; HttpOnly`.

---

## 9. Verification & Testing Strategy

1. **Kernel Tests (`pytest`):**
   - In-memory SQLite database tests for all noun CRUD operations and revision concurrency checks.
   - FTS5 trigger verification and search ranking.
   - Transactional Event Outbox delivery and error isolation.
   - Synchronous pre-commit policy hook veto and data enrichment.
   - Asset attachment and garbage collection.
2. **Plugin SDK & Contract Tests (`pytest`):**
   - Plugin discovery, migrations runner (`upgrade`), and isolation of `plugin_<id>_*` tables.
   - Service registry (`register`/`get`) and Shared AI service mock.
   - Projection rebuild verification.
3. **Frontend Tests (`vitest`):**
   - Unit tests for `IntentRegistry` (registering hubs, registering providers, sorting by priority, availability filtering).
   - Component tests for `<IntentHubTrigger>`, `<IntentHubModal>`, and `<PluginSlot>`.
   - Dynamic ESM import map loader mock tests.
4. **End-to-End Smoke Test:**
   - Booting instance with built-in plugins enabled.
   - Adding a recipe manually and via mock importer.
   - Scheduling a recipe on the timeline.
   - Verifying shopping list projection generates and tracks checked items.

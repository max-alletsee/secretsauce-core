# SecretSauce Architecture Design: Kernel + Plugins

**Date:** 2026-09-09  
**Status:** Revision 7 (PrimeVue as the shared component library, trigram full-text search, HEIC dropped from uploads, key derivation and passphrase-versioned sessions, one reader connection and one worker stated, no base element, workbox-expiration in the worker, Gemini named as the first AI provider; supersedes Revision 6 of 2026-09-08)  
**Target:** A minimal, customizable, extensible meal-planning harness in the spirit of the `pi` coding agent.

**How to read this document.** Sections 1 to 11 are the design. Section 12 is the test plan, section 13 the build order, section 14 the non-goals. Appendix A is the complete REST API and Appendix B the JSON shapes. When a section and an appendix disagree, the appendix wins, because it is the more precise statement.

---

## 1. Vision

SecretSauce is a meal-planning platform for **one household per instance**. An instance is one container with one SQLite database. Instances are self-hosted with a single `podman run`, or provisioned by a separate orchestrator on `https://<family>.secretsauce.food`. It is used on a phone in the shop and on a tablet in the kitchen, so it installs as an app and keeps working without a connection (section 8).

The design philosophy is borrowed from `pi`: **primitives, not features.** The kernel is a harness, not a product. All product functionality is delivered by plugins. The plugins we consider essential ship inside the image as *core plugins*, enabled by default, and are replaceable and disableable like any other plugin.

The existing `tmp` codebase is a source of ideas, not of data. There is no data migration; instances start from a clean slate.

---

## 2. Principles

**P1. Canonical data vs. derived data.** Canonical data is every accepted decision and retained observation, whether typed by a person, confirmed from an AI import, or written by an authorized plugin. The litmus test: *will it be annoying to lose it?* If yes, it is durable and backed up. If it can be recomputed from canonical data without user grief, it is derived and may be dropped and rebuilt.

**P2. The kernel contains only what every plugin must agree on.** That is: the nouns, the database, the HTTP server, the event log, the plugin loader, and the UI shell with its registries. If two reasonable households could want it different, it is a plugin. Configuration that only one plugin reads is that plugin's configuration.

**P3. Core plugins are ordinary plugins.** The kernel ships no product screens. With every plugin disabled, an instance is an empty shell with Settings, Plugin Manager, and the REST API. If the plugin API cannot build the recipe editor, the API is too weak.

**P4. Full trust inside the instance.** Plugins run in-process with full database and network access, exactly like `pi` extensions. Isolation exists only at the container boundary and the browser origin boundary. Identity inside the household is an honor system.

**P5. Simple means decoupled, not small.** Every mechanism carries one concern. When a mechanism needs a special case to serve a second concern, the mechanism is split, even if the result is larger.

---

## 3. System Overview

```
┌────────────────────────────── one container, one household ───────────────────────────────┐
│  Kernel (Python 3.12, FastAPI, aiosqlite)                                                 │
│    nouns · SQLite · REST /api/* · event log · plugin loader · jobs · SSE · manifest · sw  │
│    /app/plugins/*     core plugins baked into the image                                   │
│    /data/plugins/*    user plugins on the volume                                          │
│    /data/site         shared pip target for plugin requirements                           │
│  Shell (Vue 3 + PrimeVue SPA served by the kernel)                                        │
│    router · slots · intent hubs · settings · plugin manager · import map                  │
│    plugin UI bundles loaded as ES modules from /api/plugins/{id}/ui.js                    │
│    service worker (shell, plugin bundles, assets, API cache) · outbox (queued writes)     │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

Vocabulary used throughout: **kernel** (Python runtime and database), **shell** (frontend host), **core plugin**, **user plugin**, **noun** (kernel table), **hook** (pre-commit), **event** (post-commit, logged), **push** (ephemeral browser message, not logged), **command** (plugin action shown in Plugin Manager, run as a job), **hub** and **provider** (intent system), **slot** (UI extension point), **cache** (responses the service worker keeps on the device), **outbox** (writes queued on the device until the kernel accepts them).

### 3.1 Repository layout

```
secretsauce-core/
├── pyproject.toml                # package "secretsauce"; [project.scripts] secretsauce = "secretsauce.cli:main"
├── uv.lock
├── Containerfile                 # two stages: node builds the shell, python runs the kernel
├── secretsauce/                  # the kernel
│   ├── __init__.py               # __version__
│   ├── __main__.py               # `python -m secretsauce` == `secretsauce serve`
│   ├── cli.py                    # serve, export, migrate
│   ├── app.py                    # build_app() -> FastAPI; lifespan runs boot() and shutdown()
│   ├── boot.py                   # boot sequence, boot_id, precache list, re-exec
│   ├── config.py                 # infra config: env > /data/config.json > defaults
│   ├── errors.py                 # Conflict, NotFound, Veto, PluginError, Unauthorized
│   ├── db.py                     # Database: writer lock, reader connection, transaction(), migration runner
│   ├── migrations/               # 0001_initial.sql ...
│   ├── nouns/                    # recipes.py, schedule.py, journal.py, members.py, assets.py, attributes.py, household.py
│   ├── hooks.py                  # hook registry and runner
│   ├── events.py                 # Event, log writer, cursors, dispatchers, pruning
│   ├── jobs.py                   # jobs table, Job handle, runner
│   ├── stream.py                 # SSE hub: envelopes, pushes, hello frame
│   ├── auth.py                   # setup, login, sessions, login delay, Sec-Fetch-Site check, tokens
│   ├── secrets.py                # master key file, HKDF subkeys, Fernet
│   ├── gc.py                     # hourly garbage collector
│   ├── plugins/
│   │   ├── loader.py             # discovery, PLUGIN validation, ordering, activate, deactivate
│   │   ├── context.py            # PluginContext and its members
│   │   ├── registry.py           # plugins table access
│   │   └── install.py            # zip install, requirements, uninstall
│   ├── http/                     # one router per resource: auth, household, members, recipes, schedule, journal,
│   │                             #   assets, attributes, plugins, jobs, stream, export, pwa (manifest, sw.js), spa
│   ├── units/
│   │   ├── __init__.py           # canonical(), parse(), convert(), to_system(), format()
│   │   └── units.json            # the unit table in section 9
│   ├── testing.py                # make_kernel(), drain_events()
│   └── static/                   # built shell output incl. sw.js and icons/; not committed, produced by the Containerfile
├── shell/                        # Vite project
│   ├── package.json              # pnpm workspace: shell + packages/ui
│   ├── vite.config.ts            # dev proxy /api -> http://localhost:8000; build outDir ../secretsauce/static; copies vendor/
│   ├── vite.sw.config.ts         # builds src/sw/sw.ts into ../secretsauce/static/sw.js as one IIFE
│   ├── public/icons/             # app icons, copied to static/icons/ by the build
│   ├── packages/ui/              # @secretsauce/ui: Slot, IntentTrigger, API_VERSION, testing fake
│   └── src/                      # main.ts, api.ts, stream.ts, outbox.ts, sw/, registries/, stores/, pages/, components/
├── plugins/                      # core plugins, copied to /app/plugins in the image
│   └── <id>/                     # __init__.py, migrations/, requirements.txt (optional), ui/src, ui/dist
├── tests/                        # test_db.py, test_nouns.py, test_hooks.py, test_events.py, test_plugins.py,
│                                 #   test_http.py, test_auth.py, test_pwa.py, test_units.py, fixtures/plugins/
└── docs/
```

Libraries, fixed so that every task uses the same ones: `fastapi`, `uvicorn`, `aiosqlite`, `pydantic` v2, `itsdangerous`, `cryptography`, `python-multipart`, `sse-starlette`, `httpx`; the passphrase hash is `hashlib.scrypt` from the standard library, so no native wheel is needed for it; frontend `vue` 3.5, `pinia` 3, `vue-router` 5, `primevue` 4.5 with `@primevue/themes` 4.5 and `primeicons` 7, `idb` 8, `workbox-expiration` 7, `vite` 7, `vitest` 4, `typescript` 5.9; end-to-end `playwright` 1.58.

### 3.2 Development commands

```
uv sync                                                          # backend dependencies
uv run secretsauce serve --data ./.data --plugins ./plugins --reload
uv run pytest
cd shell && pnpm install && pnpm dev                             # dev server proxies /api to :8000
cd shell && pnpm build                                           # writes ../secretsauce/static, including sw.js
cd shell && pnpm test
podman build -t secretsauce-instance .
```

`--plugins` adds a second core-plugin directory for development; in the image that directory is `/app/plugins`. `pnpm dev` does not register the service worker; installation and offline behavior are exercised against `secretsauce serve` with a built shell, and in the smoke test.

---

## 4. Storage

### 4.1 Engine
- SQLite 3 at `/data/secretsauce.db` with `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`, `busy_timeout=5000`.
- One writer connection behind an asyncio lock and one reader connection, each in its own `aiosqlite` thread. A household never produces enough concurrent reads to justify a pool, and every connection is a thread and a hop. Rule: nothing awaits the network while holding the writer.
- `synchronous=NORMAL` under WAL can lose the most recently committed transactions on power loss; it never corrupts the file. That is accepted for this data, and the backup in 4.5 is the durability story.
- `/data` must be on a local filesystem. WAL is unsafe on network filesystems such as NFS and SMB, so a data volume on a NAS share will corrupt the database; the self-hosting docs say so in the first paragraph.
- The four noun tables carry `revision INTEGER NOT NULL DEFAULT 1` per row. Updates require the expected revision and bump it; a mismatch is HTTP `409 Conflict` with the current row in the body. `assets` and `events` are immutable; the remaining kernel tables are last-write-wins.
- Kernel schema versions live in `kernel_migrations(number, applied_at)`; plugin schema versions live in `plugins.schema_applied`. Both are applied at boot from numbered SQL files named `NNNN_<slug>.sql`, sorted numerically, each in its own transaction.

### 4.2 Three storage categories
1. **Kernel nouns**: the tables in 4.3. Canonical, backed up, never dropped.
2. **Plugin tables**: named `plugin_<plugin_id>_<name>`, created by the plugin's own migrations. This is where durable plugin facts live. They may declare foreign keys to any kernel noun, including `recipes(id)`, with `ON DELETE CASCADE` or `SET NULL`. SQLite enforces them, and the kernel keeps recipe references meaningful across translations, see 4.4.
3. **Attributes**: rows in `entity_attributes`. Attributes are a derived index and nothing else: they exist so kernel list endpoints can filter and sort by plugin data. Any attribute row may be dropped at any time, and plugins recompute them in their `rebuild` command.

There is no generic projections table. A plugin that wants a cache creates a table.

### 4.3 Kernel nouns

All timestamps are ISO-8601 UTC with a `Z` suffix. All ids are UUID v4 in lowercase hyphenated form. Dates are `YYYY-MM-DD` in the household's local calendar as chosen by the browser; the kernel never converts dates. `actor_member_id` and `origin` record the latest write to the row and follow the provenance shape in 6.7.

#### Recipes: one table, one row per language

```sql
CREATE TABLE recipes (
    id TEXT PRIMARY KEY,                      -- '<group_id>_<language>', e.g. '2f1c…-9a_de'
    group_id TEXT NOT NULL,                   -- UUID shared by every language row of one recipe
    language TEXT NOT NULL,                   -- 'en', 'de', ...
    revision INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    ingredients JSON NOT NULL DEFAULT '[]',   -- array of Ingredient, Appendix B
    steps JSON NOT NULL DEFAULT '[]',         -- array of Step, Appendix B, in array order
    servings REAL NOT NULL DEFAULT 2,
    yield_text TEXT,                          -- "makes 1 loaf"
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    total_time_minutes INTEGER,
    tags JSON NOT NULL DEFAULT '[]',
    source JSON,                              -- {"type": "url", "url": ...} | {"type": "book", ...}
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actor_member_id TEXT,
    origin TEXT NOT NULL DEFAULT 'member'     -- 'member' | 'plugin:<id>' | 'system'
);
CREATE INDEX idx_recipes_group ON recipes(group_id);
```

Rules:
- A recipe is a group of rows sharing a `group_id`. Each row is complete and self-contained, and has one address: its `id`, which the kernel derives as `group_id + "_" + language` on create. The underscore is a safe separator because UUIDs and language tags never contain one.
- Every reference to a recipe, from schedule entries, journal rows, events, hooks and plugin tables, is a row `id`, so it can be a real foreign key. Only attachments and attributes use `group_id`: they belong to the recipe as a whole, and being polymorphic they could not be foreign keys in any design.
- Rows sharing a `group_id` share ingredient and step ids. The editor's "add translation" action and the translator plugin both start from a copy of an existing row, so ids line up. The kernel does not enforce this across rows, because doing so would block legitimate edits to one language.
- Language-independent fields such as servings, times and quantities are duplicated per row. The translator plugin keeps rows it wrote in sync with the row it translated from. Rows maintained by people may drift, and that is accepted.
- `origin` distinguishes authored rows from derived ones without an extra flag: the translator overwrites only rows whose `origin` is `plugin:translator`. A human edit sets `origin = member` and the row is thereafter left alone.
- Quantities are stored in the household's unit system; conversion happens at write time, never at display time (section 9). `unit` holds a canonical id from the units table or free text when unparsed.
- Two read forms. `GET /api/recipes/{id}` returns exactly that row. `GET /api/recipes/{group_id}?lang=de` returns the row in that language if present, otherwise the row in `household_config.languages.primary`, otherwise the oldest row; the two are told apart by the underscore. List endpoints that carry recipe references, such as the schedule, accept `lang` and expand each reference the same way, so readers see their own language wherever it exists. Responses always carry `language` and the list of languages the group exists in.
- Deleting one row removes one language and re-points references to it, see 4.4. Deleting a recipe removes every row of the group.

`recipes_fts` is an FTS5 table `(id UNINDEXED, group_id UNINDEXED, language UNINDEXED, title, description, ingredients, tags, tokenize='trigram')` with one row per recipe row, written by the recipe repository in the same transaction. `ingredients` is the space-joined ingredient names, `tags` the space-joined tags. There are no triggers. The trigram tokenizer matches inside words and ignores case, so `salat` finds `Kartoffelsalat`; the default word tokenizer matches whole words and prefixes only, which German compounds defeat. It needs SQLite 3.34 or newer, which the Debian base image exceeds, and it cannot answer a query shorter than three characters; such queries fall back to `LIKE` on `title` (Appendix A.4). The larger index is irrelevant at household scale.

#### Schedule, journal, members

```sql
CREATE TABLE schedule_entries (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,                       -- YYYY-MM-DD
    meal_type TEXT NOT NULL,                  -- free text; household config lists the defaults
    entry_type TEXT NOT NULL DEFAULT 'recipe',-- 'recipe' | 'note' | plugin-defined
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,   -- one language row, see 4.4
    title TEXT,
    note TEXT,
    servings_override REAL,                   -- null: sum of participants' serving_ratio, or of all members
    position INTEGER NOT NULL DEFAULT 0,
    assigned_cook_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    participant_member_ids JSON NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actor_member_id TEXT,
    origin TEXT NOT NULL DEFAULT 'member'
);
CREATE INDEX idx_schedule_date ON schedule_entries(date);
```
The kernel knows two entry types: `recipe`, which carries a `recipe_id`, and `note`. Plugins define others; the cook-tracker plugin defines `leftover` and keeps the link to the originating journal row in its own table. A meal type not present in household config is still valid; the timeline renders every meal type that occurs on a day plus the configured defaults.

```sql
CREATE TABLE cook_journal (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
    schedule_entry_id TEXT UNIQUE REFERENCES schedule_entries(id) ON DELETE SET NULL,
    title TEXT,
    status TEXT NOT NULL,                     -- 'cooked' | 'skipped' | 'dined_out'
    servings_cooked REAL,
    servings_left REAL,
    cooked_by_member_id TEXT REFERENCES household_members(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    actor_member_id TEXT,
    origin TEXT NOT NULL DEFAULT 'member'
);
CREATE INDEX idx_journal_date ON cook_journal(date);
```
The journal records what happened at a slot and nothing more. At most one row per schedule entry; corrections edit the row. Ratings, carryovers, and leftovers are plugin concerns (section 10). The kernel nouns therefore form a straight line: journal refers to schedule, schedule refers to recipes, nothing refers back.

```sql
CREATE TABLE household_members (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    avatar_color TEXT,
    serving_ratio REAL NOT NULL DEFAULT 1.0,
    dietary_restrictions JSON NOT NULL DEFAULT '[]',
    allergies JSON NOT NULL DEFAULT '[]',
    disliked_ingredients JSON NOT NULL DEFAULT '[]',
    favorite_cuisines JSON NOT NULL DEFAULT '[]',
    preferred_language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```
There is no role column. Every logged-in member can do everything.

#### Assets and attributes

```sql
CREATE TABLE assets (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,                -- 'recipe' | 'schedule_entry' | 'journal' | 'member' | 'plugin'
    entity_id TEXT NOT NULL,                  -- for recipes: recipes.group_id, shared across languages
    sub_id TEXT,                              -- ingredient or step id inside the entity, if any
    slot TEXT NOT NULL DEFAULT 'primary',     -- 'primary' | 'step_photo' | 'document' | plugin-defined
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,               -- uploads/2026/09/<uuid>.<ext>
    created_at TEXT NOT NULL
);
CREATE INDEX idx_assets_entity ON assets(entity_type, entity_id);

CREATE TABLE entity_attributes (
    plugin_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_numeric REAL,
    value_text TEXT,
    value_json JSON,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (plugin_id, entity_type, entity_id, key)
);
CREATE INDEX idx_attrs_query ON entity_attributes(plugin_id, entity_type, key, value_numeric);
CREATE INDEX idx_attrs_entity ON entity_attributes(entity_type, entity_id);
```
Uploads are limited to 20 MB and to content types `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; plugins may extend the list through `ctx.assets.allow(content_type)`. HEIC is deliberately absent: Chrome and Firefox cannot render it, and iOS converts a HEIC photo to JPEG itself when the file input's `accept` names JPEG and PNG, so the kernel carries no image conversion code. Attribute queries look like `GET /api/recipes?attr=nutrition.calories<600&sort=-nutrition.calories`; the grammar is in Appendix A. Keys are always qualified by plugin id. Recipe attributes use `group_id`, so one nutrition row serves every language. Because attributes are derived, the kernel drops a plugin's rows on deactivate and before `rebuild`.

#### Kernel bookkeeping

```sql
CREATE TABLE events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                       -- 'recipe:updated', 'pantry:item_expired'
    entity_type TEXT,
    entity_id TEXT,                           -- always the row's primary key; for recipes '<group_id>_<language>'
    revision INTEGER,
    actor_member_id TEXT,
    origin TEXT NOT NULL,                     -- 'member' | 'plugin:<id>' | 'system'
    cause_seq INTEGER,
    depth INTEGER NOT NULL DEFAULT 0,
    data JSON NOT NULL,                       -- kernel nouns: {"before": {...}|null, "after": {...}|null}
    created_at TEXT NOT NULL
);
CREATE TABLE event_cursors (
    plugin_id TEXT PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0,
    failing_seq INTEGER,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE TABLE plugins (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    schema_applied INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,       -- the household's intent
    config JSON NOT NULL DEFAULT '{}',        -- secret fields stored encrypted, see 5.4
    state TEXT NOT NULL,                      -- the runtime outcome: 'active' | 'disabled' | 'blocked' | 'errored'
    last_error TEXT,
    installed_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE jobs (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,                     -- 'pending' | 'running' | 'done' | 'failed' | 'cancelled'
    progress INTEGER NOT NULL DEFAULT 0,
    message TEXT,
    input JSON NOT NULL DEFAULT '{}',
    result JSON,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);
CREATE INDEX idx_jobs_status ON jobs(status);

CREATE TABLE api_tokens (
    id TEXT PRIMARY KEY,
    plugin_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    token_hash TEXT NOT NULL,                 -- sha256 of the token
    label TEXT,
    created_at TEXT NOT NULL,
    last_used_at TEXT
);

CREATE TABLE household_config (
    key TEXT PRIMARY KEY,
    value JSON NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 4.4 Reference integrity promises
Every reference to a recipe from `schedule_entries`, `cook_journal` and plugin tables is a foreign key to `recipes(id)`, so SQLite guarantees it names a row that exists. Attachments and attributes are polymorphic and use `group_id`. Inside the mutation's transaction, the kernel guarantees:
- Deleting a language row while other rows of its group remain first re-points every foreign key that references it, in kernel and plugin tables alike, to the group's row in the household's primary language, or else the oldest remaining row. The kernel finds those columns with `PRAGMA foreign_key_list` on every table, so no plugin code is involved and no cascade fires. A planned meal never disappears because someone removed a translation.
- Deleting the last row of a group lets the foreign keys fire as declared, `SET NULL` for schedule and journal and whatever each plugin chose for its tables, and deletes the group's `assets` and `entity_attributes` rows.
- Deleting an entry, journal row, or member deletes its `assets` and `entity_attributes` rows. Deleting a member also removes its id from every `participant_member_ids` array.
- Files are unlinked after commit, never inside the transaction.

Outside the transaction, a garbage collector runs hourly and handles everything lazy: files under `uploads/` with no `assets` row, `assets` rows whose `sub_id` no longer exists in any language row of the recipe, events below every cursor and older than thirty days, and crash gaps between commit and unlink. Recipe updates do not touch assets at all.

### 4.5 Backup and export
- `GET /api/export` and `secretsauce export` produce a zip containing a `VACUUM INTO` copy of the database, `uploads/`, `plugins/`, `site/`, and `config.json`. Restore is unzipping into an empty `/data` and starting the container.
- `GET /api/export/json` writes every kernel noun as plain JSON for interop with other tools.
- Direct SQLite access to `/data/secretsauce.db` is supported for power users. The database is the file format.

---

## 5. Configuration and Identity

### 5.1 Infrastructure configuration
Owned by the host operator. Environment variables override `/data/config.json`, which overrides defaults. Keys: `PORT` (8080), `BASE_PATH` (`/`), `DATA_DIR` (`/data`), `COOKIE_SECURE` (`auto`; `true` | `false` | `auto`), `FORWARDED_ALLOW_IPS` (empty), `LOG_LEVEL` (`info`).

`FORWARDED_ALLOW_IPS` is handed to uvicorn together with `--proxy-headers`. When the connecting peer is in that list, the kernel takes the client address from `X-Forwarded-For` and the request scheme from `X-Forwarded-Proto`; otherwise it uses the socket. The login delay (5.3) and `COOKIE_SECURE=auto` both depend on it, so the orchestrator sets it to Caddy's address and the self-hosting docs set it for whatever terminates TLS. `secretsauce serve` always runs exactly one uvicorn worker: the registries, the writer lock and the dispatcher wake-up are process state, and a second worker would hold its own copy of each.

### 5.2 Household configuration
Owned by the household through Settings, stored in `household_config`. Only keys with more than one reader live here:
- `household_name`: string
- `passphrase_hash`: `hashlib.scrypt` with `n=2**15, r=8, p=1` and a random 16-byte salt, stored as `scrypt$<n>$<r>$<p>$<salt>$<hash>` with both binary parts base64; never returned by any endpoint
- `passphrase_version`: integer starting at 1, incremented by every passphrase change, carried in session cookies (5.3)
- `meal_types`: `[{"id": "breakfast", "label": "Breakfast"}, ...]`, the defaults shown on every day, in display order
- `languages`: `{"primary": "en"}`, the fallback language for recipe reads
- `units`: `"metric"` | `"us_customary"`, the unit system every recipe is stored in (section 9)

Plugin configuration, including which languages to translate into, lives in `plugins.config` and is edited in that plugin's Settings section.

### 5.3 First run, login, cross-site protection, actor identity
Four concerns, four mechanisms:
- **First run.** While `passphrase_hash` is absent, every endpoint except `GET /api/health`, `GET /api/setup` and `POST /api/setup` answers `409 {"error": {"code": "setup_required"}}`, and the shell shows the setup page. `POST /api/setup` takes the household name, the passphrase, and the first member, writes them, and logs the caller in. It answers 409 once a passphrase exists.
- **Login.** `POST /api/auth/login` with the passphrase sets the cookie `ss_session`: host-only, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` according to `COOKIE_SECURE` (`auto` sets it when the request scheme is https). The value is a signed token from `itsdangerous.URLSafeTimedSerializer` keyed by the session subkey (5.4), carrying a random session id, the issue time and the current `passphrase_version`, valid thirty days. A token whose version differs from `household_config.passphrase_version` is rejected as 401, so changing the passphrase logs every other device out without a session table. Logout clears the cookie and, because the device may hold cached data and queued writes, everything the shell stored for the household (8.6). An installed app on iOS has a cookie jar separate from Safari's, so the first launch after installing asks for the passphrase once. After `n` consecutive failures from one client address, as resolved under 5.1, further attempts within `min(2^(n-1), 60)` seconds of the last failure answer `429` with `Retry-After`; success resets the counter.
- **Cross-site protection.** The kernel rejects with 403 any cookie-authenticated request whose `Sec-Fetch-Site` header is `cross-site`. Browsers set this header themselves; nothing in the shell or in plugins participates.
- **Actor identity.** The shell sends `X-Actor-Member: <member id>` on requests. When present, the kernel checks that the id exists and stamps it as `actor_member_id` on writes and events. When absent, the actor is null. Nothing else is checked; this is the honor system.

Plugins that need cookie-less access, for example a calendar feed, call `ctx.tokens.issue(scope, label)` and mark their routes `auth="token"`. Token routes read `Authorization: Bearer <token>`, look up the sha256 hash, and check the scope the route declares. Tokens are shown once and stored hashed. Their writes carry no actor and the token's plugin as `origin`.

### 5.4 Secrets and the key file
On first boot the kernel writes 32 random bytes, base64 encoded, to `/data/secret.key` with mode `0600`. That is the master key, and it is never used directly. At boot the kernel derives two subkeys from it with HKDF-SHA256 from `cryptography`, using the info strings `secretsauce/session` and `secretsauce/config`. The first keys the session cookie serializer (5.3); the second, urlsafe-base64 encoded, is the `cryptography.fernet.Fernet` key that encrypts plugin config fields whose schema carries `"secret": true`. Key separation costs three lines and guarantees the two uses can never interact. Such fields are returned to the browser as the literal string `••••••••`, and a config write that contains that literal leaves the stored value unchanged. Plugins read the clear value through `ctx.config`.

### 5.5 Trust model
Anyone with the passphrase can do anything, including installing plugins. An in-process plugin can read and write the entire database, the filesystem under `/data`, and the network. This is the same trust model as `pi` extensions, and it is why hosted isolation is done at the container level (section 11.4).

---

## 6. Backend Plugin API

### 6.1 Discovery and shape
The kernel scans `/app/plugins/` and `/data/plugins/` for `<name>.py` and `<name>/__init__.py`, in that order. A plugin is a module with a `PLUGIN` dict and a `setup` function:

```python
PLUGIN = {
    "id": "shopping-list",              # required; matches ^[a-z][a-z0-9-]{1,40}$ and the file or directory name
    "version": "1.2.0",                 # required; semver
    "name": "Shopping list",            # default: id
    "description": "",                  # default: ""
    "schema": 2,                        # default 0; must equal the highest number in ./migrations
    "requires": ["ai-provider?"],       # default []; plugin ids, trailing ? marks optional
    "ui": "ui/dist/index.js",           # default None; ES module relative to the plugin directory
    "ui_css": "ui/dist/style.css",      # default None
    "ui_api": 1,                        # default 1
    "config_schema": {"type": "object", "properties": {"group_by_category": {"type": "boolean", "default": True}}},
}

async def setup(ctx: "PluginContext") -> None: ...
async def teardown() -> None: ...       # optional
api = None                              # optional public object for ctx.plugins.get()
```

The module is imported under the name `ss_plugin_<id with dashes replaced by underscores>`. The dict is validated against a JSON Schema at load; a plugin with an invalid dict is listed as `errored` and never activated. There is no separate manifest file. Python dependencies are declared in a `requirements.txt` next to the module, exactly like a `package.json` next to a `pi` extension.

### 6.2 Dependencies: one shared environment
On install or update, the kernel runs `uv pip install -r requirements.txt --target /data/site` with `UV_CACHE_DIR=/tmp/uv`. `/data/site` is appended to `sys.path` at boot. The file `/data/site/.python-version` records the interpreter version; when the image ships a different Python, every plugin's requirements are reinstalled at boot before any plugin is imported.

Accepted downsides, stated for the record: two plugins with incompatible pins fail at install time and the later one is left `blocked` with the resolver output in `last_error`; a native-extension crash takes down the process; Python modules are not reloaded in-process.

### 6.3 Lifecycle at runtime
Everything a plugin registers through `ctx` is keyed by its plugin id and removable. That makes the lifecycle a pair of operations that never touch the process:
- **Activate**: run pending migrations, create the cursor row at the current head if it does not exist, call `setup(ctx)`, start the plugin's event dispatcher, set `state = active`.
- **Deactivate**: call `teardown()` if defined, cancel its background tasks and running jobs, unregister its hooks, handlers, routes and commands, stop its dispatcher, drop its attribute rows, set `state = disabled`.

Enabling and disabling a plugin, and changing its configuration, are deactivate followed by activate, while every other plugin keeps running. The process restarts only when plugin code is installed, updated or uninstalled, or when the image changes, because Python modules cannot be safely reloaded.

Plugins are ordered by a topological sort of `requires`, ties broken by id. A plugin whose required dependency is missing or disabled is `blocked` and is not activated; enabling the dependency re-evaluates dependents. An exception in `setup` marks the plugin `errored` with the traceback in `last_error`; the rest of the system is unaffected.

### 6.4 The context object
`ctx` is the entire backend API. Every method that touches the database is a coroutine. Handlers always receive `ctx` as their last argument.

```python
class PluginContext:
    plugin_id: str
    log: logging.Logger                       # namespaced "secretsauce.plugin.<id>"
    config: dict                              # validated against config_schema, defaults applied, secrets decrypted
    db: Database
    recipes: RecipeRepo
    schedule: Repo
    journal: Repo
    members: Repo
    assets: Assets
    attributes: Attributes
    household: Household
    jobs: Jobs
    plugins: Plugins
    tokens: Tokens

    def hook(self, name: str, handler: HookHandler) -> None
    def on(self, name: str, handler: EventHandler, include_self: bool = False) -> None
    async def emit(self, name: str, data: dict, entity: tuple[str, str] | None = None) -> int   # returns seq
    async def push(self, name: str, data: dict) -> None
    def router(self, router: fastapi.APIRouter, auth: Literal["cookie", "token"] = "cookie", scope: str | None = None) -> None
    def command(self, name: str, fn: JobFn, title: str) -> None
    def background(self, coro: Coroutine) -> asyncio.Task

HookHandler  = Callable[[dict | None, Row | None, PluginContext], Awaitable[None]]   # (draft, current, ctx)
EventHandler = Callable[[Event, PluginContext], Awaitable[None]]                     # (event, ctx)
JobFn        = Callable[[Job, PluginContext], Awaitable[Any]]                        # (job, ctx); return value becomes result
Row          = dict                                                                  # a table row as a plain dict
```

```python
class Database:
    async def execute(self, sql: str, params: Sequence = ()) -> None
    async def fetch_one(self, sql: str, params: Sequence = ()) -> Row | None
    async def fetch_all(self, sql: str, params: Sequence = ()) -> list[Row]
    def transaction(self) -> AsyncContextManager[None]     # acquires the writer; nests by joining the outer transaction

class Repo:                                   # schedule, journal, members
    async def list(self, filters: dict | None = None, sort: str | None = None, limit: int = 50, offset: int = 0) -> Page
    async def get(self, id: str) -> Row | None
    async def create(self, draft: dict) -> Row
    async def update(self, id: str, patch: dict, expected_revision: int) -> Row       # raises Conflict(current)
    async def delete(self, id: str, expected_revision: int) -> None                  # raises Conflict(current), NotFound

class RecipeRepo(Repo):
    async def resolve(self, group_id: str, lang: str) -> Row | None                  # fallback rule in 4.3
    async def delete_recipe(self, group_id: str) -> None
    async def search(self, text: str, lang: str, limit: int = 50) -> list[Row]

class Page(NamedTuple):
    items: list[Row]
    total: int

class Assets:
    async def store(self, entity_type: str, entity_id: str, filename: str, content: bytes, content_type: str,
                    slot: str = "primary", sub_id: str | None = None) -> Row
    async def list(self, entity_type: str, entity_id: str) -> list[Row]
    async def delete(self, id: str) -> None
    def path(self, row: Row) -> pathlib.Path
    def allow(self, content_type: str) -> None

class Attributes:                             # all calls are scoped to this plugin's plugin_id
    async def set(self, entity_type: str, entity_id: str, key: str, value: float | int | bool | str | dict | list | None) -> None
    async def delete(self, entity_type: str, entity_id: str, key: str) -> None
    async def get(self, entity_type: str, entity_id: str) -> dict[str, Any]          # this plugin's keys
    async def get_all(self, entity_type: str, entity_id: str) -> dict[str, Any]      # "<plugin>.<key>" for every plugin
    async def query(self, entity_type: str, key: str, op: str, value: Any, limit: int = 100) -> list[tuple[str, Any]]

class Household:
    async def get(self, key: str, default: Any = None) -> Any
    async def set(self, key: str, value: Any) -> None

class Jobs:
    async def run(self, job_type: str, fn: JobFn, input: dict | None = None) -> str   # returns job id
    async def cancel(self, id: str) -> None
    async def get(self, id: str) -> Row | None

class Job:
    id: str
    input: dict
    async def progress(self, percent: int, message: str | None = None) -> None

class Plugins:
    def get(self, id: str) -> Any | None      # the other plugin's module-level `api`, None if absent or inactive

class Tokens:
    async def issue(self, scope: str, label: str) -> str                             # the clear token, shown once
    async def revoke(self, id: str) -> None
    async def list(self) -> list[Row]

@dataclass
class Event:
    seq: int; name: str; entity_type: str | None; entity_id: str | None; revision: int | None
    actor_member_id: str | None; origin: str; cause_seq: int | None; depth: int
    data: dict; created_at: str
```

Filter keys accepted by `list`: any column of the noun for equality; `date_from` and `date_to` for tables with a `date` column; `q` for full-text search on recipes; `lang` for recipes; `attr` as a list of strings in the Appendix A grammar. `sort` uses the Appendix A grammar. `Attributes.set` picks the column by type: numbers and booleans go to `value_numeric` (booleans as 0 and 1), strings to `value_text`, dicts and lists to `value_json`; `None` deletes. Exceptions live in `secretsauce.errors`: `Conflict(current: Row)`, `NotFound`, `Veto(message: str)`, `PluginError`.

### 6.5 Noun repositories
Each repository is the same code the REST layer uses, so a plugin and the browser have identical capabilities. `id` is always the row's primary key. A draft may carry its own `id` as a UUID v4 (for recipes, `group_id`); otherwise the repository generates one, and a duplicate raises `Conflict(current)`. Client-chosen ids are what make replays from the outbox (8.5) safe. The recipe repository adds three calls: `resolve(group_id, lang)` applies the fallback rule in 4.3, `delete_recipe(group_id)` removes every row of the group, and `search(text, lang)` queries FTS. `create(draft)` with a `group_id` that already exists and a new `language` adds a language row; without a `group_id` it starts a new recipe. There are no special write paths; a translation is a row like any other.

### 6.6 Pre-commit hooks
`ctx.hook("recipe:update", handler)` registers a hook. Hook names are `<noun>:<create|update|delete>` with nouns `recipe`, `schedule`, `journal`, `member`. Hooks are coroutines awaited inline inside the request, before the commit, in plugin load order. A handler receives `(draft, current, ctx)`: for create, `draft` is the row about to be written and `current` is `None`; for update, `draft` is the current row with the patch applied and `current` is the row as stored; for delete, `draft` is `None`. A handler may mutate `draft` in place or raise `Veto("Contains peanuts")`, which aborts the transaction and returns HTTP 422 with the message and the plugin id. Any other exception also vetoes and is logged against the plugin. Writes made through `ctx.db` inside a hook join the same transaction. Hooks run for every writer: REST, plugins, and the kernel's own re-pointing do not bypass them, except that re-pointing in 4.4 runs no hooks because it changes no row content.

### 6.7 Events: log, delivery, loops
**Envelope.** Every event row carries `name`, optional entity reference and revision, `actor_member_id`, `origin`, `cause_seq`, `depth`, and `data`. Kernel noun events carry `before` and `after` snapshots. `origin` is one of `member`, `plugin:<id>`, `system`; `actor_member_id` is set alongside because a plugin acts on behalf of a member.

**Writing.** Kernel mutations append their event inside the mutation's transaction. `ctx.emit` appends a row with `origin = plugin:<id>` and, when `entity` is given, that `(entity_type, entity_id)`.

**Delivery rules.**
1. One dispatcher task per plugin reads `events WHERE seq > last_seq ORDER BY seq` in batches of 100 and awaits that plugin's handlers for each event in turn. The cursor advances after each event. Plugins never block each other.
2. Handlers match by exact name or by prefix wildcard, `recipe:*`. A plugin may register several handlers for one name; they run in registration order.
3. A failing event is retried with backoff of one second, ten seconds, one minute, then every ten minutes, up to twenty attempts, tracked in `attempts` and `failing_seq`. It is then skipped, the cursor advances, `last_error` keeps the traceback, and Plugin Manager shows the count of skipped events. Delivery is at-least-once per plugin, in order; handlers must be idempotent, and the envelope revision makes that a one-line check.
4. Dispatchers wake when the writer sets a shared `asyncio.Event` after every commit, and also every five seconds as a fallback.
5. A deactivated plugin keeps its cursor. Events below every cursor and older than thirty days are pruned. On activation, a plugin whose cursor is still within the retained window catches up; otherwise the kernel moves its cursor to head and runs the plugin's `rebuild` command if one is registered. A plugin activated for the first time starts at head and never replays history.
6. The dispatcher never delivers an event to the plugin named in its `origin`, unless the handler subscribed with `include_self=True`.
7. Writes made inside a handler record the delivered event as `cause_seq` and `depth + 1`. The kernel refuses writes at depth greater than eight with `PluginError` and logs the causal chain.
8. The browser SSE stream at `GET /api/events/stream` forwards every event's envelope without `data`, and every `ctx.push` message, each tagged with its kind. The stream is a view; it is never a source. Its frames are in Appendix A.

**Vocabulary.** `recipe:created|updated|deleted`, `schedule:created|updated|deleted`, `journal:created|updated|deleted`, `member:created|updated|deleted`, `asset:created|deleted`, `plugin:activated|deactivated|updated`, `job:started|finished`. Plugin events are `<plugin_id>:<verb>`. `entity_id` is always the row's primary key, so a recipe event names the exact language row; the snapshot carries `group_id` for handlers that care about the whole recipe. Deleting a recipe emits one `recipe:deleted` per row.

### 6.8 Jobs and commands
`ctx.jobs.run(job_type, fn, input)` inserts a `pending` row, schedules `fn(job, ctx)` as a tracked task, and returns the job id. When the task starts the row becomes `running` and `job:started` is logged. The return value is stored as `result` and the row becomes `done`; an exception stores `str(exc)` in `error` and the row becomes `failed`; either way `job:finished` is logged with the final status. `job.progress(percent, message)` updates the row and calls `ctx.push("job:progress", {"id", "percent", "message"})`; progress is a notification and never enters the log. `ctx.jobs.cancel(id)` cancels the task, which raises `asyncio.CancelledError` inside `fn`, and sets `cancelled`. At boot, rows still `running` become `failed` with the message `interrupted by restart`; plugins that want to resume re-enqueue in `setup`. The kernel provides no retry and no scheduling. Periodic work is a `ctx.background` loop with `asyncio.sleep`.

Commands are jobs with a button. `ctx.command("rebuild", fn, title="Rebuild")` registers `fn` as a `JobFn`; `POST /api/plugins/{id}/commands/rebuild` runs it as a job of type `command:rebuild` and answers with the job id, and Plugin Manager shows its progress and result. The kernel itself invokes a plugin's `rebuild` command in the case described in 6.7 rule 5.

### 6.9 Routes and errors
Routers mount under `/api/x/<plugin_id>/` behind the session cookie by default; with `auth="token"` they require a bearer token whose scope equals the `scope` argument. Plugin routes receive `ctx` through the FastAPI dependency `secretsauce.plugins.context.current_ctx`. An unhandled exception in a plugin route returns 500 with `{"error": {"code": "plugin_error", "message": ..., "details": {"plugin_id": ...}}}` and is logged against the plugin; it never affects other routes.

### 6.10 Plugin installation and removal
`POST /api/plugins/install` accepts a zip of at most 50 MB and returns a job id. The job: rejects archives with more than one top-level entry, or whose module has no valid `PLUGIN` dict, or whose `id` does not match the directory name, or whose `id` collides with a core plugin; rejects an existing user plugin id unless `?upgrade=true`; extracts to `/data/plugins/<id>/`; runs the requirements install of 6.2; writes or updates the registry row with `enabled = 1`, `state = disabled`; then triggers a restart. `DELETE /api/plugins/{id}?delete_data=true` deactivates, removes the directory, drops every `plugin_<id>_*` table when `delete_data` is set, deletes the registry row, cursor and tokens, and triggers a restart. Core plugins can be disabled but not removed.

A restart means: stop accepting requests, wait up to two seconds for in-flight requests, close the database, then `os.execv(sys.executable, [sys.executable, "-m", "secretsauce", *sys.argv[1:]])`. The new process has a new boot id, which makes every open shell reload (7.1).

### 6.11 Example: a recurring-meal plugin in full
```python
PLUGIN = {"id": "recurring", "version": "1.0.0", "schema": 1}
# migrations/0001_rules.sql: CREATE TABLE plugin_recurring_rules (id TEXT PRIMARY KEY, weekday INTEGER,
#                            meal_type TEXT, recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE);

async def setup(ctx):
    ctx.background(materialize(ctx))

async def materialize(ctx):
    while True:
        rules = await ctx.db.fetch_all("SELECT * FROM plugin_recurring_rules")
        for day in next_fourteen_days():
            for rule in rules:
                if rule["weekday"] == day.weekday() and not await already_planned(ctx, day, rule):
                    await ctx.schedule.create({"date": day.isoformat(), "meal_type": rule["meal_type"],
                                               "recipe_id": rule["recipe_id"]})
        await asyncio.sleep(3600)
```
Entries created this way carry `origin = plugin:recurring`, so the plugin never reacts to its own writes. The foreign key does the cleanup: if the household deletes the recipe, the rule disappears with it, and if it only deletes a translation, the kernel re-points the rule to another language row first.

---

## 7. Frontend Plugin API

### 7.1 Loading and lifecycle
The kernel serves `index.html` templated with the import map below, `window.__SS__ = {"boot_id": ..., "base_path": ..., "version": ...}`, and the manifest and icon links of 8.2. Every URL in the document is absolute and carries `BASE_PATH`. There is no `<base href>`: a base element also rewrites in-page anchors such as `href="#ingredients"` into navigations, and the shell already has exactly one place that knows the prefix, `ss.url`. The import map pins `vue`, `pinia`, `vue-router` and `@secretsauce/ui` as single files at exact versions under `{BASE_PATH}static/vendor/`, and maps the prefixes `primevue/`, `@primevue/themes/` and `@primeuix/` to vendored copies of those packages, so that `import Button from "primevue/button"` in any bundle resolves to the shell's copy. The shell build copies the library files and package directories from `node_modules` into that directory with the version in the path and builds `@secretsauce/ui` into `secretsauce-ui.js`.

A plugin's UI bundle is served at `/api/plugins/{id}/ui.js?v={version}_{hash}` with `Cache-Control: public, max-age=31536000, immutable`, loaded with a dynamic `import()`; the optional stylesheet is linked the same way. Plugins build the bundle with Vite in library mode, `formats: ["es"]`, and `rollupOptions.external: ["vue", "pinia", "vue-router", "@secretsauce/ui", /^primevue\//, /^@primevue\//, /^@primeuix\//]`, so the shared libraries resolve through the import map and no plugin ships its own copy of Vue or of a PrimeVue component. The bundle's default export is called once per activation:

```ts
export default function activate(ss: SecretSauceUI) {
  ss.route({ path: "/shopping", component: ShoppingPage, nav: { label: "Shopping", icon: "cart", order: 30 } })
  ss.slot("recipe.detail.sidebar", NutritionPanel, { order: 50 })
  ss.intent.hub({ id: "shopping:export", title: "Export list" })
  ss.intent.provider({ hub: "recipe:create", id: "import-url", title: "Import from URL", order: 20,
                       kind: "ui", component: ImportDialog })
  ss.settings.section({ id: "shopping", title: "Shopping list", component: ShoppingSettings })
  ss.on("recipe:updated", e => refresh(e.entity_id))
}
```

Every registration is keyed by plugin id. On `plugin:activated` the shell imports the bundle and calls `activate`; on `plugin:deactivated` it removes that plugin's routes, slots, providers, sections, stream handlers and outbox handlers. No page reload is involved. The stream's hello frame carries the boot id; the shell reloads the page only when it differs from `window.__SS__.boot_id`, which means the process restarted, and it updates the service worker first (8.4). A dropped connection alone reconnects silently with `Last-Event-ID`, and the kernel replays missed envelopes; while the reconnect keeps failing, `ss.store.online` is false (8.6).

### 7.2 The `ss` object
```ts
export const API_VERSION = 1

export interface SecretSauceUI {
  pluginId: string
  route(def: RouteDef): void
  slot(name: string, component: Component, opts?: { order?: number }): void
  intent: { hub(def: IntentHub): void; provider(def: IntentProvider): void }
  settings: { section(def: { id: string; title: string; component: Component; order?: number }): void }
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): void       // exact name or "recipe:*"
  api: ApiClient
  url(path: string): string
  store: { currentMember: Ref<Member | null>; members: Ref<Member[]>; household: Ref<Household>; online: Ref<boolean> }
  outbox: Outbox                                                               // queued writes, section 8.5
  i18n: { add(lang: string, messages: Record<string, string>): void }
  t(key: string, params?: Record<string, string | number>): string
  theme: { register(def: { id: string; label: string; preset: object }): void }        // a PrimeVue preset, see below
  notify(n: { level: "info" | "success" | "warning" | "error"; message: string }): void
}

export interface RouteDef { path: string; component: Component; order?: number;    // default 50
                            nav?: { label: string; icon?: string; order: number } }
export interface ApiClient {
  get<T>(path: string, query?: Record<string, string | number | boolean | string[]>): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string, query?: Record<string, string | number>): Promise<void>
  upload<T>(path: string, form: FormData): Promise<T>
}
export class ApiError extends Error { status: number; code: string; details?: unknown }
export class ConflictError extends ApiError { current: Record<string, unknown> }
export class OfflineError extends ApiError { }                                 // status 0, code "offline"; section 8.3

export interface StreamEvent { kind: "event"; seq: number; name: string; entity_type: string | null; entity_id: string | null;
                               revision: number | null; actor_member_id: string | null; origin: string; created_at: string }
export interface StreamPush  { kind: "push"; name: string; data: unknown; plugin_id: string }

export interface Member { id: string; revision: number; name: string; avatar_color: string | null; serving_ratio: number;
                          dietary_restrictions: string[]; allergies: string[]; disliked_ingredients: string[];
                          favorite_cuisines: string[]; preferred_language: string }
export interface Household { household_name: string; meal_types: { id: string; label: string }[];
                             languages: { primary: string }; units: "metric" | "us_customary" }
```

JSON field names are snake_case on the wire and in TypeScript; the shell never renames fields. `ss.api` adds credentials, the base path, `X-Actor-Member` from `store.currentMember`, and throws `ApiError` for any non-2xx response, `ConflictError` for 409, and `OfflineError` when the network fails or the service worker answers `503 offline` (8.3). `ss.url` prefixes the base path. `ss.i18n` messages use `{name}` placeholders.

**Components and styling.** PrimeVue 4 is the component library of the shell and of every plugin, and the import map is what makes it one library rather than one copy per bundle. The shell installs PrimeVue once with the `Aura` preset from `@primevue/themes`, plus `ToastService` and `ConfirmationService`; plugins import components from `primevue/<name>` and use them as in any Vue app, and `ss.notify` is the shell's Toast. Plugin CSS uses PrimeVue design tokens, `var(--p-primary-color)`, `var(--p-content-border-radius)` and the rest, and no second variable set, so a theme reaches plugin markup for free. A theme is a PrimeVue preset: `ss.theme.register` takes the object `definePreset(Aura, {...})` accepts, Settings lists every registered theme plus `Aura` unchanged, and the shell applies the choice with `usePreset` and keeps it in localStorage like the current member. Icons are PrimeIcons; the `icon` fields of `RouteDef` and `IntentProvider` name one without the `pi pi-` prefix, for example `shopping-cart`, and the shell links `primeicons.css` from the vendor directory so plugin bundles ship no icon assets. The config form of 7.6 is built from the same components, which is why a schema-rendered section and a hand-written one look alike.

A reference such as a schedule entry names one row. When the shell follows a reference it asks for the group in the current member's `preferred_language`, so readers see their own language wherever it exists; the response's `language` field says what is shown, and the page offers the other languages. Edits go to the row's `id`, so a save can never land on the wrong language. Computations such as shopping aggregation use the referenced row as it is.

### 7.3 Routes and replacement
Core plugins register their pages at `order: 100`. A plugin that registers the same path with a lower order replaces the page. That is how a household swaps the recipe editor or the timeline without forking anything. Navigation entries are sorted by `nav.order`.

### 7.4 Slots
`<Slot name="..." :context="{...}" />` renders every contribution in `order`, each receiving the object as a single prop named `context`. Any plugin may render a `<Slot>` with a new name, so slots are declarable the same way hubs are. The shell itself declares:

| Slot | Context |
|---|---|
| `shell.header.left`, `shell.header.right` | `{}` |
| `shell.nav.footer` | `{}` |
| `plugin_manager.plugin.actions` | `{ plugin: PluginEntry }` |
| `login.footer` | `{}` |

Core plugins declare further slots, listed in section 10.

### 7.5 Intents
```ts
export interface IntentHub { id: string; title: string }
export interface IntentProvider<C = unknown, R = unknown> {
  hub: string; id: string; title: string; icon?: string; order: number
  isAvailable?: (context: C) => boolean
  disabledReason?: (context: C) => string | null
  kind: "ui" | "headless"
  component?: Component                            // kind "ui": receives prop `context`, emits `resolve(result)` or `cancel`
  execute?: (context: C) => Promise<R> | R         // kind "headless"
}
```
`<IntentTrigger hub="recipe:create" :context="..." label?>` behaves by count: zero available providers renders nothing, one runs it directly, more than one opens a menu sorted by `order`. A `kind: "ui"` component is rendered in a sheet until it emits. Providers registered before their hub are held until the hub appears. Every hub belongs to the plugin owning the page. The shell declares exactly one, `share:receive`, because its entrypoint is the manifest (8.7).

### 7.6 Settings sections and config forms
A section component receives props `{ pluginId, config, schema }` and emits `save(config)`; the shell writes it through `PUT /api/plugins/{id}/config`. Plugins with a `config_schema` and no section of their own get one rendered from the schema. The supported JSON Schema subset is: `type` of `string`, `number`, `integer`, `boolean`, and `array` with `items: {type: "string"}`; `enum` on strings; `minimum` and `maximum` on numbers; `title`, `description`, `default`; and `secret: true` on strings, rendered as a password field. Nested objects are not supported.

### 7.7 Version contract
`@secretsauce/ui` exports `API_VERSION`. A bundle whose `ui_api` major differs is not loaded, and Plugin Manager shows why. Shared library versions in the import map are part of that contract and only change with a major bump.

---

## 8. Installation and Offline

SecretSauce is used in the kitchen with wet hands and in the shop with one bar of signal. The shell is therefore an installable web app with a service worker, and an instance keeps working without the network: everything a member has seen stays readable, and the writes a plugin chooses to queue are applied when the connection returns. A browser allows one service worker per scope, which makes it something every plugin must agree on, so it belongs to the shell (P2). Plugins never register their own; they reach the cache and the outbox through `ss`.

### 8.1 Guarantees
Offline, with a session cookie on the device:
1. The app starts from the home screen and every route renders, plugin routes included, because navigations are answered from the cached `index.html`.
2. Every `GET /api/...` response the device has received is served from the cache, marked as cached, exactly as it was at the last successful fetch of that URL. Photos, documents and plugin bundles that were loaded once are available.
3. Writes made through `ss.outbox` are stored on the device and replayed, in order, once the kernel answers again. Every other write fails at once with `OfflineError`.
4. The stream reconnects by itself, and `ss.store.online` tells plugins which mode they are in.

Not offered: writes from shell-owned pages, that is Settings, Plugin Manager, setup and login, are online-only; a queued write the kernel rejects is dropped and shown to the member, never merged; nothing happens while the app is closed. Installation and caching need a secure context, HTTPS or `localhost`; on plain HTTP the shell skips the worker and runs as an ordinary site (11.6).

### 8.2 Manifest and installation
`index.html` links `<link rel="manifest" href="{BASE_PATH}manifest.webmanifest" crossorigin="use-credentials">`, `<meta name="theme-color" content="#c2410c">` and `<link rel="apple-touch-icon" href="{BASE_PATH}static/icons/apple-touch-icon.png">`, all templated absolute like every other URL in the document (7.1). `GET {BASE_PATH}manifest.webmanifest` is templated at request time:

```json
{
  "id": "/",
  "name": "SecretSauce – Familie Müller",
  "short_name": "SecretSauce",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#faf7f2",
  "theme_color": "#c2410c",
  "icons": [
    {"src": "/static/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "/static/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "/static/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ],
  "share_target": {"action": "/share", "method": "GET", "params": {"title": "title", "text": "text", "url": "url"}}
}
```

`id`, `start_url`, `scope`, `share_target.action` and every icon `src` carry `BASE_PATH`. `name` carries the household name when the request has a session and is `SecretSauce` otherwise; the manifest is the one shell resource that reads the cookie without requiring it. Icons ship in `shell/public/icons/`, are copied into `static/icons/` by the build, and are not configurable.

`GET {BASE_PATH}sw.js` serves the built worker with `Cache-Control: no-cache`, so the browser looks for a new one on every navigation, and with the placeholder `__SS_PRECACHE__` replaced by `{"build": "<hash>", "files": [...]}`: `files` is every path under `static/` except `sw.js`, and `build` is the SHA-256 of that list and the kernel version. The kernel computes both once at boot. The routes sit beside `index.html`, outside `/api`, and are listed in Appendix A.8.

The shell registers the worker at `ss.url("sw.js")` with scope `BASE_PATH` on startup, in secure contexts and production builds only. After the first successful login it calls `navigator.storage.persist()`, so the browser does not evict the caches and the outbox under storage pressure. Whether the app is installed changes nothing for the shell or for any plugin: an installed app is the same page in `display-mode: standalone`.

### 8.3 The service worker
`shell/src/sw/sw.ts` is built by `vite.sw.config.ts` into one IIFE. Its only dependency is `CacheExpiration` from `workbox-expiration`, which enforces the per-cache entry limits below; the strategies are a few lines each and are written by hand, because the classification table is the whole design and a routing framework would only hide it. It classifies every request by its URL relative to the registration scope and applies one strategy per class. The worker never hardcodes a path.

| Request | Strategy | Cache |
|---|---|---|
| Navigation to any path in scope outside `api/` | Network-first with a 5 s timeout; fallback: the cached `index.html`, else a built-in offline page saying nothing is saved yet | `ss-shell-<build>` |
| `static/**` | Cache-first; precached at install | `ss-shell-<build>` |
| `api/plugins/{id}/ui.js`, `ui.css` | Cache-first; the URL carries the version; at most 50 entries, least recently used evicted | `ss-plugins` |
| `api/assets/{id}/file` | Cache-first; at most 200 entries, least recently used evicted | `ss-assets` |
| Other `GET api/**`, except `events/stream`, `export`, `export/json`, `health` | Network-first with a 5 s timeout, or straight to the cache when `navigator.onLine` is false; fallback: the cached response with the header `X-SS-Cached-At`; at most 1000 entries, least recently used evicted | `ss-api` |
| Everything else: non-GET, the stream, exports, health, cross-origin | Passed through untouched | none |

Rules:
1. Only `200` responses enter a cache. A `4xx` or `5xx` from the network is returned as is and never replaced by a cached copy; the fallback exists for network failure and timeout only.
2. A cacheable GET with no cached copy while the network is unreachable is answered with `503 {"error": {"code": "offline", "message": "..."}}`, which `ss.api` turns into `OfflineError`.
3. Cache keys are the full URL including the query string; `lang`, filters and paging are therefore distinct entries. Request headers such as `X-Actor-Member` play no part, because they only affect writes.
4. The kernel sends `Cache-Control: no-store` on every `/api` JSON response, so the HTTP cache never holds household data and the worker's cache is the only one. Assets and plugin bundles keep their immutable headers; the HTTP cache and the worker then hold the same bytes, one for speed and one for offline use.
5. `install` precaches `files` and calls `skipWaiting()`. `activate` deletes every `ss-shell-*` cache of another build and `ss-api`, because a new kernel may answer differently, keeps `ss-plugins` and `ss-assets`, and calls `clients.claim()`. Plugins re-warm what they need on activation (8.8).
6. A `{"type": "clear"}` message from the shell deletes `ss-api` and `ss-assets`. The shell sends it on logout (8.6).

The classification is a pure function `classify(url: URL, scope: URL): RequestClass` in `sw/classify.ts`, tested without a browser.

### 8.4 Updates
Every shell file under `static/` is content-hashed and immutable; `index.html` and `sw.js` are the two mutable entry points and carry `no-cache`. A new image changes the boot id, and 7.1 already reloads the shell on a boot id it has not seen. The reload is ordered so that it lands on the new shell: the shell calls `registration.update()`; when a new worker was found it waits for `controllerchange`, at most ten seconds; then it reloads. The new worker has precached the new files by then, so the reloaded page is complete even if the connection drops during the reload. When the image did not change, `update()` finds identical bytes and the reload happens at once. Plugin bundles need no handling: an upgraded plugin has a new `v=` and therefore a new cache key, and old entries leave `ss-plugins` by eviction.

### 8.5 The outbox
The outbox is a queue of HTTP writes in IndexedDB, database `ss-outbox`, one per origin, flushed in order whenever the kernel answers. It exists so that a plugin can accept a change on the device and let the member move on. It is not a sync engine: entries are replayed verbatim, and the kernel's answer is final.

```ts
export interface Outbox {
  pending: Ref<number>
  failed: Ref<OutboxEntry[]>
  enqueue(req: OutboxRequest): Promise<string>       // resolves with the entry id once the entry is stored
  discard(entryId: string): Promise<void>            // removes a failed entry
  on(kind: "applied", handler: (entry: OutboxEntry, response: unknown) => void): void   // this plugin's entries only
  on(kind: "failed", handler: (entry: OutboxEntry, error: ApiError) => void): void
}
export interface OutboxRequest {
  method: "POST" | "PATCH" | "PUT" | "DELETE"; path: string
  body?: unknown; query?: Record<string, string | number>
  tag?: string                                       // shown to the member in the offline bar, "Check off milk"
}
export interface OutboxEntry extends OutboxRequest {
  id: string; plugin_id: string; actor_member_id: string | null
  created_at: string; attempts: number; last_error: string | null
}
```

Rules:
1. `enqueue` stores the entry with the calling plugin's id and the current member as `actor_member_id`, then triggers a flush. Online, the write reaches the kernel within milliseconds; offline, it waits. There is one code path, not an online path and an offline path.
2. The flush sends entries strictly in creation order, one at a time, through the same client as `ss.api`, with the stored member as `X-Actor-Member`. Entries whose plugin is not active are left in place and wait; uninstalling a plugin deletes its entries.
3. A `2xx` removes the entry and calls the plugin's `applied` handlers with the response body.
4. A `409` on a `POST` whose body carried an `id` (`group_id` for recipes) equal to `details.current.id` (`group_id`) means an earlier attempt was applied and the answer was lost; the entry counts as applied.
5. Any other `4xx` moves the entry to `failed`, calls the `failed` handlers with the `ApiError`, and the flush continues with the next entry. Failed entries stay in the offline bar until discarded.
6. A `401` stops the flush and leaves the entry pending; the shell shows the login page, and the flush resumes after login. Sessions expire while a device is offline, and nothing is lost by it.
7. A `5xx` or a network error stops the flush and leaves the entry pending. A `5xx` counts as an attempt, and after ten the entry fails, so that a broken endpoint cannot block the queue forever. Network errors do not count.
8. Flushes are triggered by `enqueue`, by the stream's hello frame, by the browser's `online` event, by a successful login, and every sixty seconds while entries are pending.
9. An entry may be replayed days after it was made. A plugin that cares about the time of the action puts it in the body.

Because entries are replayed verbatim and possibly twice, since the connection can drop after the kernel committed and before the device saw the answer, a queueable endpoint is idempotent: creates carry a client-generated id, and updates state the target value rather than a delta (`{"checked": true}`, not `{"toggle": true}`). Kernel creates accept an `id` for exactly this reason (Appendix A.1). A `PATCH` on a kernel noun carries the revision the device last saw, so it fails under rule 5 when someone else edited the row meanwhile; that is the intended outcome, and the member sees it.

### 8.6 Online state, the offline bar, logout
`ss.store.online` is true while the stream is connected. It turns false when `navigator.onLine` is false or when a reconnect attempt fails, and true again on the next hello frame; a single missed ping does not flip it. While it is false the shell shows a persistent bar, "Offline, showing saved data", with the outbox counts; tapping the bar lists pending and failed entries with their plugin and `tag`, and offers to discard failed ones. A cached answer arriving while the stream is connected, which means the five-second timeout struck, shows the same bar as "Slow connection, showing saved data" until the next fresh response. This is the only offline UI the shell owns. Plugins read `ss.store.online` to disable what cannot work and `ss.outbox.pending` if they want counts of their own.

Logout removes everything the device holds for the household: it warns when the outbox is not empty, then posts `clear` to the worker (8.3 rule 6), deletes the outbox database, removes `currentMember` from localStorage, and clears the cookie. The shell and plugin caches stay, because they contain no household data.

### 8.7 Share target
The manifest declares a GET share target at `{BASE_PATH}share`. When a member shares a page from another app into SecretSauce, the browser opens that route with `title`, `text` and `url` as query parameters. The shell owns this one entrypoint, because the manifest is kernel-served, and it is the only hub the shell declares:

`share:receive`, context `{ title: string | null; text: string | null; url: string | null }`, result `{ path?: string }`. The share page fires the hub on load through `<IntentTrigger>`; with zero providers it says that no installed plugin handles shared content; when the chosen provider resolves with a `path`, the shell navigates there. `recipe-importer` provides `import-shared`, which opens its URL import with the shared URL filled in. Web Share Target exists on Android and desktop Chromium; iOS does not offer it, and members there paste the URL into the `recipe:create` hub. Sharing a file, such as a photo of a recipe card, would need a POST target and is a non-goal for now.

### 8.8 What plugins do
Three patterns cover what the core plugins need, and each is an ordinary use of a mechanism that already exists:
- **Warm the cache with a GET.** Every response passes through the worker, so a plugin that wants data available offline fetches it while online. `core-timeline` fetches the current and the next week on activation and after every `schedule:*` event, then the recipes those entries reference; the shopping list fetches its lists on activation. Nothing marks a response as "for offline", and nothing else is needed.
- **Optimistic state plus the outbox.** `shopping-list` toggles the item in its store, enqueues `PUT /api/x/shopping-list/items/{id}/checked` with `{"checked": true}`, reverts on `failed`, and refreshes on its own `shopping-list:item_changed` event when it arrives through the stream. `cook-tracker` enqueues `POST /api/journal` with a client-generated `id`; a `409` on `schedule_entry_id` means someone else logged that meal, and the entry fails visibly.
- **Disable what cannot work.** Anything that needs the kernel now, such as an AI import or a plugin install, reads `ss.store.online` and says why it is unavailable.

Plugin routes that accept queued writes follow the kernel's example: take a client id on create, answer `409` with `details.current` on a duplicate, and take target values rather than deltas.

---

## 9. Units

**Unit preference is applied at write time, not at display time.** A household has exactly one unit system, `household_config.units`, and every stored recipe row is in that system. Conversion is a pre-commit hook in the core plugin `units`, so the importer, the editor, and any third-party plugin get identical behavior without conversion code of their own, and views render stored values exactly as they are.

```python
PLUGIN = {"id": "units", "version": "1.0.0"}
from secretsauce import units

async def setup(ctx):
    ctx.hook("recipe:create", convert)
    ctx.hook("recipe:update", convert)
    ctx.command("reconvert-all", reconvert_all, title="Re-convert all recipes")

async def convert(draft, current, ctx):
    system = await ctx.household.get("units", "metric")
    for ing in draft["ingredients"]:
        ing["quantity"], ing["quantity_max"], ing["unit"] = units.to_system(
            ing["quantity"], ing["quantity_max"], ing["unit"], system)
```

The hook converts each ingredient whose unit belongs to the other system; shared units pass through unchanged. `raw_text` always keeps the authored form, so nothing is lost. Step text is left as authored. Changing the preference later runs `reconvert-all`, which rewrites every recipe row through the normal update path with `origin = plugin:units`.

### 9.1 The library
`secretsauce.units` exposes:

```python
def canonical(alias: str, lang: str) -> str | None            # "EL" -> "tbsp"; None if unknown
def parse(text: str, lang: str) -> Ingredient                  # fills raw_text, quantity, quantity_max, quantity_text, unit, name, notes
def convert(quantity: float, from_unit: str, to_unit: str) -> float   # raises ValueError across dimensions
def to_system(quantity, quantity_max, unit, system) -> tuple[float | None, float | None, str | None]
def format(quantity: float | None, quantity_max: float | None, unit: str | None, lang: str, system: str) -> str
```

The browser package `@secretsauce/units` exports `parse` and `format` only, for the editor's live preview. Conversion tables exist in Python alone, so there is one implementation of every fact that can be wrong.

### 9.2 The unit table
`secretsauce/units/units.json` is the single source; the table below is its content. `factor` converts to the dimension's base, grams or millilitres. Alias matching is case-insensitive after trimming whitespace and a trailing period, except that single-letter aliases are case-sensitive so that `T` is tablespoon and `t` is teaspoon.

| id | dimension | system | factor | en aliases | de aliases |
|---|---|---|---|---|---|
| `g` | mass | metric | 1 | g, gram, grams | Gramm |
| `kg` | mass | metric | 1000 | kg, kilogram, kilograms | Kilogramm |
| `mg` | mass | metric | 0.001 | mg, milligram, milligrams | Milligramm |
| `oz` | mass | us_customary | 28.3495 | oz, ounce, ounces | Unze, Unzen |
| `lb` | mass | us_customary | 453.592 | lb, lbs, pound, pounds | |
| `ml` | volume | metric | 1 | ml, milliliter, millilitre, milliliters | Milliliter |
| `cl` | volume | metric | 10 | cl, centiliter, centilitre | Zentiliter |
| `dl` | volume | metric | 100 | dl, deciliter, decilitre | Deziliter |
| `l` | volume | metric | 1000 | l, liter, litre, liters, litres | Liter |
| `tsp` | volume | shared | 5 | tsp, teaspoon, teaspoons, t | TL, Teelöffel |
| `tbsp` | volume | shared | 15 | tbsp, tablespoon, tablespoons, T | EL, Esslöffel |
| `cup` | volume | us_customary | 240 | cup, cups, c | |
| `fl_oz` | volume | us_customary | 29.5735 | fl oz, fl. oz., fluid ounce, fluid ounces | |
| `pint` | volume | us_customary | 473.176 | pint, pints, pt | |
| `quart` | volume | us_customary | 946.353 | quart, quarts, qt | |
| `gallon` | volume | us_customary | 3785.41 | gallon, gallons, gal | |
| `c` | temperature | metric | | °C, C, celsius | Grad, Grad Celsius |
| `f` | temperature | us_customary | | °F, F, fahrenheit | |
| `piece` | count | shared | | piece, pieces, pc, pcs, x | Stück, St., Stk. |
| `pinch` | count | shared | | pinch, pinches | Prise, Prisen |
| `dash` | count | shared | | dash, dashes | Spritzer |
| `drop` | count | shared | | drop, drops | Tropfen |
| `clove` | count | shared | | clove, cloves | Zehe, Zehen |
| `slice` | count | shared | | slice, slices | Scheibe, Scheiben |
| `can` | count | shared | | can, cans, tin, tins | Dose, Dosen |
| `package` | count | shared | | package, packages, pack, pkg | Packung, Packungen, Pck., Päckchen |
| `bunch` | count | shared | | bunch, bunches | Bund |
| `handful` | count | shared | | handful, handfuls | Handvoll |
| `sprig` | count | shared | | sprig, sprigs | Zweig, Zweige |
| `stalk` | count | shared | | stalk, stalks, stick, sticks | Stange, Stangen |
| `leaf` | count | shared | | leaf, leaves | Blatt, Blätter |

German `Pfund` and `Tasse` are deliberately absent because their sizes are regional. Temperature converts by formula, `c = (f - 32) * 5 / 9`, rounded to the nearest 5.

### 9.3 Conversion targets and rounding
- To metric: mass becomes `g`, or `kg` when at least 1000 g; volume becomes `ml`, or `l` when at least 1000 ml; `f` becomes `c`.
- To US customary: mass becomes `oz`, or `lb` when at least 16 oz; volume becomes `cup` when at least 60 ml, `tbsp` when at least 15 ml, otherwise `tsp`; `c` becomes `f`.
- Metric rounding after conversion: to the nearest 1 below 20, nearest 5 below 200, nearest 10 below 1000, and to 0.05 when expressed in `kg` or `l`.
- US customary formatting: the nearest of 1/8, 1/4, 1/3, 1/2, 2/3, 3/4 and whole numbers when within 4 percent of the exact value, otherwise one decimal place.
- A range converts both ends and rounds each.

### 9.4 Parsing
`parse` handles, in order: an optional quantity in the forms `2`, `2.5`, `2,5`, `½` and the other Unicode vulgar fractions, `1/2`, `1 1/2`, and ranges written `2-3`, `2 – 3`, `2 to 3`, `2 bis 3`; then an optional unit alias; then the name; then notes, taken from a trailing parenthetical or from text after the first comma. The phrases `to taste`, `some`, `a little`, `nach Belieben`, `nach Geschmack`, `etwas` leave `quantity` null. `quantity_text` keeps the quantity exactly as written. Text that fits no pattern becomes the name with everything else null. The importer's AI extraction produces structured ingredients directly; `parse` serves the editor's raw-text entry and any plugin that receives free text.

**Non-goals.** Cross-dimension conversion such as a cup of flour to grams, which needs a density per ingredient; the library never carries ingredient knowledge, and a plugin may add it and store the result as an attribute. Display-time conversion and per-member unit preferences.

---

## 10. Core Plugins

These ship in the image under `/app/plugins/`, are enabled by default, and use only the APIs in sections 6 to 8. This table is an inventory. Each plugin gets its own specification, written once the kernel exists, following the template: pages, components, endpoints, tables, hooks, events, config schema, tests.

| Plugin | Owns | Declares |
|---|---|---|
| `core-recipes` | Recipe list, detail, editor pages; "add translation" copies the shown row into a new language row | Hubs `recipe:create` (provider `manual`, order 100) and `recipe:actions` (`edit` 10, `delete` 999); slots `recipe.list.filters`, `recipe.card.actions`, `recipe.detail.sidebar`, `recipe.detail.footer`, each with context `{ recipe }` |
| `core-timeline` | Week and day views; warms the cache with the current and next week and their recipes (8.8) | Hubs `entry:interact` (`view-recipe` 10, `remove` 999) and `timeline:assist` (no core providers); slots `timeline.day.footer` with `{ date }`, `timeline.entry.badge` with `{ entry }`, `timeline.sidebar` with `{ from, to }` |
| `core-members` | Member picker in `shell.header.right`, member editing in Settings | Sets `ss.store.currentMember`, persisted in localStorage |
| `units` | Hooks on recipe create and update that convert ingredient quantities into the household unit system (section 9) | Command `reconvert-all` |
| `cook-tracker` | Providers `mark-cooked`, `skip`, `log-leftover` on `entry:interact`, written through the outbox with client ids (8.8); journal page; entry type `leftover`; tables `plugin_cook_tracker_leftovers(schedule_entry_id, journal_id)` and `plugin_cook_tracker_carryovers(journal_id, resolved_by_entry_id)` | Slot `journal.entry.footer` with `{ entry }`; command `rebuild` |
| `shortlist` | Table `plugin_shortlist_entries(id, member_id, recipe_id REFERENCES recipes(id) ON DELETE CASCADE, note, created_at)` | Contributes to `recipe.card.actions` and `timeline.sidebar` |
| `ratings` | Table `plugin_ratings_scores(journal_id, member_id, score)`; mirrors the mean as attribute `ratings.score` for sorting | Contributes to `journal.entry.footer`; command `rebuild` |
| `ai-provider` | Config `provider` (enum, `gemini` only for now), `model`, `api_key` (secret), `monthly_budget`; table `plugin_ai_provider_calls`; public object `api.complete(schema, prompt, images=None)`, implemented on `google-genai` structured outputs with `response_schema` as `tmp` does; no multi-provider library, a second provider is a second branch behind the same object | Settings section with usage |
| `translator` | Requires `ai-provider`; config `target_languages`; on `recipe:created` and `recipe:updated` with `origin` other than itself, writes or overwrites the rows for each target language whose `origin` is `plugin:translator` or which do not exist yet | Command `retranslate-all` |
| `recipe-importer` | Requires `ai-provider`; providers `import-url`, `import-photo` on `recipe:create` and `import-shared` on `share:receive` (8.7); jobs with progress; online only | Slot contribution `recipe.detail.footer` for "imported from" |
| `meal-planner` | Requires `ai-provider`; config `system_prompt`, `days_ahead`; uses member restrictions, allergies, cuisines and serving ratios | Provider `suggest-week` on `timeline:assist` |
| `shopping-list` | Page `/shopping`; tables `plugin_shopping_list_lists` and `plugin_shopping_list_items`; its own ingredient normalization strategy; hub `shopping:export` (`copy-markdown`, `print`); check-offs and ad-hoc items go through the outbox (8.8) | Command `rebuild`; slot `shopping.item.actions` with `{ item }` |

The shopping list is the reference case for plugin-owned tables and for the outbox, the units plugin for hooks, and the translator for provenance-driven behavior. Two shopping plugins with different strategies can coexist because each keys its own tables.

---

## 11. Deployment

### 11.1 Container
The `Containerfile` has two stages. A `node:22` stage runs `pnpm install` and `pnpm build` in `shell/`. A `python:3.12-slim` stage installs `uv`, copies the kernel, the built shell into `secretsauce/static/`, and `plugins/` to `/app/plugins/`, runs `uv sync --frozen`, and starts `secretsauce serve`, one uvicorn worker (5.1). `/api/*` is the API, `/static/*` the shell assets, `/manifest.webmanifest` and `/sw.js` the installation files (8.2), and every other path returns `index.html` for SPA routing. `/data` is the only writable volume: database, `uploads/`, `plugins/`, `site/`, `config.json`, `secret.key`. It must be a local filesystem (4.1). `GET /api/health` answers `{"status": "ok", "boot_id": ..., "version": ...}` without authentication.

### 11.2 Base path
`BASE_PATH` defaults to `/`. When set, the server templates every URL in `index.html`, the import map and the manifest with it, `vue-router` is created with it as its base, and `ss.api` and `ss.url()` prefix it. Plugins never build URLs by hand, so a self-hosted instance behind `https://home.example.com/secretsauce/` works unchanged. Hosted tenants use `/`. The service worker is registered with scope `BASE_PATH` and classifies requests relative to it, and the manifest's `id`, `start_url`, `scope` and share target carry it, so an installed app under a prefix opens at the prefix.

### 11.3 Hosted tenants: origin isolation
Each family runs at `https://<family>.secretsauce.food` behind Caddy with wildcard TLS. Separate origins mean separate cookies, storage and service workers in the browser, so a plugin installed by one family cannot touch another family's session. The core codebase contains no multi-tenant logic; the orchestrator handles sign-up, billing, provisioning and DNS.

### 11.4 Hosted tenants: container isolation
The orchestrator starts every tenant with this line; the self-hosting docs use the same line without the quota flags.

```
podman run -d --name ss-<tenant> \
  --userns=auto --cap-drop=ALL --security-opt=no-new-privileges \
  --read-only --tmpfs /tmp:size=256m \
  --memory=512m --memory-swap=512m --cpus=1 --pids-limit=256 \
  --network=tenant-<tenant> \
  -v /tenants/<tenant>/data:/data:Z \
  secretsauce-instance
```

- **Rootless Podman with `--userns=auto`** gives each tenant a distinct subordinate uid range. A container escape lands as an unprivileged, unique user.
- **One bridge network per tenant.** Caddy is attached to every tenant network; tenants are never attached to each other's. Tenant to tenant traffic has no route.
- **Host nftables egress rules** drop packets from tenant bridges to RFC 1918 ranges, link-local including `169.254.169.254`, and the host. AI APIs stay reachable; the orchestrator and cloud metadata do not. Outbound port 25 is dropped.
- **The orchestrator listens on a unix socket.** The Podman socket is never mounted into a tenant.
- **Read-only root filesystem.** Plugin installs write only under `/data`.
- **Disk quota** by a loop-mounted ext4 image per tenant, sized at sign-up.
- **Health and restart.** A healthcheck on `/api/health`, `--restart=on-failure`, and orchestrator restarts on memory kills.

**Threat model.** A malicious plugin can destroy its own household's data, spend its own AI budget, and attack the internet from the host's IP. It cannot read other tenants, reach the orchestrator, exceed its quota, or escalate on the host. Outbound abuse is handled by monitoring and terms of service in the orchestrator.

### 11.5 Upgrades
A new image runs kernel migrations, then each plugin's pending migrations, then reinstalls plugin requirements if the interpreter version changed, then boots with a new boot id, which makes every open shell update its service worker and reload (8.4). A failed plugin migration marks that plugin `errored` and does not block the kernel.

### 11.6 HTTPS
Service workers, and with them installation and offline use, require a secure context: HTTPS, or `localhost`. Hosted tenants have TLS from Caddy. Self-hosters get the same by putting the container behind Caddy or another TLS terminator, or by exposing it through Tailscale Serve; the self-hosting docs show both and present one of them as the normal setup. A plain `http://` address on the LAN still runs the app in the browser, without installation or offline use, and `COOKIE_SECURE=false` remains the setting for that case. The shell detects the situation itself, since it registers the worker only in a secure context, so nothing needs configuring.

---

## 12. Testing

1. **Kernel (`pytest`)**: noun CRUD and revision conflicts per row; recipe rows keyed `<group_id>_<language>`, fallback reads, single-row delete with re-pointed references in kernel and plugin tables, and whole-recipe delete with foreign keys firing; FTS per language, trigram matches inside words, and the `LIKE` fallback for a `q` under three characters; reference integrity promises in 4.4; hook mutate and veto; event log ordering, per-plugin retry and skip, cursor catch-up and head-jump, loop rules 6 and 7; pushes never reach the log; job restart recovery; activate and deactivate a plugin while another plugin's job keeps running; setup flow, login delay with and without a trusted forwarded address, session rejection after a passphrase change, cross-site rejection by `Sec-Fetch-Site`; export and restore round trip; a boot with zero plugins; the manifest with and without a session; `sw.js` with its placeholder replaced; `Cache-Control: no-store` on API responses; client-supplied ids on create and 409 on a duplicate.
2. **Plugin harness**: `secretsauce.testing` exposes `async make_kernel(tmp_path, plugins: list[ModuleType | str] = []) -> Kernel`, which boots a kernel on a temporary data directory with the given plugin modules or paths and returns an object with `app`, `db`, the repositories, `ctx_for(plugin_id)`, and `client`, an `httpx.AsyncClient` already logged in; and `async drain_events(kernel)`, which runs every dispatcher to head and returns the delivered events. Every core plugin is tested through it, and it is the documented harness for third-party authors.
3. **Shell (`vitest`)**: registries for routes, slots, intents and settings, including removal on deactivate and route replacement by order; `<Slot>` and `<IntentTrigger>` behavior by provider count; `ss.api` conflict handling; reload on boot-id change only, and only after the worker update with a fake registration; `classify` for every row of the table in 8.3; the outbox: order, persistence across a reload, the 401 pause, 4xx failure with the handler called, the 409-on-create rule, and waiting entries of inactive plugins; `@secretsauce/ui/testing` ships `fakeSS()`, a recording fake of `ss` whose outbox can be told to apply or fail entries, for plugin authors.
4. **Units**: a fixture file `tests/fixtures/units_cases.json` of parse and format cases run against both implementations, conversion cases against Python only; the `units` plugin converts on create and update, passes shared units through, preserves `raw_text`, and `reconvert-all` is idempotent.
5. **Translator**: overwrites rows it wrote, leaves rows with `origin = member` alone, and never reacts to its own writes.
6. **End-to-end smoke** (`playwright` against the built image): boot with core plugins, create a recipe manually and through a mocked importer, see the German row appear, schedule it, mark it cooked, confirm the shopping list rebuilds and keeps a checkmark across a recipe edit; then take the browser offline, reload from the home route, open the recipe and the shopping list from the cache, check an item, go online, and see the check on the server and the offline bar gone.

---

## 13. Build Order

Each stage ends with a commit and with the named tests passing. A stage does not begin until the previous one is green. Stages 1 to 5 are the kernel; stage 6 proves the plugin API before the large plugins are written.

| Stage | Deliverable | Done when |
|---|---|---|
| 1 | `db.py`, migration runner, `0001_initial.sql` with every table in 4.3, the four repositories, FTS, assets, attributes, household config, `errors.py` | `test_db.py`, `test_nouns.py` pass, including revision conflicts, re-pointing and group delete |
| 2 | `hooks.py`, `events.py` with log writer, cursors, dispatchers, retry, pruning, loop rules | `test_hooks.py`, `test_events.py` pass |
| 3 | `plugins/loader.py`, `context.py`, `registry.py`, `jobs.py`, `secrets.py`, tokens, `testing.py`; fixture plugins under `tests/fixtures/plugins/` | `test_plugins.py` passes, including activate and deactivate at runtime and blocked dependencies |
| 4 | `app.py`, `auth.py`, every router in Appendix A including the manifest and `sw.js` routes, client ids on create, `stream.py` with replay, `install.py`, re-exec, `gc.py`, `cli.py` | `test_http.py`, `test_auth.py`, `test_pwa.py` pass against Appendix A |
| 5 | `shell/`: `@secretsauce/ui`, registries, router, `<Slot>`, `<IntentTrigger>`, settings, plugin manager, login and setup pages, stream client, service worker, outbox, offline bar, share page | `pnpm test` passes; an empty-plugin boot renders setup, login, settings and plugin manager, installs as an app, and starts offline |
| 6 | `secretsauce/units/`, the `units` plugin, the `recurring` plugin, their UI bundles | `test_units.py` passes; both plugins work through the harness and in the browser |
| 7 | Core plugins, one per specification, in the order `core-members`, `core-recipes`, `core-timeline`, `cook-tracker`, `shortlist`, `ratings`, `ai-provider`, `recipe-importer`, `translator`, `meal-planner`, `shopping-list` | each plugin's own tests pass |
| 8 | `Containerfile`, healthcheck, export and restore, smoke test | the smoke test in 12.6 passes against the built image, offline steps included |

---

## 14. Non-Goals and Deliberate Defaults

**Non-goals for this architecture:** multi-tenant logic in the core; plugin sandboxing inside the instance; per-plugin virtual environments; roles and permissions; cross-dimension unit conversion; display-time unit conversion or per-member unit preferences; a separate translations table or kernel-enforced consistency between language rows; data migration from `tmp`; merging conflicting offline edits (a rejected queued write is dropped and shown, 8.5); Web Push and any behavior while the app is closed; the Background Sync and Periodic Background Sync APIs; file share targets; queued writes from shell-owned pages; configurable app icons and colors; in-process reload of Python modules; a server-side session table.

**Deliberate couplings, kept on purpose:** one event cursor per plugin, which trades isolation between a plugin's handlers for causal ordering within the plugin; one pinned Vue and one pinned PrimeVue in the import map for every plugin bundle, which is what makes composition and a single look possible.

**Defaults chosen now, revisable later without structural change:** event retention of thirty days; twenty retry attempts; causal depth limit of eight; one reader connection; `synchronous=NORMAL`; hourly garbage collection; five-second dispatcher fallback poll; thirty-day sessions; 20 MB uploads; 50 MB plugin archives; a five-second network timeout before the cache answers; 1000 cached API responses, 200 assets and 50 plugin bundles; ten server errors before a queued write fails; a sixty-second outbox retry.

---

## Appendix A. REST API

### A.1 Conventions
- All paths are under `BASE_PATH` + `/api`. Bodies and responses are JSON with snake_case keys, except uploads, which are `multipart/form-data`.
- Authentication is the session cookie unless stated. Before setup, every route except health and setup answers 409 `setup_required`. Without a session, routes answer 401.
- Errors: `{"error": {"code": string, "message": string, "details": object | null}}`. Codes: `setup_required` 409, `unauthorized` 401, `forbidden` 403, `not_found` 404, `conflict` 409 with `details.current` as the stored row, `validation` 422 with `details.fields` as a map of field to message, `veto` 422 with `details.plugin_id`, `too_many_requests` 429, `payload_too_large` 413, `plugin_error` 500 with `details.plugin_id`.
- Lists: `limit` (default 50, maximum 200) and `offset`; response `{"items": [...], "total": n, "limit": n, "offset": n}`.
- Concurrency: `PATCH` bodies carry `revision`, the revision the client last saw; `DELETE` takes `?revision=`. Both answer 409 on mismatch. Group deletes take no revision.
- Creates: a `POST` body may carry `id` (for recipes, `group_id`) as a UUID v4 chosen by the client; the kernel uses it and answers 409 `conflict` with `details.current` when that row exists. Replays from the outbox (8.5) rely on this.
- Caching: every `/api` JSON response carries `Cache-Control: no-store`; asset files and plugin bundles carry immutable cache headers. The service worker's caches are the only caches of household data (8.3).
- `sort`: comma-separated fields, each optionally prefixed with `-` for descending. Fields are the noun's sortable columns, listed per resource, or `<plugin_id>.<key>` for an attribute, which sorts by `value_numeric` then `value_text`. Rows without the attribute sort last.
- `attr`: repeatable; each value is `<plugin_id>.<key><op><value>` with `op` one of `=`, `!=`, `<`, `<=`, `>`, `>=`. A numeric value compares against `value_numeric`, any other value against `value_text`. Multiple `attr` parameters are combined with AND. Clients URL-encode the operator.
- Row responses for the four nouns are the table columns as JSON, with JSON columns decoded. Recipe responses add `languages: string[]`.

### A.2 Setup, auth, health
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/health` | | 200 `{status, boot_id, version}`; no auth |
| GET | `/setup` | | 200 `{needs_setup: bool}`; no auth |
| POST | `/setup` | `{household_name, passphrase, first_member: {name, preferred_language}}` | 201 `Member`, sets cookie; 409 if already set up |
| POST | `/auth/login` | `{passphrase}` | 204, sets cookie; 401; 429 with `Retry-After` |
| POST | `/auth/logout` | | 204, clears cookie |
| GET | `/auth/session` | | 200 `{logged_in: bool, boot_id, version}`; no auth |

### A.3 Household and members
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/household` | | 200 `{household_name, meal_types, languages, units}` |
| PATCH | `/household` | any subset of those keys | 200 same shape |
| PUT | `/household/passphrase` | `{current, new}` | 204 and a fresh cookie for the caller; every other session is invalid from then on (5.3); 401 if `current` is wrong |
| GET | `/members` | `sort` in `name`, `created_at` | 200 list of `Member` |
| POST | `/members` | `Member` without `revision` and timestamps; `id` optional | 201 `Member`; 409 if `id` exists |
| GET | `/members/{id}` | | 200 `Member` |
| PATCH | `/members/{id}` | `{revision, ...fields}` | 200 `Member`; 409 |
| DELETE | `/members/{id}` | `?revision=` | 204; 409 |

### A.4 Recipes
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/recipes` | `lang` (default: primary), `q`, `tag` (repeatable), `attr`, `sort` in `title`, `created_at`, `updated_at`, `limit`, `offset` | 200 list of `Recipe`, one per group, resolved in `lang`; `total` counts groups |
| POST | `/recipes` | `Recipe` draft; `language` required; optional `group_id` to add a language row or to fix the id of a new recipe | 201 `Recipe`; 409 `conflict` if that `id` exists |
| GET | `/recipes/{id}` | | 200 exactly that row |
| GET | `/recipes/{group_id}` | `lang` | 200 resolved row; 404 if the group is empty |
| PATCH | `/recipes/{id}` | `{revision, ...fields}` | 200 `Recipe`; 409 |
| DELETE | `/recipes/{id}` | `?revision=` | 204; references re-pointed per 4.4 |
| DELETE | `/recipes/{group_id}` | | 204; the whole group |

With `q` of three or more characters, the list searches FTS over rows in `lang` and in the primary language, deduplicated by group, and ignores `sort`, returning FTS rank order. A shorter `q` cannot use the trigram index and instead matches `title` case-insensitively with `LIKE`, sorted by `title`.

### A.5 Schedule and journal
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/schedule` | `from`, `to` (inclusive dates, required, at most 62 days), `lang`, `attr`, `sort` in `date`, `position` | 200 list of `ScheduleEntry`, each with `recipe: Recipe \| null` resolved in `lang` |
| POST | `/schedule` | draft; `id` optional | 201; 409 if `id` exists |
| GET | `/schedule/{id}` | `lang` | 200 with `recipe` |
| PATCH | `/schedule/{id}` | `{revision, ...fields}` | 200; 409 |
| DELETE | `/schedule/{id}` | `?revision=` | 204; 409 |
| GET | `/journal` | `from`, `to`, `lang`, `attr`, `sort` in `date` | 200 list of `JournalEntry`, each with `recipe` |
| POST | `/journal` | draft; `id` optional | 201; 409 `conflict` if `id` exists or `schedule_entry_id` already has a row |
| GET | `/journal/{id}` | `lang` | 200 |
| PATCH | `/journal/{id}` | `{revision, ...fields}` | 200; 409 |
| DELETE | `/journal/{id}` | `?revision=` | 204; 409 |

### A.6 Assets and attributes
| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/assets` | multipart: `file`, `entity_type`, `entity_id`, `slot` (default `primary`), `sub_id` | 201 `Asset`; 413; 422 for a disallowed type |
| GET | `/assets` | `entity_type`, `entity_id` | 200 list of `Asset` |
| GET | `/assets/{id}` | | 200 `Asset` |
| GET | `/assets/{id}/file` | | 200 bytes with the stored content type, `Cache-Control: private, max-age=31536000, immutable` |
| DELETE | `/assets/{id}` | | 204 |
| GET | `/attributes` | `entity_type`, `entity_id` | 200 `{"<plugin_id>.<key>": value, ...}` |

Attributes are written only through `ctx.attributes`.

### A.7 Plugins, jobs, stream, export
| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/plugins` | | 200 list of `PluginEntry` |
| GET | `/plugins/{id}` | | 200 `PluginEntry` |
| POST | `/plugins/{id}/enable` | | 200 `PluginEntry` after activation |
| POST | `/plugins/{id}/disable` | | 200 `PluginEntry` |
| GET | `/plugins/{id}/config` | | 200 config with secrets masked |
| PUT | `/plugins/{id}/config` | full config object | 200 masked config; 422 `validation`; the plugin is deactivated and activated |
| POST | `/plugins/{id}/commands/{name}` | | 202 `{job_id}`; 404 if the command is not registered |
| POST | `/plugins/install` | multipart `file` zip; `?upgrade=true` | 202 `{job_id}`; 413 |
| DELETE | `/plugins/{id}` | `?delete_data=true` | 202 `{job_id}`; 403 for a core plugin |
| GET | `/plugins/{id}/ui.js`, `/plugins/{id}/ui.css` | `v` | 200 the bundle; immutable cache headers |
| GET | `/jobs` | `status`, `plugin_id`, `limit`, `offset`; sorted by `created_at` descending | 200 list of `Job` |
| GET | `/jobs/{id}` | | 200 `Job` |
| POST | `/jobs/{id}/cancel` | | 200 `Job` |
| GET | `/events/stream` | header `Last-Event-ID` optional | `text/event-stream`, see below |
| GET | `/export` | | 200 `application/zip` |
| GET | `/export/json` | | 200 JSON `{recipes, schedule_entries, cook_journal, household_members, assets, household_config}` |
| any | `/x/{plugin_id}/...` | plugin-defined | plugin-defined; 401 without cookie, or bearer token for `auth="token"` routes |

**Stream frames.** The first frame is `event: hello` with data `{"boot_id": ..., "seq": <current head>}`. When `Last-Event-ID` is present, the kernel then replays every event with a greater `seq` from the log before going live. Log events are sent as `id: <seq>`, `event: event`, data `StreamEvent`. Pushes are sent as `event: push`, data `StreamPush`, without an id. A comment frame `: ping` is sent every twenty seconds.

### A.8 Outside `/api`
All under `BASE_PATH`, none authenticated.

| Method | Path | Response |
|---|---|---|
| GET | `/static/{file}` | 200 the built shell file; `Cache-Control: public, max-age=31536000, immutable`; every name carries a content hash. `index.html` and `sw.js` are never served here, only templated at their own paths |
| GET | `/manifest.webmanifest` | 200 `application/manifest+json` templated per 8.2; `name` carries the household name only when the request has a session; `Cache-Control: no-cache` |
| GET | `/sw.js` | 200 `text/javascript`, the built worker with `__SS_PRECACHE__` replaced; `Cache-Control: no-cache` |
| GET | any other path | 200 `index.html` templated per 7.1; `Cache-Control: no-cache`. `/share?title=&text=&url=` is one such path, handled by the shell (8.7) |

## Appendix B. JSON Shapes

```ts
interface Ingredient {
  id: string                     // uuid, stable across edits and languages
  raw_text: string               // as authored or imported, never modified by the kernel or the units hook
  name: string
  quantity: number | null        // null: unspecified, "to taste"
  quantity_max: number | null    // set only for a range; quantity is then the lower bound
  quantity_text: string          // the quantity exactly as written, "1 1/2", "2-3", ""
  unit: string | null            // canonical id from the unit table, or free text when unrecognized
  notes: string | null           // "minced", "room temperature"
}
interface Step { id: string; instruction: string; timer_minutes: number | null }

interface Recipe {
  id: string; group_id: string; language: string; revision: number
  title: string; description: string | null
  ingredients: Ingredient[]; steps: Step[]
  servings: number; yield_text: string | null
  prep_time_minutes: number | null; cook_time_minutes: number | null; total_time_minutes: number | null
  tags: string[]; source: { type: "url"; url: string } | { type: "book"; title: string; page?: string } | null
  created_at: string; updated_at: string; actor_member_id: string | null; origin: string
  languages: string[]            // response only: every language the group exists in
}
interface ScheduleEntry {
  id: string; revision: number; date: string; meal_type: string; entry_type: string
  recipe_id: string | null; title: string | null; note: string | null; servings_override: number | null
  position: number; assigned_cook_id: string | null; participant_member_ids: string[]
  created_at: string; updated_at: string; actor_member_id: string | null; origin: string
  recipe?: Recipe | null         // list and get responses only, resolved in `lang`
}
interface JournalEntry {
  id: string; revision: number; date: string; meal_type: string
  recipe_id: string | null; schedule_entry_id: string | null; title: string | null
  status: "cooked" | "skipped" | "dined_out"; servings_cooked: number | null; servings_left: number | null
  cooked_by_member_id: string | null; notes: string | null
  created_at: string; updated_at: string; actor_member_id: string | null; origin: string
  recipe?: Recipe | null
}
interface Asset {
  id: string; entity_type: string; entity_id: string; sub_id: string | null; slot: string
  filename: string; content_type: string; size_bytes: number; created_at: string
  url: string                    // response only: "/api/assets/{id}/file" under the base path
}
interface Job {
  id: string; plugin_id: string; job_type: string
  status: "pending" | "running" | "done" | "failed" | "cancelled"
  progress: number; message: string | null; input: unknown; result: unknown; error: string | null
  created_at: string; started_at: string | null; finished_at: string | null
}
interface PluginEntry {
  id: string; version: string; name: string; description: string; core: boolean
  enabled: boolean; state: "active" | "disabled" | "blocked" | "errored"; last_error: string | null
  schema_applied: number; requires: string[]; ui: boolean; ui_api: number
  config_schema: object | null; commands: { name: string; title: string }[]
  skipped_events: number
}
```

Python plugins see the same shapes as plain dicts with the same keys. The `PLUGIN` dict's keys and defaults are in 6.1.

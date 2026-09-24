# SecretSauce Kernel Architecture

This document describes the design, concurrency model, persistence layer, security subsystem, and runtime lifecycle of the SecretSauce Core Kernel.

---

## 1. System Overview

SecretSauce Core is a local-first, self-hostable recipe and meal management runtime designed to run on resource-constrained devices (such as a Raspberry Pi or personal home server) with zero cloud dependencies.

The kernel is built with **Python 3.12+**, **FastAPI**, **aiosqlite**, and **Uvicorn**, adhering to the following design principles:
1. **The Database is the File Format**: SQLite WAL mode stores the entire operational state. A single snapshot (`VACUUM INTO`) serves as a portable backup.
2. **Strict Optimistic Revision Concurrency**: High-contention entities (`household_members`, `recipes`, `cook_journal`) carry integer revision counters, returning HTTP `409 Conflict` on concurrent mutations.
3. **Synchronous Hooks & Transactional Outbox**: Policy enforcement (veto and mutation) happens synchronously inside database transactions; event logging and plugin notifications use a transactional outbox pattern to guarantee at-least-once delivery.
4. **Sandboxed Plugin SDK**: Plugins contribute capabilities via a strongly-typed `PluginContext` SDK without direct table coupling or cross-plugin database corruption.

---

## 2. Concurrency & Database Engine (`secretsauce/db.py`)

SQLite in Write-Ahead Logging (WAL) mode enables concurrent readers alongside a single writer. The kernel implements this using two distinct connections:

```
                  ┌──────────────────────┐
                  │   FastAPI App / SDK  │
                  └──────────┬───────────┘
                             │
               ┌─────────────┴─────────────┐
               │                           │
        asyncio.Lock()                     │
               │                           │
      ┌────────▼─────────┐        ┌────────▼─────────┐
      │ Writer Connection│        │ Reader Connection│
      │   (WAL / Write)  │        │   (WAL / Read)   │
      └────────┬─────────┘        └────────┬─────────┘
               │                           │
               └─────────────┬─────────────┘
                             │
                    ┌────────▼────────┐
                    │ secretsauce.db  │
                    │   (-wal, -shm)  │
                    └─────────────────┘
```

- **Single Writer Connection**: Guarded by an `asyncio.Lock`. All mutating operations (`INSERT`, `UPDATE`, `DELETE`, `VACUUM INTO`) execute through `db.transaction()` or `db.vacuum_into()`.
- **Re-entrant transactions**: The task that holds the writer may open `db.transaction()` again (a pre-commit hook writing through `ctx.db`, a repository called without `conn`). The nested block joins the open transaction through a `SAVEPOINT` instead of deadlocking on the lock the task already holds. A failure inside it rolls back to the savepoint only.
- **Rollback on cancellation**: A transaction rolls back on any `BaseException`, including `asyncio.CancelledError`, and the rollback is shielded from a second cancellation. A cancelled request can never leave the writer inside an open transaction.
- **Commit and rollback callbacks**: `db.after_commit(fn, key=None)` runs `fn` only after the outermost transaction commits (SSE broadcasts, dispatcher wake-ups, deleting a replaced file); with a `key` it runs at most once per transaction. `db.on_rollback(fn)` undoes side effects outside the database, such as removing an uploaded file whose row never committed. Both respect savepoints.
- **Single Reader Connection**: Handles `SELECT` queries without acquiring the write lock. Every read executes and drains its statement in one step on the connection's thread (`execute_fetchall`): a statement left open across an `await` pins a read snapshot that every other task sharing the connection would then see.
- **Atomic migrations**: Scripts run statement by statement (`split_sql_script` respects triggers, strings and comments) inside one transaction together with their bookkeeping row. `executescript()` is not used because it commits any pending transaction first.
- **Connection Pragma Configuration**:
  - `PRAGMA journal_mode=WAL;`
  - `PRAGMA foreign_keys=ON;`
  - `PRAGMA synchronous=NORMAL;`
  - `PRAGMA busy_timeout=5000;`

---

## 3. Cryptography & Identity (`secretsauce/secrets.py`, `secretsauce/auth.py`)

The kernel uses a single Master Key stored at `/data/secret.key` (with strict `0600` permissions) to derive application subkeys via HKDF (HMAC-based Key Derivation Function, RFC 5869) using SHA-256:

```
                        ┌──────────────────┐
                        │ /data/secret.key │ (32 raw random bytes)
                        └────────┬─────────┘
                                 │
                   HKDF-Expand(SHA-256, info)
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌───────────────────────────────┐     ┌──────────────────────────────────┐
│ Subkey: "secretsauce/session" │     │ Subkey: "secretsauce/config"     │
│   (Timed Session Signer)      │     │   (Fernet Symmetric Encryption)  │
└───────────────────────────────┘     └──────────────────────────────────┘
```

1. **Passphrase Authentication**:
   - The passphrase is stored in `household_config` as `scrypt$<n>$<r>$<p>$<salt>$<hash>` (`n=2**15, r=8, p=1`, base64 parts). Hashes in the older `scrypt$<salt hex>$<hash hex>` format still verify. Hashing runs in a worker thread so it never blocks the event loop. New passphrases need at least 8 characters.
   - Session cookies (`ss_session`) are signed with the `secretsauce/session` subkey via `itsdangerous.URLSafeTimedSerializer`, carry `{session_id, passphrase_version}` and are valid for 30 days.
   - Changing the passphrase increments `passphrase_version`, which invalidates every other session.
   - Logout records the session id in `revoked_sessions` until the cookie would have expired, so a copied cookie stops working too.
   - The cookie's `Secure` flag follows `COOKIE_SECURE`: `true`, `false`, or `auto` (set when the request scheme is https).
2. **Request Authentication (`AuthMiddleware`)** fails closed:
   - While no kernel is attached (still booting) every `/api` route except `/api/health` answers 503.
   - Kernel routes and plugin routes mounted with `auth="cookie"` require the session cookie.
   - Bearer tokens are accepted only on routes a plugin mounted with `auth="token"`, where the token's scope and owning plugin must match the route, and on `GET /api/auth/session`.
   - `X-Actor-Member` is honoured only when it names an existing member.
3. **Rate Limiting & Brute-Force Defense**:
   - After `n` consecutive failures from one address, attempts within `min(2^(n-1), 60)` seconds answer 429 with `Retry-After`. Login and passphrase rotation share the limiter, which lives on the kernel and tracks at most 10,000 addresses.
   - `Sec-Fetch-Site: cross-site` requests with session cookies are blocked with HTTP 403.
4. **Encrypted Configuration**:
   - Plugin config fields whose schema carries `"secret": true` are stored encrypted with the Fernet subkey (`secretsauce/config`). Plaintext secrets written by older versions are encrypted the first time the plugin loads.
   - Every endpoint that returns plugin config (`/api/plugins`, `/api/plugins/{id}`, `/api/plugins/{id}/config`) masks secrets as `••••••••`; submitting the mask keeps the stored value.
   - Plugins read clear values through `ctx.config`.
5. **API Bearer Tokens (`api_tokens.py`)**:
   - Machine tokens (`ss_tok_<urlsafe32>`) are stored as SHA-256 hashes behind a unique index.
   - `last_used_at` is written at most once every 10 minutes per token.

---

## 4. Domain Noun Model & Storage Architecture

```
                                  ┌──────────────────┐
                                  │ household_config │
                                  └────────┬─────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         │                  │                    │                  │
┌────────▼──────────┐ ┌─────▼──────┐     ┌───────▼────────┐  ┌──────▼───────┐
│ household_members │ │  recipes   │◄────┤schedule_entries│  │ cook_journal │
└────────┬──────────┘ └───┬───┬────┘     └───────┬────────┘  └──────┬───────┘
         │                │   │                  │                  │
         │                │   └────────────┐     │                  │
         │                │                │     │                  │
         │          ┌─────▼──────┐   ┌─────▼─────▼──────────────────▼───────┐
         │          │recipes_fts5│   │                assets                │
         │          └────────────┘   └──────────────────────────────────────┘
         │                                       │
         └───────────────────────────────────────┴───────────────┐
                                                                 │
                                                    ┌────────────▼─────┐
                                                    │ entity_attributes│
                                                    └──────────────────┘
```

### 4.1 Recipes (`secretsauce/nouns/recipes.py`)
- **Composite Keying**: Recipes are grouped by `group_id` with language rows (`<group_id>_<language>`).
- **Trigram FTS5**: Full-text search using SQLite FTS5 trigram tokenizer enables substring search within compound words (essential for languages like German), with fallback to `LIKE` for queries under 3 characters.
- **Language Resolution**:
  1. Requested language (e.g. `de`).
  2. Household primary language (`household_config.languages.primary`).
  3. Oldest available language row in group.
- **Foreign Key Safe Deletion**: Deleting a language row re-points every foreign key that references it to the primary-language row of the group, or the oldest surviving one. Deleting the last row deletes the whole group with its assets and attributes.
- **Listing**: `list_recipes` resolves every group in one windowed query (`ROW_NUMBER() OVER (PARTITION BY group_id ...)`) and applies search, tag and attribute filters and sorting to the resolved row, so the query count does not grow with the number of recipes.

### 4.2 Household Members (`secretsauce/nouns/members.py`)
- Stores member profiles, avatars, dietary restrictions, allergies, and serving ratios.
- Guarded by optimistic revision checks. Deleting a member removes its assets and attributes and its id from every schedule entry's participants.

All repositories validate required fields (`ValidationError` → 422), take an optional `conn` to join the caller's transaction, and emit their events when constructed with the kernel's `EventLog`.

### 4.3 Schedule & Cook Journal (`secretsauce/nouns/schedule.py`, `journal.py`)
- `schedule_entries`: Planned meals by date, meal type, participant members, and recipe ID.
- `cook_journal`: Actual cook history, servings cooked vs. left over, notes, and member attribution.
- Lists embed each entry's `recipe`, fetched for the whole page in one query (`RecipesRepo.get_recipes_by_ids`).

### 4.4 Assets & Entity Attributes (`secretsauce/nouns/assets.py`, `attributes.py`)
- `assets`: Files stored at `uploads/<yyyy>/<mm>/<id>.<ext>`, recorded with entity type, entity id and optional `sub_id` (e.g. a photo tied to a step). The declared content type must match the file's signature and determines the extension. A file written for a row that rolls back is removed; a deleted asset's file is removed only after the deletion commits.
- `entity_attributes`: Scoped key-value store enabling plugins to annotate core nouns (e.g. `core-ratings.score`, `nutrition.calories`) with numeric or text values. `AttributesRepo` provides `set_attribute`, `delete_attribute`, `get_attributes`, `get_all_attributes` and `query_entity_ids`; `filter_sql` turns `<plugin>.<key><op><value>` filters into SQL for the recipe listing.

---

## 5. Event Log, Outbox Dispatchers & Streaming

```
[ Repository mutation ]──same transaction──▶ INSERT INTO events (... cause_seq, depth)
                                                   │ after commit
                          ┌────────────────────────┴───────────────────────┐
                          ▼                                                ▼
                 EventPump.wake()                                 EventBroadcaster
       one dispatcher task per active plugin                bounded queue per SSE client
                          │                                                │
                          ▼                                                ▼
        plugin handlers, in order, cursor per plugin          GET /api/events/stream
```

1. **Transactional append**: The kernel repositories (recipes, schedule, journal, members, assets) append `<noun>:created|updated|deleted` inside the mutation's own transaction, with `before`/`after` snapshots in `data` (embedded joins such as a schedule entry's `recipe` are left out). A vetoed or failed write leaves neither row nor event. Deleting a recipe emits one `recipe:deleted` per language row. The kernel also logs `plugin:activated|deactivated` and `job:started|finished` with origin `system`.
2. **Origin and causation**: `origin` describes each write, never an earlier one: `member` for REST writes, `plugin:<id>` for writes made while a plugin's handler, job or background task runs (the `acting_as` context variable), or an explicit value passed by kernel code. Writes made inside an event handler record the delivered event as `cause_seq` and `depth + 1`; a write deeper than 8 raises `EventDepthError` and is logged, which stops feedback loops.
3. **Broadcast after commit**: SSE broadcasts and dispatcher wake-ups are registered with `db.after_commit`, so no browser or plugin hears about a write that rolled back.
4. **Delivery (`EventPump`, `EventDispatcher`)**: One task per active plugin drains `events WHERE seq > last_seq` in batches of 100. It wakes after every commit that appended events, and every 5 seconds otherwise. Drains are serialized per plugin, so an event is never delivered twice at once. Events a plugin has no handler for only advance its cursor. A failing event is retried after 1 s, 10 s, 60 s, then every 10 minutes, and skipped after 20 attempts with the traceback kept in `event_cursors.last_error`. A failing plugin never delays the others. The dispatcher skips events whose origin is the plugin itself unless the handler subscribed with `include_self=True`.
5. **Cursors**: A plugin activated for the first time starts at the log head and never replays history. A disabled plugin keeps its cursor and catches up when re-enabled; if the events it missed were pruned meanwhile, its cursor moves to head and its `rebuild` command, if registered, is queued.
6. **SSE stream (`secretsauce/stream.py`)**: `GET /api/events/stream` sends named events whose data always carries `kind`:
   - `hello` with `boot_id` and the head `seq`;
   - `event` frames with the envelope (no `data`) and `id: <seq>`;
   - `push` frames `{"kind": "push", "name", "data", "plugin_id"}` for transient messages such as `job:progress`.

   Replay starts after `Last-Event-ID` (header) or `?last_event_id=` (for a freshly opened `EventSource`) and pages through the log up to the hello position; live frames at or below it are skipped. Each client has a bounded queue of 1,000 items; a client too slow to drain it is disconnected and replays what it missed when it reconnects.

---

## 6. Background Jobs & Recovery (`secretsauce/jobs.py`)

Long-running plugin work (imports, translations, reconversions, commands) runs as jobs:
- **Lifecycle**: `pending` → `running` → `done` | `failed` | `cancelled`. `job:started` and `job:finished` (with the final status) are logged events. Progress (`handle.set_progress(percent, message)`) updates the row and reaches browsers as a `job:progress` push; it never enters the log.
- **Runner**: `JobManager.start()`, called at app startup, runs pending jobs as tracked tasks, waking when a job is created and every 5 seconds. A job is claimed atomically (`pending` → `running` in one `UPDATE`), so it runs once. Jobs whose plugin has not registered a handler stay pending until it does. Handlers run as `plugin:<id>` for origin purposes.
- **Cancellation**: `cancel_job` marks the job `cancelled` and cancels its running task. A job cancelled before it started never runs, and a cancelled or finished job's result cannot be overwritten.
- **Commands**: `ctx.command(name, fn, title)` registers `fn` as a job of type `command:<name>`; `POST /api/plugins/{id}/commands/{name}` queues it and answers `202 {"job_id"}`.
- **Boot recovery**: Jobs still `running` when the previous process stopped become `failed` with the message `interrupted by restart`. Pending jobs stay queued.
- **Explicit execution**: `JobManager.run_job(job_id)` runs a job in the caller's task; tests and scripts use it.

---

## 7. Units Engine Subsystem (`secretsauce/units/`)

The kernel includes a localized culinary units parsing, conversion, and formatting engine designed for ingredient text processing:

1. **Units Definition Table (`units.json`)**:
   - Classifies units into dimensions: `mass`, `volume`, `temperature`, `length`, `time`, and `count`.
   - Associates unit factors relative to SI base units (`g` for mass, `ml` for volume).
   - Maps localized aliases across languages (`en`, `de`), e.g., `"tbsp"`, `"tablespoon"`, `"EL"`, `"Esslöffel"`.
2. **Natural Language Ingredient Parsing (`parse`)**:
   - Parses vulgar Unicode fractions (`¼`, `½`, `¾`, `⅓`, `⅔`, `⅛`, `⅜`, `⅝`, `⅞`) and standard slash fractions (`1 1/2`, `3/4`).
   - Extracts quantity ranges (`2-3 cloves`) and subjective amounts (`pinch of salt`).
   - Extracts parenthetical notes (`cloves garlic (minced)`) and resolves leading unit names to canonical IDs.
3. **Dimensional Conversion & Rounding (`convert`)**:
   - Converts between units within the same dimension (rejects cross-dimensional conversion like `g` to `ml`).
   - For temperatures (`f` and `c`), rounds converted values to the nearest 5°.
4. **Target System Normalization (`to_system`)**:
   - Translates measurements between `metric` and `us_customary`.
   - Implements tiered rounding rules for metric output (<20g/ml integer, 20-199g/ml nearest 5, 200-999g/ml nearest 10, >=1kg/l to 0.05 step).
5. **Formatting (`format`)**:
   - Formats quantities with localized decimal separators.
   - For US customary measurements, renders remainders within 0.04 tolerance as Unicode vulgar fraction glyphs (`1 ¼ cup`).

---

## 8. Plugin Runtime, Core Plugins & Dynamic UI Serving

1. **Discovery**: The loader scans `secretsauce/plugins/core/` and then `<data_dir>/plugins/`, each in sorted order; the first plugin found with a given id wins. A package plugin is imported as `ss_plugin_<id>` and registered in `sys.modules` as a real package, so it can import its own submodules (`from .helpers import ...`). Modules are never re-imported in a running process.
2. **Ordering and dependencies**: Plugins activate in topological order of `requires`, ties broken by id. A plugin whose required dependency is missing, errored, disabled or not active is `blocked`, transitively. Plugins in a dependency cycle are `blocked` with the cycle named. Optional dependencies (`"id?"`) only affect ordering.
3. **Activation**: Pending migrations run atomically (a failing migration marks the plugin `errored` and boot continues), the event cursor is prepared, `setup(ctx)` runs, the plugin's dispatcher joins the event pump and `plugin:activated` is logged. An exception in `setup` marks the plugin `errored`, removes whatever it had registered, and affects nothing else.
4. **Runtime enable/disable**: `POST /api/plugins/{id}/disable` calls `teardown()` if defined, cancels the plugin's background tasks and running jobs, and removes its hooks, event handlers, routes, services, commands and job handlers. Active dependents become `blocked`. `enable` re-activates the plugin and re-evaluates blocked dependents. No restart is involved.
5. **Context (`PluginContext`)**: Each plugin gets one context holding the kernel's own repositories, so plugin writes run the same hooks and append the same events as REST writes. `ctx.config` is the plugin's configuration with schema defaults applied and secrets decrypted; it is live, so config changes apply without re-activation.
6. **Routes (`RouterRegistry`)**: `ctx.router(router, auth="cookie" | "token", scope=None)` mounts a router before the SPA fallback. Every path must lie under `/api/x/<plugin_id>/`; anything else fails activation. Plugin endpoints receive their context through the dependency `secretsauce.plugins.context.current_ctx`. An unhandled exception in a plugin route answers 500 `plugin_error` with `details.plugin_id` and is logged against the plugin.
7. **Database schema**: Plugin migrations create tables prefixed `plugin_<plugin_id>_`. Foreign keys are enforced, so a plugin table declaring `REFERENCES recipes(id) ON DELETE CASCADE` cleans up with the noun.
8. **UI bundles**: `GET /api/plugins/active` lists active plugins with `ui_entry`/`ui_css` URLs that include the base path and a content version (`?v=<sha256 prefix>`). `GET /api/plugins/{id}/ui.js|ui.css` serves the bundle with an ETag (304 on match) and immutable caching for versioned URLs. Bundle bytes and ETags are cached in memory and re-read only when the file changes.

---

## 9. Garbage Collector (`secretsauce/gc.py`)

An hourly background task, started with the app, cleans lazy references:
1. **Unlinked uploads**: Walks `uploads/` recursively (files live in `uploads/<yyyy>/<mm>/`) and deletes files with no matching `assets.storage_path`. Files younger than one hour are kept, since they may belong to an upload whose row has not committed yet.
2. **Orphaned sub-id assets**: Deletes, in bulk, recipe assets whose `sub_id` no longer appears in the ingredients or steps of any language row of the recipe.
3. **Event pruning**: Deletes events older than 30 days that are at or below the cursor of every *active* plugin. Disabled plugins do not hold the log back (see cursors in section 5).

---

## 10. Backup, Export & Restore (`secretsauce/api/routes/export.py`)

- **Full backup (`GET /api/export` / `secretsauce export`)**: A `VACUUM INTO` copy of the database plus `uploads/`, `plugins/`, `site/` and `config.json`. The zip is built in a temporary file by a worker thread and streamed, so large upload folders neither block the event loop nor sit in memory.
- **Restore (`secretsauce restore <backup.zip>`)**: Validates the archive (it must contain `secretsauce.db`, and no path may escape the target), removes stale `secretsauce.db-wal`/`-shm` files that would otherwise be replayed onto the restored database, and streams each entry to disk.
- **Data interop (`GET /api/export/json`)**: Every kernel noun as JSON with JSON columns decoded (recipe ingredients, steps, tags and source; schedule participants; member lists).

---

## 11. Runtime Boot & `BootedKernel` Lifecycle (`secretsauce/boot.py`)

`boot()` is the single composition root. The production app (`build_app`) and the test harness (`secretsauce.testing.make_kernel`) both use it, so tests exercise the production wiring.

1. **Data directory**: `resolve_data_dir()` takes the explicit argument, then `DATA_DIR`, `SECRETSAUCE_DATA_DIR`, `/data` if it exists, else `./data`; `uploads/` and `plugins/` are created.
2. **Config & keys**: Loads `config.json` (environment variables override it) and the `KeyManager` (`secret.key`).
3. **Database**: Connects and runs pending kernel migrations.
4. **Wiring**: `BootedKernel` builds the event log, broadcaster and event pump, the hook registry, the noun repositories (sharing hooks and events), jobs, tokens, sessions, the rate limiter, services, the router registry, the plugin registry and the loader.
5. **Recovery & plugins**: Jobs left running by a previous process are failed, revoked sessions are loaded, and plugins are discovered and activated.
6. **Precache**: Static shell assets are hashed once for the service worker (`kernel.precache_info`).
7. **Services**: The app lifespan calls `kernel.start_services()` (event pump, job runner, garbage collector) and `kernel.shutdown()` on exit, which stops them, tears plugins down and closes the database. The test harness leaves services off unless `make_kernel(..., services=True)`; tests deliver events with `drain_events()` and run jobs with `run_job()`.

### Kernel Attributes & Accessors
Routes reach the kernel through `request.app.state.kernel`:
- `kernel.db`: database and transaction runner.
- `kernel.household`, `kernel.members`, `kernel.recipes`, `kernel.schedule`, `kernel.journal`, `kernel.assets`, `kernel.attributes`: noun repositories.
- `kernel.registry` (alias `kernel.plugins`): `PluginRegistry` for plugin rows, manifests and configuration.
- `kernel.loader`: `PluginLoader`, including `enable()` and `disable()`.
- `kernel.ctx_for(plugin_id)` / `kernel.active_ctx(plugin_id)`: plugin contexts.
- `kernel.events`, `kernel.pump`, `kernel.broadcaster`, `kernel.jobs`, `kernel.tokens`, `kernel.sessions`, `kernel.rate_limiter`.

---

## 12. Command-Line Interface (`secretsauce/cli.py`)

The kernel entry point provides four core operational subcommands:

- **`serve`**: Starts the single-worker Uvicorn ASGI server with proxy headers and forwarded IPs enabled.
  - Arguments: `--host` (default `0.0.0.0`), `--port` (default from config or `8080`), `--data-dir`.
  - Environment: Respects `PORT`, `DATA_DIR`, `FORWARDED_ALLOW_IPS`, and `LOG_LEVEL`.
- **`migrate`**: Runs pending database schema migrations on `secretsauce.db`.
- **`export`**: Takes a hot backup snapshot of the system into an archive zip file.
  - Arguments: `--output` (target zip path), `--data-dir`.
- **`restore`**: Restores database, uploads, plugins, and configuration from an export zip file into `data_dir`.
  - Arguments: `backup` (positional path to zip file), `--data-dir`.


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
- **Single Reader Connection**: Handles non-blocking `SELECT` queries without acquiring the write lock.
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
   - Master passphrase stored in `household_config` using Scrypt KDF (`n=32768, r=8, p=1`).
   - Session cookies signed with `secretsauce/session` subkey via `itsdangerous.URLSafeTimedSerializer`.
   - Each session cookie binds: `{household_id, passphrase_version, created_at}`.
   - Changing the household passphrase increments `passphrase_version`, instantly invalidating all active sessions across all devices.
2. **Rate Limiting & Brute-Force Defense**:
   - Failed authentication attempts increment a backoff delay up to 10 seconds.
   - `Sec-Fetch-Site: cross-site` requests with session cookies are blocked with HTTP 403.
3. **Encrypted Configuration**:
   - Secrets marked in plugin config schemas are encrypted on disk with the Fernet subkey (`secretsauce/config`).
   - API endpoints mask secrets as `••••••••`; submitting the mask preserves existing ciphertext.
4. **API Bearer Tokens (`api_tokens.py`)**:
   - Machine tokens (`ss_tok_<urlsafe32>`) stored as SHA-256 hashes in `api_tokens`.
   - Audited with `last_used_at` timestamp and restricted by scope.

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
- **Foreign Key Safe Deletion**: Deleting a language row re-points attached schedule, journal, and asset foreign keys to the oldest surviving row in the group. Deleting the last row executes a complete group cascade.

### 4.2 Household Members (`secretsauce/nouns/members.py`)
- Stores member profiles, avatars, dietary restrictions, allergies, and serving ratios.
- Guarded by optimistic revision checks.

### 4.3 Schedule & Cook Journal (`secretsauce/nouns/schedule.py`, `journal.py`)
- `schedule_entries`: Planned meals by date, meal type, participant members, and recipe ID.
- `cook_journal`: Actual cook history, servings cooked vs. left over, notes, and member attribution.

### 4.4 Assets & Entity Attributes (`secretsauce/nouns/assets.py`, `attributes.py`)
- `assets`: Binary assets stored on disk at `uploads/{id}.{ext}`, recorded with entity type, entity ID, and optional `sub_id` (e.g., photo tied to an ingredient ID).
- `entity_attributes`: Scoped key-value store enabling plugins to annotate core nouns (e.g. `ratings.score`, `nutrition.calories`) with fast numeric or string lookups and indexed sorting.

---

## 5. Event Log, Outbox Dispatchers & Streaming

```
[ Domain Mutation ]
       │
       ▼ (Same SQLite Transaction)
[ INSERT INTO events (seq, name, entity_type, entity_id, data, origin, ...) ]
       │
       ├──────────────────────────────────────┐
       ▼                                      ▼
[ Outbox Dispatcher ]               [ EventBroadcaster ]
 (Retries up to 20 attempts,         (In-memory async queue)
  advances event_cursors,                     │
  capped at causal depth 8)                   ▼
       │                               GET /api/events/stream
       ▼                              - Frame 1: event: hello
 [ Plugin Event Handlers ]            - Frame 2..N: Last-Event-ID replay
                                      - Frame N+1..: Live log events & pushes
```

1. **Transactional Event Append**: Events are appended inside the mutating transaction, guaranteeing no event is emitted for rolled-back state.
2. **Dispatcher Outbox**: Each plugin maintains an independent cursor in `event_cursors`. If a handler raises an exception, the dispatcher retries up to 20 times before advancing and recording `last_error`.
3. **Causal Depth Cap**: If an event handler triggers cascading events, causal depth is capped at 8 to prevent infinite loops.
4. **SSE Stream (`secretsauce/stream.py`)**:
   - `GET /api/events/stream`
   - Yields `event: hello` with `boot_id` and current head `seq`.
   - When `Last-Event-ID` is passed, replays missed events from the database before listening to live events.
   - Supports transient pushes (`event: push`) that bypass the event log.

---

## 6. Background Jobs & Recovery (`secretsauce/jobs.py`)

Long-running plugin tasks (recipe imports, translations, backups) run through the `JobManager`:
- Status lifecycle: `pending` $\to$ `running` $\to$ `completed` | `failed` | `cancelled`.
- Real-time numeric progress tracking (0.0 to 1.0).
- **Boot Recovery**: On kernel startup, `recover_stale_jobs_on_boot()` marks any jobs stranded in `pending` or `running` state as `failed` with message `"Server restarted before job completed"`.

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

```
                     ┌───────────────────────────────┐
                     │         PluginLoader          │
                     └───────────────┬───────────────┘
                                     │ Searches
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
       ┌────────────────────────┐        ┌────────────────────────┐
       │ secretsauce/plugins/   │        │     data/plugins/      │
       │        core/           │        │     (User/Runtime)     │
       │ (units, recurring, ...)│        └────────────────────────┘
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │  PluginContext (Sandboxed)
       │  • ctx.routes / router() -> mounts under /api/x/{id}
       │  • ctx.command()        -> registers in ServiceRegistry
       │  • ctx.hook()           -> synchronous pre-commit hooks
       │  • ctx.jobs             -> Scoped background job engine
       │  • ctx.background()     -> cooperative task runners
       └────────────┬───────────┘
                    │ Serves UI
                    ▼
       ┌────────────────────────┐
       │ GET /api/plugins/{id}/ui.js (SHA-256 ETag + 304 / Immutable)
       │ GET /api/plugins/{id}/ui.css
       └────────────────────────┘
```

1. **Dual Search Paths**:
   - The kernel discovers built-in core plugins (`secretsauce/plugins/core/`) and external runtime plugins (`data/plugins/`).
   - Core plugins (such as `units` and `recurring`) are pre-installed and activated during boot.
2. **Dynamic Extension Routers (`ctx.routes` / `RouterRegistry`)**:
   - Plugins mount custom FastAPI routers under `/api/x/{plugin_id}/...`.
   - The `RouterRegistry` inserts plugin routes before the SPA catch-all fallback route (`/{full_path:path}`).
3. **Dynamic UI Bundle Serving**:
   - `GET /api/plugins/active`: Lists enabled plugins and flags whether `ui.js` or `ui.css` are present.
   - `GET /api/plugins/{plugin_id}/ui.js` and `GET /api/plugins/{plugin_id}/ui.css`: Serves compiled ES modules directly from the plugin directory with SHA-256 ETag headers for conditional 304 validation and long-lived immutable caching with version query params (`?v=...`).

---

## 9. Garbage Collector (`secretsauce/gc.py`)

An hourly background task cleans lazy references:
1. **Unlinked Uploads**: Deletes files under `uploads/` with no matching row in `assets`.
2. **Orphaned Sub-ID Assets**: Cleans `assets` rows whose `sub_id` no longer exists in any language row of the recipe.
3. **Event Log Pruning**: Prunes events older than 30 days that are below all active plugin cursors in `event_cursors`.

---

## 10. Backup & Export (`secretsauce/api/routes/export.py`)

- **Full System Backup (`GET /api/export` / `secretsauce export`)**:
  - Uses SQLite `VACUUM INTO` outside active transactions for zero-downtime hot backup.
  - Bundles `secretsauce.db`, `uploads/`, `plugins/`, `site/` (if present), and `config.json` into an `application/zip` archive.
- **Data Interop (`GET /api/export/json`)**:
  - Exports all kernel nouns (`recipes`, `schedule_entries`, `cook_journal`, `household_members`, `assets`, `household_config`) as a JSON payload for migration or external tools.

---

## 11. Runtime Boot & `BootedKernel` Lifecycle (`secretsauce/boot.py`)

When the application boots via `boot(data_dir)`, it orchestrates the following sequence:
1. **Directories**: Ensures `uploads/` and `plugins/` directories exist within `data_dir`.
2. **Config & Keys**: Loads `config.json` and initializes `KeyManager` (`secret.key`).
3. **Database**: Connects to `secretsauce.db` and runs any pending schema migrations.
4. **Repositories**: Instantiates core noun repositories (`household`, `members`, `recipes`, `schedule`, `journal`, `assets`, `attributes`).
5. **Services & Plugins**: Instantiates `JobManager`, `TokenManager`, `PluginRegistry`, and `PluginLoader`. Stale jobs from prior runs are recovered, and plugin manifests are discovered and synchronized.
6. **Precache Computation**: Hashes static shell assets for the Service Worker precache manifest.
7. **BootedKernel State**: Returns a `BootedKernel` dataclass attached to `app.state.kernel`.

### Kernel Attributes & Accessors
All API routers interact with the kernel through `request.app.state.kernel`:
- `kernel.db`: Database connection and transaction runner.
- `kernel.household`, `kernel.members`, etc.: Core noun repositories.
- `kernel.plugins` / `kernel.registry`: `PluginRegistry` instance for listing, enabling, configuring, and inspecting plugins.
- `kernel.loader`: `PluginLoader` for dynamic backend plugin activation.
- `kernel.broadcaster`: `EventBroadcaster` for SSE clients.


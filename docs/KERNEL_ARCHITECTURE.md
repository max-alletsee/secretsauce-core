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

## 7. Garbage Collector (`secretsauce/gc.py`)

An hourly background task cleans lazy references:
1. **Unlinked Uploads**: Deletes files under `uploads/` with no matching row in `assets`.
2. **Orphaned Sub-ID Assets**: Cleans `assets` rows whose `sub_id` no longer exists in any language row of the recipe.
3. **Event Log Pruning**: Prunes events older than 30 days that are below all active plugin cursors in `event_cursors`.

---

## 8. Backup & Export (`secretsauce/api/routes/export.py`)

- **Full System Backup (`GET /api/export` / `secretsauce export`)**:
  - Uses SQLite `VACUUM INTO` outside active transactions for zero-downtime hot backup.
  - Bundles `secretsauce.db`, `uploads/`, `plugins/`, `site/` (if present), and `config.json` into an `application/zip` archive.
- **Data Interop (`GET /api/export/json`)**:
  - Exports all kernel nouns (`recipes`, `schedule_entries`, `cook_journal`, `household_members`, `assets`, `household_config`) as a JSON payload for migration or external tools.

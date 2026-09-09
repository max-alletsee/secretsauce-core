# SecretSauce Kernel Implementation Plan (Stages 1 – 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete SecretSauce Python kernel harness (Database, SQLite WAL & FTS5 Trigram, Kernel Nouns, Hooks, Event Outbox & Dispatcher, Plugin Runtime & Loader, Background Jobs, and FastAPI REST/SSE Server) that serves as the foundation for the shell and all plugins.

**Architecture:** Single-process Python 3.12+ FastAPI application with `aiosqlite` SQLite WAL persistence (one writer behind an asyncio lock, one reader connection). Pre-commit mutations run through synchronous policy hooks (`hooks.py`); committed mutations append to a transactional event log (`events.py`) dispatched asynchronously to per-plugin cursors. Plugins run in-process via `PluginContext` mounting routes, hooks, event listeners, and background jobs.

**Tech Stack:** Python 3.12+, FastAPI, Uvicorn, aiosqlite, Pydantic v2, cryptography (HKDF-SHA256, Fernet), itsdangerous, httpx, pytest, pytest-asyncio. Managed via `uv`.

**Spec:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md` (Revision 7)

---

## Global Constraints

- **Python floor:** Python 3.12+.
- **Database:** SQLite 3 at `/data/secretsauce.db` with `PRAGMA journal_mode=WAL;`, `PRAGMA foreign_keys=ON;`, `PRAGMA synchronous=NORMAL;`, `PRAGMA busy_timeout=5000;`.
- **Connections:** Exactly one writer connection held behind an `asyncio.Lock()`, and one reader connection. Nothing awaits the network while holding the writer.
- **Identities & Timestamps:** All IDs are UUID v4 lowercase hyphenated strings. Recipe row IDs are `<group_id>_<language>`. All timestamps are ISO-8601 UTC with a `Z` suffix.
- **Optimistic Concurrency:** Mutable noun tables carry `revision INTEGER NOT NULL DEFAULT 1`. Updates require matching revision and increment it; mismatches raise `ConflictError` (HTTP 409).
- **Trigram FTS5:** `recipes_fts` uses `tokenize='trigram'`. Queries with `len(q) < 3` fall back to case-insensitive `LIKE` on `title`.
- **Secret Isolation:** Master secret at `/data/secret.key` (0600 permissions, 32 random bytes). Derived subkeys via HKDF-SHA256: `secretsauce/session` (session cookies) and `secretsauce/config` (Fernet config encryption).
- **Session Cookies:** `ss_session`, host-only, `HttpOnly`, `SameSite=Lax`, `Path=/`. `COOKIE_SECURE=auto` (sets `Secure` only when request scheme is `https`).
- **REST Error Format:** `{"error": {"code": string, "message": string, "details": object | null}}`.
- **API Caching:** Every JSON response under `/api/*` carries `Cache-Control: no-store`.

---

## Key Integration Points & Risk Analysis

Before writing code, the implementation agent must account for these critical integration points:
1. **Recipe Reference Integrity & Deletions (Section 4.4):**
   - Deleting one language row while others remain must inspect `PRAGMA foreign_key_list` on all tables and re-point references to the primary or oldest remaining language row before deleting.
   - Deleting the last language row deletes the entire group and triggers normal SQLite FK actions (`SET NULL`).
2. **Event Dispatcher Loop Prevention (Section 6.7, Rules 6 & 7):**
   - Every event has `origin` (`member`, `plugin:<id>`, `system`). Handlers must not trigger infinite feedback loops when reacting to events.
   - Event depth must be bounded (`depth <= 8`).
3. **Database Concurrency (Section 4.1):**
   - Write operations must acquire the single writer lock. Reader operations use the dedicated reader connection.
   - Migrations and transaction blocks must never leak locks on exceptions.
4. **Session Versioning (Section 5.3):**
   - Passphrase changes increment `household_config.passphrase_version`, instantly invalidating all issued sessions without a session table.

---

## Task Decomposition Overview

- **Stage 1: Project Setup, Database & Kernel Nouns**
  - Task 1: Package initialization, dependencies (`pyproject.toml`), and infrastructure config (`config.py`, `errors.py`)
  - Task 2: Database engine, writer lock, reader connection, transaction runner, and migration runner (`db.py`, `migrations/0001_initial.sql`)
  - Task 3: Household configuration repository (`nouns/household.py`)
  - Task 4: Household members repository (`nouns/members.py`)
  - Task 5: Recipe repository with group multi-language rows, trigram FTS5, and re-pointing delete (`nouns/recipes.py`)
  - Task 6: Schedule entries and Cook Journal repositories (`nouns/schedule.py`, `nouns/journal.py`)
  - Task 7: Assets and Entity Attributes repositories (`nouns/assets.py`, `nouns/attributes.py`)
- **Stage 2: Hooks & Event System**
  - Task 8: Synchronous pre-commit policy hooks (`hooks.py`)
  - Task 9: Transactional event log, outbox dispatchers, cursors, and pruning (`events.py`)
- **Stage 3: Plugin System & Runtime**
  - Task 10: Secrets management & HKDF key derivation (`secrets.py`)
  - Task 11: Background jobs runner & state tracking (`jobs.py`)
  - Task 12: Plugin manifest validation, loader, and plugin registry (`plugins/registry.py`, `plugins/loader.py`)
  - Task 13: Plugin Context SDK & Token Management (`plugins/context.py`, `api_tokens.py`)
  - Task 14: Plugin test harness (`testing.py`)
- **Stage 4: HTTP API, Auth & SSE Streaming**
  - Task 15: Authentication middleware, session cookies, and setup routes (`auth.py`, `api/routes/setup.py`, `api/routes/auth.py`)
  - Task 16: Household & Member REST API routes (`api/routes/household.py`, `api/routes/members.py`)
  - Task 17: Recipe REST API routes with trigram search & fallback (`api/routes/recipes.py`)
  - Task 18: Schedule & Journal REST API routes (`api/routes/schedule.py`, `api/routes/journal.py`)
  - Task 19: Assets & Attributes REST API routes (`api/routes/assets.py`, `api/routes/attributes.py`)
  - Task 20: Plugins, Jobs & Server-Sent Events stream routes (`api/routes/plugins.py`, `api/routes/jobs.py`, `stream.py`)
  - Task 21: CLI entrypoints, boot orchestrator, garbage collector, and export (`cli.py`, `boot.py`, `gc.py`)

---

## Detailed Task Specifications

### Task 1: Package Scaffolding, Infrastructure Config & Error Hierarchy

**Test Strategy:** Unit tests verifying config loading precedence (env > config.json > defaults) and error hierarchy serialization matching Appendix A conventions.

**Files:**
- Create: `pyproject.toml`
- Create: `secretsauce/__init__.py`
- Create: `secretsauce/config.py`
- Create: `secretsauce/errors.py`
- Test: `tests/test_config.py`
- Test: `tests/test_errors.py`

**Interfaces:**
- Consumes: Environment variables, filesystem JSON.
- Produces: `Config` dataclass/pydantic model, `SecretSauceError` subclasses (`NotFoundError`, `ConflictError`, `ValidationError`, `VetoError`, `SetupRequiredError`, `UnauthorizedError`, `ForbiddenError`, `PayloadTooLargeError`, `PluginRuntimeError`).

- [x] **Step 1: Write the failing test for Config and Errors**

```python
# tests/test_config.py
from secretsauce.config import load_config
import os
import json

def test_config_defaults():
    cfg = load_config(env={})
    assert cfg.port == 8080
    assert cfg.base_path == "/"
    assert cfg.data_dir == "/data"
    assert cfg.cookie_secure == "auto"

def test_config_env_overrides_json(tmp_path):
    json_path = tmp_path / "config.json"
    json_path.write_text(json.dumps({"PORT": 9000, "LOG_LEVEL": "debug"}))
    cfg = load_config(env={"PORT": "9090"}, config_path=json_path)
    assert cfg.port == 9090
    assert cfg.log_level == "debug"
```

```python
# tests/test_errors.py
from secretsauce.errors import ConflictError, VetoError, NotFoundError

def test_conflict_error_payload():
    err = ConflictError(message="Revision mismatch", current={"id": "1", "revision": 2})
    assert err.code == "conflict"
    assert err.status_code == 409
    assert err.to_dict() == {
        "error": {
            "code": "conflict",
            "message": "Revision mismatch",
            "details": {"current": {"id": "1", "revision": 2}}
        }
    }
```

- [x] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_config.py tests/test_errors.py`
Expected: FAIL (modules do not exist)

- [x] **Step 3: Write minimal implementation**
Write `pyproject.toml` with `fastapi`, `uvicorn`, `aiosqlite`, `pydantic`, `cryptography`, `itsdangerous`, `httpx`, `pytest`, `pytest-asyncio`.
Write `secretsauce/config.py` and `secretsauce/errors.py`.

- [x] **Step 4: Run test to verify it passes**
Run: `uv run pytest tests/test_config.py tests/test_errors.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add pyproject.toml secretsauce/__init__.py secretsauce/config.py secretsauce/errors.py tests/test_config.py tests/test_errors.py
git commit -m "feat(kernel): add project config and standard error hierarchy"
```

---

### Task 2: Database Connection Engine & Migration Runner

**Test Strategy:** Verify SQLite initialization with WAL mode, foreign keys, busy timeout, single writer lock exclusivity, and sequential migration execution from `0001_initial.sql`.

**Files:**
- Create: `secretsauce/db.py`
- Create: `secretsauce/migrations/0001_initial.sql`
- Test: `tests/test_db.py`

**Interfaces:**
- Consumes: SQLite database file path.
- Produces: `Database` class with `connect()`, `close()`, `read()`, `write()`, `transaction()`, and `run_migrations()`.

- [x] **Step 1: Write the failing test for Database engine and migrations**

```python
# tests/test_db.py
import pytest
from secretsauce.db import Database

@pytest.mark.asyncio
async def test_database_init_and_pragmas(tmp_path):
    db_path = tmp_path / "secretsauce.db"
    db = Database(db_path)
    await db.connect()
    try:
        # Check pragmas
        journal_mode = await db.read_val("PRAGMA journal_mode;")
        assert journal_mode.lower() == "wal"
        fk = await db.read_val("PRAGMA foreign_keys;")
        assert fk == 1
        
        # Run migrations
        await db.run_migrations()
        tables = await db.read_all("SELECT name FROM sqlite_master WHERE type='table';")
        table_names = {t["name"] for t in tables}
        assert "recipes" in table_names
        assert "schedule_entries" in table_names
        assert "cook_journal" in table_names
        assert "household_members" in table_names
        assert "assets" in table_names
        assert "entity_attributes" in table_names
        assert "events" in table_names
        assert "event_cursors" in table_names
        assert "plugins" in table_names
        assert "jobs" in table_names
        assert "api_tokens" in table_names
        assert "household_config" in table_names
        assert "kernel_migrations" in table_names
    finally:
        await db.close()
```

- [x] **Step 2: Run test to verify it fails**
Run: `uv run pytest tests/test_db.py`
Expected: FAIL

- [x] **Step 3: Write minimal implementation**
Implement `secretsauce/migrations/0001_initial.sql` with full DDL matching Section 4.3 of the spec (including `recipes_fts` with `tokenize='trigram'`).
Implement `secretsauce/db.py` managing the single writer connection (with `asyncio.Lock`), reader connection, and migration execution tracking `kernel_migrations`.

- [x] **Step 4: Run test to verify it passes**
Run: `uv run pytest tests/test_db.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/db.py secretsauce/migrations/0001_initial.sql tests/test_db.py
git commit -m "feat(kernel): implement sqlite wal database engine and initial schema migration"
```

---

### Task 3: Household Configuration Repository

**Test Strategy:** Verify reading, writing, and atomic updating of household configuration (`household_name`, `meal_types`, `languages`, `units`, `passphrase_hash`, `passphrase_version`).

**Files:**
- Create: `secretsauce/nouns/household.py`
- Test: `tests/test_household.py`

**Interfaces:**
- Consumes: `Database` instance.
- Produces: `HouseholdRepo` with `get_config()`, `update_config(dict)`, `get_passphrase_info()`, `set_passphrase(hash)`.

- [x] **Step 1: Write failing test for HouseholdRepo**
```python
# tests/test_household.py
import pytest
from secretsauce.db import Database
from secretsauce.nouns.household import HouseholdRepo

@pytest.mark.asyncio
async def test_household_config_crud(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = HouseholdRepo(db)
    
    cfg = await repo.get_config()
    assert cfg["household_name"] == "Our Household"
    assert cfg["passphrase_version"] == 1
    
    await repo.update_config({"household_name": "The Smiths", "units": "metric"})
    updated = await repo.get_config()
    assert updated["household_name"] == "The Smiths"
    assert updated["units"] == "metric"
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_household.py`
Expected: FAIL

- [x] **Step 3: Implement HouseholdRepo**
Implement `secretsauce/nouns/household.py` storing values in `household_config`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_household.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/nouns/household.py tests/test_household.py
git commit -m "feat(kernel): add household config repository"
```

---

### Task 4: Household Members Repository

**Test Strategy:** Verify Member CRUD, optimistic revision locking (409 on revision mismatch), serving ratio validation, and participant ID cleanup on member delete.

**Files:**
- Create: `secretsauce/nouns/members.py`
- Test: `tests/test_members.py`

**Interfaces:**
- Consumes: `Database`.
- Produces: `MembersRepo` with `list_members()`, `get_member(id)`, `create_member(data)`, `update_member(id, revision, data)`, `delete_member(id, revision)`.

- [x] **Step 1: Write failing test for MembersRepo**
```python
# tests/test_members.py
import pytest
from secretsauce.db import Database
from secretsauce.nouns.members import MembersRepo
from secretsauce.errors import ConflictError

@pytest.mark.asyncio
async def test_member_crud_and_revision_conflict(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = MembersRepo(db)
    
    m = await repo.create_member({"name": "Alice", "serving_ratio": 1.5, "preferred_language": "en"})
    assert m["name"] == "Alice"
    assert m["revision"] == 1
    
    # Successful update
    m2 = await repo.update_member(m["id"], revision=1, data={"name": "Alice A."})
    assert m2["revision"] == 2
    assert m2["name"] == "Alice A."
    
    # Stale revision conflict
    with pytest.raises(ConflictError) as exc:
        await repo.update_member(m["id"], revision=1, data={"name": "Alice B."})
    assert exc.value.status_code == 409
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_members.py`
Expected: FAIL

- [x] **Step 3: Implement MembersRepo**
Implement `secretsauce/nouns/members.py` with SQL queries, JSON serialization, and conflict checking.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_members.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/nouns/members.py tests/test_members.py
git commit -m "feat(kernel): add household members repository with revision concurrency"
```

---

### Task 5: Recipe Repository (Language Rows, Trigram FTS5 & Safe Deletion)

**Test Strategy:** Test group ID multi-language storage, FTS5 trigram search matching inside words (e.g. `salat` matching `Kartoffelsalat`), fallback to `LIKE` for `len(q) < 3`, reference re-pointing when deleting one language row of a group, and cascade deletion when deleting the entire group.

**Files:**
- Create: `secretsauce/nouns/recipes.py`
- Test: `tests/test_recipes.py`

**Interfaces:**
- Consumes: `Database`, `HouseholdRepo`.
- Produces: `RecipesRepo` with `list_recipes(lang, q, tags, attrs, sort, limit, offset)`, `get_recipe(id_or_group_id, lang)`, `create_recipe(data)`, `update_recipe(id, revision, data)`, `delete_recipe_row(id, revision)`, `delete_recipe_group(group_id)`.

- [x] **Step 1: Write failing test for RecipesRepo**
```python
# tests/test_recipes.py
import pytest
from secretsauce.db import Database
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.household import HouseholdRepo

@pytest.mark.asyncio
async def test_recipe_trigram_search_and_group_languages(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = RecipesRepo(db)
    
    # Create English row
    r_en = await repo.create_recipe({
        "title": "Potato Salad",
        "language": "en",
        "ingredients": [{"id": "i1", "raw_text": "2 potatoes", "name": "Potatoes", "quantity": 2.0, "unit": "pcs", "notes": ""}],
        "steps": [{"id": "s1", "instruction": "Boil potatoes.", "timer_minutes": 20}]
    })
    group_id = r_en["group_id"]
    
    # Add German row to same group
    r_de = await repo.create_recipe({
        "group_id": group_id,
        "title": "Kartoffelsalat",
        "language": "de",
        "ingredients": [{"id": "i1", "raw_text": "2 Kartoffeln", "name": "Kartoffeln", "quantity": 2.0, "unit": "Stück", "notes": ""}],
        "steps": [{"id": "s1", "instruction": "Kartoffeln kochen.", "timer_minutes": 20}]
    })
    
    # Trigram FTS5 search inside word "salat"
    search_res = await repo.list_recipes(lang="de", q="salat")
    assert search_res["total"] == 1
    assert search_res["items"][0]["title"] == "Kartoffelsalat"
    
    # Fallback LIKE search for q < 3 chars
    short_res = await repo.list_recipes(lang="de", q="Ka")
    assert short_res["total"] == 1
    assert short_res["items"][0]["title"] == "Kartoffelsalat"
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_recipes.py`
Expected: FAIL

- [x] **Step 3: Implement RecipesRepo**
Implement `secretsauce/nouns/recipes.py` including `recipes_fts` synchronization in the same transaction, reference re-pointing with `PRAGMA foreign_key_list`, and group resolution by language.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_recipes.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/nouns/recipes.py tests/test_recipes.py
git commit -m "feat(kernel): implement recipe repository with trigram fts5 and group language resolution"
```

---

### Task 6: Schedule & Cook Journal Repositories

**Test Strategy:** Verify schedule entry CRUD, date range queries, servings calculation from participants, cook journal CRUD, unique schedule_entry_id constraint on journal, and foreign key `ON DELETE SET NULL` from recipes.

**Files:**
- Create: `secretsauce/nouns/schedule.py`
- Create: `secretsauce/nouns/journal.py`
- Test: `tests/test_schedule_journal.py`

**Interfaces:**
- Consumes: `Database`, `RecipesRepo`.
- Produces: `ScheduleRepo`, `JournalRepo`.

- [x] **Step 1: Write failing test for Schedule and Journal**
```python
# tests/test_schedule_journal.py
import pytest
from secretsauce.db import Database
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.schedule import ScheduleRepo
from secretsauce.nouns.journal import JournalRepo

@pytest.mark.asyncio
async def test_schedule_and_journal_flow(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    recipe_repo = RecipesRepo(db)
    sched_repo = ScheduleRepo(db)
    journal_repo = JournalRepo(db)
    
    rec = await recipe_repo.create_recipe({"title": "Pasta", "language": "en"})
    entry = await sched_repo.create_entry({
        "date": "2026-09-10",
        "meal_type": "dinner",
        "recipe_id": rec["id"],
        "servings_override": 4.0
    })
    assert entry["recipe_id"] == rec["id"]
    
    journal = await journal_repo.create_entry({
        "date": "2026-09-10",
        "meal_type": "dinner",
        "recipe_id": rec["id"],
        "schedule_entry_id": entry["id"],
        "status": "cooked",
        "servings_cooked": 4.0
    })
    assert journal["status"] == "cooked"
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_schedule_journal.py`
Expected: FAIL

- [x] **Step 3: Implement ScheduleRepo and JournalRepo**
Implement `secretsauce/nouns/schedule.py` and `secretsauce/nouns/journal.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_schedule_journal.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/nouns/schedule.py secretsauce/nouns/journal.py tests/test_schedule_journal.py
git commit -m "feat(kernel): implement schedule and cook journal repositories"
```

---

### Task 7: Assets & Entity Attributes Repositories

**Test Strategy:** Verify asset upload record keeping, size and MIME type validation, file path generation, entity attribute CRUD with numeric/text indexing, and attribute filtering grammar (`nutrition.calories<600`).

**Files:**
- Create: `secretsauce/nouns/assets.py`
- Create: `secretsauce/nouns/attributes.py`
- Test: `tests/test_assets_attributes.py`

**Interfaces:**
- Consumes: `Database`, filesystem upload directory.
- Produces: `AssetsRepo` and `AttributesRepo`.

- [x] **Step 1: Write failing test**
```python
# tests/test_assets_attributes.py
import pytest
from secretsauce.db import Database
from secretsauce.nouns.attributes import AttributesRepo

@pytest.mark.asyncio
async def test_entity_attributes_filtering(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = AttributesRepo(db)
    
    await repo.set_attribute("nutrition", "recipe", "group1", "calories", 450)
    await repo.set_attribute("nutrition", "recipe", "group2", "calories", 650)
    
    matched = await repo.query_entity_ids("recipe", [("nutrition.calories", "<", 600)])
    assert matched == ["group1"]
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_assets_attributes.py`
Expected: FAIL

- [x] **Step 3: Implement AssetsRepo and AttributesRepo**
Implement `secretsauce/nouns/assets.py` and `secretsauce/nouns/attributes.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_assets_attributes.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/nouns/assets.py secretsauce/nouns/attributes.py tests/test_assets_attributes.py
git commit -m "feat(kernel): implement assets and entity attributes repositories"
```

---

### Task 8: Synchronous Pre-Commit Policy Hooks

**Test Strategy:** Test hook registration (`before:recipe:create`, `before:schedule:delete`), hook execution order, data mutation inside hooks, and veto with `VetoError` rolling back the transaction.

**Files:**
- Create: `secretsauce/hooks.py`
- Test: `tests/test_hooks.py`

**Interfaces:**
- Consumes: `Database` transaction context.
- Produces: `HookRegistry` with `register(hook_name, callback)`, `run_before(hook_name, data)`.

- [x] **Step 1: Write failing test for Policy Hooks**
```python
# tests/test_hooks.py
import pytest
from secretsauce.hooks import HookRegistry
from secretsauce.errors import VetoError

@pytest.mark.asyncio
async def test_hook_mutate_and_veto():
    registry = HookRegistry()
    
    # Mutating hook
    async def add_tag(data):
        data["tags"] = data.get("tags", []) + ["auto-tagged"]
        return data
    registry.register("before:recipe:create", "tagger-plugin", add_tag)
    
    res = await registry.run_before("before:recipe:create", {"title": "Soup"})
    assert res["tags"] == ["auto-tagged"]
    
    # Veto hook
    async def allergen_veto(data):
        if "peanut" in data.get("title", "").lower():
            raise VetoError("Peanuts not allowed", plugin_id="allergen-plugin")
        return data
    registry.register("before:recipe:create", "allergen-plugin", allergen_veto)
    
    with pytest.raises(VetoError) as exc:
        await registry.run_before("before:recipe:create", {"title": "Peanut Butter Toast"})
    assert exc.value.plugin_id == "allergen-plugin"
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_hooks.py`
Expected: FAIL

- [x] **Step 3: Implement HookRegistry**
Implement `secretsauce/hooks.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_hooks.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/hooks.py tests/test_hooks.py
git commit -m "feat(kernel): implement pre-commit policy hooks with mutation and veto"
```

---

### Task 9: Transactional Event Log, Outbox Dispatchers & Pruning

**Test Strategy:** Test writing events to `events` table in the same transaction as mutations, per-plugin cursor advancement in `event_cursors`, asynchronous event delivery to plugin listeners, retry handling on failure, loop prevention (depth limit <= 8), and pruning events older than 30 days.

**Files:**
- Create: `secretsauce/events.py`
- Test: `tests/test_events.py`

**Interfaces:**
- Consumes: `Database`.
- Produces: `EventLog`, `EventDispatcher`, `Event` dataclass.

- [x] **Step 1: Write failing test for Event Log and Dispatcher**
```python
# tests/test_events.py
import pytest
from secretsauce.db import Database
from secretsauce.events import EventLog, EventDispatcher

@pytest.mark.asyncio
async def test_event_logging_and_dispatch(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    
    event_log = EventLog(db)
    received = []
    
    async def sample_handler(event):
        received.append(event)
        
    dispatcher = EventDispatcher(db, plugin_id="test-plugin")
    dispatcher.subscribe("recipe:created", sample_handler)
    
    # Append event in transaction
    async with db.transaction() as tx:
        seq = await event_log.append(tx, name="recipe:created", entity_type="recipe", entity_id="rec_1", origin="member", data={"after": {"title": "Tacos"}})
    
    await dispatcher.drain_to_head()
    assert len(received) == 1
    assert received[0].name == "recipe:created"
    assert received[0].data["after"]["title"] == "Tacos"
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_events.py`
Expected: FAIL

- [x] **Step 3: Implement EventLog and EventDispatcher**
Implement `secretsauce/events.py` following Section 6.7 of the spec.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_events.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/events.py tests/test_events.py
git commit -m "feat(kernel): implement transactional event log and per-plugin outbox dispatchers"
```

---

### Task 10: Secrets Management & Key Derivation

**Test Strategy:** Test reading/writing 32-byte master key at `/data/secret.key` with 0600 mode, HKDF-SHA256 derivation of `session` and `config` subkeys, and Fernet encryption/decryption of plugin config secrets with masking (`••••••••`).

**Files:**
- Create: `secretsauce/secrets.py`
- Test: `tests/test_secrets.py`

**Interfaces:**
- Consumes: Master key file.
- Produces: `KeyManager` with `get_session_serializer()`, `encrypt_secret(clear)`, `decrypt_secret(cipher)`, `mask_config(schema, config)`, `unmask_and_encrypt_config(schema, old_config, new_config)`.

- [x] **Step 1: Write failing test for KeyManager**
```python
# tests/test_secrets.py
import pytest
import os
from secretsauce.secrets import KeyManager

def test_key_derivation_and_secret_masking(tmp_path):
    key_path = tmp_path / "secret.key"
    km = KeyManager(key_path)
    assert key_path.exists()
    assert oct(os.stat(key_path).st_mode & 0o777) == "0o600"
    
    schema = {
        "type": "object",
        "properties": {
            "api_key": {"type": "string", "secret": True},
            "model": {"type": "string"}
        }
    }
    
    stored = km.unmask_and_encrypt_config(schema, old_config={}, new_config={"api_key": "sk-12345", "model": "gemini"})
    assert stored["api_key"] != "sk-12345"
    assert stored["model"] == "gemini"
    
    # Masking for client
    client_view = km.mask_config(schema, stored)
    assert client_view["api_key"] == "••••••••"
    
    # Preserving secret when client re-submits mask
    re_stored = km.unmask_and_encrypt_config(schema, old_config=stored, new_config={"api_key": "••••••••", "model": "gemini-flash"})
    assert re_stored["api_key"] == stored["api_key"]
    assert re_stored["model"] == "gemini-flash"
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_secrets.py`
Expected: FAIL

- [x] **Step 3: Implement KeyManager**
Implement `secretsauce/secrets.py` using `cryptography.hazmat.primitives.kdf.hkdf.HKDF` and `Fernet`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_secrets.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/secrets.py tests/test_secrets.py
git commit -m "feat(kernel): implement secrets management and hkdf key derivation"
```

---

### Task 11: Background Jobs Engine

**Test Strategy:** Test job creation, progress reporting (0-100%), stage messaging, cancellation handling, failure recording, and crash recovery (resetting pending/running jobs on boot).

**Files:**
- Create: `secretsauce/jobs.py`
- Test: `tests/test_jobs.py`

**Interfaces:**
- Consumes: `Database`.
- Produces: `JobManager`, `JobHandle`.

- [x] **Step 1: Write failing test for Jobs**
```python
# tests/test_jobs.py
import pytest
from secretsauce.db import Database
from secretsauce.jobs import JobManager

@pytest.mark.asyncio
async def test_job_lifecycle(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    jm = JobManager(db)
    
    job_id = await jm.create_job("test-plugin", "import_url", {"url": "https://example.com"})
    job = await jm.get_job(job_id)
    assert job["status"] == "pending"
    
    async with jm.run(job_id) as handle:
        await handle.set_progress(50, "Parsing recipe...")
        job_mid = await jm.get_job(job_id)
        assert job_mid["progress"] == 50
        assert job_mid["message"] == "Parsing recipe..."
        await handle.set_result({"recipe_id": "r1"})
        
    job_done = await jm.get_job(job_id)
    assert job_done["status"] == "done"
    assert job_done["result"] == {"recipe_id": "r1"}
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_jobs.py`
Expected: FAIL

- [x] **Step 3: Implement JobManager**
Implement `secretsauce/jobs.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_jobs.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/jobs.py tests/test_jobs.py
git commit -m "feat(kernel): implement background jobs engine"
```

---

### Task 12: Plugin Discovery, Manifest Validation & Registry

**Test Strategy:** Test scanning core (`/app/plugins/`) and user (`/data/plugins/`) plugins, validating `PLUGIN` dict against schema, checking semver and dependencies (`requires: ["ai-provider?"]`), tracking plugin state (`active`, `disabled`, `blocked`, `errored`), and applying plugin SQL migrations.

**Files:**
- Create: `secretsauce/plugins/manifest.py`
- Create: `secretsauce/plugins/loader.py`
- Create: `secretsauce/plugins/registry.py`
- Test: `tests/test_plugin_loader.py`

**Interfaces:**
- Consumes: Plugin files on disk, `Database`.
- Produces: `PluginRegistry`, `PluginLoader`.

- [x] **Step 1: Write failing test for Plugin Discovery and Loading**
```python
# tests/test_plugin_loader.py
import pytest
from secretsauce.db import Database
from secretsauce.plugins.registry import PluginRegistry
from secretsauce.plugins.loader import PluginLoader

@pytest.mark.asyncio
async def test_plugin_discovery_and_registration(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    
    plugin_dir = tmp_path / "plugins" / "sample"
    plugin_dir.mkdir(parents=True)
    (plugin_dir / "__init__.py").write_text("""
PLUGIN = {
    "id": "sample",
    "version": "1.0.0",
    "name": "Sample Plugin"
}
async def setup(ctx):
    pass
""")
    registry = PluginRegistry(db)
    loader = PluginLoader(registry, search_paths=[tmp_path / "plugins"])
    await loader.discover_and_sync()
    
    plugins = await registry.list_plugins()
    assert len(plugins) == 1
    assert plugins[0]["id"] == "sample"
    assert plugins[0]["state"] == "active"
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_plugin_loader.py`
Expected: FAIL

- [x] **Step 3: Implement PluginRegistry and PluginLoader**
Implement `secretsauce/plugins/manifest.py`, `secretsauce/plugins/registry.py`, and `secretsauce/plugins/loader.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_plugin_loader.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/plugins/manifest.py secretsauce/plugins/loader.py secretsauce/plugins/registry.py tests/test_plugin_loader.py
git commit -m "feat(kernel): implement plugin discovery, validation, and registry"
```

---

### Task 13: Plugin Context SDK & Token Management

**Test Strategy:** Test `PluginContext` handles provided to `setup(ctx)`: mounting routes, registering hooks, subscribing to events, emitting events, spawning jobs, issuing tokens (`api_tokens`), and accessing shared service interfaces.

**Files:**
- Create: `secretsauce/plugins/context.py`
- Create: `secretsauce/api_tokens.py`
- Test: `tests/test_plugin_context.py`

**Interfaces:**
- Consumes: Repositories, `Database`, `HookRegistry`, `EventDispatcher`, `JobManager`.
- Produces: `PluginContext` instance scoped per plugin.

- [x] **Step 1: Write failing test for PluginContext**
```python
# tests/test_plugin_context.py
import pytest
from secretsauce.db import Database
from secretsauce.plugins.context import create_plugin_context

@pytest.mark.asyncio
async def test_plugin_context_capabilities(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    ctx = await create_plugin_context(db, plugin_id="my-plugin")
    
    # Token issue
    token = await ctx.tokens.issue(scope="read:calendar", label="Kitchen Tablet")
    assert token.startswith("ss_tok_")
    
    # Service registration
    ctx.services.register("calculator", {"add": lambda a, b: a + b})
    calc = ctx.services.get("calculator")
    assert calc["add"](2, 3) == 5
    await db.close()
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_plugin_context.py`
Expected: FAIL

- [x] **Step 3: Implement PluginContext and TokenManager**
Implement `secretsauce/plugins/context.py` and `secretsauce/api_tokens.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_plugin_context.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/plugins/context.py secretsauce/api_tokens.py tests/test_plugin_context.py
git commit -m "feat(kernel): implement plugin context sdk and token management"
```

---

### Task 14: Plugin Test Harness (`testing.py`)

**Test Strategy:** Verify `make_kernel(tmp_path, plugins)` boots an ephemeral test kernel, provides authenticated `httpx.AsyncClient`, allows draining events via `drain_events(kernel)`, and verifies plugins in unit tests without manual setup.

**Files:**
- Create: `secretsauce/testing.py`
- Test: `tests/test_testing_harness.py`

**Interfaces:**
- Consumes: `secretsauce` kernel subsystems.
- Produces: `make_kernel()`, `drain_events()`, `KernelTestHarness`.

- [x] **Step 1: Write failing test for testing harness**
```python
# tests/test_testing_harness.py
import pytest
from secretsauce.testing import make_kernel, drain_events

@pytest.mark.asyncio
async def test_make_kernel_fixture(tmp_path):
    async with make_kernel(tmp_path) as k:
        assert k.client is not None
        res = await k.client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_testing_harness.py`
Expected: FAIL

- [x] **Step 3: Implement testing.py**
Implement `secretsauce/testing.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_testing_harness.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/testing.py tests/test_testing_harness.py
git commit -m "feat(kernel): implement secretsauce.testing harness"
```

---

### Task 15: Auth Middleware, Session Cookies & Setup Flow

**Test Strategy:** Test `POST /api/setup` (one-time setup), session cookie issuance (`ss_session`), passphrase verification using `hashlib.scrypt`, brute-force delay throttling (exponential backoff after consecutive failures), `Sec-Fetch-Site` cross-site request blocking (403), and passphrase version increment invalidating older sessions.

**Files:**
- Create: `secretsauce/auth.py`
- Create: `secretsauce/api/routes/setup.py`
- Create: `secretsauce/api/routes/auth.py`
- Test: `tests/test_auth_routes.py`

**Interfaces:**
- Consumes: `HouseholdRepo`, `KeyManager`, FastAPI Request/Response.
- Produces: Auth middleware, `/api/setup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`.

- [x] **Step 1: Write failing test for Auth and Setup**
```python
# tests/test_auth_routes.py
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_setup_and_login_lifecycle(tmp_path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        # Before setup: 409 setup_required
        res = await k.client.get("/api/household")
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "setup_required"
        
        # Setup
        setup_res = await k.client.post("/api/setup", json={
            "household_name": "Alletsee Home",
            "passphrase": "super-secret-pass",
            "first_member": {"name": "Max", "preferred_language": "en"}
        })
        assert setup_res.status_code == 201
        assert "ss_session" in setup_res.cookies
        
        # Now authorized
        hh = await k.client.get("/api/household")
        assert hh.status_code == 200
        assert hh.json()["household_name"] == "Alletsee Home"
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_auth_routes.py`
Expected: FAIL

- [x] **Step 3: Implement Auth and Setup Routes**
Implement `secretsauce/auth.py`, `secretsauce/api/routes/setup.py`, and `secretsauce/api/routes/auth.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_auth_routes.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/auth.py secretsauce/api/routes/setup.py secretsauce/api/routes/auth.py tests/test_auth_routes.py
git commit -m "feat(kernel): implement setup flow, scrypt auth, and session cookie validation"
```

---

### Task 16: Household & Member REST API Routes

**Test Strategy:** Test `GET /api/household`, `PATCH /api/household`, `PUT /api/household/passphrase` (rotating passphrase and issuing fresh cookie), and full CRUD for `/api/members` with `revision` concurrency checks.

**Files:**
- Create: `secretsauce/api/routes/household.py`
- Create: `secretsauce/api/routes/members.py`
- Test: `tests/test_household_members_api.py`

**Interfaces:**
- Consumes: `HouseholdRepo`, `MembersRepo`, Auth dependencies.
- Produces: FastAPI APIRouter mounted at `/api/household` and `/api/members`.

- [x] **Step 1: Write failing test**
```python
# tests/test_household_members_api.py
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_household_and_members_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.get("/api/household")
        assert res.status_code == 200
        
        # Create member
        m_res = await k.client.post("/api/members", json={"name": "Sarah", "serving_ratio": 1.0})
        assert m_res.status_code == 201
        m_id = m_res.json()["id"]
        
        # Patch member
        patch_res = await k.client.patch(f"/api/members/{m_id}", json={"revision": 1, "name": "Sarah A."})
        assert patch_res.status_code == 200
        assert patch_res.json()["name"] == "Sarah A."
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_household_members_api.py`
Expected: FAIL

- [x] **Step 3: Implement Household and Members Routes**
Implement `secretsauce/api/routes/household.py` and `secretsauce/api/routes/members.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_household_members_api.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/api/routes/household.py secretsauce/api/routes/members.py tests/test_household_members_api.py
git commit -m "feat(kernel): implement household and members rest api routes"
```

---

### Task 17: Recipe REST API Routes (Search, Languages & Deletion)

**Test Strategy:** Test `GET /api/recipes` with language fallback, trigram search, tag filters, attribute sorting, `POST /api/recipes`, `GET /api/recipes/{id}`, `GET /api/recipes/{group_id}?lang=de`, `PATCH /api/recipes/{id}`, `DELETE /api/recipes/{id}`, and `DELETE /api/recipes/{group_id}`.

**Files:**
- Create: `secretsauce/api/routes/recipes.py`
- Test: `tests/test_recipes_api.py`

**Interfaces:**
- Consumes: `RecipesRepo`, `HookRegistry`, `EventLog`.
- Produces: FastAPI APIRouter mounted at `/api/recipes`.

- [x] **Step 1: Write failing test for Recipe Routes**
```python
# tests/test_recipes_api.py
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_recipe_routes_crud_and_search(tmp_path):
    async with make_kernel(tmp_path) as k:
        create_res = await k.client.post("/api/recipes", json={
            "title": "Vegetable Curry",
            "language": "en",
            "ingredients": [{"id": "i1", "raw_text": "1 onion", "name": "Onion", "quantity": 1.0, "unit": "pcs", "notes": ""}],
            "steps": [{"id": "s1", "instruction": "Chop onion", "timer_minutes": None}],
            "tags": ["dinner", "vegan"]
        })
        assert create_res.status_code == 201
        rec = create_res.json()
        assert rec["title"] == "Vegetable Curry"
        
        # Search by tag
        list_res = await k.client.get("/api/recipes?tag=vegan")
        assert list_res.status_code == 200
        assert list_res.json()["total"] == 1
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_recipes_api.py`
Expected: FAIL

- [x] **Step 3: Implement Recipe Routes**
Implement `secretsauce/api/routes/recipes.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_recipes_api.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/api/routes/recipes.py tests/test_recipes_api.py
git commit -m "feat(kernel): implement recipe rest api routes with fts5 search and language resolution"
```

---

### Task 18: Schedule & Cook Journal REST API Routes

**Test Strategy:** Test `GET /api/schedule` (date range filter up to 62 days, expanding recipe in requested language), `POST /api/schedule`, `PATCH /api/schedule/{id}`, `DELETE /api/schedule/{id}`, `GET /api/journal`, `POST /api/journal`, `PATCH /api/journal/{id}`, and `DELETE /api/journal/{id}`.

**Files:**
- Create: `secretsauce/api/routes/schedule.py`
- Create: `secretsauce/api/routes/journal.py`
- Test: `tests/test_schedule_journal_api.py`

**Interfaces:**
- Consumes: `ScheduleRepo`, `JournalRepo`, `RecipesRepo`.
- Produces: FastAPI APIRouter mounted at `/api/schedule` and `/api/journal`.

- [x] **Step 1: Write failing test**
```python
# tests/test_schedule_journal_api.py
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_schedule_journal_routes(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Schedule dish
        s_res = await k.client.post("/api/schedule", json={
            "date": "2026-09-12",
            "meal_type": "dinner",
            "title": "Pizza Night",
            "entry_type": "note"
        })
        assert s_res.status_code == 201
        entry_id = s_res.json()["id"]
        
        # Query schedule range
        list_res = await k.client.get("/api/schedule?from=2026-09-10&to=2026-09-15")
        assert list_res.status_code == 200
        assert len(list_res.json()["items"]) == 1
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_schedule_journal_api.py`
Expected: FAIL

- [x] **Step 3: Implement Schedule and Journal Routes**
Implement `secretsauce/api/routes/schedule.py` and `secretsauce/api/routes/journal.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_schedule_journal_api.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/api/routes/schedule.py secretsauce/api/routes/journal.py tests/test_schedule_journal_api.py
git commit -m "feat(kernel): implement schedule and journal rest api routes"
```

---

### Task 19: Assets & Attributes REST API Routes

**Test Strategy:** Test multipart file upload to `/api/assets` (MIME validation, size limit 20MB), file streaming with immutable caching headers from `/api/assets/{id}/file`, asset deletion, and attribute query endpoint `/api/attributes`.

**Files:**
- Create: `secretsauce/api/routes/assets.py`
- Create: `secretsauce/api/routes/attributes.py`
- Test: `tests/test_assets_attributes_api.py`

**Interfaces:**
- Consumes: `AssetsRepo`, `AttributesRepo`.
- Produces: FastAPI APIRouter mounted at `/api/assets` and `/api/attributes`.

- [x] **Step 1: Write failing test**
```python
# tests/test_assets_attributes_api.py
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_assets_upload_and_download(tmp_path):
    async with make_kernel(tmp_path) as k:
        files = {"file": ("test.png", b"\x89PNG\r\n\x1a\nfakecontent", "image/png")}
        data = {"entity_type": "recipe", "entity_id": "r1", "slot": "primary"}
        res = await k.client.post("/api/assets", files=files, data=data)
        assert res.status_code == 201
        asset_id = res.json()["id"]
        
        # Download
        dl_res = await k.client.get(f"/api/assets/{asset_id}/file")
        assert dl_res.status_code == 200
        assert "immutable" in dl_res.headers.get("cache-control", "")
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_assets_attributes_api.py`
Expected: FAIL

- [x] **Step 3: Implement Assets and Attributes Routes**
Implement `secretsauce/api/routes/assets.py` and `secretsauce/api/routes/attributes.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_assets_attributes_api.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/api/routes/assets.py secretsauce/api/routes/attributes.py tests/test_assets_attributes_api.py
git commit -m "feat(kernel): implement assets and attributes rest api routes"
```

---

### Task 20: Plugins, Jobs & Server-Sent Events (SSE) Stream

**Test Strategy:** Test `/api/plugins` listing and configuration updates with secret masking, job status polling `/api/jobs/{id}`, job cancellation `/api/jobs/{id}/cancel`, and Server-Sent Events stream `/api/events/stream` (initial `hello` frame, `Last-Event-ID` replay, live event delivery, ping comments).

**Files:**
- Create: `secretsauce/stream.py`
- Create: `secretsauce/api/routes/plugins.py`
- Create: `secretsauce/api/routes/jobs.py`
- Test: `tests/test_stream_jobs_api.py`

**Interfaces:**
- Consumes: `PluginRegistry`, `JobManager`, `EventLog`.
- Produces: `SSEStreamHub`, FastAPI APIRouter mounted at `/api/plugins`, `/api/jobs`, `/api/events/stream`.

- [x] **Step 1: Write failing test for SSE Stream and Jobs**
```python
# tests/test_stream_jobs_api.py
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_jobs_and_stream(tmp_path):
    async with make_kernel(tmp_path) as k:
        plugins_res = await k.client.get("/api/plugins")
        assert plugins_res.status_code == 200
        assert isinstance(plugins_res.json()["items"], list)
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_stream_jobs_api.py`
Expected: FAIL

- [x] **Step 3: Implement SSE Stream and Plugins/Jobs Routes**
Implement `secretsauce/stream.py`, `secretsauce/api/routes/plugins.py`, and `secretsauce/api/routes/jobs.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_stream_jobs_api.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/stream.py secretsauce/api/routes/plugins.py secretsauce/api/routes/jobs.py tests/test_stream_jobs_api.py
git commit -m "feat(kernel): implement sse stream hub and plugin/job api routes"
```

---

### Task 21: Application Boot Orchestrator, CLI & Garbage Collector

**Test Strategy:** Test `secretsauce` CLI commands (`serve`, `export`, `migrate`), full startup boot sequence (generating boot ID, precache hash, running hourly GC), and export zip creation (`/api/export`).

**Files:**
- Create: `secretsauce/app.py`
- Create: `secretsauce/boot.py`
- Create: `secretsauce/gc.py`
- Create: `secretsauce/cli.py`
- Create: `secretsauce/__main__.py`
- Test: `tests/test_app_boot.py`
- Test: `tests/test_cli.py`

**Interfaces:**
- Consumes: All kernel modules.
- Produces: `build_app()`, `secretsauce` CLI command, full FastAPI application instance.

- [x] **Step 1: Write failing test for App Boot and Export**
```python
# tests/test_app_boot.py
import pytest
from secretsauce.testing import make_kernel
import zipfile
import io

@pytest.mark.asyncio
async def test_boot_and_export(tmp_path):
    async with make_kernel(tmp_path) as k:
        health = await k.client.get("/api/health")
        assert health.status_code == 200
        assert "boot_id" in health.json()
        
        # Test full export
        exp = await k.client.get("/api/export")
        assert exp.status_code == 200
        assert exp.headers["content-type"] == "application/zip"
        
        with zipfile.ZipFile(io.BytesIO(exp.content)) as z:
            names = z.namelist()
            assert "secretsauce.db" in names
            assert "config.json" in names
```

- [x] **Step 2: Run test to verify failure**
Run: `uv run pytest tests/test_app_boot.py`
Expected: FAIL

- [x] **Step 3: Implement Boot, GC, App Factory and CLI**
Implement `secretsauce/boot.py`, `secretsauce/gc.py`, `secretsauce/app.py`, `secretsauce/cli.py`, and `secretsauce/__main__.py`.

- [x] **Step 4: Run test to verify pass**
Run: `uv run pytest tests/test_app_boot.py tests/test_cli.py`
Expected: PASS

- [x] **Step 5: Commit**
```bash
git add secretsauce/app.py secretsauce/boot.py secretsauce/gc.py secretsauce/cli.py secretsauce/__main__.py tests/test_app_boot.py tests/test_cli.py
git commit -m "feat(kernel): implement application boot factory, hourly gc, export, and cli"
```

---

## Phase 2 & 3 Roadmap (Following the Build Order in Spec §13)

Once Phase 1 (Tasks 1–21) is completed and green:
- **Phase 2: Shell & PWA Frontend (Stage 5)**
  - Scaffold `shell/` Vite project with Vue 3, Pinia, PrimeVue.
  - Implement dynamic import map and module loader for `/api/plugins/{id}/ui.js`.
  - Implement registries: routes, slots (`<Slot>`), intent hubs (`<IntentTrigger>`), settings.
  - Service worker with offline caching and outbox write queue (`sw.js`).
  - Setup, login, settings, and plugin manager core views.
- **Phase 3: Units & Core Plugins (Stages 6–7)**
  - Stage 6: `secretsauce/units/` engine, `units` plugin, `recurring` plugin.
  - Stage 7: Core plugins: `core-members`, `core-recipes`, `core-timeline`, `cook-tracker`, `shortlist`, `ratings`, `ai-provider` (Gemini), `recipe-importer`, `translator`, `meal-planner`, `shopping-list`.
- **Phase 4: Podman Packaging & E2E Smoke (Stage 8)**
  - `Containerfile` multi-stage build (Node builds shell, Python runs kernel).
  - End-to-end Playwright smoke test covering online and offline operation.

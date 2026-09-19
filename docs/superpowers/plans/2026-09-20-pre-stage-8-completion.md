# Pre-Stage 8 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement plugin command execution, plugin archive installer/uninstaller, process re-exec, core plugin workflow completions (`core-translator`, `core-recipe-importer`, `core-shopping-list`, `core-cook-tracker`, `core-recipes`, `core-units`), `PluginManagerPage.vue` UI controls, and project ledger synchronization before Stage 8.

**Architecture:** Foundation-first approach: First build the backend command registration and plugin management lifecycle routes (`install.py`, `DELETE /api/plugins/{id}`, `POST /api/plugins/{id}/commands/{name}`). Next, complete the core plugin domain workflows and register their commands via `ctx.command`. Then enhance the frontend Plugin Manager and rebuild UI bundles, concluding with full test suite verification and project tracking synchronization.

**Tech Stack:** Python 3.12, FastAPI, aiosqlite, Vue 3, Vite, Vitest, Pytest.

**Spec:** `docs/superpowers/specs/2026-09-20-pre-stage-8-completion-design.md`

## Global Constraints

- Always use `python` or `uv run python`. **NEVER** invoke `python3`.
- Backend test runner: `uv run pytest`.
- Frontend workspace: all Node/pnpm operations must target `shell/` (`pnpm --prefix shell ...`). **NEVER** run `pnpm add` at repo root.
- Plugin UI builds: after modifying `secretsauce/plugins/core/<name>/ui/`, run `pnpm --prefix shell build:plugins`.
- Shell UI builds: after modifying `shell/src/`, run `pnpm --prefix shell build` to compile into `secretsauce/static/`.
- No placeholders, full implementations with strict error handling and type consistency.

## Review Focus

1. **Malicious zip with path traversal in `POST /api/plugins/install`**: must reject archives containing `..` or absolute paths with HTTP 400 without extracting files (tested in Task 2).
2. **Attempt to delete a core plugin via `DELETE /api/plugins/{id}`**: must return HTTP 403 Forbidden without deleting directory or dropping database tables (tested in Task 3).
3. **Overwriting member-edited recipe translations in `core-translator`**: must preserve user-written translations (`origin != "plugin:core-translator"`) on `recipe:updated` events (tested in Task 4).
4. **Calling `POST /api/plugins/{id}/commands/{name}` for an unregistered command or disabled plugin**: must return HTTP 404 Not Found (tested in Task 1).
5. **Deleting a plugin with `?delete_data=true`**: must drop all tables prefixed with `plugin_{id}_*` cleanly from SQLite (tested in Task 3).

---

## Task Breakdown

### Phase 1: Plugin Command & Management Infrastructure

#### Task 1: Plugin Command Registration & Execution API

**Files:**
- Modify: `secretsauce/plugins/context.py`
- Modify: `secretsauce/api/routes/plugins.py`
- Test: `tests/test_plugin_commands.py`

**Interfaces:**
- Consumes: `JobManager.register_handler`, `JobManager.create_job`, `JobManager.run_job`
- Produces: `POST /api/plugins/{plugin_id}/commands/{command_name}` $\rightarrow$ `{"job_id": str, "status": "pending"}` (HTTP 202)

- [ ] **Step 1: Write failing test for plugin command registration and execution**

```python
# tests/test_plugin_commands.py
import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_plugin_command_lifecycle(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ctx = k.ctx_for("core-recipes")
        executed = False

        async def dummy_cmd(input_data, handle=None):
            nonlocal executed
            executed = True
            if handle:
                await handle.set_progress(100, "Finished dummy command")
            return {"success": True}

        ctx.command("dummy-cmd", dummy_cmd, title="Run Dummy Command")

        # 1. Verify command metadata appears in plugin details
        p_res = await k.client.get("/api/plugins/core-recipes")
        assert p_res.status_code == 200
        p_data = p_res.json()
        assert any(c["id"] == "dummy-cmd" and c["title"] == "Run Dummy Command" for c in p_data.get("commands", []))

        # 2. Trigger command execution via POST endpoint
        cmd_res = await k.client.post("/api/plugins/core-recipes/commands/dummy-cmd")
        assert cmd_res.status_code == 202
        job_id = cmd_res.json()["job_id"]
        assert job_id.startswith("job_")

        # 3. Wait for background execution or run job directly
        job_state = await k.jobs.get_job(job_id)
        if job_state["status"] != "done":
            await k.jobs.run_job(job_id)
            job_state = await k.jobs.get_job(job_id)
        assert job_state["status"] == "done"
        assert executed is True

        # 4. Unknown command returns 404
        bad_res = await k.client.post("/api/plugins/core-recipes/commands/non-existent")
        assert bad_res.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_commands.py -v`
Expected: FAIL (404 on command endpoint or missing attribute)

- [ ] **Step 3: Implement command registration in `context.py` and router in `plugins.py`**

In `secretsauce/plugins/context.py`:
```python
    def command(
        self, command_id: str, fn: Callable[..., Any], title: str = ""
    ) -> None:
        cmd_title = title or command_id
        self.services.register_command(self.plugin_id, command_id, fn, title=cmd_title)
        self.jobs.register(f"command:{command_id}", fn)
```

In `secretsauce/api/routes/plugins.py`:
```python
import asyncio
from secretsauce.errors import NotFoundError

@router.get("/{plugin_id}")
async def get_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    cmds = []
    for (pid, cid), entry in getattr(kernel.services, "_commands", {}).items():
        if pid == plugin_id:
            cmds.append({"id": cid, "title": entry.get("title", cid)})
    return {**p, "commands": cmds}

@router.post("/{plugin_id}/commands/{command_name}", status_code=202)
async def run_plugin_command(plugin_id: str, command_name: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None or p.get("state") != "active":
        raise NotFoundError(f"Plugin '{plugin_id}' not active or not found")

    cmd_fn = kernel.services.get_command(plugin_id, command_name)
    if not cmd_fn:
        raise NotFoundError(f"Command '{command_name}' not found on plugin '{plugin_id}'")

    job_id = await kernel.jobs.create_job(
        plugin_id, f"command:{command_name}", input_data={}
    )
    asyncio.create_task(kernel.jobs.run_job(job_id))
    return {"job_id": job_id, "status": "pending"}
```
Also update `list_plugins` in `secretsauce/api/routes/plugins.py` to include `commands` on each returned plugin item.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_commands.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/context.py secretsauce/api/routes/plugins.py tests/test_plugin_commands.py
git commit -m "feat(plugins): implement plugin command registration and execution API"
```

---

#### Task 2: Plugin Archive Installer (`secretsauce/install.py` & `POST /api/plugins/install`)

**Files:**
- Create: `secretsauce/install.py`
- Modify: `secretsauce/api/routes/plugins.py`
- Test: `tests/test_plugin_install.py`

**Interfaces:**
- Consumes: Python `zipfile`, `PluginLoader`, `Database`
- Produces: `POST /api/plugins/install` multipart endpoint returning HTTP 202

- [ ] **Step 1: Write failing test for plugin installation and security validation**

```python
# tests/test_plugin_install.py
import io
import json
import zipfile
import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

def create_plugin_zip(plugin_id: str, manifest: dict, files: dict[str, str] = None, traversal_path: str = None) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("manifest.json", json.dumps(manifest))
        z.writestr("__init__.py", "async def setup(ctx):\n    pass\n")
        if files:
            for path, content in files.items():
                z.writestr(path, content)
        if traversal_path:
            z.writestr(traversal_path, "malicious payload")
    return buf.getvalue()

@pytest.mark.asyncio
async def test_install_valid_plugin(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        manifest = {
            "id": "custom-timer",
            "name": "Custom Cooking Timer",
            "version": "1.0.0",
            "description": "Kitchen timer",
            "schema": 1,
        }
        zip_bytes = create_plugin_zip("custom-timer", manifest)

        res = await k.client.post(
            "/api/plugins/install",
            files={"file": ("custom-timer.zip", zip_bytes, "application/zip")},
        )
        assert res.status_code == 202, res.text
        data = res.json()
        assert data["plugin_id"] == "custom-timer"
        assert data["status"] == "installed"

        # Verify plugin directory was extracted
        target_dir = k.data_dir / "plugins" / "custom-timer"
        assert (target_dir / "manifest.json").exists()

@pytest.mark.asyncio
async def test_install_rejects_path_traversal(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        manifest = {"id": "evil-plugin", "name": "Evil", "version": "1.0.0", "schema": 1}
        zip_bytes = create_plugin_zip("evil-plugin", manifest, traversal_path="../../evil.txt")

        res = await k.client.post(
            "/api/plugins/install",
            files={"file": ("evil.zip", zip_bytes, "application/zip")},
        )
        assert res.status_code == 400
        assert "path traversal" in res.text.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_install.py -v`
Expected: FAIL (endpoint does not exist)

- [ ] **Step 3: Implement `secretsauce/install.py` and upload route**

Create `secretsauce/install.py`:
- `install_plugin_archive(archive_bytes: bytes, data_dir: Path, upgrade: bool = False) -> dict[str, Any]`
- Validates payload length $\le 50\text{ MB}$ (raises `PayloadTooLargeError` or `HTTPException(413)`).
- Opens `ZipFile`; checks `info.filename` does not start with `/`, `\`, contain `..`, or resolve outside target directory (raises `HTTPException(400, "Path traversal detected")`).
- Locates `manifest.json`; parses and validates ID, name, version.
- Sets target folder `{data_dir}/plugins/{plugin_id}`; if exists and not `upgrade`, raises `HTTPException(409, "Plugin already exists")`.
- Extracts archive safely to target folder.
- If `{target_dir}/migrations` exists, applies SQL migration files.
- Updates/inserts record in database `plugins` table (`id, name, version, core=0, enabled=1, state='active'`).
- Returns `{"plugin_id": plugin_id, "status": "installed", "restart_required": True}`.

In `secretsauce/api/routes/plugins.py`:
- Add `POST /api/plugins/install` accepting `file: UploadFile = File(...)` and `upgrade: bool = Query(False)`.
- Invokes `install_plugin_archive(...)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_install.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/install.py secretsauce/api/routes/plugins.py tests/test_plugin_install.py
git commit -m "feat(plugins): implement secure plugin archive installer and upload endpoint"
```

---

#### Task 3: Plugin Uninstaller & Kernel Re-Exec (`DELETE /api/plugins/{id}` & `kernel.request_restart`)

**Files:**
- Modify: `secretsauce/api/routes/plugins.py`
- Modify: `secretsauce/kernel.py`
- Test: `tests/test_plugin_uninstall.py`

**Interfaces:**
- Consumes: `kernel.db`, `kernel.request_restart`
- Produces: `DELETE /api/plugins/{plugin_id}` returning HTTP 200/202

- [ ] **Step 1: Write failing test for plugin uninstallation and core protection**

```python
# tests/test_plugin_uninstall.py
import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_delete_core_plugin_rejected(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        res = await k.client.delete("/api/plugins/core-recipes")
        assert res.status_code == 403
        assert "core plugin" in res.text.lower()

@pytest.mark.asyncio
async def test_delete_third_party_plugin_with_data_cascade(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Create third party plugin directory & database record
        p_dir = k.data_dir / "plugins" / "test-widget"
        p_dir.mkdir(parents=True, exist_ok=True)
        (p_dir / "manifest.json").write_text('{"id":"test-widget","name":"Widget","version":"1.0.0"}')

        await k.db.write(
            "INSERT INTO plugins (id, name, version, core, enabled, state) VALUES (?, ?, ?, 0, 1, 'active')",
            ("test-widget", "Widget", "1.0.0"),
        )
        # Create a plugin-specific table
        await k.db.write("CREATE TABLE plugin_test_widget_data (id TEXT PRIMARY KEY, info TEXT);")
        await k.db.write("INSERT INTO plugin_test_widget_data VALUES ('1', 'sample');")

        # Uninstall with delete_data=true
        res = await k.client.delete("/api/plugins/test-widget?delete_data=true")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "uninstalled"
        assert data["data_deleted"] is True

        # Verify directory removed
        assert not p_dir.exists()

        # Verify table dropped
        row = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_test_widget_data';"
        )
        assert row is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_uninstall.py -v`
Expected: FAIL (DELETE route not found)

- [ ] **Step 3: Implement `DELETE /api/plugins/{plugin_id}` and `kernel.request_restart`**

In `secretsauce/kernel.py`:
- Add method `request_restart(self)`:
  - If `os.environ.get("SS_TEST_MODE") == "1"`: logs restart request and returns without executing `os.execv`.
  - Otherwise: initiates shutdown and executes `os.execv(sys.executable, [sys.executable, "-m", "secretsauce", *sys.argv[1:]])`.

In `secretsauce/api/routes/plugins.py`:
- Add `DELETE /{plugin_id}`:
  - Fetch plugin from registry. If not found, return 404.
  - If `p.get("core")`: return `HTTPException(403, "Core plugins cannot be uninstalled")`.
  - If `delete_data`:
    - Query `sqlite_master` for tables matching `plugin_{sanitized_id}_%`.
    - Drop each matching table safely.
  - Delete plugin folder from `{DATA_DIR}/plugins/{plugin_id}` via `shutil.rmtree`.
  - Delete record from `plugins` table in SQLite.
  - Return `{"plugin_id": plugin_id, "status": "uninstalled", "data_deleted": bool(delete_data)}`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_uninstall.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/api/routes/plugins.py secretsauce/kernel.py tests/test_plugin_uninstall.py
git commit -m "feat(plugins): implement plugin uninstallation endpoint and kernel restart trigger"
```

---

### Phase 2: Core Plugin Domain & Command Completions

#### Task 4: `core-translator` Event-Driven Auto-Translation & Command

**Files:**
- Modify: `secretsauce/plugins/core/core-translator/__init__.py`
- Test: `tests/test_plugin_core_translator.py`

**Interfaces:**
- Consumes: `recipe:created` and `recipe:updated` events, `core-ai-provider` service
- Produces: Translated recipe rows with `origin = "plugin:core-translator"`, `retranslate-all` command

- [ ] **Step 1: Write failing test for automatic translation on events**

```python
# In tests/test_plugin_core_translator.py
@pytest.mark.asyncio
async def test_auto_translate_on_recipe_created(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = {
                "title": "Apfelkuchen",
                "description": "Köstlich",
                "ingredients": [{"name": "Äpfel", "quantity": 2, "unit": "Stück"}],
                "steps": [{"instruction": "Backen"}],
                "tags": ["Dessert"],
            }
            # Create recipe in English
            res = await k.client.post("/api/recipes", json={
                "title": "Apple Pie",
                "language": "en",
                "ingredients": [{"name": "Apples", "quantity": 2, "unit": "piece"}],
                "steps": [{"instruction": "Bake"}],
            })
            assert res.status_code == 201
            group_id = res.json()["group_id"]

            # Drain event dispatchers
            await k.events.dispatch_pending()

            # Verify German row was automatically created
            rows = await k.db.read_all("SELECT * FROM recipes WHERE group_id = ? AND language = 'de'", (group_id,))
            assert len(rows) == 1
            assert rows[0]["title"] == "Apfelkuchen"
            assert rows[0]["origin"] == "plugin:core-translator"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_core_translator.py -k "test_auto_translate" -v`
Expected: FAIL (no German row created automatically)

- [ ] **Step 3: Implement event listener and `retranslate-all` command**

In `secretsauce/plugins/core/core-translator/__init__.py`:
- Update manifest `config_schema` to include `target_languages: list[str]` (default `["de"]`).
- In `setup(ctx)`:
  - Register `ctx.command("retranslate-all", translate_all_job, title="Retranslate All Recipes")`.
  - Add event listener:
    ```python
    async def on_recipe_event(event: dict[str, Any]):
        payload = event.get("payload", {})
        if payload.get("origin") == "plugin:core-translator":
            return
        recipe_id = payload.get("id") or payload.get("recipe_id")
        if not recipe_id:
            return
        rec = await ctx.recipes.get_recipe(recipe_id)
        if not rec:
            return
        cfg = await ctx.config.get()
        targets = cfg.get("target_languages", ["de"])
        group_id = rec["group_id"]
        group_rows = await ctx.db.read_all("SELECT * FROM recipes WHERE group_id = ?", (group_id,))
        for t_lang in targets:
            if t_lang == rec.get("language"):
                continue
            existing = next((dict(r) for r in group_rows if r["language"] == t_lang), None)
            if existing and existing.get("origin") != "plugin:core-translator":
                # Preserve user translation
                continue
            await translate_recipe(ctx, recipe_id, t_lang)

    ctx.on("recipe:created", on_recipe_event)
    ctx.on("recipe:updated", on_recipe_event)
    ```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_core_translator.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-translator/__init__.py tests/test_plugin_core_translator.py
git commit -m "feat(core-translator): implement automated event translation and retranslate-all command"
```

---

#### Task 5: `core-recipe-importer` Share Target Provider, Attribution Slot & Offline Gating

**Files:**
- Create: `secretsauce/plugins/core/core-recipe-importer/ui/src/ImportedSourceAttribution.vue`
- Modify: `secretsauce/plugins/core/core-recipe-importer/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-recipe-importer/ui/src/ImportRecipeModal.vue`
- Test: `shell/tests/plugins/core-recipe-importer.spec.ts`

**Interfaces:**
- Consumes: `ss.intent.provider`, `ss.slot`, `ss.store.online`
- Produces: `import-shared` provider on `share:receive`, `recipe.detail.footer` attribution slot

- [ ] **Step 1: Write failing test in Vitest**

```typescript
// In shell/tests/plugins/core-recipe-importer.spec.ts
it('registers import-shared provider on share:receive and attribution slot', () => {
  const mockSS = {
    intent: { provider: vi.fn() },
    slot: vi.fn(),
  }
  activate(mockSS)
  expect(mockSS.intent.provider).toHaveBeenCalledWith(
    expect.objectContaining({ hub: 'share:receive', id: 'import-shared' })
  )
  expect(mockSS.slot).toHaveBeenCalledWith(
    'recipe.detail.footer',
    expect.anything(),
    expect.objectContaining({ order: 50 })
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-importer.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement `ImportedSourceAttribution.vue` and register in `index.ts`**

Create `secretsauce/plugins/core/core-recipe-importer/ui/src/ImportedSourceAttribution.vue`:
- Renders link if `recipe.origin` or `recipe.attributes?.import_url` is present.

In `secretsauce/plugins/core/core-recipe-importer/ui/src/index.ts`:
- Register `import-shared` on `share:receive` hub.
- Register `ImportedSourceAttribution` on slot `recipe.detail.footer` (order 50).
- In `ImportRecipeModal.vue`, gate extraction actions with `:disabled="!ss.store?.online"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/core-recipe-importer.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-recipe-importer/ui/ shell/tests/plugins/core-recipe-importer.spec.ts
git commit -m "feat(core-recipe-importer): add share target provider, attribution slot, and offline gating"
```

---

#### Task 6: `core-shopping-list` Export Hub, Item Actions Slot, Rebuild Command & Route

**Files:**
- Modify: `secretsauce/plugins/core/core-shopping-list/__init__.py`
- Modify: `secretsauce/plugins/core/core-shopping-list/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-shopping-list/ui/src/ShoppingListPage.vue`
- Test: `shell/tests/plugins/core-shopping-list.spec.ts`
- Test: `tests/test_plugin_core_shopping_list.py`

**Interfaces:**
- Consumes: `ctx.command`, `ss.intent.hub`, `ss.slot`
- Produces: `rebuild` command, `shopping:export` hub, `shopping.item.actions` slot

- [ ] **Step 1: Write failing tests for command and frontend hub/slot**

In `tests/test_plugin_core_shopping_list.py`:
- Add test verifying `POST /api/plugins/core-shopping-list/commands/rebuild` returns 202 and completes.

In `shell/tests/plugins/core-shopping-list.spec.ts`:
- Add test verifying hub `shopping:export` is declared with providers `copy-markdown` and `print`, and `<Slot name="shopping.item.actions" />` renders in item row.

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_plugin_core_shopping_list.py -v`
Run: `pnpm --prefix shell test shell/tests/plugins/core-shopping-list.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement backend command and frontend export hub & slot**

In `secretsauce/plugins/core/core-shopping-list/__init__.py`:
- Register `ctx.command("rebuild", rebuild_job, title="Rebuild Shopping List")`.

In `secretsauce/plugins/core/core-shopping-list/ui/src/index.ts`:
- Declare hub `shopping:export`.
- Register providers `copy-markdown` (order 10) and `print` (order 20).
- Alias route `/shopping` to `ShoppingListPage`.

In `secretsauce/plugins/core/core-shopping-list/ui/src/ShoppingListPage.vue`:
- Add `<Slot name="shopping.item.actions" :context="{ item }" />` inside each list item template.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_plugin_core_shopping_list.py -v`
Run: `pnpm --prefix shell test shell/tests/plugins/core-shopping-list.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-shopping-list/ tests/test_plugin_core_shopping_list.py shell/tests/plugins/core-shopping-list.spec.ts
git commit -m "feat(core-shopping-list): implement rebuild command, export hub, and item action slot"
```

---

#### Task 7: `core-cook-tracker` Skip Action, Leftover Carryovers & Modal

**Files:**
- Create: `secretsauce/plugins/core/core-cook-tracker/ui/src/CookDetailsModal.vue`
- Modify: `secretsauce/plugins/core/core-cook-tracker/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-cook-tracker/__init__.py`
- Test: `tests/test_plugin_core_cook_tracker.py`
- Test: `shell/tests/plugins/core-cook-tracker.spec.ts`

**Interfaces:**
- Consumes: Outbox client, carryovers table
- Produces: `skip` action that removes/cancels schedule entry, `log-leftover` dialog writing carryover records

- [ ] **Step 1: Write failing tests for skip and leftover carryovers**

In `tests/test_plugin_core_cook_tracker.py`:
- Add test for `/api/x/core-cook-tracker/carryovers` creating a carryover record.

In `shell/tests/plugins/core-cook-tracker.spec.ts`:
- Test that clicking `skip` triggers schedule deletion/cancellation and `log-leftover` opens `CookDetailsModal`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/test_plugin_core_cook_tracker.py -v`
Run: `pnpm --prefix shell test shell/tests/plugins/core-cook-tracker.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement carryover endpoint and modal**

In `secretsauce/plugins/core/core-cook-tracker/__init__.py`:
- Add endpoint `POST /api/x/core-cook-tracker/carryovers` inserting into `plugin_core_cook_tracker_carryovers`.
- Add endpoint `GET /api/x/core-cook-tracker/carryovers` returning unresolved carryovers.

In `secretsauce/plugins/core/core-cook-tracker/ui/src/CookDetailsModal.vue`:
- Modal input for leftover portions, container notes, expiration.
- On save, POSTs to `/api/x/core-cook-tracker/carryovers` (via outbox).

In `secretsauce/plugins/core/core-cook-tracker/ui/src/index.ts`:
- Update `skip` provider to call `api.delete('/api/schedule/' + ctx.entry.id)` or mark status.
- Update `log-leftover` provider to mount and show `CookDetailsModal`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_plugin_core_cook_tracker.py -v`
Run: `pnpm --prefix shell test shell/tests/plugins/core-cook-tracker.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-cook-tracker/ tests/test_plugin_core_cook_tracker.py shell/tests/plugins/core-cook-tracker.spec.ts
git commit -m "feat(core-cook-tracker): implement skip action, leftover modal, and carryover tracking"
```

---

#### Task 8: `core-recipes` Delete Hub Action & `core-units` Reconvert Command

**Files:**
- Modify: `secretsauce/plugins/core/core-recipes/ui/src/index.ts`
- Modify: `secretsauce/plugins/core/core-units/__init__.py`
- Test: `tests/test_plugin_core_units.py`

**Interfaces:**
- Consumes: `ctx.command`, `ss.intent.provider`
- Produces: `recipe:actions` delete provider (order 999), `reconvert-all` command

- [ ] **Step 1: Write failing tests**

In `tests/test_plugin_core_units.py`:
- Add test verifying `POST /api/plugins/core-units/commands/reconvert-all` executes successfully.

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_core_units.py -k "test_command" -v`
Expected: FAIL

- [ ] **Step 3: Implement delete action and `reconvert-all` command**

In `secretsauce/plugins/core/core-recipes/ui/src/index.ts`:
- Register provider `delete` on `recipe:actions` hub (order 999) with confirmation dialog calling `ss.api.delete(`/api/recipes/${ctx.recipe.id}`)`.

In `secretsauce/plugins/core/core-units/__init__.py`:
- Register `ctx.command("reconvert-all", reconvert_all_job, title="Reconvert All Recipes")`.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_core_units.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-recipes/ui/src/index.ts secretsauce/plugins/core/core-units/__init__.py tests/test_plugin_core_units.py
git commit -m "feat(core-recipes, core-units): add delete recipe action and reconvert-all command"
```

---

### Phase 3: Frontend Shell Enhancements & Asset Recompilation

#### Task 9: `PluginManagerPage.vue` Enhancements

**Files:**
- Modify: `shell/src/pages/PluginManagerPage.vue`
- Create: `shell/tests/pages/PluginManagerPage.spec.ts`

**Interfaces:**
- Consumes: `POST /api/plugins/install`, `POST /api/plugins/{id}/commands/{name}`, `DELETE /api/plugins/{id}`
- Produces: Enhanced UI for plugin management, job progress polling, and installation

- [ ] **Step 1: Write failing Vitest test for PluginManagerPage**

```typescript
// shell/tests/pages/PluginManagerPage.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PluginManagerPage from '../../src/pages/PluginManagerPage.vue'

describe('PluginManagerPage', () => {
  it('renders command buttons and triggers job execution', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue([
        {
          id: 'core-translator',
          name: 'Translator',
          core: true,
          enabled: true,
          state: 'active',
          commands: [{ id: 'retranslate-all', title: 'Retranslate All' }],
        },
      ]),
      post: vi.fn().mockResolvedValue({ job_id: 'job_123', status: 'pending' }),
    }
    const wrapper = mount(PluginManagerPage, {
      global: { provide: { __SS_API__: mockApi } },
    })
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    const cmdBtn = wrapper.find('button.btn-command')
    expect(cmdBtn.exists()).toBe(true)
    expect(cmdBtn.text()).toContain('Retranslate All')

    await cmdBtn.trigger('click')
    expect(mockApi.post).toHaveBeenCalledWith('/api/plugins/core-translator/commands/retranslate-all')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/pages/PluginManagerPage.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement PluginManagerPage controls**

In `shell/src/pages/PluginManagerPage.vue`:
- Add "Install Plugin" button with hidden `<input type="file" accept=".zip" />`.
- Upload selected file to `POST /api/plugins/install` via `FormData`.
- Render command buttons on plugin cards when `p.commands?.length > 0`.
- On command click: POST to `/api/plugins/{id}/commands/{cmd.id}` and poll `/api/jobs/{job_id}` showing progress bar.
- Render "Uninstall" button for non-core plugins (`!p.core`) with confirmation modal and data deletion checkbox.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/pages/PluginManagerPage.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shell/src/pages/PluginManagerPage.vue shell/tests/pages/PluginManagerPage.spec.ts
git commit -m "feat(shell): enhance PluginManagerPage with archive install, commands, and deletion"
```

---

#### Task 10: Compile Plugin Bundles & Shell Static Assets

**Files:**
- Build: `secretsauce/plugins/core/*/ui.js`
- Build: `secretsauce/static/`

- [ ] **Step 1: Compile all plugin UI bundles**

Run: `pnpm --prefix shell build:plugins`
Expected: All 13 core plugin bundles compiled with 0 errors.

- [ ] **Step 2: Build frontend shell bundle**

Run: `pnpm --prefix shell build`
Expected: Compiled static assets in `secretsauce/static/` with 0 errors.

- [ ] **Step 3: Commit updated bundles**

```bash
git add secretsauce/plugins/core/ secretsauce/static/
git commit -m "build: recompile all core plugin UI bundles and frontend shell assets"
```

---

### Phase 4: Full Suite Verification & Project Ledger Synchronization

#### Task 11: Comprehensive Test Suite Verification

- [ ] **Step 1: Run complete backend Pytest suite**

Run: `uv run pytest`
Expected: 100% tests passing with zero errors.

- [ ] **Step 2: Run complete frontend Vitest suite**

Run: `pnpm --prefix shell test --run`
Expected: 100% tests passing with zero errors.

---

#### Task 12: Project Ledger & Documentation Sync

**Files:**
- Modify: `TODO.md`
- Modify: `docs/superpowers/plans/2026-09-12-phase-3b-core-recipe-and-member-domain.md`
- Modify: `docs/superpowers/plans/2026-09-13-phase-3c-timeline-and-cooking-workflow.md`
- Modify: `docs/superpowers/plans/2026-09-18-stage-7-remaining-plugins.md`
- Modify: `docs/API_REFERENCE.md`

- [ ] **Step 1: Update `TODO.md`**
Mark Phase 3D, Phase 3E, Stage 7, and Pre-Stage 8 hardening as complete. Retain Stage 8 (Containerization & Smoke Verification) as the upcoming milestone.

- [ ] **Step 2: Sync checkmarks in historical plan files**
Update `- [ ]` to `- [x]` across `2026-09-12-...`, `2026-09-13-...`, and `2026-09-18-...` to reflect committed code.

- [ ] **Step 3: Update `docs/API_REFERENCE.md`**
Document the new plugin management endpoints (`POST /api/plugins/install`, `DELETE /api/plugins/{id}`, `POST /api/plugins/{id}/commands/{name}`).

- [ ] **Step 4: Commit**

```bash
git add TODO.md docs/superpowers/plans/ docs/API_REFERENCE.md
git commit -m "docs(ledger): synchronize TODO.md, historical plans, and API reference for Pre-Stage 8"
```

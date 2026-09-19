# Pre-Stage 8 Hardening: Plugin Lifecycle, Command API & Core Plugin Completions Design

**Date:** 2026-09-20  
**Status:** Approved  
**Target Milestone:** Pre-Stage 8 Hardening Phase  
**Preceding Milestones:** Stage 1–7 (Phases 1–3E)  
**Succeeding Milestone:** Stage 8 (Containerization, Healthcheck & Image Smoke Verification)

---

## 1. Executive Summary & Context

SecretSauce core completed Stages 1 through 6 and the initial implementation of all 13 Stage 7 core plugins (`core-*`). All 122 Pytest backend tests and 67 Vitest frontend tests pass. However, an architectural audit against the master system architecture (`docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md`) revealed that several foundational features before Stage 8 were deferred or left as stubs:

1. **Plugin Lifecycle & Command Endpoints (Stage 4 & 5)**:
   - The plugin command execution endpoint (`POST /api/plugins/{id}/commands/{name}`) was not wired to `JobManager`.
   - The third-party plugin installer (`secretsauce/install.py`), archive upload endpoint (`POST /api/plugins/install`), deletion endpoint (`DELETE /api/plugins/{id}`), and in-process re-exec (`os.execv`) were not implemented.
   - `PluginManagerPage.vue` lacked UI controls for uploading plugins, running commands, and deleting non-core plugins.
2. **Core Plugin Feature Gaps (Stage 7 & earlier)**:
   - `core-translator`: Lacked automated background translation on `recipe:created` and `recipe:updated` events, configuration schema for `target_languages`, and registration of `retranslate-all` via `ctx.command`.
   - `core-recipe-importer`: Lacked `import-shared` provider on `share:receive` intent hub (for Web Share Target), attribution slot on `recipe.detail.footer`, and offline gating.
   - `core-shopping-list`: Lacked `shopping:export` intent hub (`copy-markdown`, `print`), `shopping.item.actions` slot, and `rebuild` command.
   - `core-cook-tracker`: `skip` meal action and `log-leftover` carryover creation were stubbed with notifications; `CookDetailsModal.vue` and leftover resolution in timeline were missing.
   - `core-recipes` & `core-units`: Missing `delete` action on `recipe:actions` hub and `reconvert-all` `ctx.command` registration.
3. **Project Ledger Drift**: `TODO.md` and historical plan files contain out-of-date checklists.

This specification details the end-to-end design to resolve all pre-Stage 8 tasks so that the codebase is completely aligned with system architecture specifications prior to Stage 8 containerization.

---

## 2. Goals & Non-Goals

### Goals
- Fully implement the plugin command execution pipeline (`ctx.command` $\rightarrow$ `JobManager` $\rightarrow$ `POST /api/plugins/{id}/commands/{name}` $\rightarrow$ 202 job).
- Fully implement third-party plugin archive installation (`secretsauce/install.py`, `POST /api/plugins/install`) with zip slip / path traversal safety and manifest validation.
- Implement plugin uninstallation (`DELETE /api/plugins/{id}`), enforcing core plugin protection (`403 Forbidden`) and optional database table cascading (`?delete_data=true`).
- Provide in-process kernel re-exec (`os.execv`) upon restart request, guarded for test environments.
- Complete domain workflows across all 6 impacted core plugins (`core-translator`, `core-recipe-importer`, `core-shopping-list`, `core-cook-tracker`, `core-recipes`, `core-units`).
- Enhance `PluginManagerPage.vue` to expose command execution buttons with inline progress bars, zip uploads, and plugin deletion.
- Recompile all plugin UI bundles and the production frontend shell.
- Synchronize `TODO.md` and historical plan files.

### Non-Goals
- Multi-stage `Containerfile` and container image build (deferred to Stage 8).
- Rootless Podman deployment orchestration scripts (deferred to Stage 8).
- Playwright E2E smoke tests against built container images (deferred to Stage 8).

---

## 3. Detailed Architecture & Design

### 3.1 Backend Plugin Lifecycle & Command Infrastructure

#### 3.1.1 Plugin Command Registration & Execution
1. **Plugin Context Registration (`secretsauce/plugins/context.py`)**:
   - `PluginContext.command(command_id: str, fn: Callable[..., Any], title: str = "")`:
     - Registers command metadata `{"id": command_id, "title": title or command_id}` in `ServiceRegistry._commands[(plugin_id, command_id)]`.
     - Automatically registers the command function with `JobManager`: `self.jobs.register_handler(self.plugin_id, f"command:{command_id}", fn)`.
2. **Metadata Serialization**:
   - Update `kernel.plugins.list_plugins()` and `GET /api/plugins`:
     - Inspect `kernel.services._commands` to populate `"commands": [{"id": cmd_id, "title": cmd_title}, ...]` on active plugins.
3. **Command Execution Endpoint (`secretsauce/api/routes/plugins.py`)**:
   - `POST /api/plugins/{plugin_id}/commands/{command_name}`:
     - Check plugin existence and active status; raise `NotFoundError` (`404`) if missing or disabled.
     - Verify `command_name` exists in `kernel.services.get_command(plugin_id, command_name)`; raise `NotFoundError` (`404`) if not registered.
     - Create job: `job_id = await kernel.jobs.create_job(plugin_id, f"command:{command_name}", input_data={})`.
     - Launch execution: `asyncio.create_task(kernel.jobs.run_job(job_id))`.
     - Return HTTP 202: `{"job_id": job_id, "status": "pending"}`.

#### 3.1.2 Plugin Archive Installer (`secretsauce/install.py`)
1. **Security & Validation**:
   - Enforce archive payload limit $\le 50\text{ MB}$ (`HTTP 413 Payload Too Large`).
   - Member path traversal protection: inspect every member path in the `.zip` archive; reject archives containing relative paths resolving outside target (`..`), absolute paths, or symbolic links.
   - Manifest validation: locate `manifest.json` at archive root or in single top-level directory; parse and validate against `PluginManifestSchema` (id, name, version).
2. **Target Extraction & Installation**:
   - Destination: `{DATA_DIR}/plugins/{plugin_id}/`.
   - Conflict handling: If directory exists and query parameter `?upgrade=true` is false, return `HTTP 409 Conflict`. If `upgrade=true`, remove existing directory and extract.
   - Python dependencies: If `{plugin_dir}/requirements.txt` exists, invoke `uv pip install -r requirements.txt` (or fallback `pip install`) targeting the runtime Python environment.
   - Database migrations: Run `{plugin_dir}/migrations/*.sql` using the kernel's migration engine.
   - Registry update: Insert or update row in `plugins` SQLite table (`id, name, version, core=0, enabled=1, state='active'`).
3. **Endpoint (`POST /api/plugins/install`)**:
   - Accepts multipart `UploadFile` with optional query parameter `upgrade: bool = False`.
   - Returns HTTP 202: `{"plugin_id": plugin_id, "status": "installed", "restart_required": True}`.

#### 3.1.3 Plugin Uninstallation (`DELETE /api/plugins/{plugin_id}`)
1. **Core Plugin Protection**:
   - Check plugin record; if `core == 1` or manifest declares `core: true`, raise `HTTP 403 Forbidden` (`"Core plugins cannot be uninstalled"`).
2. **Data Cascade (`?delete_data=true`)**:
   - If query parameter `delete_data=true`, query `sqlite_master` for tables matching `plugin_{plugin_id}_%` and drop them inside a transaction.
3. **Directory & Registry Cleanup**:
   - Remove directory `{DATA_DIR}/plugins/{plugin_id}/`.
   - Delete row from `plugins` table in database.
   - Return HTTP 200: `{"plugin_id": plugin_id, "status": "uninstalled", "data_deleted": bool}`.

#### 3.1.4 In-Process Kernel Re-Exec
- Add `kernel.request_restart()`:
  - Closes active SQLite connection pools cleanly.
  - Cancels running background tasks and terminates SSE stream handles.
  - If `os.environ.get("SS_TEST_MODE") != "1"`: invokes `os.execv(sys.executable, [sys.executable, "-m", "secretsauce", *sys.argv[1:]])`.

---

### 3.2 Core Plugin Completions

#### 3.2.1 `core-translator`
- **Config Schema**:
  - Update `config_schema` in manifest to include:
    ```json
    {
      "properties": {
        "auto_translate_members": { "type": "boolean", "default": false },
        "target_languages": { "type": "array", "items": { "type": "string" }, "default": ["de"] }
      }
    }
    ```
- **Event Listeners (`setup(ctx)`)**:
  - Register `ctx.on("recipe:created", on_recipe_saved)` and `ctx.on("recipe:updated", on_recipe_saved)`.
  - In `on_recipe_saved(event)`:
    - If `event.payload.get("origin") == "plugin:core-translator"`, return immediately (loop prevention).
    - Retrieve source recipe via `ctx.recipes.get_recipe(event.payload["id"])`.
    - Fetch recipe group rows. For each target language $L \in \text{config.target\_languages}$ where $L \ne \text{source.language}$:
      - If target row exists with `origin != "plugin:core-translator"`, skip (preserve user/member edits).
      - If target row does not exist, or exists with `origin == "plugin:core-translator"`: call `translate_recipe(ctx, source_recipe["id"], L)`.
- **Command Registration**:
  - Replace raw job registration with `ctx.command("retranslate-all", translate_all_job, title="Retranslate All Recipes")`.

#### 3.2.2 `core-recipe-importer`
- **Web Share Target Integration**:
  - In `core-recipe-importer/ui/src/index.ts`: register provider `import-shared` on hub `share:receive` (order 10).
  - Inspects context `{ url, text, title }`. If a URL is detected, opens `ImportRecipeModal` pre-populated with that URL, returning `{ path: "/recipes" }`.
- **Source Attribution Slot**:
  - Create `ImportedSourceAttribution.vue`: displays `"Imported from <domain>"` with an external link if recipe has import metadata.
  - Register component in slot `recipe.detail.footer` (order 50).
- **Offline Gating**:
  - Inspect `ss.store.online`; disable URL extraction button and input field when offline, displaying an offline badge/tooltip.

#### 3.2.3 `core-shopping-list`
- **Export Intent Hub (`shopping:export`)**:
  - Declare hub `shopping:export` (`"Export Shopping List"`).
  - Register provider `copy-markdown` (order 10): serializes current shopping list into Markdown checklist format (`- [ ] 2 cups flour`), writes to clipboard, and triggers notification.
  - Register provider `print` (order 20): triggers print formatting view via `window.print()`.
- **Slot `shopping.item.actions`**:
  - Add `<Slot name="shopping.item.actions" :context="{ item }" />` next to each ingredient item row in `ShoppingListPage.vue`.
- **Backend Command & Route**:
  - Register `ctx.command("rebuild", rebuild_job, title="Rebuild Shopping List")`.
  - Expose `/shopping` as a route alongside `/shopping-list`.

#### 3.2.4 `core-cook-tracker`
- **`skip` Meal Workflow**:
  - Update `skip` provider to remove or reschedule the timeline meal entry and record a skipped event in journal history.
- **`log-leftover` Flow & Carryovers**:
  - Create `CookDetailsModal.vue`: inputs leftover servings count, container notes, and expiration date (default +3 days).
  - Inserts carryover record into `plugin_core_cook_tracker_carryovers` table:
    `(id, recipe_id, cooked_at, servings_remaining, notes, resolved_by_entry_id)`.
- **Timeline Leftover Scheduling**:
  - In `core-timeline`, allow selecting available carryover items when creating a timeline entry, linking `resolved_by_entry_id`.

#### 3.2.5 `core-recipes` & `core-units`
- **`core-recipes`**:
  - Register `delete` action provider on `recipe:actions` hub (order 999) with confirmation dialog invoking `DELETE /api/recipes/{id}`.
- **`core-units`**:
  - Register `reconvert-all` via `ctx.command("reconvert-all", reconvert_all_job, title="Reconvert All Recipes")`.

---

### 3.3 Frontend Shell Enhancements & Rebundling

#### 3.3.1 `PluginManagerPage.vue`
- **Header "Install Plugin" Action**:
  - Hidden file input accepting `.zip` files.
  - Triggered by button, uploads file via `FormData` to `POST /api/plugins/install`.
  - Shows progress state and reload notification.
- **Command Buttons on Plugin Cards**:
  - If `p.commands?.length > 0`, render command buttons.
  - On click, POSTs to `/api/plugins/{p.id}/commands/{cmd.id}`.
  - Starts polling `/api/jobs/{job_id}`, rendering a progress bar and status message.
- **Delete Plugin Action**:
  - For non-core plugins (`!p.core`), display a "Delete" button.
  - Modal confirmation with checkbox: *"Also delete plugin data & database tables"*.
  - Calls `DELETE /api/plugins/{p.id}?delete_data=true|false`.

#### 3.3.2 Bundling Pipeline
- Run `pnpm --prefix shell build:plugins` to compile all 13 plugin bundles (`ui.js`, `ui.css`).
- Run `pnpm --prefix shell build` to compile shell static assets to `secretsauce/static/`.

---

## 4. Verification & Testing Strategy

### 4.1 Backend Pytest
- **`tests/test_plugin_management.py`**:
  - Test command execution: `POST /api/plugins/{id}/commands/{name}` returns 202 with valid `job_id`, updates job progress, runs handler. Returns 404 for unknown command or inactive plugin.
  - Test archive install: `POST /api/plugins/install` with valid zip installs plugin, registers in DB, extracts files. Rejects zip with path traversal (`../etc/passwd`) or missing manifest. Enforces size limit.
  - Test uninstaller: `DELETE /api/plugins/{id}` returns 403 on core plugin. Successfully deletes user plugin, and drops `plugin_{id}_*` tables when `delete_data=true`.
- **`tests/test_plugin_core_translator.py`**:
  - Automated translation on `recipe:created` and `recipe:updated` events.
  - Verifies loop prevention when `origin == "plugin:core-translator"`.
  - Verifies user-edited recipes are not overwritten.
  - Verifies `retranslate-all` command.
- **`tests/test_plugin_core_shopping_list.py`**:
  - Verifies `rebuild` command execution.

### 4.2 Frontend Vitest
- **`shell/tests/pages/PluginManagerPage.spec.ts`**:
  - Verifies install upload trigger, command button execution and job polling, and non-core delete modal.
- **`shell/tests/plugins/core-recipe-importer.spec.ts`**:
  - Verifies `share:receive` intent provider and attribution slot.
- **`shell/tests/plugins/core-shopping-list.spec.ts`**:
  - Verifies `shopping:export` intent providers (`copy-markdown`, `print`) and item actions slot.

---

## 5. Project Tracking & Documentation Maintenance

1. **Update `TODO.md`**:
   - Mark Phase 3D, Phase 3E, and Stage 7 as completed.
   - Record Pre-Stage 8 Hardening as the current in-progress phase.
   - Retain Stage 8 (Containerization & Container E2E Smoke Verification) as the upcoming milestone.
2. **Update Historical Plan Files**:
   - Mark completed steps as `- [x]` in:
     - `docs/superpowers/plans/2026-09-12-phase-3b-core-recipe-and-member-domain.md`
     - `docs/superpowers/plans/2026-09-13-phase-3c-timeline-and-cooking-workflow.md`
     - `docs/superpowers/plans/2026-09-18-stage-7-remaining-plugins.md`
3. **Update API Documentation**:
   - Update `docs/API_REFERENCE.md` to document `POST /api/plugins/{id}/commands/{name}`, `POST /api/plugins/install`, and `DELETE /api/plugins/{id}`.

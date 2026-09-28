# Agent Guidelines for SecretSauce Core

## 1. System & Environment Realities (Windows / Git Bash)

- **Python Runtime:** Always use `python` or `uv run python`. **NEVER** invoke `python3` (on Windows, `python3` triggers the Microsoft Store app execution alias, exiting with code 49).
- **Python Package & Test Runner:** Always use `uv run pytest`. If pytest is missing, run `uv sync --extra dev`.
- **Node & Package Manager:** The frontend uses `pnpm`. Root is **not** a Node project; all npm/pnpm operations must target the `shell/` workspace:
  - Add dependency: `pnpm --prefix shell add <pkg>` (or `-D`)
  - **NEVER** run `pnpm add` at repo root (`ERR_PNPM_ADDING_TO_ROOT`).
- **MSYS / Git Bash Flag Conversions:** When calling Windows binaries like `taskkill`, MSYS automatically converts `/F` into `F:/`. Use double slashes: `taskkill //F //IM <proc>.exe`, or invoke via `cmd.exe /c "taskkill /F /IM <proc>.exe"`.
- **Bash Quoting & Showboat:** Avoid unescaped backticks inside double-quoted bash strings (e.g. in `uvx showboat note ...`). Bash evaluates backticks as subshell commands. Use single quotes or `cat << 'EOF'` heredocs.
- **Search Bounds:** Never run unconstrained `find .` or `grep` across the repository. Always ignore or prune `.venv`, `node_modules`, `.git`, and `.worktrees` to prevent infinite hangs.

---

## 2. Directory Layout & Mental Model

```
secretsauce-core/
├── pyproject.toml               # Python project configuration (FastAPI, aiosqlite, uv)
├── secretsauce/                 # Backend Python package
│   ├── api/routes/              # REST endpoints (setup, auth, recipes, members, plugins, pwa, etc.)
│   ├── nouns/                   # Core repositories (recipes, members, household, schedule, assets)
│   ├── plugins/                 # Plugin loader, context, and registry
│   │   └── core/                # Core plugins live here: <plugin>/manifest.json, __init__.py, ui/
│   ├── static/                  # Production-built frontend shell assets (served by FastAPI)
│   └── units/                   # Units engine backend
├── shell/                       # Frontend PWA & UI monorepo (pnpm workspace)
│   ├── package.json             # Frontend dependencies & scripts
│   ├── packages/                # Internal frontend packages
│   │   ├── ui/                  # @secretsauce/ui shared components
│   │   └── units/               # @secretsauce/units frontend engine
│   ├── src/                     # Vue 3 application shell (App.vue, main.ts, stores, registries)
│   ├── scripts/                 # build-plugins.ts, vendor.ts
│   └── e2e/                     # Playwright end-to-end test suite
├── tests/                       # Backend Pytest suite (tests/test_*.py)
├── docs/                        # Specifications, API reference, architecture docs
└── tmp/, tmp_claudecode/        # Reference material and test data — DO NOT DELETE
```

*Note: Core plugins are located at `secretsauce/plugins/core/`, NOT at `/plugins`.*

---

## 3. Standard Verification & Test Commands

### Backend
- Run all tests: `uv run pytest`
- Run single test file: `uv run pytest tests/test_<module>.py -v`
- Run by keyword filter: `uv run pytest -k "<test_name>"`

### Frontend
- Unit / Component tests: `pnpm --prefix shell test` (Runs Vitest)
  - *Do NOT run `pnpm test:unit` (command does not exist).*
- Single vitest file (path is relative to `shell`): `pnpm --prefix shell test packages/units/tests/units.spec.ts`
- E2E tests: `pnpm --prefix shell test:e2e` (Runs Playwright)

---

## 4. Testing Strategy (TDD)

Earlier bugs slipped past a green test suite because tests skipped over the broken code or faked things production never did. Rules:

- **Outside-in:** Start every feature with one failing test that runs the way production runs. Then write the unit tests inside it.
  - Backend: `build_app()` + `app.router.lifespan_context(app)` + httpx, then poll until the expected result appears (see `_eventually` in `tests/test_runtime_services.py`). Never call `drain_events()` or `run_job()` in these tests.
  - Shell: add a Playwright test for anything that goes between browser and kernel (REST, SSE, service worker, outbox), and for browser globals that Vitest/Happy-DOM only mocks (`localStorage`, `SVGElement`, `indexedDB`, 401 handling).
- **Use `make_kernel()` only for unit-level tests.** If a feature is only tested with `drain_events()`/`run_job()`, the code that connects it in production is untested.
- **Trigger, don't fake.** Create events by going through the kernel (HTTP or repos). Only the event-system tests (`tests/test_events*.py`) may emit or append kernel `<noun>:*` events directly.
- **Test from the real entry point.** Don't test through internal functions the app never calls from outside. Example: test the stream client via `connect()`, not `handleMessage()`. Fake browser APIs must behave like the real ones.
- **Mocks must match the backend.** Check mocked API responses against the route code or a recorded real response, never from memory. Vitest tests with a mocked API are component tests; don't call them e2e or integration tests.
- **Test failure cases, not just the happy path:**
  - Transactions: cancelled or raising mid-write, nested, concurrent.
  - Events and jobs: duplicate delivery, concurrent drains, a handler that raises or loops, restart.
  - Auth: no credential, wrong type of credential, revoked session.
  - Multi-step writes (setup, migrations, import): if step N fails, nothing is saved.
- **Check shared rules across everything:** for rules that apply everywhere (auth, error format, events), write one parametrized test over `app.routes`, all noun repos or all plugins, so new code is covered automatically.

---

## 5. UI & Plugin Build Pipeline (Critical)

The backend and Playwright E2E tests rely on compiled bundles:
1. **Plugin UI compilation:** When modifying plugins under `secretsauce/plugins/core/<name>/ui/`:
   - You **MUST** run `pnpm --prefix shell build:plugins` to compile to `<plugin>/ui/dist/ui.js`.
2. **Shell compilation:** When modifying the application shell (`shell/src/`):
   - You **MUST** run `pnpm --prefix shell build` to compile to `secretsauce/static/`.

---

## 6. Kernel & API Architecture Notes

- **Kernel Attributes:** `BootedKernel` holds `kernel.registry` (also reachable as the alias `kernel.plugins`) and `kernel.loader` (`enable()`/`disable()` work at runtime).
- **One composition root:** `secretsauce.boot.boot()` wires everything; both `build_app()` and the test harness `secretsauce.testing.make_kernel()` use it. The harness keeps background services (event pump, job runner, GC) off unless `make_kernel(..., services=True)`: deliver events with `drain_events(k)` and run jobs with `k.jobs.run_job(job_id)`.
- **Transactions:** `db.transaction()` is re-entrant within a task (savepoints), rolls back on cancellation, and supports `db.after_commit()`/`db.on_rollback()`. Kernel repositories append their `<noun>:*` events inside the same transaction.
- **Plugin routes:** must live under `/api/x/<plugin_id>/` and take their context via `Depends(current_ctx)`, not `request.app.state.kernel`.
- **Database Connections:** Always close SQLite connections in async tests and fixtures; open connections on Windows cause file locks that prevent directory cleanups (`_rmtree_unsafe` permission errors).

---

## 7. Git Worktree & Cleanup Hygiene

- Before removing a worktree (`git worktree remove`), ensure all background server processes, pytest runs, and Node processes are completely terminated. Windows will lock files and corrupt worktree pruning if handles remain open.
- Never delete `tmp/`, `tmp_claudecode/`, or test data directories like `my-test-data/` unless explicitly requested.

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

## 4. UI & Plugin Build Pipeline (Critical)

The backend and Playwright E2E tests rely on compiled bundles:
1. **Plugin UI compilation:** When modifying plugins under `secretsauce/plugins/core/<name>/ui/`:
   - You **MUST** run `pnpm --prefix shell build:plugins` to compile to `<plugin>/ui/dist/ui.js`.
2. **Shell compilation:** When modifying the application shell (`shell/src/`):
   - You **MUST** run `pnpm --prefix shell build` to compile to `secretsauce/static/`.
3. **Never trust Happy-DOM / Vitest component tests alone:**
   - Vitest runs against mocks. Browser globals (`localStorage`, `SVGElement`, `indexedDB`, unauthenticated 401 handling) must be verified via Playwright E2E tests (`pnpm --prefix shell test:e2e`).

---

## 5. Kernel & API Architecture Notes

- **Kernel Attributes:** `BootedKernel` holds `kernel.registry` and `kernel.loader`, **not** `kernel.plugins`.
- **Database Connections:** Always close SQLite connections in async tests and fixtures; open connections on Windows cause file locks that prevent directory cleanups (`_rmtree_unsafe` permission errors).

---

## 6. Git Worktree & Cleanup Hygiene

- Before removing a worktree (`git worktree remove`), ensure all background server processes, pytest runs, and Node processes are completely terminated. Windows will lock files and corrupt worktree pruning if handles remain open.
- Never delete `tmp/`, `tmp_claudecode/`, or test data directories like `my-test-data/` unless explicitly requested.

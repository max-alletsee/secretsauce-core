# SecretSauce Development Ledger

**Current Status:** Phase 2: Frontend Shell & PWA in progress (Tasks 1-9 completed, Task 10 ready)  
**Active Plan:** `docs/superpowers/plans/2026-09-10-frontend-shell-implementation-plan.md`  
**Architecture Spec:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md` (Revision 7)  
**Last Updated:** 2026-09-10  

---

## Instructions for Resuming in a Fresh Pi Session

When starting a new Pi session to continue development:
1. **Announce Skill:** Invoke the `executing-plans` skill.
2. **Inspect State:**
   - Read this `TODO.md` to see the current active task and last commit.
   - Run `git status` and `git log -n 5 --oneline`.
   - Run existing tests: `uv run pytest` to ensure the baseline is completely green.
3. **Execute Task:**
   - Open `docs/superpowers/plans/2026-09-10-frontend-shell-implementation-plan.md`.
   - Locate the first task with unchecked boxes (`- [ ]`).
   - Follow each step strictly with Test-Driven Development (TDD):
     - Step 1: Write failing test
     - Step 2: Run test to verify failure
     - Step 3: Write minimal implementation
     - Step 4: Run test to verify it passes
     - Step 5: Commit with conventional commit message
   - Update `- [ ]` to `- [x]` in both the plan file and this `TODO.md`.
4. **Surprises & Blockers:**
   - If an unexpected error, constraint violation, or design ambiguity arises, **stop immediately**. Do not work around it silently. Surface it to the human partner and update the plan.

---

## Phase 1: Kernel Foundation (Stages 1 – 4)

### Stage 1: Project Setup, Database Engine & Kernel Nouns
- [x] **Task 1: Package Scaffolding, Config & Error Hierarchy**
  - Files: `pyproject.toml`, `secretsauce/config.py`, `secretsauce/errors.py`
  - Tests: `tests/test_config.py`, `tests/test_errors.py`
- [x] **Task 2: Database Connection Engine & Migration Runner**
  - Files: `secretsauce/db.py`, `secretsauce/migrations/0001_initial.sql`
  - Tests: `tests/test_db.py`
- [x] **Task 3: Household Configuration Repository**
  - Files: `secretsauce/nouns/household.py`
  - Tests: `tests/test_household.py`
- [x] **Task 4: Household Members Repository**
  - Files: `secretsauce/nouns/members.py`
  - Tests: `tests/test_members.py`
- [x] **Task 5: Recipe Repository (Language Rows, Trigram FTS5 & Safe Deletion)**
  - Files: `secretsauce/nouns/recipes.py`
  - Tests: `tests/test_recipes.py`
- [x] **Task 6: Schedule & Cook Journal Repositories**
  - Files: `secretsauce/nouns/schedule.py`, `secretsauce/nouns/journal.py`
  - Tests: `tests/test_schedule_journal.py`
- [x] **Task 7: Assets & Entity Attributes Repositories**
  - Files: `secretsauce/nouns/assets.py`, `secretsauce/nouns/attributes.py`
  - Tests: `tests/test_assets_attributes.py`

### Stage 2: Hooks & Event System
- [x] **Task 8: Synchronous Pre-Commit Policy Hooks**
  - Files: `secretsauce/hooks.py`
  - Tests: `tests/test_hooks.py`
- [x] **Task 9: Transactional Event Log, Outbox Dispatchers & Pruning**
  - Files: `secretsauce/events.py`
  - Tests: `tests/test_events.py`

### Stage 3: Plugin System & Runtime
- [x] **Task 10: Secrets Management & Key Derivation**
  - Files: `secretsauce/secrets.py`
  - Tests: `tests/test_secrets.py`
- [x] **Task 11: Background Jobs Engine**
  - Files: `secretsauce/jobs.py`
  - Tests: `tests/test_jobs.py`
- [x] **Task 12: Plugin Discovery, Manifest Validation & Registry**
  - Files: `secretsauce/plugins/manifest.py`, `secretsauce/plugins/loader.py`, `secretsauce/plugins/registry.py`
  - Tests: `tests/test_plugin_loader.py`
- [x] **Task 13: Plugin Context SDK & Token Management**
  - Files: `secretsauce/plugins/context.py`, `secretsauce/api_tokens.py`
  - Tests: `tests/test_plugin_context.py`
- [x] **Task 14: Plugin Test Harness (`secretsauce.testing`)**
  - Files: `secretsauce/testing.py`
  - Tests: `tests/test_testing_harness.py`

### Stage 4: HTTP API, Auth & SSE Streaming
- [x] **Task 15: Auth Middleware, Session Cookies & Setup Flow**
  - Files: `secretsauce/auth.py`, `secretsauce/api/routes/setup.py`, `secretsauce/api/routes/auth.py`
  - Tests: `tests/test_auth_routes.py`
- [x] **Task 16: Household & Member REST API Routes**
  - Files: `secretsauce/api/routes/household.py`, `secretsauce/api/routes/members.py`
  - Tests: `tests/test_household_members_api.py`
- [x] **Task 17: Recipe REST API Routes (Search, Languages & Deletion)**
  - Files: `secretsauce/api/routes/recipes.py`
  - Tests: `tests/test_recipes_api.py`
- [x] **Task 18: Schedule & Cook Journal REST API Routes**
  - Files: `secretsauce/api/routes/schedule.py`, `secretsauce/api/routes/journal.py`
  - Tests: `tests/test_schedule_journal_api.py`
- [x] **Task 19: Assets & Attributes REST API Routes**
  - Files: `secretsauce/api/routes/assets.py`, `secretsauce/api/routes/attributes.py`
  - Tests: `tests/test_assets_attributes_api.py`
- [x] **Task 20: Plugins, Jobs & Server-Sent Events (SSE) Stream**
  - Files: `secretsauce/stream.py`, `secretsauce/api/routes/plugins.py`, `secretsauce/api/routes/jobs.py`
  - Tests: `tests/test_stream_jobs_api.py`
- [x] **Task 21: Application Boot Orchestrator, CLI & Garbage Collector**
  - Files: `secretsauce/app.py`, `secretsauce/boot.py`, `secretsauce/gc.py`, `secretsauce/cli.py`, `secretsauce/__main__.py`
  - Tests: `tests/test_app_boot.py`, `tests/test_cli.py`

## Phase 2: Frontend Shell & PWA (Stage 5)

- [x] **Task 1: Backend PWA & Shell Serving Routes** - Commit: `135ae32`
  - Files: `secretsauce/api/routes/pwa.py`, `secretsauce/app.py`, `secretsauce/boot.py`, `secretsauce/testing.py`
  - Tests: `tests/test_pwa.py`
- [x] **Task 2: Shell Project Scaffolding & Dependencies** - Commit: `736ae85`
  - Files: `shell/package.json`, `shell/pnpm-workspace.yaml`, `shell/tsconfig.json`, `shell/vite.config.ts`, `shell/vitest.config.ts`, `shell/packages/ui/package.json`, `shell/packages/ui/tsconfig.json`
  - Tests: `shell/tests/scaffold.spec.ts`
- [x] **Task 3: @secretsauce/ui Package Core** - Commit: `62c1752`
  - Files: `shell/packages/ui/src/index.ts`, `shell/packages/ui/src/types.ts`, `shell/packages/ui/src/Slot.vue`, `shell/packages/ui/src/IntentTrigger.vue`, `shell/packages/ui/src/testing.ts`
  - Tests: `shell/packages/ui/tests/slot.spec.ts`, `shell/packages/ui/tests/intent-trigger.spec.ts`
- [x] **Task 4: Shell API Client** - Commit: `715e70b`
  - Files: `shell/src/api.ts`
  - Tests: `shell/tests/api.spec.ts`
- [x] **Task 5: Service Worker & URL Classifier** - Commit: `9b9ea09`
  - Files: `shell/src/sw/classify.ts`, `shell/src/sw/sw.ts`, `shell/vite.sw.config.ts`
  - Tests: `shell/src/sw/classify.spec.ts`
- [x] **Task 6: IndexedDB Outbox Engine** - Commit: `d161563`
  - Files: `shell/src/outbox.ts`
  - Tests: `shell/tests/outbox.spec.ts`
- [x] **Task 7: SSE Stream Client** - Commit: `d5c14f6`
  - Files: `shell/src/stream.ts`
  - Tests: `shell/tests/stream.spec.ts`
- [x] **Task 8: Shell Registries & Plugin Loader** - Commit: `edebe9c`
  - Files: `shell/src/registries/routes.ts`, `shell/src/registries/slots.ts`, `shell/src/registries/intents.ts`, `shell/src/registries/settings.ts`, `shell/src/registries/i18n.ts`, `shell/src/registries/plugins.ts`
  - Tests: `shell/src/registries/registries.spec.ts`
- [x] **Task 9: Stores, Theming & PrimeVue Setup** - Commit: `23f94f5`
  - Files: `shell/src/stores/app.ts`, `shell/src/stores/household.ts`, `shell/src/stores/member.ts`, `shell/src/theme.ts`
  - Tests: `shell/src/stores/stores.spec.ts`
- [ ] **Task 10: Shell Components & Offline Bar**
  - Files: `shell/src/components/OfflineBar.vue`, `shell/src/components/ConfigForm.vue`, `shell/src/components/AppHeader.vue`, `shell/src/components/AppNav.vue`
  - Tests: `shell/tests/components.spec.ts`
- [ ] **Task 11: Core Shell Pages**
  - Files: `shell/src/pages/SetupPage.vue`, `shell/src/pages/LoginPage.vue`, `shell/src/pages/SettingsPage.vue`, `shell/src/pages/PluginManagerPage.vue`, `shell/src/pages/SharePage.vue`
  - Tests: `shell/tests/pages.spec.ts`
- [ ] **Task 12: App Shell Assembly & Routing**
  - Files: `shell/src/App.vue`, `shell/src/router/index.ts`, `shell/src/main.ts`, `shell/index.html`
  - Tests: `shell/tests/app.spec.ts`
- [ ] **Task 13: Build Pipeline, Vendoring & End-to-End Build Verification**
  - Files: `shell/scripts/build.js`, `pyproject.toml`
  - Tests: `tests/test_pwa_vendored.py`

---

## Upcoming Phases (Roadmap)
- **Phase 2: Shell & PWA Frontend (Stage 5)**
  - Vue 3 + PrimeVue SPA shell, dynamic import map, module loader for `/api/plugins/{id}/ui.js`, slot & intent registries, service worker, offline outbox write queue.
- **Phase 3: Units & Core Plugins (Stages 6 – 7)**
  - Units engine (`secretsauce/units/`), `units` plugin, `recurring` plugin, and all 11 core plugins (`core-members` through `shopping-list`).
- **Phase 4: Podman Packaging & Verification (Stage 8)**
  - Multi-stage `Containerfile`, automated healthcheck, zip export/restore, and Playwright smoke test.

---

## Completed Tasks Log
- **Task 1: Package Scaffolding, Config & Error Hierarchy** - Commit: `e5e9233` (feat(kernel): add project scaffolding, config and error hierarchy)
- **Task 2: Database Connection Engine & Migration Runner** - Commit: `1f234e0` (feat(kernel): implement sqlite wal database engine and initial schema migration)
- **Task 3: Household Configuration Repository** - Commit: `a00ccea` (feat(kernel): add household config repository)
- **Task 4: Household Members Repository** - Commit: `9ad6b80` (feat(kernel): add household members repository with revision concurrency)
- **Task 5: Recipe Repository (Language Rows, Trigram FTS5 & Safe Deletion)** - Commit: `cbd058f` (feat(kernel): implement recipe repository with trigram fts5 and group language resolution)
- **Task 6: Schedule & Cook Journal Repositories** - Commit: `5c425b3` (feat(kernel): implement schedule and cook journal repositories)
- **Task 7: Assets & Entity Attributes Repositories** - Commit: `56023f6` (feat(kernel): implement assets and entity attributes repositories)
- **Task 8: Synchronous Pre-Commit Policy Hooks** - Commit: `b8f8d79` (feat(kernel): implement pre-commit policy hooks with mutation and veto)
- **Task 9: Transactional Event Log, Outbox Dispatchers & Pruning** - Commit: `d2c37af` (feat(kernel): implement transactional event log and per-plugin outbox dispatchers)
- **Task 10: Secrets Management & Key Derivation** - Commit: `f026bf5` (feat(kernel): implement secrets management and hkdf key derivation)
- **Task 11: Background Jobs Engine** - Commit: `9316629` (feat(kernel): implement background jobs engine)
- **Task 12: Plugin Discovery, Manifest Validation & Registry** - Commit: `9a465ae` (feat(kernel): implement plugin discovery, validation, and registry)
- **Task 13: Plugin Context SDK & Token Management** - Commit: `db4dd0c` (feat(kernel): implement plugin context sdk and token management)
- **Task 14: Plugin Test Harness (`secretsauce.testing`)** - Commit: `69d7f95` (feat(kernel): implement secretsauce.testing harness)
- **Task 15: Auth Middleware, Session Cookies & Setup Flow** - Commit: `ebbb5d6` (feat(kernel): implement setup flow, scrypt auth, and session cookie validation)
- **Task 16: Household & Member REST API Routes** - Commit: `d3b5638` (feat(kernel): implement household and members rest api routes)
- **Task 17: Recipe REST API Routes (Search, Languages & Deletion)** - Commit: `d304f52` (feat(kernel): implement recipe rest api routes with fts5 search and language resolution)
- **Task 18: Schedule & Cook Journal REST API Routes** - Commit: `8c93b04` (feat(kernel): implement schedule and cook journal rest api routes)
- **Task 19: Assets & Attributes REST API Routes** - Commit: `934e5fb` (feat(kernel): implement assets and attributes rest api routes)
- **Task 20: Plugins, Jobs & Server-Sent Events (SSE) Stream** - Commit: `7d5444a` (feat(kernel): implement sse stream hub and plugin/job api routes)
- **Task 21: Application Boot Orchestrator, CLI & Garbage Collector** - Commit: `b9c0c38` (feat(kernel): implement application boot factory, hourly gc, export, and cli)

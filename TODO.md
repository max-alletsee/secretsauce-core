# SecretSauce Development Ledger

**Current Status:** Ready to begin Phase 1 execution  
**Active Plan:** `docs/superpowers/plans/2026-09-09-kernel-implementation-plan.md`  
**Architecture Spec:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md` (Revision 7)  
**Last Updated:** 2026-09-09  

---

## Instructions for Resuming in a Fresh Pi Session

When starting a new Pi session to continue development:
1. **Announce Skill:** Invoke the `executing-plans` skill.
2. **Inspect State:**
   - Read this `TODO.md` to see the current active task and last commit.
   - Run `git status` and `git log -n 5 --oneline`.
   - Run existing tests: `uv run pytest` to ensure the baseline is completely green.
3. **Execute Task:**
   - Open `docs/superpowers/plans/2026-09-09-kernel-implementation-plan.md`.
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
- [ ] **Task 4: Household Members Repository**
  - Files: `secretsauce/nouns/members.py`
  - Tests: `tests/test_members.py`
- [ ] **Task 5: Recipe Repository (Language Rows, Trigram FTS5 & Safe Deletion)**
  - Files: `secretsauce/nouns/recipes.py`
  - Tests: `tests/test_recipes.py`
- [ ] **Task 6: Schedule & Cook Journal Repositories**
  - Files: `secretsauce/nouns/schedule.py`, `secretsauce/nouns/journal.py`
  - Tests: `tests/test_schedule_journal.py`
- [ ] **Task 7: Assets & Entity Attributes Repositories**
  - Files: `secretsauce/nouns/assets.py`, `secretsauce/nouns/attributes.py`
  - Tests: `tests/test_assets_attributes.py`

### Stage 2: Hooks & Event System
- [ ] **Task 8: Synchronous Pre-Commit Policy Hooks**
  - Files: `secretsauce/hooks.py`
  - Tests: `tests/test_hooks.py`
- [ ] **Task 9: Transactional Event Log, Outbox Dispatchers & Pruning**
  - Files: `secretsauce/events.py`
  - Tests: `tests/test_events.py`

### Stage 3: Plugin System & Runtime
- [ ] **Task 10: Secrets Management & Key Derivation**
  - Files: `secretsauce/secrets.py`
  - Tests: `tests/test_secrets.py`
- [ ] **Task 11: Background Jobs Engine**
  - Files: `secretsauce/jobs.py`
  - Tests: `tests/test_jobs.py`
- [ ] **Task 12: Plugin Discovery, Manifest Validation & Registry**
  - Files: `secretsauce/plugins/manifest.py`, `secretsauce/plugins/loader.py`, `secretsauce/plugins/registry.py`
  - Tests: `tests/test_plugin_loader.py`
- [ ] **Task 13: Plugin Context SDK & Token Management**
  - Files: `secretsauce/plugins/context.py`, `secretsauce/api_tokens.py`
  - Tests: `tests/test_plugin_context.py`
- [ ] **Task 14: Plugin Test Harness (`secretsauce.testing`)**
  - Files: `secretsauce/testing.py`
  - Tests: `tests/test_testing_harness.py`

### Stage 4: HTTP API, Auth & SSE Streaming
- [ ] **Task 15: Auth Middleware, Session Cookies & Setup Flow**
  - Files: `secretsauce/auth.py`, `secretsauce/api/routes/setup.py`, `secretsauce/api/routes/auth.py`
  - Tests: `tests/test_auth_routes.py`
- [ ] **Task 16: Household & Member REST API Routes**
  - Files: `secretsauce/api/routes/household.py`, `secretsauce/api/routes/members.py`
  - Tests: `tests/test_household_members_api.py`
- [ ] **Task 17: Recipe REST API Routes (Search, Languages & Deletion)**
  - Files: `secretsauce/api/routes/recipes.py`
  - Tests: `tests/test_recipes_api.py`
- [ ] **Task 18: Schedule & Cook Journal REST API Routes**
  - Files: `secretsauce/api/routes/schedule.py`, `secretsauce/api/routes/journal.py`
  - Tests: `tests/test_schedule_journal_api.py`
- [ ] **Task 19: Assets & Attributes REST API Routes**
  - Files: `secretsauce/api/routes/assets.py`, `secretsauce/api/routes/attributes.py`
  - Tests: `tests/test_assets_attributes_api.py`
- [ ] **Task 20: Plugins, Jobs & Server-Sent Events (SSE) Stream**
  - Files: `secretsauce/stream.py`, `secretsauce/api/routes/plugins.py`, `secretsauce/api/routes/jobs.py`
  - Tests: `tests/test_stream_jobs_api.py`
- [ ] **Task 21: Application Boot Orchestrator, CLI & Garbage Collector**
  - Files: `secretsauce/app.py`, `secretsauce/boot.py`, `secretsauce/gc.py`, `secretsauce/cli.py`, `secretsauce/__main__.py`
  - Tests: `tests/test_app_boot.py`, `tests/test_cli.py`

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

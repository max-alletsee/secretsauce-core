# SDD ledger — plan: docs/superpowers/plans/2026-09-18-stage-7-remaining-plugins.md

## Pre-flight
- Phase 0: Renames existing core plugins (cook-tracker -> core-cook-tracker, ratings -> core-ratings, shortlist -> core-shortlist, units -> core-units, recurring -> core-recurring). Table names, routes, manifests, shell imports, and test suites updated with no backwards-compatibility aliases.
- Phase 1: `core-ai-provider` introduces `google-genai>=1.0.0` and multi-provider drivers (Gemini, OpenAI, OpenRouter) with unified `complete()` interface.
- Phase 2: `core-translator` consumes `core-ai-provider`.
- Phase 3: `core-recipe-importer` consumes `core-ai-provider`.
- Phase 4: `core-meal-planner-ai` consumes `core-ai-provider`.
- Phase 5: `core-shopping-list` consumes `core-units` and optional `core-ai-provider`.
- Phase 6: System build, test verification, documentation.
Pre-flight check: Interfaces clean.

Task 1: complete (commits 0c8f351..8ec64fe, refactor: rename core plugin directories and update manifests to core- prefix)
Task 2: complete (commit 020b55d, feat(shell): update frontend code, tests, and build pipeline for core-* plugins)
Task 3: complete (commit 8728476, test: update backend test suite for core-* prefix conventions)
Task 4: complete (commit 7218e53, chore(deps): add google-genai>=1.0.0 dependency)
Task 5: complete (commit d4c429f, feat(core-ai-provider): implement schema, Gemini driver, and usage logging)
Task 6: complete (commit 8041b7d, test(core-ai-provider): add tests for OpenAI, OpenRouter, and budget toggle)
Task 7: complete (commit 7d16764, feat(core-ai-provider): add UI settings component, bundle, and vitest tests)
Task 8: complete (commit e3bb08c, feat(core-recipe-importer): implement extraction parser, routes, and background jobs)
Task 9: complete (commit ff7f83b, feat(core-recipe-importer): add UI import modal, bundle, and vitest tests)
Task 10: complete (commit cfa3a44, feat(core-translator): implement recipe translation engine, jobs, and history)
Task 11: complete (commit 56e2772, feat(core-translator): add UI translation widget, bundle, and vitest tests)
Task 12: complete (commit 66d0b81, feat(core-meal-planner-ai): implement meal planning service, candidate pool, and endpoints)
Task 13: complete (commit ac7fc9a, feat(core-meal-planner-ai): add UI candidate pool widget, bundle, and vitest tests)
Task 14: complete (commit b158605, feat(core-shopping-list): implement meal aggregation, staples, manual items, and toggle)
Task 15: complete (commit 11c6823, feat(core-shopping-list): add UI checklist, staples manager, bundle, and vitest tests)
Task 16: complete (commit db8c764, test(stage-7): add multi-plugin end-to-end integration tests (backend & frontend))
Task 17: complete (commit pending, docs(core-plugins): document Stage 7 plugins, naming standardization, and final verification)

## Final Verification Summary
- **Backend Tests (`uv run pytest`)**: 122/122 passed (100%)
- **Frontend Vitest (`pnpm --prefix shell test`)**: 75/75 passed across 30 test files (100%)
- **Plugin Bundles (`pnpm --prefix shell build:plugins`)**: All 11 core plugins built and compiled cleanly to `<plugin>/ui.js` and `<plugin>/ui.css`
- **Shell Production Build (`pnpm --prefix shell build`)**: Static shell + service worker + vendor bundles built successfully into `secretsauce/static/`
- **Prefix Conventions**: All 11 core plugins standardize on `core-` across directories, manifest IDs/names, routes (`/api/x/core-*`), and tables (`plugin_core_*`). Zero aliasing or legacy shims.

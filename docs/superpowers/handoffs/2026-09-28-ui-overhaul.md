# UI overhaul — interrupted implementation handoff

**Status:** paused at the user's request on 2026-09-28. Do not treat the overhaul or Phase 2 as complete. Resume implementation in a separate session when requested; do not restart the design/plan approval process.

## Goal and approved approach

Implement `docs/superpowers/specs/2026-09-28-ui-overhaul-design.md` with Superpowers, TDD and implementation tests, including investigation of why previous tests missed the bugs. The user approved the implementation plan and inline execution with “implement it please,” then requested this interruption.

Binding plan: `docs/superpowers/plans/2026-09-28-ui-overhaul.md`. Seven phases, one implementation commit per phase, tests and regenerated bundles included. No subagent tool is available; inline execution and final self-review were disclosed. Do not merge or push without the user's choice.

## Exact workspace

- **Implementation worktree:** `C:/github/secretsauce-core/.worktrees/ui-overhaul`
- **Branch:** `feat/ui-overhaul`
- **HEAD:** `675092c80777c5ce0aea8b76917cd7df7191ee3e`
- **Original checkout:** `C:/github/secretsauce-core`, detached at `d3b01c6`.
- Original checkout's untracked `dev-data/` and `test-data/` were preserved. Do not delete them, or `tmp/` / `tmp_claudecode/` / other user data.
- Separate `.worktrees/pre-stage-8-hardening` was left untouched.
- Dependencies are installed in the implementation worktree (`uv sync --extra dev`, pnpm frozen lockfile).
- **Ledger, briefs and logs:** `.superpowers/sdd/2026-09-28-ui-overhaul/` inside the worktree. This directory is gitignored but persists on disk.
- This handoff is an untracked document in the **original checkout**, deliberately not an implementation commit.
- Process inspection at interruption found no running E2E server, Uvicorn, Playwright test or Vitest run. Do not remove either worktree.

All commands below run from the implementation worktree, not the original checkout.

## Commits and verified baseline

1. `d7037a6` — saved design (pre-existing).
2. `d3b01c6` — `docs(plan): define UI overhaul TDD execution`.
3. `675092c` — `feat(ui): install themed design system and plugin context` (**Phase 1 complete**).

Initial isolated baseline: **214 pytest, 85 Vitest, successful build, 3 Playwright tests**.

Phase 1 verification: **214 pytest, 103 Vitest, successful fresh build, 7 Playwright tests**. No Phase 2 implementation commit has been made.

## Phase 1 delivered

- Production PrimeVue global installer, all 31 reserved controls, Tooltip, Toast and Confirmation services; PrimeIcons.
- Four live/persisted themes, zinc surfaces, `ss-theme`, unknown-theme fallback and denied-storage resilience.
- `makeSecretSauceUI` and `withPlugin`; shared string `__SS_UI__` and `useSecretSauce`; wrapped route/slot/settings/UI-intent registrations forward attrs, slots, route props and events.
- `ss.confirm(options): Promise<boolean>` and optional unsubscribe return from `ss.on`.
- **Confirmation options use `header`, not `title`.** See `shell/packages/ui/src/types.ts`.
- Strict provider validation logs malformed attempts rather than silently accepting missing `kind`.
- Settings pinned last; Plugins removed from navigation; `/plugins` redirects to `/settings?section=plugins`.
- Phone Drawer navigation closes on route changes; root ConfirmDialog; beginning of shell controls/token conversion.
- Real plugin harness and globally installed production UI in component tests; real browser navigation/theme/storage tests.
- Vendored Pinia build explicitly disables production devtools, which otherwise eagerly reads denied localStorage before shell guards can run.
- `.gitattributes` exempts generated asset JS from blank-at-EOL checks only: upstream PrimeVue multiline CSS strings contain indentation on blank lines. Source whitespace checks remain strict; generated output is not manually rewritten.
- Aura/Nora use different shades of the same rose palette (500/600), so tests must not require identical primary colours.

## Why earlier tests missed the bugs

- Direct component mounts supplied invented `isOpen`/`ss` props and bypassed activation, registries and the shell's real context. They made importer UI work in a harness although no production provider could open it.
- Registration-only assertions checked hub/id, not required `kind`, accepted registry state, rendered slot consumers or top-level navigation. Rejected attempts could otherwise disappear from coverage.
- Mocked suites named E2E used fabricated responses and manual flows, not browser/kernel integration. Gemini driver/budget fixtures also mocked successful calls without a configured key, hiding unavailable-provider behavior.
- Older browser tests observed requests or created Journal records directly rather than proving a card's actual action passed through the outbox and changed persisted/visible state.
- Recurring tests manually materialized rules, leaving startup/hourly wiring and deleted-entry resurrection untested. Those production regressions belong to Phase 6.

The new tests exercise production composition/registration, HTTP lifespans, real browser menus, writes and reloads. Component API doubles remain explicitly component-level, not E2E.

## Phase 2: partial, uncommitted

Read `.superpowers/sdd/2026-09-28-ui-overhaul/task-2-brief.md` and the full plan before continuing. Current changes are intentionally retained unstaged/uncommitted.

### Implemented so far

- `shell/packages/ui/src/IntentTrigger.vue`: real Button/Menu/Dialog; scoped `{ open }` trigger; popup event anchor; provider icons; available filtering; disabled reasons/tooltips; exactly-once resolve/cancel/close; busy/error handling for headless work.
- `shell/src/registries/intents.ts`: UI components marked raw. Dialog provider is held in a shallow ref, eliminating reactive-component warnings.
- New `core-recipe-importer/ui/src/ImportRecipeDialog.vue`: URL/Paste text/Photo tabs; parse requests with `auto_save: false`; base64/MIME/FileReader photo handling; structured preview; explicit save and navigation; 503/unavailable explanation and Settings link.
- Importer registers the valid `ui` provider **Import with AI…** and no dead slot.
- Recipes manual provider is **Blank recipe**; header trigger **New recipe**; empty-state trigger **Add your first recipe**.
- New `core-translator/ui/src/TranslateDialog.vue`; one valid UI provider **Translate…** on `recipe:actions`, no card/sidebar registration. Translation component behavior has not yet received its new browser/component verification.
- Planner entry point now contributes only to `timeline.sidebar`; removed `meal:plan` provider. Planner widget itself still needs overhaul/household slot choices.
- Shopping entry point uses top-level nav `{ label: 'Shopping list', icon: 'shopping-cart', order: 30 }`; removed `shopping:view`. **Preserve existing route `/shopping-list`**, not `/shopping`.
- AI provider checks configured/environment key before outbound helper and raises standard **503 `unavailable`**. Availability check currently precedes budget check. Configured budget behavior should remain covered.
- Timeline interaction repair while retaining the **old horizontal layout**: MealSlot wraps ScheduleCard in scoped IntentTrigger; card emits actual click event; resolves refetch; page uses `useSecretSauce` and production SSE subscriptions with cleanup and stale-request guard.
- Timeline fetches real journal rows to derive cooked flags, including after reload.
- Removal uses `ss.confirm`, real revisioned DELETE, toast and refetch, not native confirm/document reload.
- Cook tracker uses real outbox `path`, **and route-valid journal fields**; cooked badge now uses Tag.
- Journal nav uses actual PrimeIcons `history` instead of nonexistent `book-open`.

### Additional bug found by the new tests

The old cook-tracker request had not only `url` instead of outbox `path`, but invalid API body fields: `servings` and `assigned_cook_id`. `JournalCreate` actually accepts **`servings_cooked`** and **`cooked_by_member_id`**. New production-path coverage checks the write persists. It also supplies title and status, so free-text planned meals appear correctly in Journal.

Existing Skip/Log leftovers providers retain their old local/notification-only behavior. Do not accidentally describe them as persisted functionality; consider them during the final spec reconciliation rather than inventing new kernel behavior casually.

### Browser server infrastructure

`shell/e2e/server.py` still runs `build_app()` with its real lifespan/services. It now patches **only the bound AIService `_complete_openai_compatible` outbound paid helper**, returning schema-validated draft/translation/planning results and token counts. The seed configures an OpenAI test key through the real config service; real routes, availability, budget, usage/history and writes remain in use. Planner fixture uses actual recipe IDs parsed from the supplied prompt. Developer credential environment fallbacks are removed only inside the child test server process. No browser REST stubs or production test endpoints were introduced.

## Tests and evidence at pause

Logs are in the ledger directory above. These are targeted results, **not a full Phase 2 gate**.

- `task2-import-red.log`: new real-browser importer tests failed because New recipe/provider UI was missing.
- `task2-http-red.log`: three provider-key cases returned wrong failure behavior/500; outbound spy must never be called when unconfigured. HTTP test uses `ASGITransport(..., raise_app_exceptions=False)` to assert real response errors rather than transport reraises.
- `task2-activation-red.log`: guard caught all four malformed registrations.
- `task2-contract-red.log`: original IntentTrigger lacked popup/scoped trigger/real Dialog/disabled/error behavior. Also includes an initial harness raw-import denial; corrected source scanning uses Node fs bounded to core `ui/src` directories.
- `task2-intent-green.log`: **10 passed** (8 real-registry IntentTrigger + 2 all-core contract tests), before the subsequent Timeline/cook rewrites.
- `task2-import-green.log`: **2 Playwright tests passed**: extracted text draft saved only on explicit Save and persisted after reload; unconfigured AI explains configuration and navigates to Settings query. Settings panel assertion belongs to Phase 3.
- `task2-http-green.log`: **7 passed, 3 failed** in new runtime + existing AI-provider tests. All four new runtime cases passed; the three existing unit tests faked successful Gemini with no configured key or attempted budget behavior with no key. Their fixtures have since been changed to configure `gemini_api_key: test-key`, and budget test now asserts RuntimeError specifically. **Those fixture repairs have not been rerun.**
- `task2-timeline-red.log`: both real browser card/menu interactions failed because dead `__SS_INTENT__` wiring rendered no action menu.
- `task2-outbox-red.log`: real registered trigger exposed wrong `url`, wrong body fields and omitted title/status.
- `task2-outbox-green.log`: **10 passed** (2 registered cook tracker + 8 IntentTrigger).
- `task2-build.log`: latest build succeeded **before the final tiny confirmation-header change**.
- `task2-timeline-green.log`: **1 browser passed, 1 failed**. Mark cooked persisted through real outbox, badge survived reload, and Journal showed free-text title. Remove test timed out because it looked for `dialog`, while PrimeVue ConfirmDialog correctly uses **`alertdialog`**.

### Last two edits — NOT rerun/rebuilt

Immediately before interruption:
1. `shell/e2e/ui-plugins.e2e.ts`: confirmation selectors changed from `dialog` to `alertdialog` (Cancel and Remove).
2. `core-timeline/ui/src/index.ts`: confirmation option changed from `title: 'Remove meal'` to correct **`header: 'Remove meal'`**.

No claim that removal passes yet. Generated Timeline bundle is therefore one small source edit behind. No Phase 2 full pytest/Vitest/Playwright gate or commit yet.

## Remaining Phase 2 work

Follow the approved task brief; do not mark it complete based on the targeted results above.

1. Rebuild and rerun the two Timeline browser tests; rerun runtime/AI-provider tests after fixture repairs.
2. Replace misleading importer/translator tests with activation → real registry → IntentTrigger rendering. **Old `ImportRecipeModal.vue` and `TranslateAction.vue` still exist**, and old tests still import them. Remove obsolete components only after replacing their tests.
3. Add actual Photo browser coverage for FileReader/base64/MIME. Add accurate URL component coverage and save/error cases.
4. Add translation browser test through recipe Actions, persisted translated variant after reload; verify standard errors.
5. Overhaul actual widgets/pages: AI settings, planner, shopping, recipes (list/detail/edit/cards/ingredients/steps), shortlist controls/sidebar, ratings, Journal, and initial member/recurring controls. Most still have old raw controls, Tailwind or hardcoded colours/dead injections. Use globals/tokens and `useSecretSauce` as planned; planner uses household meal type choices; free chips use AutoComplete multiple/typeahead false.
6. Ratings still needs real current-member context rather than unprovided `__SS_CURRENT_MEMBER__`.
7. Add real browser checks for planner generation/acceptance/sidebar, shopping navigation/toggle, shortlist and ratings.
8. Rewrite remaining direct plugin mount tests through actual activation and registered consumers, with route-checked API doubles only in honestly named component tests.
9. Rename mocked `phase-{3b,3c,7}-e2e.spec.ts` suites to `*-components.spec.ts`; preserve actual behavior assertions.
10. Existing `shell/e2e/phase-3b.e2e.ts` still expects old Add/Import and Manual Recipe button/menu selectors; update to New recipe / Blank recipe **menuitem**, preserving manual creation coverage. `phase-3c.e2e.ts` needs its real cooking interaction strengthened instead of manually creating Journal records.
11. Run full gates, inspect types/contracts, fresh builds, whitespace check, self-review, cleanup only obsolete **generated** build artifacts, then Phase 2 commit.

Generated output is modified under plugin `ui.js`/`ui.css` and `secretsauce/static/`. Current untracked build files include `assets/index-DXQmmscA.css`, `assets/index-DYinPPd-.js` and `vendor/secretsauce-shell.css`, plus new importer/translator `ui.css`. Vite uses `emptyOutDir: false`, so old tracked assets can remain unreferenced. Inspect the latest index/CSS references and pipeline before committing; do not blindly stage stale assets or delete user directories. All changes can be inspected with `git status --short` / `git diff` in the worktree.

## Remaining phases after Phase 2

- **3 / todo #7:** consolidated reactive Settings panels, shared validated meal type IDs/labels and defaults.
- **4 / todo #8:** member editing, transactional last-member protection, current-member fallback, remove UI colour picker/setup submission while preserving backend compatibility.
- **5 / todo #9:** vertical date-grouped Timeline, slot service/override endpoints, explicit date expansion, dialogs/sidebar responsiveness/live updates.
- **6 / todo #10:** recurring schema 2 migration/materialization tracking; immediate/hourly 14-day materialization, no resurrection after schedule deletion, edit/delete UI.
- **7 / todo #11:** docs, theme/screen matrix/screenshots, all gates, testing-gap explanation/spec reconciliation/review/branch finish choice.

Todo #6 remains **in_progress** (interrupted), #7–#11 pending. Phase 1/todo #5 is completed. Todo IDs may not exist in a new session; recreate from the plan/ledger rather than losing progress.

## Resume commands and instructions

Read root/worktree `AGENTS.md`, Superpowers `using-superpowers`, `executing-plans`, TDD and systematic-debugging skills, then the design, plan, ledger and Task 2 brief. Existing design/plan are approved. Continue inline, task-by-task; record rulings and RED/GREEN evidence, and do not pause between tasks unless blocked or instructed.

```bash
cd C:/github/secretsauce-core/.worktrees/ui-overhaul
git status --short
uv run pytest tests/test_ui_import_runtime.py tests/test_plugin_core_ai_provider.py -q
pnpm --prefix shell test packages/ui/tests/intent-trigger.spec.ts tests/plugins/core-plugin-contracts.spec.ts tests/plugins/core-cook-tracker.spec.ts
pnpm --prefix shell build
pnpm --prefix shell test:e2e e2e/ui-import.e2e.ts e2e/ui-plugins.e2e.ts
```

Then continue the missing Phase 2 work with outside-in RED before behavior changes. Final phase gates: `uv run pytest`, `pnpm --prefix shell test`, fresh plugin/shell/vendor/SW builds, `pnpm --prefix shell test:e2e`, `git diff --check`.

Windows rules: use `python`/`uv run python`, never `python3`; pnpm operations target `shell`; bound searches and exclude .venv/node_modules/.git/.worktrees. Backend runtime tests use `build_app()` + lifespan + HTTP and poll real services; never fake noun events or manually drain/run jobs. Keep API_VERSION 1 and string provide/inject keys; plugin UI must not import PrimeVue directly. Preserve kernel free-string meal_type and backend avatar_color compatibility.

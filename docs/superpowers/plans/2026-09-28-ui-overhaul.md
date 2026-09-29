# UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved UI overhaul, repair production plugin wiring and recurring scheduling, and replace false-confidence tests with regression coverage through real entry points.

**Architecture:** Keep the existing kernel nouns and Vue registries. Centralize PrimeVue installation and plugin context wrapping in the shell, put per-day meal-slot overrides behind a timeline plugin service, and persist recurring materialization history separately from schedule entries. Execute the seven delivery phases in order, with outside-in RED → focused RED/GREEN → full verification in each phase.

**Tech Stack:** Python/FastAPI/Pydantic/SQLite/pytest/httpx; Vue 3/Pinia/PrimeVue 4/PrimeIcons/Vitest/Playwright; uv and pnpm on Windows/Git Bash.

**Spec:** `docs/superpowers/specs/2026-09-28-ui-overhaul-design.md`

**Status:** Approved by the user for inline execution. Implementation follows the task ledger and verification gates below.

## Global Constraints

- Work on branch `feat/ui-overhaul` in a worktree under `.worktrees/`.
- One implementation commit per delivery phase; include that phase's tests and regenerated bundles.
- `API_VERSION` stays 1. All provide/inject keys are strings, never Symbols: shell and plugin vendor copies of `@secretsauce/ui` are distinct.
- Plugins use the globally registered PrimeVue component tags; no plugin UI imports from `primevue`, `@primevue` or `@primeuix`.
- Themes: `aura-tomato` (default), `nora-tomato`, `material-indigo`, `lara-amber`; all use the zinc surface palette. Tomato means rose. Persistence key: `ss-theme`.
- Below 768px: hamburger and Drawer. Timeline sidebar: 280px alongside feed at ≥1024px, above feed below 1024px, widgets initially collapsed below 768px.
- Timeline window: today − 2 through today + 6; explicit **Show 2 earlier days** / **Show 5 more days**. No infinite scroll or persisted window.
- Recurring horizon: 14 days, Python weekdays (0 = Monday), immediate startup run followed by hourly runs. Removed materialized meals never resurrect.
- Keep `meal_type` a free kernel string; retain `avatar_color` API compatibility, but remove its UI picker and setup submission.
- Non-goals: dark mode, new-string i18n migration, phone bottom tabs, drag-and-drop slot reordering, kernel schedule/journal redesign.
- Run Python with `python` or `uv run python`, tests with `uv run pytest`, frontend commands with `pnpm --prefix shell ...`.
- Do not delete `tmp/`, `tmp_claudecode/`, `dev-data/`, `test-data/` or any user data. Do not search dependencies or other worktrees recursively.
- Backend integration tests use `build_app()` + lifespan + httpx with services on; never manually drain events or run jobs. Test-only failure injection is allowed below the HTTP boundary.
- Browser-to-kernel behavior, SSE, outbox, browser globals, 401 handling and built/import-mapped plugin modules require Playwright against the real server.
- Browser tests arrange their own household/AI/recipe/schedule state through authenticated APIs and restore their writes/configuration in fixtures; no order-dependent shared seeded state, arbitrary sleeps, live paid LLM calls or browser REST stubs.

## Review Focus

1. Storage denied or a stale theme/panel id: boot and Settings still render, an unknown theme falls back, and valid choices still apply live. Tests: Tasks 1 and 3, including a real browser with throwing Storage methods.
2. Legacy `Dinner` entries and occupied skipped slots: the user still sees every meal, and slot deletion/skip checks cannot miss label/case aliases. Tests: Task 5 composition, route and browser fixtures.
3. Concurrent recurring loop/request writes, rollback, and restart: exactly one tracked entry per rule/day; no partial schedule/history writes or resurrection. Tests: Task 6 lifespan, concurrent HTTP and injected-failure cases.
4. Stale member revisions or concurrent deletion of the remaining members: edits reload current data; at least one member always remains. Tests: Task 4 HTTP and dialog cases.
5. A plugin disabled/re-enabled while its views or widgets are open: registration, context, listeners, navigation and Settings update without orphaned UI or duplicate requests. Tests: Tasks 2, 3 and 5 real loader/browser paths.

## Evidence: why the previous tests missed the bugs

Read-only investigation on `d7037a6` found the following gaps. These are code-path findings, not a claim that the overhaul is implemented.

| Gap | Evidence in the existing suite | Regression that closes it |
| --- | --- | --- |
| Importer is never reached from its provider | `shell/tests/plugins/core-recipe-importer.spec.ts` mounts `ImportRecipeModal` with `isOpen: true` and an invented `ss` prop; activation asserts only hub/id. The provider has no `kind`, and its slot is not rendered. | Real `activate()` + real factory/registries + Recipes' IntentTrigger, followed by Playwright extraction/save. |
| Fake multi-plugin flow bypasses registration and contracts | `shell/tests/integration/phase-7-e2e.spec.ts` directly mounts four components and simulates repositories with a JS array. It is a component test, not e2e. | Activation-based component tests with route-checked fixtures, plus real browser/backend flows; rename misleading suite/file. |
| Declaring a slot is mistaken for rendering a widget | Planner registers `schedule.sidebar`; Timeline renders `timeline.sidebar`. Shopping nav is nested in `meta.nav`. | All-core activation guard and browser checks for widget and nav visibility. |
| Meal interaction is never exercised | Timeline test supplies only `__SS_API__` and stubs Slot. The page injects `__SS_INTENT__`, which production never provides. `phase-3c.e2e.ts` says it marks cooked but only adds a meal and opens Journal. | Click the real meal trigger, invoke providers, assert persisted journal/schedule state and no document reload. |
| Request observation is mistaken for live rendering | `live-stream.e2e.ts` watches a cache-warming request for an entry outside the visible window; it does not assert the page changes. | Write inside the window through another authenticated client and assert visible create/update/delete and slot changes. |
| Recurring background behavior is bypassed | `tests/test_plugin_recurring.py` uses `make_kernel()` and explicitly calls `/materialize` and the registered command. Only occupied slots prevent re-creation. | Immediate HTTP result, actual accelerated background loop, deletion, restart and persistent tracking checks. |
| Members have only add coverage | `member-picker.spec.ts` adds a member; no existing member is edited. Backend tests delete a non-last member only. | Edit the first member in Settings and reload; stale revision and transactional last-member tests. |
| Theme persistence is mistaken for theme application | `theme.ts` only updates a ref/localStorage; Settings captures sections once. Happy-DOM tests do not verify browser CSS variables. | Verify real theme application and CSS after reload, and live registry-driven accordion changes. |

Baseline commands run during planning:
- `pnpm --prefix shell test tests/plugins/core-recipe-importer.spec.ts tests/integration/phase-7-e2e.spec.ts tests/plugins/timeline.spec.ts tests/plugins/member-picker.spec.ts` → **9 passed**.
- `uv run pytest tests/test_plugin_recurring.py tests/test_plugin_timeline.py tests/test_household_members_api.py -q` → **4 passed**.

A temporary lifespan/HTTP diagnostic also confirmed that an active OpenAI provider with no configured/environment key reaches the external completion helper. Replacing only that helper with a diagnostic exception produced `500 plugin_error`, not the specified `503 unavailable`; no external request was sent. An unknown authenticated plugin POST returns 405 because of the SPA catch-all's method handling.

No full-suite baseline or new RED tests has been run yet. Capture those in execution setup.

## Execution setup and sequencing decisions

- [ ] Commit the reviewed implementation plan before creating the worktree, so its file is reachable from the target branch. Use `using-git-worktrees` before implementation. The current root is already on `feat/ui-overhaul`, not an isolated worktree, with untracked `dev-data/` and `test-data/`. After verifying tracked changes are clean and `.worktrees/` is ignored, run `git switch --detach` in the root, then `git worktree add .worktrees/ui-overhaul feat/ui-overhaul`; this preserves root data and avoids checking the same branch out twice. Approval of this plan includes that non-destructive checkout arrangement; ask if unexpected tracked changes or a branch conflict prevents it safely.
- [ ] Create this plan's SDD workspace/ledger with the executing-plans scripts. Read spec and plan; record shared interfaces between Tasks 1→2/3/4/5/6, 3→4/5/6 and 5→6. No subagent tool is available in this session: execute inline and explicitly label final review as self-review unless a fresh reviewer becomes available.
- [ ] Install worktree dependencies only as needed (`uv sync --extra dev`; `pnpm --prefix shell install --frozen-lockfile`), then run full backend/frontend baseline, build and existing Playwright. Save output to this plan's workspace and report failures by name.

Decisions to review before execution:
1. The full-core guard cannot be green in Foundation while the knowingly invalid providers are repaired only in phase 2. Task 1 introduces strict validation and guard infrastructure; Task 2 adds/enforces the full-core activation guard together with those repairs. Do not skip/xfail known broken registrations.
2. The spec says importer backend routes are fine, but `AIService.complete()` has no missing-key guard: an active, unconfigured provider reaches an external helper instead of reliably returning 503 `unavailable`. Task 2 adds the minimal backend availability check, tested through the real importer route, to satisfy the specified error UI.
3. Recurring's manifest must advance from schema 1 to **2**; the loader only applies migration numbers up to the manifest's schema. Merely adding `0002_materialized.sql` would silently skip it.
4. Recurring and the AI planner declare optional `core-timeline?` dependencies when they consume its service. This orders initial activation without requiring Timeline to remain enabled; look up the service at call time, not once during activation.
5. `SecretSauceUI.on` gains a backwards-compatible return type `void | (() => void)`; the real factory returns the stream unsubscribe function. Existing consumers ignoring the result remain valid. Mounted views clean up subscriptions and debounce timers.
6. Timeline write responses are `{ date: string, slots: Slot[] }`; GET remains `{ days: Record<string, Slot[]> }`. Occupancy conflicts include `details.current.entry_count` in the standard conflict envelope. These make the spec's unspecified "resolved day"/entry-count response explicit.

### Verification gate used by every delivery phase

After each focused GREEN run, and before its commit:
1. `uv run pytest` → no failures.
2. `pnpm --prefix shell test` → no failures.
3. `pnpm --prefix shell build:plugins` when plugin source changed, then `pnpm --prefix shell build` → successful fresh plugin/shell/vendor/SW bundles.
4. From phase 2 onward: `pnpm --prefix shell test:e2e` → no failures. Task 1 also runs its new focused browser tests.
5. `git diff --check` → no whitespace errors; inspect generated diff, tests and expected errors explicitly.

Do not claim a phase complete with a red suite. Record RED command/actual assertion, GREEN command/result, deviations and commit in the ledger; keep exactly one task in progress. New tests use literal/hand-checked expectations, fail for the missing behavior rather than harness/import errors, and do not assert only that mocks were called.

---

## Task 1: Install the design system and wire plugin context (Foundation)

**Files:**
- Create: `shell/src/ui/install.ts`, `shell/src/pluginContext.ts`, `shell/packages/ui/src/useSecretSauce.ts`, `shell/tests/helpers/mountWithUi.ts`, `shell/tests/helpers/pluginHarness.ts`, `shell/e2e/helpers/ui.ts` (real login/state helpers).
- Modify: `shell/src/main.ts`, `shell/src/theme.ts`, `shell/src/registries/intents.ts`, `shell/packages/ui/src/types.ts`, `shell/packages/ui/src/index.ts`, `shell/packages/ui/src/testing.ts`, `shell/src/router.ts`, `shell/src/stores/member.ts`, `shell/src/App.vue`, `shell/src/components/{AppNav,AppHeader,OfflineBar,ConfigForm}.vue`, `shell/src/pages/{LoginPage,SetupPage,SharePage}.vue`.
- Test: `shell/tests/ui-install.spec.ts`, `shell/tests/plugin-context.spec.ts`, `shell/tests/theme.spec.ts`, `shell/src/registries/registries.spec.ts`, existing shell component/page/app/router specs, `shell/e2e/ui-foundation.e2e.ts`.

**Interfaces:**
- Produces `installUi(app: App, { themes }: { themes: ReturnType<typeof createThemeRegistry> }): void`.
- Produces `withPlugin(component: Component, ss: SecretSauceUI): Component` and `makeSecretSauceUI(pluginId: string, deps: PluginUiDependencies): SecretSauceUI` in `pluginContext.ts`. `deps` names the existing registries, api/outbox/stream, live store refs, router, basePath, notify and confirm adapters; no import of side-effectful `main.ts` in tests.
- Produces `useSecretSauce(): SecretSauceUI`, using string key `'__SS_UI__'` and throwing a clear error outside a wrapped component.
- Adds `ConfirmOptions = { header?: string; message: string; acceptLabel?: string; rejectLabel?: string; severity?: 'info' | 'success' | 'warn' | 'danger' | 'secondary' }` and `ss.confirm(options: ConfirmOptions): Promise<boolean>`; accept resolves true, reject/close resolves false.
- Test harness constructs real registries/factory/store refs and activates real modules. `mountWithUi` installs the production UI module; it never replaces Dialog, Menu, Slot or IntentTrigger with behavioral stubs.

**Pinned tests (names → independently derived assertions):**
- `rejects_invalid_intent_provider_shapes` → `expect(registry.getProviders('recipe:create')).toEqual([])` for each invalid shape; diagnostic contains the owning plugin/provider.
- `wrapped_components_receive_context_and_route_props` → `expect(renderedId).toBe('r42'); expect(injectedSs).toBe(receivedSs)` through all four registration paths.
- `theme_choice_applies_and_survives_reload` → `expect(primaryAfterReload).toBe(primaryBeforeReload)`; rose/indigo/amber are distinct as described below.
- `settings_is_pinned_after_high_order_routes` → `expect(navLabels).toEqual(['Late plugin', 'Settings'])` using nav order 5000 in the AppNav component test.
- `phone_navigation_closes_after_route_change` → `await expect(drawer).not.toBeVisible()` after selecting Recipes.
- `confirmation_accept_reject_and_dismiss_settle` → `expect(await result).toBe(true)` only for Accept, false for Reject/close.

- [ ] **Step 1: Write outside-in Foundation tests before changing production.** `ui-foundation.e2e.ts`: desktop Settings is last among the real plugins; no Plugins nav item. At 390×844 hamburger opens left navigation and choosing Recipes closes it. Select each new theme on the existing Settings page with browser colour scheme light, assert `getComputedStyle(document.documentElement).getPropertyValue('--p-primary-color').trim()` is populated and stays the same after reload. Aura/Nora tomato share the rose primary; Indigo and Amber differ from rose and each other. Do not incorrectly require Aura→Nora to change primary colour. Unknown `ss-theme` and throwing Storage methods still reach an authenticated page. Use browser setup to set storage before reload; do not replace the theme implementation.
- [ ] **Step 2: Run RED.** Run `pnpm --prefix shell test:e2e e2e/ui-foundation.e2e.ts`. Expected failures: missing hamburger/presets, Plugins after Settings, or storage breaking boot; not server startup/import errors.
- [ ] **Step 3: Add focused tests.** Theme tests use the existing registry entry point; assert the four ids, unknown-id fallback, live application and plugin theme registration. Registry table cases reject missing kind, unknown kind, UI without component, and headless without execute; errors include plugin/provider ids and invalid providers cannot appear via `getProviders`. After extracting the unchanged factory under the outer RED test, context tests render a registered route/slot/settings/intent component and assert its `ss` prop and injected object are identical, emitted events/scoped slots forward, and route `/recipes/:id` delivers the actual id. Confirmation tests interact with real ConfirmDialog and check true/false including dismiss.
- [ ] **Step 4: Run focused RED.** `pnpm --prefix shell test tests/theme.spec.ts tests/plugin-context.spec.ts src/registries/registries.spec.ts`. Expected: no preset application, context not provided, and malformed providers accepted; fix test harness errors before implementing behavior.
- [ ] **Step 5: Implement Foundation.** Use `definePreset`/`usePreset` with Aura/Nora/Material/Lara, rose/indigo/amber primary and zinc light/dark surfaces; apply stored theme at boot and safely handle get/set failures. `installUi` installs PrimeVue, ToastService, ConfirmationService, tooltip and the exact 31-component set in spec §4.1; retain the shell's Toast host. Wrap all four component registration paths with `inheritAttrs: false`, string provide and `h(component, { ...attrs, ss }, slots)`. Validate provider kinds before registration. Render ConfirmDialog in App. Sort nav by `nav.order`, pin Settings separately before footer, redirect `/plugins` to `/settings?section=plugins`, and close Drawer on route changes. Convert shell controls/colours to PrimeVue/tokens, including auth/offline/config/share screens; protect existing start-page and current-member storage reads/writes in main/router/member store too, so storage-denied browser tests reach the UI rather than failing in unrelated boot plumbing.
- [ ] **Step 6: Verify GREEN and commit.** Run the focused unit/browser tests, the phase verification gate, and existing auth/logout/offline tests. Extend `ui-install.spec.ts` to mount a real component using every reserved global tag and reject unresolved-component warnings. `git commit -m "feat(ui): install themed design system and plugin context"` after staging only this phase's explicit paths/generated outputs.

## Task 2: Repair intents, AI import and all core-plugin wiring

**Files:**
- Modify: `shell/packages/ui/src/IntentTrigger.vue`, its existing tests, `shell/e2e/server.py`, `shell/e2e/phase-3c.e2e.ts`, all existing `shell/tests/plugins/*.spec.ts`, `shell/tests/integration/phase-{3b,3c,7}-e2e.spec.ts`.
- Create: `shell/tests/plugins/core-plugin-contracts.spec.ts`, `shell/e2e/ui-import.e2e.ts`, `shell/e2e/ui-plugins.e2e.ts`, `tests/test_ui_import_runtime.py`.
- Replace: importer `ui/src/ImportRecipeModal.vue` with `ImportRecipeDialog.vue`; translator `ui/src/TranslateAction.vue` with `TranslateDialog.vue`.
- Modify plugin entry points/components: importer, translator, meal-planner-ai, shopping-list, ai-provider, recipes, shortlist, ratings and cook-tracker; convert recurring settings and member controls to tokens without implementing their later behavior yet.
- Recipe files: `ui/src/pages/{RecipeListPage,RecipeDetailPage,RecipeEditPage}.vue`, `ui/src/components/{RecipeCard,IngredientRowList,StepList}.vue`.
- Other exact components: `core-ai-provider/ui/src/AiSettings.vue`, `core-meal-planner-ai/ui/src/MealPlannerWidget.vue`, `core-shopping-list/ui/src/ShoppingListPage.vue`, `core-shortlist/ui/src/{ShortlistAction,ShortlistFilter,ShortlistSidebar}.vue`, `core-ratings/ui/src/VoteRating.vue`, `core-cook-tracker/ui/src/{index.ts,components/CookedBadge.vue,pages/JournalPage.vue}`, `core-recurring/ui/src/RecurringSettings.vue`, `core-members/ui/src/{MemberSettings,MemberPicker}.vue`.
- Timeline wiring only (leave layout for Task 5): `secretsauce/plugins/core/core-timeline/ui/src/{index.ts,pages/TimelinePage.vue,components/MealSlot.vue,components/ScheduleCard.vue}`.
- Backend: `secretsauce/plugins/core/core-ai-provider/__init__.py` availability check only; retain importer routes/service.

**Interfaces:**
- Consumes Task 1's wrapped registrations, globals, `useSecretSauce` and confirmation API.
- IntentTrigger props remain `{ hub, context?, label? }`; emits `resolve(result)` / `cancel`; scoped default slot receives `{ open: (event: Event) => void }` to anchor Menu to the caller's element.
- Import/translate provider components receive `context` and emit `resolve` or `cancel`; they are dialog contents, not nested modal overlays.
- E2E server wraps `build_app()` lifespan, obtains the dynamically loaded AIService, and replaces only `_complete_openai_compatible(self, base_url, api_key, model, schema, prompt, images=None)` with deterministic `(schema-valid structured result, input_tokens, output_tokens)` results for import/translation/planning; planner suggestions use the actual recipe ids supplied in the prompt. Seed/configure an OpenAI test key through real configuration; retain real availability/budget/history/recipe writes. No browser REST stubbing or production test endpoint.

**Pinned tests:**
- `imports_draft_through_the_registered_recipe_provider` → `await expect(page).toHaveURL(/\/recipes\/[^/]+$/)` and persisted extracted title/ingredients after reload; recipe count unchanged before Save.
- `unconfigured_importer_returns_unavailable` → `assert response.status_code == 503; assert response.json()['error']['code'] == 'unavailable'` for each missing provider key.
- `all_core_plugin_registrations_have_rendered_consumers` → `expect(registrationErrors).toEqual([])` and literal allowed hubs/slots/top-level nav checks.
- `disabled_provider_explains_why_without_running` → tooltip reason visible, no resolved result or dialog after selecting the disabled item.
- `mark_cooked_uses_the_real_outbox_and_persists` → `expect(journalRows.filter(row => row.schedule_entry_id === entryId)).toHaveLength(1)` after real browser interaction/jobless outbox application.
- `translation_is_reachable_from_recipe_actions` → translated recipe variant visible after using the actual Actions provider and reloading.

- [ ] **Step 1: Write real-browser importer RED and backend unavailable RED.** Login → Recipes → **New recipe** → **Import with AI…** → **Paste text** → Extract → visible ingredients/steps → Save recipe → `/recipes/<id>`; reload and assert persisted content. Assert `auto_save: false` does not create a recipe before Save. Separately clear AI settings through its real route and test **AI isn't set up yet** → **Open AI settings** → correct Settings panel (panel assertion completes in Task 3). Lifespan test posts to parse-text with provider active but key missing and asserts `status_code == 503` and `json()['error']['code'] == 'unavailable'`; parameterize provider key selection and remove environment fallbacks in this test.
- [ ] **Step 2: Build the unchanged app and run RED.** `pnpm --prefix shell build` then `pnpm --prefix shell test:e2e e2e/ui-import.e2e.ts`; `uv run pytest tests/test_ui_import_runtime.py -v`. Expect missing/ineffective importer provider and wrong missing-key error, not canned HTTP bypass or failed harness setup.
- [ ] **Step 3: Write activation/component contract tests and run RED.** `core-plugin-contracts.spec.ts` discovers every core `ui/src/index.ts`, runs real activate modules against real registries/factory, checks console registration errors as well as accepted providers (rejected attempts must not vanish from coverage). Assert valid kind/body; hubs are registered/rendered; slots are in the explicit rendered-slot list; routes cannot hide nav in meta; every nav has label/order and a real PrimeIcons class name. Scan `.ts`/`.vue` imports for prohibited PrimeVue packages as a build-contract guard. IntentTrigger cases cover single/multiple, popup anchor, disabled tooltip/no execution, unavailable filtering, UI resolve/cancel/close, headless result and scoped trigger. Run `pnpm --prefix shell test packages/ui/tests/intent-trigger.spec.ts tests/plugins/core-plugin-contracts.spec.ts tests/plugins/core-recipe-importer.spec.ts` → expected missing dialog/invalid registrations.
- [ ] **Step 4: Implement intent and importer behavior.** Use Button/Menu/Dialog; show trailing chevron for multiple providers and provider icons prefixed `pi pi-`. Register `{ id: 'ai-import', kind: 'ui', title: 'Import with AI…', icon: 'sparkles', order: 15, component: ImportRecipeDialog }`; remove dead importer slot. Manual provider becomes **Blank recipe**; Recipes trigger label **New recipe**. Tabs URL/Paste text/Photo call existing parse routes with false autosave, including base64/mime image payload and preview. Render parsed servings, ingredients and instruction steps; Save posts full route-valid draft with language, toasts, emits resolve and navigates. Inline Message distinguishes 503 unavailable from all other backend messages. Missing configured/environment key raises a standard 503 error before any LLM helper call; do not change configured provider behavior.
- [ ] **Step 5: Sweep plugins one RED/GREEN behavior at a time.** Planner → `timeline.sidebar`, household slot choices, no `meal:plan` provider. Translator → one UI `recipe:actions` provider, no card/sidebar registrations. Shopping → top-level `{ label: 'Shopping list', icon: 'shopping-cart', order: 30 }`, no `shopping:view`. Settings/widgets/actions use `useSecretSauce`, not dead inject fallbacks, including ratings' unprovided `__SS_CURRENT_MEMBER__`. Tokens and real global components replace Tailwind/raw controls; free chips use AutoComplete multiple/typeahead false. Keep existing app behaviors working with route-checked fixtures. Cook-tracker's production outbox request must use `path`, not its currently erroneous `url`; first write a browser RED that clicks a real planned meal and Mark as cooked, then assert journal persistence through the real outbox. Repair Timeline's dead `__SS_INTENT__` wiring now by wrapping ScheduleCard in the scoped IntentTrigger; keep the current horizontal layout/add modal until Task 5. Replace remove-provider confirm/reload with ss.confirm/delete/resolve and refetch, also under browser RED. This enables all plugin interactions to be production-tested in phase 2 rather than postponing their wiring to phase 5.
- [ ] **Step 6: Rewrite misleading tests and verify the actual interactions.** Convert direct plugin mounts to activation → registry-rendered route/Slot/IntentTrigger, keeping API doubles only in component tests and matching complete backend responses. Rename `phase-*-e2e.spec.ts` mocked suites to `phase-*-components.spec.ts` and describe them honestly. Update old Playwright selectors without removing behavioral checks; add actual meal → Mark as cooked → persisted Journal and Remove → no document reload assertions, using the Timeline wiring repaired in Step 5. `ui-plugins.e2e.ts` checks planner/sidebar, translation via Actions, shopping navigation/toggle, shortlist and ratings via the production shell. Do not leave a known failing test/skip in the phase commit.
- [ ] **Step 7: Run GREEN, phase verification and commit.** Focused importer/provider tests plus all activation-based plugin tests; full gate including fresh build/e2e. `git commit -m "fix(ui): wire core plugin intents and AI import end to end"`.

## Task 3: Consolidate reactive Settings and validate default slots

**Files:**
- Create: `shell/src/settings/{HouseholdSettings,MealSlotEditor,DeviceSettings,PluginManagerSection}.vue`, `shell/src/settings/mealSlots.ts`, `shell/tests/settings.spec.ts`, `shell/tests/meal-slots.spec.ts`, `tests/test_ui_household_runtime.py`, `tests/test_api_auth_matrix.py`, `shell/e2e/ui-settings.e2e.ts`.
- Modify: `shell/src/pages/SettingsPage.vue`, extract existing `PluginManagerPage.vue` into PluginManagerSection (remove obsolete page), `shell/src/main.ts`, `shell/src/stores/household.ts`, `shell/packages/ui/src/types.ts`, `secretsauce/api/models.py`, `secretsauce/api/routes/{setup,household}.py`, plugin member/recurring/AI section registrations and child headings; existing shell/settings/plugin-manager tests.

**Interfaces:**
- Produces shared `MealType` in `api/models.py`: id pattern `^[a-z0-9][a-z0-9-]{0,63}$`, label length 1–64; shared validation for nonempty list/unique ids on setup and household patch. Omitted field preserves defaults/current value; explicit null/empty/duplicates are 422.
- Produces `slugMealType(label: string, existingIds: string[]): string`: lowercase ASCII alphanumeric/hyphen, collapse/trim separators, deterministic `slot` fallback, truncate to 64 including collision suffix, append `-2`, `-3`, etc.
- Shell settings sections: `household` order 0, `plugins` 900, `device` 1000. Members stays id `members` order 10; recurring stays `core-recurring` order 20; AI stays `core-ai-provider` order 80.
- Open panels persist under `ss-settings-open`; default Household. Query `section` opens/adds a known panel and scrolls after rendering; unknown/stale ids are ignored. Extend Household.languages with optional `translations?: string[]` to reflect the actual backend configuration.

**Pinned tests:**
- `setup_and_patch_reject_invalid_meal_types_atomically` → `assert response.status_code == 422; assert response.json()['error']['code'] == 'validation'`; stored household/members equal the pre-request snapshot.
- `slot_slug_collisions_and_renames_preserve_identity` → `expect(slugMealType('Lunch', ['lunch', 'lunch-2'])).toBe('lunch-3')`; renamed Dinner keeps id `dinner`.
- `settings_sections_update_from_live_registrations` → inserted section content visible, then absent after unregister, with one accordion header.
- `plugins_redirect_and_toggle_update_navigation` → `await expect(page).toHaveURL('/settings?section=plugins')`; Shopping link disappears/reappears without reload.
- `every_discovered_api_route_requires_its_credential` → `assert response.status_code == 401; assert response.json()['error']['code'] == 'unauthorized'` for protected discovered method/path pairs.

- [ ] **Step 1: Write outside-in RED.** Browser: `/plugins` redirects to `/settings?section=plugins` and Plugins opens; Settings remains last. Disable/re-enable shopping via the actual plugin control and assert nav/sections update without reload. Add Lunch, save, assert real household response and reload preservation (Timeline display assertion is added in Task 5). AI-settings link opens its panel; one accessible accordion heading per section. Throwing storage still permits editing and saving. HTTP table for both setup and PATCH: bad slug, overlong id/label, empty label/list, duplicate ids and null → `422`, error code `validation`, no config/first-member/session partially saved; valid reordered list returns exactly the posted ids/labels.
- [ ] **Step 2: Run RED.** `uv run pytest tests/test_ui_household_runtime.py -v`; `pnpm --prefix shell test:e2e e2e/ui-settings.e2e.ts`. Expected invalid meal lists accepted and missing panels/editors/live behavior.
- [ ] **Step 3: Add focused RED tests.** Meal-slot literals: Breakfast→`breakfast`, Sunday Brunch→`sunday-brunch`, existing `lunch`,`lunch-2` + Lunch→`lunch-3`; long/non-ASCII-only input remains valid/unique. Rename leaves `id === 'dinner'`, up/down updates saved order, last-slot Remove disabled. Settings real registry register/unregister changes headers/content, query opens panel on navigation, stored multi-open state restores, plugin error/blocked/disabled/active Tags and commands render correctly. Run `pnpm --prefix shell test tests/settings.spec.ts tests/meal-slots.spec.ts` → expected absent behavior.
- [ ] **Step 4: Implement Settings and validation.** Computed sections + multiple Accordion; section components have no duplicate top heading. Household name/units/language/default slots patch through the actual API and refresh the live store. PluginManagerSection uses Tag/ToggleSwitch/commands/error details and real loader deactivate/activate when refreshed from the active plugin list; prevent multiple pending toggle requests. This device has themes/start-page Selects and existing logout explanation with danger outlined button. Keep storage access guarded, including route reads. Add shared Pydantic validation and preserve setup's transaction/default behavior.
- [ ] **Step 5: Add the shared auth matrix.** In a setup lifespan app discover all APIRoutes after plugin activation, flatten mounted plugin routes if needed, and parameterize (method,path). Fill concrete path params with safe ids and clear session cookies; for all protected `/api/*` methods assert `401` plus standard envelope before request-body/query validation. Derive public exceptions from `secretsauce.auth._PUBLIC`, treat `/api/health` separately, and assert POST setup gives 409 once configured. Include missing/wrong credential and revoked session coverage without hardcoding a list that new routes can escape. Run `uv run pytest tests/test_api_auth_matrix.py -v` → pass or investigate uncovered route; no production auth relaxation.
- [ ] **Step 6: Run GREEN, phase gate and commit.** All new household/settings/auth tests, plugin enable/disable tests, and importer AI-settings browser case must pass. `git commit -m "feat(settings): consolidate sections and edit household meal slots"`.

## Task 4: Edit members and protect the last member transactionally

**Files:**
- Create: `core-members/ui/src/MemberDialog.vue`, `core-members/ui/src/avatar.ts` under `secretsauce/plugins/core/`, `shell/tests/plugins/member-dialog.spec.ts`, `tests/test_ui_members_runtime.py`, `shell/e2e/ui-members.e2e.ts`.
- Modify: member `ui/src/{MemberSettings,MemberPicker}.vue`, `shell/src/stores/member.ts`, `shell/src/pages/SetupPage.vue`, `secretsauce/nouns/members.py`, existing `tests/test_members.py`, `tests/test_noun_events.py` fixtures as necessary; activation-based member tests.

**Interfaces:**
- `MemberDialog` props `{ visible: boolean, member?: Member | null }`; emits `update:visible(boolean)` and `saved(Member)`. Uses wrapped/injected ss from its owning Settings component. POST omits revision; PATCH includes the selected member's revision.
- Produces `memberAvatarColor(memberId: string): string`, deterministic over eight readable token-based palette choices, shared by cards and picker.
- Member store adds `updateMember(member: Member): void` to replace list/current-member records without losing selection.
- Last-member check belongs inside `MembersRepo.delete_member`'s existing writer transaction, after not-found/revision checks and before destructive cleanup.

**Pinned tests:**
- `first_member_preferences_persist_after_edit_and_reload` → `expect(member.serving_ratio).toBe(1.75); expect(member.allergies).toEqual(['peanut'])` from real GET and reopened form.
- `last_member_delete_is_rejected` → `assert response.status_code == 409; assert len((await client.get('/api/members')).json()) == 1`.
- `concurrent_member_deletes_keep_one_survivor` → `assert sorted(r.status_code for r in responses) == [204, 409]` and one remaining row.
- `member_conflict_reloads_current_revision_without_overwriting` → conflict message visible, form uses current name/revision, retry preserves the concurrent changes.
- `cancelled_member_deletion_preserves_the_card` → same member card and API row remain after Reject.

- [ ] **Step 1: Write outside-in RED.** Edit Alex (the seeded first member) in Settings: portion 1.75 and peanut allergy, save, reload, assert card/dialog and GET reflect both. Assert no colour field. HTTP deletion of a one-member household → `409`; two concurrent HTTP deletes of a two-member household → sorted statuses `[204, 409]`, GET contains one member. Stale PATCH → `409` with actual current revision; no lost preference change.
- [ ] **Step 2: Run RED.** `uv run pytest tests/test_ui_members_runtime.py -v`; `pnpm --prefix shell test:e2e e2e/ui-members.e2e.ts`. Expected existing member cannot be edited/last member can be removed.
- [ ] **Step 3: Write focused dialog RED and run it.** `member-dialog.spec.ts` reaches the dialog through member activate → Settings registry. Required name; 0.25–10 portion step 0.25; four multiple/free-entry preference controls; languages contain household primary/translations, current member language and en/de/fr/es/it/nl without duplicates. Assert visible updated store/card after POST/PATCH. On ConflictError use the real `details.current` member, show **Someone else changed this member**, reload form/revision, and a subsequent save succeeds. Network errors retain entered values and show inline Message. Last-member Delete is disabled; cancelling confirmation changes nothing. `pnpm --prefix shell test tests/plugins/member-dialog.spec.ts tests/plugins/member-picker.spec.ts` → expected missing edit/preferences/conflict behavior.
- [ ] **Step 4: Implement shared dialog/cards/picker/guard.** Cards use Avatar, portion/language, info dietary Tags, danger allergy Tags/warning icon, secondary dislikes, Edit/Delete text buttons and empty-preferences CTA. Ignore stored avatar_color. Picker Avatar/name opens Menu and changes the actual current-member ref used by API headers. Setup stops sending `first_member.color` while backend compatibility remains. Add count check in the transaction, retaining noun event/cleanup behavior. Update existing tests that intentionally delete their only fixture member to seed a survivor; never weaken the new last-member rule. Close DB connections with try/finally fixtures even on failing assertions.
- [ ] **Step 5: Run GREEN, phase gate and commit.** Include stale/cancel/delete cases, store selection after edit/deletion, API actor header and reload persistence. `git commit -m "feat(members): edit dietary profiles and protect the last member"`.

## Task 5: Resolve day slots and render a live vertical Timeline

**Files:**
- Create under `secretsauce/plugins/core/core-timeline/`: `migrations/0001_day_slots.sql`, `slots.py`, `ui/src/days.ts`, `ui/src/components/{DayCard,AddSlotDialog,AddEntryDialog}.vue`.
- Modify: timeline `__init__.py` (schema 1/router/service), `ui/src/index.ts`, `ui/src/pages/TimelinePage.vue`, `ui/src/components/{MealSlot,ScheduleCard}.vue`; remove `AddEntryModal.vue` after migrating uses.
- Modify: `core-meal-planner-ai/__init__.py` and `ui/src/MealPlannerWidget.vue` to consume resolved slots when available; `shell/e2e/{phase-3c,live-stream}.e2e.ts`, activation-based `shell/tests/plugins/timeline.spec.ts`.
- Create: `tests/test_ui_timeline_runtime.py`, `shell/tests/plugins/timeline-days.spec.ts`, `shell/e2e/ui-timeline.e2e.ts`.

**Interfaces:**
- Backend `Slot = { id: str, label: str, kind: 'default' | 'extra', skipped: bool }`; `TimelineSlotsService(ctx).slots_for(from_date: str, to_date: str) -> dict[str, list[Slot]]`, registered under `core-timeline`.
- Slots module owns validation/resolution/overrides; routes remain cookie-auth under `/api/x/core-timeline` using Depends(current_ctx). GET `/slots?from=&to=`; PUT `/days/{date}/slots/{meal_type}` (extra or skip); DELETE same path with boolean `with_entries`. Writes return `{ date, slots }` and push `core-timeline:slots-changed` after commit only.
- Frontend `DateWindow = { from: string; to: string }`, `ResolvedSlot`, `ScheduleEntry` (actual schedule response), `SlotVM extends ResolvedSlot { entries: ScheduleEntry[] }`, `DayVM = { date: string; isPast: boolean; isToday: boolean; slots: SlotVM[] }` in days.ts.
- `buildDays(window: DateWindow, resolvedSlots: Record<string, ResolvedSlot[]>, entries: ScheduleEntry[], today: string): DayVM[]`; `shiftDate(date: string, days: number): string` performs local-calendar date arithmetic, not UTC millisecond slicing.
- Consumes Task 3's `slugMealType` for extra-slot ids, checking current-day ids as well as defaults for collisions. AddSlotDialog's positions are **Before <each default slot>** or **At the end** (default).
- AddEntryDialog props `{ visible, date, mealType }`; emits `update:visible`, `created(entry)`; stores the slot id and exact typed note title.

**Pinned tests:**
- `day_slots_resolve_extras_before_defaults_in_creation_order` → `assert ids == ['breakfast', 'brunch', 'coffee', 'lunch', 'dinner']` for the explicit fixture.
- `occupied_slot_checks_include_legacy_label_aliases` → `assert response.status_code == 409` for skipping default dinner containing `Dinner`.
- `deleting_extra_with_entries_is_atomic` → injected second failure leaves identical entries/override/event-log snapshot; successful retry removes both.
- `timeline_push_reaches_the_real_sse_client_after_commit` → `assert frame['event'] == 'push'; assert frame['data']['name'] == 'core-timeline:slots-changed'; assert frame['data']['data'] == {'date': '2026-09-28'}`.
- `build_days_never_hides_legacy_or_unmatched_meals` → Dinner entry in `dinner`, late-snack entry in appended extra, occupied skipped slot has `skipped === false`.
- `window_extends_and_today_resets_without_persistence` → day counts `9 → 11 → 16 → 9` after Earlier/More/Today.
- `another_devices_schedule_write_updates_the_visible_feed` → created/renamed/deleted meal is visibly added/changed/removed without navigation or fake SSE injection.

- [ ] **Step 1: Write production HTTP RED.** Add/rename/move Brunch before Lunch; multiple extras share before preserving creation order; unknown/removed before falls back to end; skip/unskip defaults. Assert GET day order by literal ids. Table: default-id extra →409, unknown default skip →404, occupied skip →409, extra with entries DELETE without flag →409 with count, invalid slug/date/calendar date or reversed/>92-day range →422; 92 days allowed. Legacy `Dinner`/label aliases count as occupied. Repeat PUT preserves order. DELETE with entries removes all meals and override; injected second deletion failure rolls back entries, overrides and noun events, and produces no push. Read via HTTP after the failure.
- [ ] **Step 2: Run RED.** `uv run pytest tests/test_ui_timeline_runtime.py -v`. Expect nonexistent plugin routes/service; distinguish missing-feature 404 from auth/harness failures.
- [ ] **Step 3: Implement backend service/routes with transactional writes.** Use the exact migration schema from spec, retain each extra's created_at on edits and order stably. Validate strict ISO YYYY-MM-DD, inclusive ranges ≤92 days, id/label bounds. Resolve household defaults in stored order, skips, and before-inserted extras. Check occupancy by case-insensitive id then label, not raw SQL equality alone. Delete through schedule repo with `conn=tx`; register `ctx.db.after_commit` callback for awaited push, not before commit. Update AI planner optional dependency/prompt/choices using per-date slots (exclude skipped) with household fallback when service disabled; no new kernel noun.
- [ ] **Step 4: Write frontend/browser RED before vertical UI.** Literal `buildDays` fixtures cover default order, resolved before extras, default skips, skipped slot with entries→normal, `Dinner`→dinner, unmatched `late-snack`→appended extra, multiple entries, past/today/window end inclusive. Browser shows Breakfast/Lunch/Dinner from actual household config; add Brunch before Lunch only on one date; skip a different empty Lunch and Undo; confirm occupied-extra removal; add recipe and exact note without category prefix; actual meal click opens View recipe/Mark as cooked/Remove providers; remove without document reload. Earlier expands by 2, More by 5, Today resets/scrolls; past lines expand/collapse independently. At 390px sidebar precedes feed and widgets start collapsed. Run `pnpm --prefix shell test tests/plugins/timeline-days.spec.ts tests/plugins/timeline.spec.ts` and `pnpm --prefix shell test:e2e e2e/ui-timeline.e2e.ts` after fresh build → expected old horizontal/Dinner-only/noninteractive UI.
- [ ] **Step 5: Implement vertical composition/components/dialogs.** Keep page orchestration small: DayCard handles menus/slot dialog, MealSlot handles slot actions, ScheduleCard hosts scoped IntentTrigger and badges. Recipes/Shortlist/Note Tabs replace the old modal and AI placeholder; quick chips fill note text, servings InputNumber. Feed/sidebar breakpoints and tokens implement the approved mockup. Empty defaults can Skip, extras can Remove with exact count confirmation, populated slots can Add another. Keep legacy unmatched entries visible. Register remove provider using `ss.confirm`, API query revision and resolve/refetch, never reload. View recipe unavailable for notes. Preserve timeline.day.footer and other actually rendered extension slots.
- [ ] **Step 6: Prove live transport, not just a request.** Subscribe through ss.on to schedule created/updated/deleted and `core-timeline:slots-changed`; debounce 300ms, unsubscribe/clear timer on unmount, guard against old-window response races. Keep separate cache warming. Backend SSE test opens stream, waits for actual subscriber, writes slot via HTTP, and asserts named push's plugin/name/date. Browser writes within the visible window from another authenticated context and asserts rendered create/update/delete/skip; no page.evaluate injection of fake events. Extend existing live-stream test to assert visible results. Unit characterization drives the stream's real `connect()` with a realistic EventSource fake, not `handleMessage` directly. Assert returning to page or toggling plugin does not duplicate subscriptions/refetches.
- [ ] **Step 7: Run GREEN, phase gate and commit.** Include atomic failures and auth matrix with new plugin routes, updated member/meal-slot browser expectations, and the existing actual cooked/journal interaction from Task 2 under the new layout. `git commit -m "feat(timeline): add day slots and a live vertical meal feed"`.

## Task 6: Track recurring materialization and provide rule creation

**Files:**
- Create: `secretsauce/plugins/core/core-recurring/migrations/0002_materialized.sql`, `ui/src/weekday.ts`, `ui/src/RecurringRuleDialog.vue` under that plugin; `tests/test_ui_recurring_runtime.py`, `shell/tests/plugins/core-recurring.spec.ts`, `shell/e2e/ui-recurring.e2e.ts`.
- Modify: recurring `__init__.py` (schema 2 and optional timeline dependency), `ui/src/index.ts`, `ui/src/RecurringSettings.vue`, timeline `ScheduleCard.vue` indicator, `shell/packages/ui/src/{types.ts,IntentTrigger.vue}`, `shell/packages/ui/tests/intent-trigger.spec.ts`, existing `tests/test_plugin_recurring.py` and command expectations.

**Interfaces:**
- Keep `materialize_rules(ctx: PluginContext) -> dict[str, int]` and background_loop's immediate/3600-second production scheduling.
- Tracking table exactly `(rule_id TEXT NOT NULL, date TEXT NOT NULL, entry_id TEXT NOT NULL, PRIMARY KEY(rule_id,date))`; intentionally do not cascade a deleted schedule entry into deletion of its tracking history.
- POST `/rules` response includes existing rule fields/recipe_title plus `created: int`; deletion returns 404 when absent and otherwise existing `{ ok: true }`.
- `pythonWeekday(jsWeekday: number): number`; literal mapping `[0,1,2,3,4,5,6] → [6,0,1,2,3,4,5]`.
- Headless provider `{ hub: 'entry:interact', id: 'repeat-weekly', kind: 'headless' }` available only for recipe entries not originating from `plugin:core-recurring`. Its context-dependent visible title is **Repeat every <weekday>**. Add optional `titleFor?: (context: C) => string` to `IntentProvider<C, R>`, retaining its required static title and API_VERSION 1; IntentTrigger selects titleFor's result for the current context.

**Pinned tests:**
- `creating_rule_materializes_before_the_http_response` → `assert rule['created'] == 2` and the literal two horizon dates already contain the meal.
- `deleted_recurring_meal_stays_deleted_across_loop_and_restart` → removed entry absent after observed real loop rounds and a new app lifespan over the same DB.
- `schema_one_entries_are_backfilled_without_duplicates` → `assert applied_schema == 2`; schedule ids unchanged, tracking row points to the original entry.
- `materialization_tracking_failure_rolls_back_the_entry` → no new entry/event/tracking row after injected INSERT failure.
- `deleting_rule_preserves_today_past_and_edited_entries` → `assert remaining_ids == ['past', 'today', 'edited', 'manual']` for the named fixture, after future unedited tracked entry removal.
- `repeat_weekly_converts_javascript_weekdays` → `expect([0,1,2,3,4,5,6].map(pythonWeekday)).toEqual([6,0,1,2,3,4,5])` plus Monday/Sunday provider payloads.
- `repeat_provider_schedules_the_same_recipe_seven_days_later` → matching title/replay tooltip visible on date+7 after menu action and window extension.

- [ ] **Step 1: Write lifespan/background RED, not a manual materializer test.** POST a rule for an upcoming horizon weekday and assert entries exist when response returns and `created == 2`. Remove one through schedule DELETE; observe at least two real loop iterations then assert it stays absent; restart a new build_app over the same data directory and assert absent again. Test-only fixture patches the dynamically imported recurring module's interval before setup, preserving real background registration; instrument calls only to observe iteration completion, never call materialize_rules from the test. Fix the clock to a local Monday for exact, hand-derived dates/counts in tests without changing production time behavior.
- [ ] **Step 2: Run RED.** `uv run pytest tests/test_ui_recurring_runtime.py -v`. Expect no immediate entries and resurrection on real loop/restart.
- [ ] **Step 3: Expand failure/migration tests before each corresponding fix.** Skipped slots remain empty, occupied manual slots untouched, old matching recurring-origin/recipe entries become tracked without duplicates. Build a genuine schema-1 data fixture through an old-manifest plugin copy in the test data directory, then boot upgraded source and assert applied_schema=2/backfill. Concurrent rule creation/background rounds yield one row/entry per rule/day. Inject tracking insert failure after real schedule creation → neither commits; rule-create failure → no partial rule/horizon. Delete rule: only revision-1 entries after today disappear; past/today/edited/manual/untracked entries remain; rule/history removal atomic even if later entry deletion fails. Unknown rule id→404; removed `/materialize` GET→404 and POST→405 (current SPA method handling), with no materializer route or command/job registration exposed through the real app/plugin API. Test service-disabled fallback and startup ordering with skipped slots present.
- [ ] **Step 4: Implement backend semantics.** In a writer transaction recheck `(rule_id,date)`, resolved skip, backfill eligibility and occupancy; create entry with recurring origin and record together. POST creates rule and materializes within one outer transaction so loops cannot see a half-created rule. DELETE reads rule and tracked entries inside its transaction, deletes eligible entries through repo with revisions/conn, removes rule/history, preserves edited/today/past. Remove route and command entirely, keep background retry/cancellation behavior and 14-day horizon. Run expanded backend tests → GREEN before UI work.
- [ ] **Step 5: Write rule UI/weekday/browser RED.** Through real activation/provider execution assert Monday/Sunday payload conversion and that notes/already-recurring entries do not offer Repeat. Through Settings Add recurring meal choose weekday, household slot, and AutoComplete recipe from `/api/recipes?q=`; assert readable list **Every Monday · Dinner · Lentil soup**, help text from spec and no Materialize control/duplicate heading. Browser: schedule a recipe, Repeat via meal menu, extend feed so date+7 is visible and assert repeated recipe and replay tooltip; delete rule from Settings and inspect eligible future entry removal. Run `pnpm --prefix shell test tests/plugins/core-recurring.spec.ts` and after build `pnpm --prefix shell test:e2e e2e/ui-recurring.e2e.ts` → expected no rule-creation UI/provider.
- [ ] **Step 6: Implement Settings form/provider/indicator.** Rule dialog uses weekday Select, household slot Select, searched recipe AutoComplete. RecurringSettings uses ss, PrimeVue list/delete/add, prescribed help text, and no internal section heading. Repeat provider computes local calendar weekday, posts canonical slot id and recipe id, toasts and resolves so timeline refreshes. IntentTrigger uses titleFor when present; add a focused test for its per-entry title, rather than changing the registry's shared provider title. Replay badge derives weekday from entry.date, tooltip **Repeats every <weekday>**.
- [ ] **Step 7: Run GREEN, full phase gate and commit.** Include restart, loop, rollback and migration tests plus all browser/runtime guards. `git commit -m "fix(recurring): track weekly plans without resurrecting removed meals"`.

## Task 7: Document contracts and verify every screen/theme

**Files:**
- Modify: `docs/{SHELL_ARCHITECTURE,PLUGIN_DEVELOPER_GUIDE,CORE_PLUGINS,API_REFERENCE}.md`, `TODO.md`.
- Create: `shell/e2e/ui-theme-smoke.e2e.ts` using `shell/e2e/helpers/ui.ts` for real login/state setup; never import another `.e2e.ts` file to share helpers; keep screenshots under `shell/test-results/`.

**Interfaces:**
- Documents the actual Task 1–6 interfaces, not hypothetical APIs. All executable behavior is already protected by RED/GREEN tests; human prose does not earn artificial source-text tests.

**Pinned test:** `all_main_screens_render_in_each_theme_without_runtime_errors` → `expect(pageErrors).toEqual([]); expect(authenticatedConsoleErrors).toEqual([]); expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)` plus visible controls and saved screenshots per theme/screen.

- [ ] **Step 1: Complete the screen/theme matrix.** Each of the four theme ids × Recipes/list/detail/editor/import dialog, Timeline/add dialogs, Journal, Shopping list, Settings/member/recurring forms; include login/setup smoke where relevant. Assert pageerror/console.error absent during authenticated flow (only explicitly expected initial session-probe 401 is exempt), visible controls/dialogs, and no horizontal overflow at 390px. Save labelled screenshots with testInfo.outputPath; inspect screenshots, not merely their existence. If a real failure is found, keep its test RED and fix the responsible phase behavior with TDD.
- [ ] **Step 2: Update docs.** Global reserved component set, install module, string injection, wrapped ss prop/useSecretSauce/confirm, provider valid kinds/scoped triggers/titleFor, settings-heading rule and reactive sections, nav/drawer/theme contracts. API docs: meal_types validation, last-member 409, timeline responses/errors/range/auth/SSE, recurring immediate created count/delete preservation and removed route/command. Record non-goals in TODO; do not mark unrelated backlog items done. Explain old test blind spots and point to replacement runtime suites.
- [ ] **Step 3: Run final verification and inspect all evidence.** Fresh plugin/shell builds; `uv run pytest`; `pnpm --prefix shell test`; `pnpm --prefix shell test:e2e`; `git diff --check`. Reconcile every spec section against delivered code/tests. Report every failure/warning requiring action instead of hiding baseline failures or expected-error broad filters.
- [ ] **Step 4: Commit docs and perform separate final review.** `git commit -m "docs(ui): document overhaul contracts and regression coverage"`. Use requesting-code-review and the executing-plans review package with spec/plan/Review Focus/ledger rulings. With no subagent tool, record **Final review: self-review (no subagent tool)** and disclose its weaker independence. Important findings get one RED→GREEN fix pass plus green full suites; deferred minors and rulings are reported exhaustively. Use finishing-a-development-branch only after verified completion; do not merge/push without the user's choice.

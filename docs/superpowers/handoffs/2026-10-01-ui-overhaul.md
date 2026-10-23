# UI overhaul — fresh-session handover

**Paused at the user's request, 2026-10-01.** Stop implementation until the user resumes it. This handover **supersedes** `2026-09-28-ui-overhaul.md`: Phase 2 is now committed and verified; Phase 3 is partial and uncommitted.

## Resume prompt

> Resume the approved UI overhaul from `C:/github/secretsauce-core/docs/superpowers/handoffs/2026-10-01-ui-overhaul.md`. Continue in `.worktrees/ui-overhaul`, preserve the partial Phase 3 changes, and do not redo Phase 1, Phase 2, or design approval. Read the ledger and Task 3 brief first. Continue inline with TDD and the per-phase gates. Do not merge or push without my choice.

## Workspace and binding documents

- **Implementation worktree:** `C:/github/secretsauce-core/.worktrees/ui-overhaul`
- **Branch:** `feat/ui-overhaul`
- **HEAD:** `a71a3e23f75bd817daad8071e51c7cefdb88cc04`
- **Original checkout:** `C:/github/secretsauce-core`, detached at `d3b01c6`.
- **Design:** `docs/superpowers/specs/2026-09-28-ui-overhaul-design.md`
- **Approved plan:** `docs/superpowers/plans/2026-09-28-ui-overhaul.md`
- **Persistent gitignored ledger/logs:** `.superpowers/sdd/2026-09-28-ui-overhaul/`
- **Current brief:** `.superpowers/sdd/2026-09-28-ui-overhaul/task-3-brief.md`
- This handover is an **untracked file in the original checkout**; it is not an implementation commit.
- Dependencies are installed in the implementation worktree. No subagent tool was available; inline execution and final self-review were disclosed.
- Windows process inspection at this pause found **no matching Python/Node test or server processes**. Do not remove any worktree.
- Preserve original checkout data (`dev-data/`, `test-data/`, `tmp/`, `tmp_claudecode/`, etc.) and the separate `.worktrees/pre-stage-8-hardening` worktree.

All implementation commands below run from the implementation worktree.

## Completed commits and verification

| Phase | Commit | Verification |
|---|---|---|
| Plan | `d3b01c6` — `docs(plan): define UI overhaul TDD execution` | Approved before implementation |
| 1: Foundation | `675092c` — `feat(ui): install themed design system and plugin context` | 214 backend, 103 frontend, fresh build, 7 browsers |
| 2: Intents/import/plugin sweep | `a71a3e2` — `fix(ui): wire core plugin intents and AI import end to end` | **220 backend, 112 frontend, fresh build, 19 browsers** |

Phase 2 was committed only after its green gates. The `task-done` script reran the full frontend suite after commit: **112 passed**, and wrote `Task 2: complete` into the ledger. No merge or push occurred.

Phase 2 evidence:
- `resume-phase2-backend.log` — 220 passed.
- `resume-phase2-frontend-serial.log` and `task-2-tests.log` — 112 passed.
- `resume-phase2-build.log` — successful plugin/shell/vendor/service-worker build.
- `resume-phase2-browser.log` — 19 passed.

Running three expensive gates concurrently once caused the four-route component workflow to exceed Vitest's default 5 seconds. That specific scenario now has a 15-second timeout; its assertions were not weakened. Full frontend verification was rerun alone and passed. An earlier browser run printed a Windows transport reset; the final browser gate did not. These were not counted as feature REDs.

## What Phase 2 now delivers

- Real Button/Menu/Dialog `IntentTrigger`, scoped popup anchors, public `disabledReason`, unavailable filtering, and exactly-once resolve/cancel/close handling.
- Importer reachable through Recipes → New recipe → Import with AI: URL/text/photo extraction with `auto_save: false`, real FileReader/base64/MIME, structured preview, explicit save and persistence, unavailable-AI Settings link. Invalid subsequent file selection clears the prior photo/draft.
- Standard 503 `unavailable` before outbound AI when a configured/environment provider key is absent. Translator preserves standard errors rather than wrapping them in 500.
- Translator reachable through recipe Actions, with persisted language variants and errors.
- Planner rendered in `timeline.sidebar`, using household slots and real acceptance/dismissal state.
- Shopping list top-level navigation, real query arguments, scheduled aggregation and manual checked persistence. Backend normalized-key/manual-UUID mismatch repaired transactionally; failed UI check writes roll back.
- Recipes list/search/detail/editor/cards/ingredients/steps converted to context/global controls/tokens. Search sends flat query parameters; failed saves retain input and display errors.
- Shortlist uses real plugin context and SPA navigation; ratings use the actual selected member and server scores, including reload/toggle.
- Journal reads `servings_cooked` correctly. AI Settings use context/global controls and retain failed form writes.
- Member picker uses the actual shared current-member ref, correct `ss-current-member` key and guarded storage. Initial member/recurring controls use global controls/tokens; later edit/last-member/recurring semantics remain for Phases 4/6.
- Timeline **wiring**, not the later layout: actual card intents, revisioned confirmed removal without document reload, real cooked outbox requests and journal-derived badges. Old horizontal layout/AddEntryModal remains for Phase 5.
- Cook-tracker writes route-valid `path`, `servings_cooked`, `cooked_by_member_id`, title and status. Existing notification-only Skip/Log leftovers behavior was not turned into new persisted functionality.
- Activation → real factory/registries/consumers replaces misleading direct plugin mounts. Mocked phase suites are renamed `*-components.spec.ts`, not E2E.
- Old importer/translator components removed after their references were replaced. All-core contract guard checks registrations, allowed rendered slots/hubs, navigation and prohibited imports.
- Old `phase-3c.e2e.ts` now actually schedules, marks cooked through the card, polls journal persistence, checks servings, votes as a member and verifies reload persistence.

### Browser infrastructure

`shell/e2e/server.py` uses real `build_app()`/lifespan/services and replaces **only the outbound paid OpenAI-compatible helper**, returning schema-valid deterministic import/translation/planner data. Real availability, budgets, usage/history and writes remain active. Developer key fallbacks are cleared only in the child server. No browser REST stubs or production test endpoints.

`shell/e2e/helpers/state.ts` is an automatic authenticated snapshot/cleanup fixture, now used by every browser suite. It removes dependent journal/schedule writes before new recipes/members and restores shortlist, shopping and household/AI configuration. AI GET masks credentials, so the fixture restores the child server's known test key, not a developer key. Extend cleanup for later-phase member edits, slot overrides or recurring rules as needed; it does not yet cover those new behaviors.

## Phase 3: exact uncommitted state

At pause, `git status --short` in the implementation worktree showed:

```text
 M secretsauce/api/models.py
 M secretsauce/api/routes/household.py
 M secretsauce/api/routes/setup.py
?? shell/e2e/ui-settings.e2e.ts
?? shell/tests/meal-slots.spec.ts
?? shell/tests/settings.spec.ts
?? tests/test_ui_household_runtime.py
```

Nothing is staged. There is **no Phase 3 commit**. Generated bundles still represent verified Phase 2.

### Backend implementation and evidence

New `tests/test_ui_household_runtime.py` uses the production HTTP/lifespan:
- Parameterized setup/PATCH cases: explicit null, empty list, uppercase/leading-hyphen/punctuation/non-ASCII/empty/overlong IDs, empty/overlong labels and duplicate IDs.
- Invalid writes must return standard 422 `validation`, preserve household/member snapshots, and leave setup credentials/cookies absent.
- Valid slot order is preserved; omitted PATCH field preserves current slots; omitted setup field retains Breakfast/Lunch/Dinner defaults.

**Observed RED:** `uv run pytest tests/test_ui_household_runtime.py -v` → **22 failed, 2 passed** because invalid slot lists were accepted. Log: `task3-household-red.log`.

Implemented:
- Shared `MealType` in `api/models.py`: exact slug pattern and label length.
- Shared `MealTypesPayload`: nonempty list, unique IDs, explicit null rejected. Unvalidated default `None` represents omission and remains permitted.
- Setup and household payloads inherit it; setup serializes slot models into stored dictionaries and retains default-on-omission behavior. PATCH serializes only sent fields.

**Focused GREEN:**

```bash
uv run pytest tests/test_ui_household_runtime.py tests/test_auth_routes.py tests/test_household_members_api.py -q
```

→ **33 passed**, `task3-household-green.log`.

Two earlier attempted focused commands named nonexistent setup test files and ran no tests; those are command mistakes, not feature RED evidence. The command above is the actual successful run.

**No full backend gate has run after the Phase 3 change.**

### Browser RED and newly written component tests

New `shell/e2e/ui-settings.e2e.ts` covers:
1. `/plugins` redirect, opened Plugins panel and real shopping disable/re-enable updating navigation without reload.
2. Add Lunch, rename Dinner without changing its ID, reorder/save/reload.
3. AI panel query, one accessible header, stale saved/query panel IDs.
4. Denied device storage still allowing household edit/save/reload.

**Observed RED:** `pnpm --prefix shell test:e2e e2e/ui-settings.e2e.ts` → **4 failed**, missing panels/editor in unchanged Phase 2 UI. Log: `task3-browser-red.log`. The server started correctly; these are not startup/import failures.

Immediately before the user paused, two focused suites were written:
- `shell/tests/meal-slots.spec.ts`: literal slug/collision/truncation cases; rename identity, last-slot guard, add/reorder/remove via actual global controls.
- `shell/tests/settings.spec.ts`: live registration/unregistration, query opening, persisted multiple panels with stale IDs filtered, household save/error/store behavior, state/error/command rendering and real loader route synchronization through API-boundary doubles.

**Neither new component suite has been run.** Their imports are intentionally not implemented yet:
- `shell/src/settings/mealSlots.ts`
- `shell/src/settings/MealSlotEditor.vue`
- `shell/src/settings/index.ts` exporting `registerShellSettings`

The tests propose a pure `registerShellSettings(registry)` helper shared by main and harness so tests need not import side-effectful `main.ts`. This is a small extra-module assumption beyond the plan's named files; validate it or record a ruling before implementing. Do not count missing-module errors as behavioral RED evidence.

Known test alignment issue found during handover inspection: the new AI-panel browser case uses exact label **Model**, but existing `AiSettings.vue` labels its input **Model name**. Correct the test to the actual public label (or make an intentional, justified accessibility change); do not treat that future selector mismatch as a production regression.

## Immediate next steps when resumed

1. Read AGENTS, relevant Superpowers skills, the binding design/plan, ledger and **Task 3 brief**. Do not rerun plan approval or completed tasks.
2. Confirm HEAD/status and preserve all seven Phase 3 files above.
3. Run the focused household GREEN command again if needed; inspect the new component suites before executing them.
4. Continue Phase 3 focused RED/GREEN and implementation:
   - `HouseholdSettings`, `MealSlotEditor`, `DeviceSettings`, `PluginManagerSection`, pure slug helper.
   - Reactive, multiple Accordion Settings with fixed shell sections (`household` 0, `plugins` 900, `device` 1000), plugin sections in between, one header each.
   - `ss-settings-open`, default Household, guarded device storage, query opens/scrolls known sections and ignores stale IDs.
   - Household draft/save refreshes the live store, preserves language translations, renames preserve slot IDs and last-slot removal is disabled.
   - Plugin controls must reconcile **real loader registrations** against `/api/plugins/active`, not only update backend state. Loader is at `shell/src/registries/plugins.ts`, not `shell/src/pluginLoader.ts`.
   - Extract/remove obsolete PluginManagerPage, update old hardening/page tests honestly.
5. Adapt `registeredPlugin.ts`/plugin harness so Settings component tests open their owning accordion sections rather than clicking hidden controls. Preserve actual registration coverage.
6. Update existing browser theme tests for the new Device panel and PrimeVue Select; current `ui-foundation.e2e.ts` expects native `selectOption`/values. Preserve all live-theme/reload/storage assertions.
7. Finish importer/translator AI-settings-link panel assertions. Add real enable/disable Settings-section coverage, without reload or duplicate registrations/requests.
8. Add `tests/test_api_auth_matrix.py` after activation: discover protected kernel/plugin routes, derive public exceptions from `secretsauce.auth._PUBLIC`, assert no/wrong/revoked credential standard errors before body validation. POST setup after configuration remains 409; health is separate. Do not weaken auth.
9. Run full Phase 3 gates, fresh builds, inspect diffs and commit only once all pass:
   `feat(settings): consolidate sections and edit household meal slots`.
10. Then proceed through Phases 4–7 inline, one implementation commit per phase.

## Remaining phases and constraints

- **4:** member add/edit shared dialog, dietary preferences/conflict reload, deterministic avatars, transactional last-member protection. Remove color picker/setup submission, retain API compatibility.
- **5:** per-day slots/service/routes, vertical live Timeline, local calendar composition/legacy aliases, explicit date expansion, new dialogs and responsive sidebar.
- **6:** schema 2 recurring tracking, immediate/hourly 14-day scheduling, no resurrection, atomic materialization/deletion and UI rule creation.
- **7:** docs, all-screen/four-theme browser smoke/screenshots, final whole-branch review (self-review unless a fresh reviewer tool is available), branch integration choice.

Todos at pause: #1/#2 completed, #3 paused/pending (partial), #4–#7 pending. Recreate from ledger if a new session lacks todo state.

Critical constraints:
- Use `python` or `uv run python`, never `python3`; `uv run pytest`; pnpm commands target `shell/`.
- `pnpm --prefix shell build` already rebuilds plugins, shell, SW and vendor. Rebuild before browser verification whenever frontend source changes.
- Per-phase gate: full pytest, full Vitest, fresh build, full Playwright, `git diff --check`; do not complete a phase with known failing/unrun required tests.
- Backend outside-in tests use `build_app()` + lifespan + HTTP; no manual drains/jobs or fake noun events.
- `API_VERSION` stays 1, provide/inject keys are strings, plugin UI uses shell-global controls and no direct PrimeVue imports.
- `ss.confirm` option is **header**, not title; ConfirmDialog's role is **alertdialog**.
- Keep `/shopping-list`, free-string kernel `meal_type`, backend `avatar_color` compatibility and all user data.
- Bound searches; avoid dependency/other-worktree recursion. Do not merge, push, publish or delete worktrees without the user's choice.

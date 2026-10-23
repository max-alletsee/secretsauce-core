# UI overhaul — fresh-session handover

**Paused at the user's request, 2026-10-03 (00:41 local environment clock).** Stop implementation until the user resumes. This handover **supersedes** `2026-10-01-ui-overhaul.md`: Phases 3 and 4 are now committed/verified; Phase 5 is substantial, green at its last gates, but **uncommitted and not yet declared complete**. Preserve older handovers.

## Resume prompt

> Resume the approved UI overhaul from `C:/github/secretsauce-core/docs/superpowers/handoffs/2026-10-03-ui-overhaul.md`. Continue in `.worktrees/ui-overhaul`, preserving all uncommitted Phase 5 changes. Do not redo Phases 1–4 or design approval. Read the ledger and Task 5 brief first, reconcile the remaining Phase 5 requirements/edge cases, then complete its gates/commit before proceeding through Phases 6–7 inline with TDD. Do not merge or push without my choice.

## Workspace and authority

- **Implementation worktree:** `C:/github/secretsauce-core/.worktrees/ui-overhaul`
- **Branch:** `feat/ui-overhaul`
- **HEAD:** `63fa9e3552e6c17ef217199dbf2196e845b29f34`
- **Original checkout:** `C:/github/secretsauce-core`, still detached at the plan commit `d3b01c6`.
- **Binding design:** `docs/superpowers/specs/2026-09-28-ui-overhaul-design.md`
- **Approved plan:** `docs/superpowers/plans/2026-09-28-ui-overhaul.md`
- **Persistent gitignored ledger/logs:** implementation worktree `.superpowers/sdd/2026-09-28-ui-overhaul/`
- **Current brief:** `.superpowers/sdd/2026-09-28-ui-overhaul/task-5-brief.md`
- This handover lives in the **original checkout**, untracked; it is not an implementation commit.
- Dependencies are installed. No subagent tool was available: execution remains inline; final whole-branch review will be self-review unless a fresh reviewer tool becomes available.
- No merge, push, publish or worktree deletion occurred.
- Windows process inspection at pause found **no matching Python/Node project test/server processes**. No processes were killed.
- Preserve `dev-data/`, `test-data/`, `tmp/`, `tmp_claudecode/`, all other user data and `.worktrees/pre-stage-8-hardening`.

All commands below run from the implementation worktree, not the original checkout.

## Completed phases — do not repeat

| Phase | Commit | Gates |
|---|---|---|
| Plan | `d3b01c6` | Approved before implementation |
| 1: Foundation | `675092c` | 214 backend, 103 frontend, fresh build, 7 browsers |
| 2: Intents/import/plugin sweep | `a71a3e2` | 220 backend, 112 frontend, fresh build, 19 browsers |
| 3: Settings/default slots/auth matrix | `4a79c88` | **247 backend, 125 frontend, fresh build, 24 browsers** |
| 4: Member editing/last-member guard | `63fa9e3` | **250 backend, 128 frontend, fresh build, 26 browsers** |

Both new phase commits were made only after their full gates passed. Each phase's `task-done` script reran the full frontend suite and appended its completion line. Phases 1/2 are described in the older handover; their behavior was retained and exercised by later full gates.

### Phase 3 now delivers

- Computed/reactive multiple Accordion Settings, one section header each, query opening/scrolling, stale-id filtering and guarded `ss-settings-open` persistence.
- Shared `registerShellSettings(registry)` in `shell/src/settings/index.ts`, used by real `main.ts` and component harnesses. Shell sections: Household 0, Plugins 900, This device 1000; Members 10, Recurring 20, AI 80.
- Household name/units/language/slots draft and save; complete language translations preserved; successful response refreshes live store; failed saves retain input and error.
- Bounded ASCII slug helper, deterministic fallback/collisions, label-only rename, slot order controls, last-slot removal guard.
- Shared setup/PATCH validation from the preserved partial work: nonempty/unique slot list, strict id and label lengths, explicit null rejected, omission retains defaults/current values. Production HTTP tests preserve household/member/session snapshots on invalid requests.
- Plugins section with Tags, ToggleSwitches, commands/error details and pending guards. `pluginLoader.syncActivePlugins(api)` reconciles actual registrations from **one** active-list read per toggle, including dependencies disappearing from the active set. Obsolete `PluginManagerPage.vue` removed.
- Device theme/start-page global Selects and logout explanation. Explicit accessible names are necessary: non-editable PrimeVue Select renders a span, so HTML `label for` plus `inputId` alone does not name it.
- Theme browser tests retain live CSS, persistence, unknown-id fallback and denied-storage assertions, using the new Device panel/global Select.
- Real enable/disable browser coverage for Shopping navigation and AI Settings registration, without document reload or duplicate POSTs; importer/translator Settings links assert the opened AI panel.
- `tests/test_api_auth_matrix.py` discovers kernel and plugin APIRoutes after real lifespan activation, descends FastAPI included-router wrappers, derives public exceptions from `_PUBLIC`, checks missing/wrong-type/revoked credentials before validation, and treats health/setup conflict separately. No production auth was relaxed. Parametrization is by credential; each case loops all discovered method/path pairs with diagnostics.

Evidence: `task3-backend-full.log`, `task3-frontend-full.log`, `task3-build-full.log`, `task3-browser-full.log`, `task-3-tests.log`.

### Phase 4 now delivers

- Shared add/edit `MemberDialog.vue`, all four multiple/free-entry dietary fields with suggestions, language union, portion bounds, route-valid POST/PATCH and revisioned conflict reload. On conflict the latest profile is loaded and can be retried; ordinary errors retain entered values.
- Cards with deterministic eight-token avatars, language/portion and dietary/allergy/dislike Tags, Edit, empty-preference CTA and confirmed Delete. Last-member Delete is disabled.
- Member picker now uses the specified Avatar/name Button + popup Menu, updating the actual actor ref and guarded `ss-current-member` key. Shared browser helper `chooseMember` now uses Button/menuitem, not combobox/option.
- Last-member guard inside the existing writer transaction, after not-found/revision checks and before cleanup. Concurrent last-two deletion returns `[204, 409]` and leaves one survivor.
- Store adds `updateMember`; plugin Settings updates the exposed live member/current-member refs on save. Backend `avatar_color` compatibility remains; UI ignores it. Setup already omitted color since Foundation, so it was not redundantly changed.
- Old only-member CRUD/noun-event fixtures seed a survivor; the member DB fixture closes in `finally` on failures.
- Browser cleanup restores edits to preexisting member profiles using their current revisions.
- The old removal browser test now waits for the Cancel alertdialog to disappear before reopening the meal menu. This fixed a reproduced transition race without sleeps/forced clicks/timeout increases.

Evidence: `task4-backend-full.log`, `task4-frontend-full.log`, `task4-build-full.log`, `task4-browser-full-green.log`, `task-4-tests.log`.

## Phase 5 — exact state at pause

**Nothing is staged. No Phase 5 commit. No `Task 5: complete` ledger line.** All changes below must be preserved. The generated plugin and shell bundles now contain the partial Phase 5 implementation, not just Phase 4.

```text
 M secretsauce/db.py
 M secretsauce/plugins/core/core-meal-planner-ai/__init__.py
 M secretsauce/plugins/core/core-meal-planner-ai/ui.css
 M secretsauce/plugins/core/core-meal-planner-ai/ui.js
 M secretsauce/plugins/core/core-meal-planner-ai/ui/src/MealPlannerWidget.vue
 M secretsauce/plugins/core/core-timeline/__init__.py
 M secretsauce/plugins/core/core-timeline/ui.css
 M secretsauce/plugins/core/core-timeline/ui.js
 D secretsauce/plugins/core/core-timeline/ui/src/components/AddEntryModal.vue
 M secretsauce/plugins/core/core-timeline/ui/src/components/MealSlot.vue
 M secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue
 M secretsauce/static/index.html
 M shell/e2e/helpers/state.ts
 M shell/e2e/live-stream.e2e.ts
 M shell/e2e/phase-3c.e2e.ts
 M shell/src/registries/plugins.ts
 M shell/tests/integration/phase-3c-components.spec.ts
 M shell/tests/plugins/timeline.spec.ts
 M tests/test_db_hardening.py
?? secretsauce/plugins/core/core-timeline/migrations/
?? secretsauce/plugins/core/core-timeline/slots.py
?? secretsauce/plugins/core/core-timeline/ui/src/components/AddEntryDialog.vue
?? secretsauce/plugins/core/core-timeline/ui/src/components/AddSlotDialog.vue
?? secretsauce/plugins/core/core-timeline/ui/src/components/DayCard.vue
?? secretsauce/plugins/core/core-timeline/ui/src/days.ts
?? secretsauce/static/assets/index-C8zHkucf.css
?? secretsauce/static/assets/index-CQ_Zh9NW.js
?? secretsauce/static/assets/index-ChVByTY1.js
?? secretsauce/static/assets/index-Cy3D1txk.js
?? secretsauce/static/assets/index-DtFJbTD1.css
?? shell/e2e/ui-timeline.e2e.ts
?? shell/tests/plugin-lifecycle.spec.ts
?? shell/tests/plugins/timeline-days.spec.ts
?? tests/test_ui_timeline_runtime.py
```

`migrations/` contains new `0001_day_slots.sql`. `index.html` currently references **`index-ChVByTY1.js`** and the already tracked **`index-7CJyyoGX.css`**. Other untracked assets above are intermediate builds from this session and were deliberately neither staged nor deleted. Stage only current outputs after the final build; do not sweep unrelated files with `git add .`.

### Backend implementation and evidence

- Timeline manifest advances to schema 1; `slots.py` supplies migration-backed `TimelineSlotsService`, strict calendar/range/id/label validation, GET/PUT/DELETE routes and service registration using `Depends(current_ctx)`.
- Defaults resolve in household order; skips are per-day; extras insert before defaults or at end, ordered by retained `created_at` and rowid. Updating an extra retains creation order.
- Occupancy matching prioritizes case-insensitive id, then label aliases, consistent with frontend composition. Occupied skip and deleting a populated extra without `with_entries` return standard conflicts with `details.current.entry_count`.
- Deleting entries and override uses one writer transaction and noun repository deletes. A failure on the second entry deletion preserves schedule/override/event snapshots and sends no push; successful retry deletes both.
- `core-timeline:slots-changed` is published after commit; real HTTP/SSE subscriber test verifies its exact plugin/name/date frame.
- **Important additional change:** `Database.transaction` now awaits awaitables returned by `after_commit` callbacks after releasing the writer. Previously it called callbacks synchronously and silently discarded the coroutine from the specified async `ctx.push`. Narrow DB RED proves the callback never ran; GREEN proves it sees committed data and can open another write transaction. Existing synchronous callbacks and rollback/savepoint tests remain green.
- AI planner declares optional `core-timeline?`, queries service at call time, includes resolved/non-skipped per-date slot ids in its paid prompt and falls back to household defaults when Timeline is disabled. HTTP tests stub only outbound completion, retain real availability/usage/routes and cover both modes.

RED evidence: `task5-http-red.log` (18 missing-route failures; PUT/DELETE return 405 due existing SPA method handling); `task5-async-commit-red.log`; `task5-planner-red-valid.log`.

Latest focused backend: `task5-focused-backend.log` — **34 passed** (Timeline + DB hardening + discovered auth).

### Frontend implementation and evidence

- `days.ts`: local-calendar date shifting, ordered day VMs, id/legacy-label matching, occupied skipped slots rendered normally and unmatched entries appended rather than hidden. Six literal tests observed RED then GREEN.
- Vertical Timeline with collapsed past-day block, Today reset/scroll, explicit Earlier/More buttons, household slots, responsive sidebar above feed below 1024px and per-widget initially collapsed Accordions on phone.
- Day/slot popup actions; one-off add dialog with positions and shared slug helper; skip/undo; populated extra removal count confirmation.
- Recipes/Shortlist/Note add-meal Dialog with exact note title and canonical slot id; old modal and AI placeholder removed. Search sends flat query arguments; async search/window responses have revision guards; errors stay visible.
- `ss.on` subscriptions debounce real schedule/journal/slot events by 300ms and clean up on unmount. Existing cache warming remains.
- AI widget loads actual day slots, includes extra Brunch in choices, excludes skipped slots and supplies date-specific acceptance choices with household fallback.
- **Important additional change:** loader wraps each activated UI context's `ss.on`, tracks its returned cleanup functions and releases them on deactivation, including activation-error cleanup. This covers module-level Timeline cache-warming subscriptions as well as view listeners. A real `stream.connect()` test with realistic EventSource frames observed firing after deactivation (RED), then exactly one delivery after reactivation (GREEN).
- Existing Timeline component/phase browser tests adapted to new real response shapes and global dialogs, preserving schedule→outbox→journal→ratings assertions.
- `live-stream.e2e.ts` now writes within the visible window and asserts actual card appearance/removal, not just a request for an out-of-window entry.
- Browser cleanup now snapshots/restores per-day resolved overrides across ±20 days, in addition to member/config/recipe/schedule cleanup. It derives an extra's `before` from its next resolved default when restoring. Extend carefully if later tests mutate existing overrides or delete existing baseline meals.

RED evidence: `task5-days-red.log`; `task5-browser-red.log` (two real layout failures, plus two harness issues corrected separately); `task5-planner-browser-red.log` (missing Brunch); `task5-lifecycle-red.log` (listener leak).

### Browser investigation — do not repeat blind fixes

The new skip-menu interaction initially failed because the popup detached while Playwright waited for stability. Closing-transition hypotheses did **not** explain it. Instrumentation in `task5-slot-scroll-trace.log` showed Playwright's automatic scroll of `.ss-content` from 0 to 606 occurring **after** Menu registered its scroll-dismiss listener. The popup therefore hid during its entry transition.

Current test explicitly `scrollIntoViewIfNeeded()` and asserts `toBeInViewport()` on the trigger **before** clicking it, matching a user scrolling before opening a menu. No sleeps, forced clicks, relaxed assertions or production popup workaround. Diagnostic instrumentation was removed. All four new Timeline browsers and the final full browser gate pass. `task5-menu-scroll-first.log` records the focused result.

### Last full gates — all ran before pause

```bash
uv run pytest                        # 271 passed
pnpm --prefix shell test             # 135 passed
pnpm --prefix shell build            # success, plugins/shell/vendor/SW
pnpm --prefix shell test:e2e          # 30 passed
git diff --check                     # clean
```

Logs: `task5-backend-full.log`, `task5-frontend-full.log`, `task5-build-full.log`, **`task5-browser-gate.log`**. The final browser gate printed **no Windows pipe reset**. Earlier diagnostic browser gates printed occasional known Windows asyncio `ConnectionResetError` on disconnect; these were recorded, not suppressed, and not counted as feature REDs. Vite still prints the existing >500kB chunk advisory; no bundle-size workaround was added.

**Green suites are not the Phase 5 completion contract.** The user stopped the session immediately after these gates. Final source/generated diff inspection, requirements reconciliation, remaining tests/fixes below, commit and `task-done` are outstanding.

## Resume next steps and inspection concerns

1. Load applicable skills, read AGENTS, binding spec/plan, this ledger and **Task 5 brief**. Skip brainstorming/design reapproval; it is approved execution. Verify HEAD/status without resetting or recreating the worktree.
2. Reconcile Phase 5 source/tests against every brief requirement and inspect its diff. Do not infer completeness solely from the green gates. Particularly inspect/test:
   - **Long date windows:** Earlier/More keeps expanding, while the backend rejects ranges over 92 days. Current page sends one whole-range query. Decide/test a spec-consistent strategy (e.g. bounded request chunks), rather than leaving repeated expansion broken.
   - **Synthetic unmatched extra slots:** `buildDays` correctly makes old free-string meals visible as extras, but Remove slot currently calls DELETE for an override that may not exist (404). Decide/test sensible actions for these synthetic slots; never hide legacy entries.
   - Default changes that collide with an existing extra id; id-vs-label priority/collisions on server occupancy and frontend composition; malformed date/label/range cases and a removed `before` target. Some are covered, but not all failure classes in the brief.
   - Cancellation/concurrency/rollback around the new async after-commit hook, and listener cleanup on failed activation, returning to the route, and real disable/re-enable without duplicate refetches. Current loader test covers the main disabled/reactivated leak; broader error-path coverage remains.
   - New planner date-specific choices/out-of-loaded-range fallback, and invalid `start_date` handling (`date.fromisoformat` is not yet translated into a standard validation error).
   - Add-meal error/shortlist/note/servings interactions through owning activation, default slots added in Settings appearing across days, and Sidebar/main layout at all required widths.
   - Browser cleanup restores resolved positions rather than raw override `before`; do not let new tests corrupt preexisting test state or delete baseline meals while restoring overrides.
   - Minor test cleanup: `shell/tests/plugins/timeline.spec.ts` contains an unused `await ...exists()` line before the real add-dialog assertions; it is not a behavioral assertion.
3. Fix confirmed gaps one RED→GREEN at a time; record rulings/costs in the ledger. Keep Phase 5 in progress while incomplete, even if gates are green.
4. After changes, rerun full backend, frontend, fresh build, full browser and diff check **serially**, inspect source/generated diff, then stage only Phase 5 files/current bundles and commit:
   `feat(timeline): add day slots and a live vertical meal feed`.
5. Run executing-plans `task-done` with BASE **`63fa9e3`** only after the contract is met. Then proceed to Tasks 6/7 inline.

## Remaining phases

- **6 (unstarted):** schema 2 recurring tracking/history; immediate/hourly 14-day scheduling; no resurrection after delete/loop/restart; atomic materialization and rule deletion; skipped slots and migration backfill; Settings rule dialog and timeline repeat provider; remove old materialize route/command; context-dependent `titleFor` and JS→Python weekday conversion.
- **7 (unstarted):** docs, full screen/four-theme browser smoke and screenshots, final full gates, whole-branch review (self-review unless a fresh reviewer tool becomes available), one Important/Critical fix pass, report rulings/deferred minors, then user integration choice.
- No final review package or final review has been produced. Do not delete the SDD workspace yet.

## New rulings from this session

- **Task 3:** add pure `settings/index.ts` registration helper shared by main/tests, avoiding side-effectful main imports. Cost if wrong: one extra internal module to maintain.
- **Task 5:** await async after-commit callback results outside the writer, because synchronous invocation cannot perform the planned awaited push. Cost if wrong: async callbacks can delay HTTP response after the writes have already committed.

Earlier phase rulings remain in the ledger and older handovers. At final completion, report the complete ledger ruling list as required; do not lose them at compaction.

## Environment and safety reminders

- `python` / `uv run python`, **never `python3`**. `uv run pytest`. `pnpm --prefix shell ...`; root is not a Node project.
- `pnpm --prefix shell build` rebuilds plugins, shell, vendor and SW. Browser runs must use fresh bundles after source changes.
- Backend outside-in tests use `build_app()` + lifespan + HTTP, no manual event drains/jobs/fake noun events. Failure injection remains below HTTP; paid AI stubs remain only outbound helper replacements.
- `API_VERSION` stays 1; provide/inject keys stay strings; plugin UI has no PrimeVue imports. `ss.confirm` option is `header`; ConfirmDialog role is `alertdialog`.
- Keep `/shopping-list`, free-string kernel `meal_type`, `avatar_color` compatibility and all data.
- Bound repository searches. No merge/push/publish/delete worktree without the user's choice.
- At pause todos: recovery/Phases 3–4 completed; Phase 5 paused pending (partial/uncommitted); Phases 6–7 pending. Recreate from ledger if todo state is lost.

No implementation or test runs were performed after the pause request; only state/process verification and this handover/ledger documentation.

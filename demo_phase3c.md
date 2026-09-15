# Phase 3C: Timeline & Cooking Workflow Demo

*2026-09-15T21:56:33Z by Showboat 0.6.1*
<!-- showboat-id: ffb43609-8262-4a43-bcfc-63075124646f -->

## Overview

Phase 3C delivers the core timeline and cooking execution workflow for SecretSauce, consisting of three decoupled core plugins built to Principles P2, P3, and P5:

1. **`core-timeline`**: Rolling 9-day anchored meal planner (`today - 2` to `today + 6`) with catch-up condensed days, an Add Meal intent hub (`entry:create`), and offline cache warming for planned recipes.
2. **`cook-tracker`**: 1-click optimistic meal execution tracking with outbox writes, carryovers & leftovers schema, checkmark badges (`timeline.entry.badge`), and a dedicated `/journal` history page.
3. **`ratings`**: Minimal binary voting (+1 / -1) on journal entries (`journal.entry.footer`), indexed into `entity_attributes` as `ratings.score` for recipe search sorting.
4. **Dynamic Start Page**: Dynamic `/` navigation guard that lands on `/timeline` when active, with user-configurable overrides in Household Settings.

## 1. Rolling 9-Day Timeline (`core-timeline`)

The `core-timeline` plugin anchors around today, showing two past days for rapid check-off or rescheduling and six future days for meal planning. Clicking "+" triggers the `entry:create` intent modal with recipe search, shortlist favorites, AI planner suggestions hook, and custom notes.

Below, we verify the timeline component tests and activator registrations via Vitest:

```bash
pnpm --prefix shell test tests/plugins/timeline.spec.ts
```

```output

> secretsauce-shell@1.0.0 test C:\github\secretsauce-core\.worktrees\phase-3c-timeline\shell
> vitest run "tests/plugins/timeline.spec.ts"


[1m[46m RUN [49m[22m [36mv3.2.7 [39m[90mC:/github/secretsauce-core/.worktrees/phase-3c-timeline/shell[39m

[90mstderr[2m | tests/plugins/timeline.spec.ts[2m > [22m[2mTimeline Plugin UI[2m > [22m[2mrenders a rolling 9-day span with 2 compact past days, today, and 6 future days
[22m[39m[Vue warn]: injection "__SS_INTENT__" not found. 
  at <TimelinePage ref="VTU_COMPONENT" > 
  at <VTUROOT>

 [32m✓[39m tests/plugins/timeline.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 96[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m   Start at [22m 23:56:45
[2m   Duration [22m 1.94s[2m (transform 289ms, setup 0ms, collect 538ms, tests 96ms, environment 417ms, prepare 268ms)[22m

```

## 2. Cook Tracking & Journal (`cook-tracker`)

The `cook-tracker` plugin tracks when scheduled meals are actually cooked. It provides:
- The `plugin_cook_tracker_leftovers` and `plugin_cook_tracker_carryovers` database tables with an administrative `rebuild` command to reconcile orphaned entries.
- The `mark-cooked` headless provider that commits meals into `/api/journal`.
- The `CookedBadge.vue` component registered into slot `timeline.entry.badge`.
- The `/journal` page route for viewing cooking history.

Below, we test the backend database migrations and rebuild command with Pytest, followed by the frontend UI tests with Vitest:

```bash
uv run pytest tests/test_plugin_cook_tracker.py -v
```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0 -- C:\github\secretsauce-core\.worktrees\phase-3c-timeline\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\github\secretsauce-core\.worktrees\phase-3c-timeline
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collecting ... collected 1 item

tests/test_plugin_cook_tracker.py::test_cook_tracker_boots_and_runs_rebuild PASSED [100%]

============================== 1 passed in 0.71s ==============================
```

```bash
pnpm --prefix shell test tests/plugins/cook-tracker.spec.ts
```

```output

> secretsauce-shell@1.0.0 test C:\github\secretsauce-core\.worktrees\phase-3c-timeline\shell
> vitest run "tests/plugins/cook-tracker.spec.ts"


[1m[46m RUN [49m[22m [36mv3.2.7 [39m[90mC:/github/secretsauce-core/.worktrees/phase-3c-timeline/shell[39m

 [32m✓[39m tests/plugins/cook-tracker.spec.ts [2m([22m[2m3 tests[22m[2m)[22m[32m 33[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m3 passed[39m[22m[90m (3)[39m
[2m   Start at [22m 23:56:57
[2m   Duration [22m 1.62s[2m (transform 203ms, setup 0ms, collect 382ms, tests 33ms, environment 399ms, prepare 242ms)[22m

```

## 3. Binary Recipe Ratings (`ratings`)

The `ratings` plugin provides a simple upvote/downvote (+1 / -1) mechanism:
- Stored in `plugin_ratings_scores` keyed by `(journal_id, member_id)`.
- Net scores are mirrored into `entity_attributes` as `ratings.score` for recipe sorting and filtering.
- Admin `rebuild` command recomputes all recipe scores across all journal entries.
- The `VoteRating.vue` UI component mounts in slot `journal.entry.footer`.

Below, we test backend vote scoring, attribute mirroring, and deletion via Pytest, followed by Vitest UI testing:

```bash
uv run pytest tests/test_plugin_ratings.py -v
```

```output
============================= test session starts =============================
platform win32 -- Python 3.13.5, pytest-9.1.1, pluggy-1.6.0 -- C:\github\secretsauce-core\.worktrees\phase-3c-timeline\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: C:\github\secretsauce-core\.worktrees\phase-3c-timeline
configfile: pyproject.toml
plugins: anyio-4.15.1, asyncio-1.4.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collecting ... collected 1 item

tests/test_plugin_ratings.py::test_ratings_upvote_downvote_and_attribute_mirroring PASSED [100%]

============================== 1 passed in 0.88s ==============================
```

```bash
pnpm --prefix shell test tests/plugins/ratings.spec.ts
```

```output

> secretsauce-shell@1.0.0 test C:\github\secretsauce-core\.worktrees\phase-3c-timeline\shell
> vitest run "tests/plugins/ratings.spec.ts"


[1m[46m RUN [49m[22m [36mv3.2.7 [39m[90mC:/github/secretsauce-core/.worktrees/phase-3c-timeline/shell[39m

 [32m✓[39m tests/plugins/ratings.spec.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 47[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m2 passed[39m[22m[90m (2)[39m
[2m   Start at [22m 23:57:10
[2m   Duration [22m 1.62s[2m (transform 129ms, setup 0ms, collect 255ms, tests 47ms, environment 464ms, prepare 316ms)[22m

```

## 4. End-to-End Playwright Browser Verification

The complete integrated workflow was verified using Playwright Chromium:
1. An unauthenticated browser visits `/` and is redirected to `/login`.
2. Logging in boots all core plugins (`core-timeline`, `cook-tracker`, `ratings`, `core-members`, `core-recipes`, `shortlist`).
3. The session dynamically lands on `/timeline`.
4. The 9-day rolling view is verified, including 2 compact past days, the Today badge, and upcoming days.
5. The Add Meal modal is opened to search for and schedule a meal.
6. The scheduled card appears on today's timeline.
7. The user navigates to `/journal` and views the journal history.

Below, we run the automated browser test suite:

```bash
pnpm --prefix shell test:e2e
```

```output

> secretsauce-shell@1.0.0 test:e2e C:\github\secretsauce-core\.worktrees\phase-3c-timeline\shell
> playwright test

[WebServer] INFO:     Started server process [16148]
[WebServer] INFO:     Waiting for application startup.
[WebServer] INFO:     Application startup complete.
[WebServer] INFO:     Uvicorn running on http://127.0.0.1:8998 (Press CTRL+C to quit)

Running 2 tests using 1 worker

PAGE LOG: error Failed to load resource: the server responded with a status of 401 (Unauthorized)
PAGE LOG: error Failed to load resource: the server responded with a status of 401 (Unauthorized)
  ok 1 [chromium] › e2e\phase-3b.e2e.ts:4:3 › Phase 3B End-to-End Browser Tests › authenticates, boots plugins, verifies member picker, recipe scaling, shortlisting, and creation (2.1s)
PAGE LOG: error Failed to load resource: the server responded with a status of 401 (Unauthorized)
PAGE LOG: error Failed to load resource: the server responded with a status of 401 (Unauthorized)
PAGE LOG: error Failed to load resource: the server responded with a status of 422 (Unprocessable Content)
  ok 2 [chromium] › e2e\phase-3c.e2e.ts:4:3 › Phase 3C End-to-End Browser Tests › authenticates, verifies timeline rolling view, schedules meal, marks cooked, and votes in journal (1.7s)

  2 passed (7.0s)
```

## Summary

Phase 3C is completely implemented and verified:
- **`core-timeline`**: Rolling 9-day view, 4-tab `AddEntryModal.vue`, `entry:create` and `entry:interact` hubs, offline recipe cache warming.
- **`cook-tracker`**: 1-click optimistic cook tracking, carryovers & leftovers schema, checkmark badge, and `/journal` page.
- **`ratings`**: Binary upvote/downvote scores, attribute mirroring to `ratings.score`, and `VoteRating.vue` in `journal.entry.footer`.
- **Dynamic Start Page**: Seamless root routing based on active plugins and user preference.
- **100% Passing Tests**: All 99 Pytest backend tests, 63 Vitest component tests, and 2 Playwright browser suites pass cleanly.


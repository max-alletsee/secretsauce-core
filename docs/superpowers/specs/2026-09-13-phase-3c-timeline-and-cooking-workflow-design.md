# Phase 3C: Timeline & Cooking Workflow (`core-timeline`, `cook-tracker`, `ratings`)

**Status:** Approved  
**Date:** 2026-09-13  
**Architecture Spec Reference:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md` (Sections 4.3, 4.4, 6.7, 7.1, 7.3, 7.4, 7.5, 8.8, 10, 13)

---

## 1. Overview & Goals

Phase 3C delivers the manual household meal scheduling, cooking execution, and feedback loop. It implements three core plugins defined in Section 10 of the SecretSauce Architecture Spec:

1. **`core-timeline`**:
   - Implements the primary meal planning dashboard (`/timeline`).
   - Displays a rolling 9-day anchored timeline (`today - 2` to `today + 6`) with two condensed past days for quick catch-up/reassignment, a prominent "Today" anchor, and six future planning days.
   - Declares intent hubs `entry:create` (add meal with 4 tabs: recipe search, shortlist, AI suggestions hook, custom note/categories) and `entry:interact` (`view-recipe`, `remove`, `move-meal`).
   - Declares slots `timeline.day.footer`, `timeline.entry.badge`, and `timeline.sidebar` (which `shortlist` already binds to).
   - Warms the service worker cache with the current and next week's schedule and recipes on startup and after `schedule:*` SSE events.
   - Introduces dynamic `/` routing and an explicit "Default Start Page" selector in shell Settings.

2. **`cook-tracker`**:
   - Manages meal execution state via SQLite tables `plugin_cook_tracker_leftovers` and `plugin_cook_tracker_carryovers`.
   - Contributes `mark-cooked`, `skip`, and `log-leftover` providers to `entry:interact`.
   - Executes `mark-cooked` with instant 1-click optimistic write through the outbox with client-generated UUIDs, displaying an undo/details toast.
   - Injects a completion status badge into slot `timeline.entry.badge`.
   - Delivers the `/journal` historical cooking log and declares slot `journal.entry.footer`.
   - Provides a `rebuild` command to maintain leftover and carryover references.

3. **`ratings`**:
   - Stores household member upvotes/downvotes (+1/-1) in `plugin_ratings_scores`.
   - Mirrors net scores into `entity_attributes` under attribute `ratings.score` on recipe groups for sorting.
   - Contributes a discrete, optional upvote/downvote component (`VoteRating.vue`) into `journal.entry.footer`.
   - Exposes REST endpoints at `/api/x/ratings` and a `rebuild` command.

---

## 2. Directory Layout

```text
secretsauce/plugins/core/
├── core-timeline/
│   ├── __init__.py                # PLUGIN manifest & setup()
│   ├── ui/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts           # Route /timeline, nav, hubs, slots, cache warming
│   │   │   ├── pages/
│   │   │   │   └── TimelinePage.vue # Rolling 9-day view & day view with navigation
│   │   │   └── components/
│   │   │       ├── MealSlot.vue     # Individual meal slot with entries and "+" trigger
│   │   │       ├── ScheduleCard.vue # Scheduled entry card with badge slot
│   │   │       └── AddEntryModal.vue# Default provider for entry:create (4 tabs)
│   │   └── dist/ -> ui.js
│   └── ui.js
├── cook-tracker/
│   ├── __init__.py                # PLUGIN manifest, setup(), rebuild command
│   ├── migrations/
│   │   └── 0001_initial.sql       # plugin_cook_tracker_leftovers & carryovers tables
│   ├── ui/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts           # Route /journal, nav, entry:interact providers, slots
│   │   │   ├── pages/
│   │   │   │   └── JournalPage.vue  # History of cooked meals, notes, leftovers
│   │   │   └── components/
│   │   │       ├── CookedBadge.vue  # Contributed to timeline.entry.badge
│   │   │       └── CookDetailsModal.vue # Edit cook details, notes, leftovers
│   │   └── dist/ -> ui.js
│   └── ui.js
└── ratings/
    ├── __init__.py                # PLUGIN manifest, /api/x/ratings router, rebuild command
    ├── migrations/
    │   └── 0001_initial.sql       # plugin_ratings_scores table
    ├── ui/
    │   ├── package.json
    │   ├── src/
    │   │   ├── index.ts           # Registers vote component in journal.entry.footer
    │   │   └── VoteRating.vue     # Upvote/downvote component for active member
    │   └── dist/ -> ui.js
    └── ui.js
```

---

## 3. Shell Integration: Dynamic `/` Routing & Settings

### 3.1 Dynamic Landing Route (`shell/src/router.ts`)
The root path `/` evaluates navigation dynamically:
1. Check `localStorage.getItem('secretsauce:default_start_page')`. If set to an explicit route (`/timeline` or `/recipes`), route there.
2. If set to `'auto'` or unconfigured, inspect the active plugin registry: if `core-timeline` is active, redirect to `/timeline`; otherwise fallback to `/recipes`.

### 3.2 General Settings Preference (`shell/src/pages/SettingsPage.vue`)
Under Settings, add a "Default Start Page" selector:
- Options: `Automatic (Timeline when active)` (default), `Timeline`, `Recipes`.
- Selection updates `localStorage.setItem('secretsauce:default_start_page', value)`.

### 3.3 Top Navigation Registry
- `core-timeline`: `ss.nav({ label: "Timeline", icon: "calendar", path: "/timeline", order: 5 })`
- `core-recipes`: `ss.nav({ label: "Recipes", icon: "book", path: "/recipes", order: 10 })` (existing)
- `cook-tracker`: `ss.nav({ label: "Journal", icon: "book-open", path: "/journal", order: 15 })`

---

## 4. `core-timeline` Plugin Specification

### 4.1 Backend Manifest & Lifecycle
- **File:** `secretsauce/plugins/core/core-timeline/__init__.py`
- **Manifest:**
  ```python
  PLUGIN = {
      "id": "core-timeline",
      "name": "Timeline",
      "version": "1.0.0",
      "description": "Rolling household meal timeline, schedule management, and offline cache warming",
      "core": True,
      "ui": "ui.js",
  }

  async def setup(ctx):
      pass
  ```
- Directly leverages the kernel schedule noun repository and `/api/schedule` routes.

### 4.2 Frontend Bundle (`ui/src/index.ts`)
- Registers route `/timeline` (`TimelinePage.vue`).
- Registers navigation `{ label: "Timeline", icon: "calendar", path: "/timeline", order: 5 }`.
- Declares intent hubs:
  - `entry:create`: context `{ date: string, meal_type?: string }` (default provider `manual-add`, order 100).
  - `entry:interact`: context `{ entry: ScheduleEntry }` (provider `view-recipe`, order 10; provider `move-meal`, order 50; provider `remove`, order 999).
  - `timeline:assist`: context `{ from: string, to: string }` (no core providers; extension point for `meal-planner`).
- Declares slots:
  - `timeline.day.footer`: context `{ date: string }`
  - `timeline.entry.badge`: context `{ entry: ScheduleEntry }`
  - `timeline.sidebar`: context `{ from: string, to: string }`

### 4.3 Rolling 9-Day Anchored Timeline (`TimelinePage.vue`)
- **Date Calculation:**
  - Anchor date $D_{anchor}$ defaults to today's date $T$ (YYYY-MM-DD in household local time).
  - Display span: $[D_{anchor} - 2\text{ days}, D_{anchor} + 6\text{ days}]$ (total 9 days).
- **Layout:**
  - **Past 2 Days ($D - 2, D - 1$):** Rendered as compact, condensed day sections. Unlogged meals feature prominent 1-click check-off circles and quick "Move to Today" actions.
  - **Today ($D$):** Visually highlighted with an active badge and distinct background tint.
  - **Future 6 Days ($D + 1$ to $D + 6$):** Standard planning columns showing meals, assigned cooks, servings, and "+" add triggers.
  - **Sidebar:** Renders `<Slot name="timeline.sidebar" :context="{ from, to }" />` on desktop screens, displaying shortlisted recipes for drag/click insertion.
- **Controls:**
  - "Today" button restores $D_{anchor} = T$.
  - "◀" shifts $D_{anchor}$ backward by 7 days; "▶" shifts forward by 7 days.
  - View toggle: switch between Rolling 9-Day View and Single Day View.

### 4.4 Meal Slots & Cards (`MealSlot.vue`, `ScheduleCard.vue`)
- Displays configured household `meal_types` (e.g. Dinner, Lunch) plus any custom meal types present on that date.
- Card shows:
  - Recipe title or custom note.
  - Assigned cook avatar/initials.
  - Servings override badge (if different from recipe default).
  - `<Slot name="timeline.entry.badge" :context="{ entry }" />`.
- Card click or menu triggers `ss.intent('entry:interact', { entry })`.
- Slot "+" button triggers `ss.intent('entry:create', { date, meal_type })`.

### 4.5 Add Entry Dialog (`AddEntryModal.vue`)
Default provider for `entry:create` presents 4 tabs:
1. **Recipe Search:** Live trigram FTS search against `/api/recipes?q=...`, thumbnail preview, and instant add.
2. **Shortlist:** Direct list of active member's shortlisted recipes from `/api/x/shortlist`.
3. **AI Suggestions:** Hook for `timeline:assist` with a fallback placeholder.
4. **Custom Note / Category:** Category chips ("Dining Out", "Leftovers", "Takeout", "Quick Note") with optional notes, assigned cook selection, and servings override.

### 4.6 Move / Reassign Action
In `entry:interact` (order 50: "Move meal..."):
- Offers quick actions: "Move to Today", "Move to Tomorrow", or opens a mini date/meal-type picker.
- Patches the entry via `PATCH /api/schedule/{id}` with `{ revision, date, meal_type, position }`.

### 4.7 Offline Cache Warming (Section 8.8)
- On bundle activation and on every `schedule:*` SSE event:
  - Issues `GET /api/schedule?from={D-2}&to={D+14}` to prime the service worker API cache.
  - For each distinct `recipe_id` in the returned entries, issues `GET /api/recipes/{id}`.
  - Failures (e.g. offline during warm) are caught and ignored.

---

## 5. `cook-tracker` Plugin Specification

### 5.1 Backend Manifest & Schema
- **File:** `secretsauce/plugins/core/cook-tracker/__init__.py`
- **Manifest:**
  ```python
  PLUGIN = {
      "id": "cook-tracker",
      "name": "Cook Tracker",
      "version": "1.0.0",
      "description": "Meal execution tracking, leftovers, carryovers, and cooking journal",
      "schema": 1,
      "core": True,
      "ui": "ui.js",
  }
  ```
- **Migrations (`migrations/0001_initial.sql`):**
  ```sql
  CREATE TABLE plugin_cook_tracker_leftovers (
      schedule_entry_id TEXT PRIMARY KEY REFERENCES schedule_entries(id) ON DELETE CASCADE,
      journal_id TEXT REFERENCES cook_journal(id) ON DELETE CASCADE
  );

  CREATE TABLE plugin_cook_tracker_carryovers (
      journal_id TEXT PRIMARY KEY REFERENCES cook_journal(id) ON DELETE CASCADE,
      servings_left REAL NOT NULL DEFAULT 1,
      resolved_by_entry_id TEXT REFERENCES schedule_entries(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
  );
  ```

### 5.2 Interactions on `entry:interact`
- **`mark-cooked` (order 20):**
  - **1-Click Execution:** Generates client UUID $id_{journal}$.
  - Enqueues `POST /api/journal` via outbox:
    ```json
    {
      "id": "<uuid>",
      "date": "YYYY-MM-DD",
      "meal_type": "dinner",
      "recipe_id": "<uuid_lang>",
      "servings": 2,
      "assigned_cook_id": "<member_id>",
      "schedule_entry_id": "<schedule_entry_id>"
    }
    ```
  - Records link in `plugin_cook_tracker_leftovers`.
  - Shows toast: *"Marked as cooked! [Add details / Leftovers] [Undo]"*.
  - Clicking "[Add details / Leftovers]" opens `CookDetailsModal.vue`.
  - Clicking "[Undo]" deletes the journal entry.
- **`log-leftover` (order 40):**
  - Marks cooked and prompts for servings left over, creating a record in `plugin_cook_tracker_carryovers`.
  - Available carryovers are exposed to `core-timeline`'s `AddEntryModal.vue` under the "Leftovers" category. When a leftover is scheduled, `resolved_by_entry_id` is linked.
- **`skip` (order 30):**
  - Confirms and deletes or moves the entry.

### 5.3 Badge Contribution (`CookedBadge.vue`)
- Injected into `timeline.entry.badge` (order 10).
- Displays a green checkmark if the entry is marked cooked in `plugin_cook_tracker_leftovers`.
- On condensed past days, uncompleted entries display a clickable check circle button to mark cooked instantly.

### 5.4 Journal Page (`JournalPage.vue`)
- Route: `/journal`
- Nav: `{ label: "Journal", icon: "book-open", path: "/journal", order: 15 }`
- Groups meals by month and week in descending chronological order.
- Displays cook avatar, recipe title/note, servings, leftovers status, and cook notes.
- Declares slot `<Slot name="journal.entry.footer" :context="{ entry }" />`.

### 5.5 Rebuild Command
- Implements command `rebuild` to clean orphaned rows in `plugin_cook_tracker_leftovers` and `plugin_cook_tracker_carryovers`.

---

## 6. `ratings` Plugin Specification

### 6.1 Backend Manifest & Schema
- **File:** `secretsauce/plugins/core/ratings/__init__.py`
- **Manifest:**
  ```python
  PLUGIN = {
      "id": "ratings",
      "name": "Ratings",
      "version": "1.0.0",
      "description": "Household member meal votes (upvote/downvote) and recipe rating indexing",
      "schema": 1,
      "core": True,
      "ui": "ui.js",
  }
  ```
- **Migrations (`migrations/0001_initial.sql`):**
  ```sql
  CREATE TABLE plugin_ratings_scores (
      journal_id TEXT NOT NULL REFERENCES cook_journal(id) ON DELETE CASCADE,
      member_id TEXT NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
      score INTEGER NOT NULL CHECK (score IN (-1, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
      PRIMARY KEY (journal_id, member_id)
  );
  ```

### 6.2 REST Endpoints (`/api/x/ratings`)
- `GET /api/x/ratings?journal_id={id}`:
  - Returns `{"scores": [{"member_id": "...", "score": 1}], "net_score": 1, "my_score": 1}`.
- `PUT /api/x/ratings`:
  - Body: `{"journal_id": "...", "member_id": "...", "score": 1 | -1}`.
  - Sets or updates vote. Recalculates recipe attribute `ratings.score`.
- `DELETE /api/x/ratings?journal_id={id}&member_id={id}`:
  - Removes vote. Recalculates recipe attribute `ratings.score`.

### 6.3 Mirrored Attribute (`ratings.score`)
- On vote mutation or journal deletion:
  - Looks up `recipe_id` on the journal row. If present, resolves `group_id`.
  - Calculates net score: $\sum \text{score}$ across all journal entries belonging to that recipe group.
  - Updates `entity_attributes` for `entity_type = 'recipe'`, `entity_id = group_id`, `name = 'ratings.score'`. If count is 0, deletes the attribute.
  - Enables `GET /api/recipes?attr=ratings.score&sort=-ratings.score`.

### 6.4 Rebuild Command
- Scans all ratings in `plugin_ratings_scores` grouped by recipe group and repopulates `entity_attributes`.

### 6.5 Frontend Vote Component (`VoteRating.vue`)
- Contributed to `journal.entry.footer` (order 10).
- Renders two subtle icon buttons: 👍 (+1) and 👎 (-1).
- Active member can toggle upvote or downvote. Clicking the active choice clears the vote.
- Completely optional, clean, and unobtrusive.

---

## 7. Error Handling, Offline Resilience & State Management

- **Outbox Ingestion:** All schedule entries and journal records generated on the client provide a UUID v4 `id`.
- **409 Conflict:** If a schedule entry was already logged as cooked on another device, `POST /api/journal` returns 409 Conflict with the existing journal row. The client updates its local state without erroring.
- **Foreign Key Cascades:** Deleting a recipe or schedule entry automatically cleans up associated leftovers, carryovers, and ratings without orphan rows.
- **Service Worker Caching:** Responses from `/api/schedule` and `/api/journal` pass through the service worker cache, allowing full read and browse functionality when offline.

---

## 8. Verification & Test Plan

### 8.1 Backend Tests (`uv run pytest`)
- `tests/test_plugin_timeline.py`: Range queries for rolling 9-day window, repositioning, and deletion.
- `tests/test_plugin_cook_tracker.py`: Schema migrations, 1-click mark-cooked flow, outbox conflict handling, leftovers/carryovers tables, and `rebuild` command.
- `tests/test_plugin_ratings.py`: Upvote/downvote operations, net score calculation, `ratings.score` attribute mirroring, recipe list sorting by rating, and `rebuild` command.

### 8.2 Frontend Tests (`pnpm --prefix shell test`)
- `tests/plugins/timeline-page.spec.ts`: Rolling 9-day view rendering (2 compact past days, today, 6 future days), date shift navigation, and slot triggers.
- `tests/plugins/add-entry-modal.spec.ts`: 4-tab switching (search, shortlist, AI suggestions hook, custom note/categories).
- `tests/plugins/cook-tracker.spec.ts`: 1-click mark-cooked, undo toast, and badge injection into `timeline.entry.badge`.
- `tests/plugins/vote-rating.spec.ts`: Upvote/downvote click toggling in `journal.entry.footer`.
- `src/router.spec.ts`: Dynamic `/` redirection based on active plugins and settings preference.

### 8.3 Bundle & E2E Verification
- `pnpm --prefix shell build:plugins`:
  - `secretsauce/plugins/core/core-timeline/ui/dist/ui.js`
  - `secretsauce/plugins/core/cook-tracker/ui/dist/ui.js`
  - `secretsauce/plugins/core/ratings/ui/dist/ui.js`
- `pnpm --prefix shell test`: All Vitest suites pass green.
- `uv run pytest`: All Pytest suites pass green.

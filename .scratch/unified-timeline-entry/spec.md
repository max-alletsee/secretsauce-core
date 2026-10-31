# Unified Timeline Entry and Timeline View

**Status:** ready-for-agent

## Problem Statement

Household members currently have to navigate between two separate top-level views—the **Timeline** and the Journal—backed by two separate kernel nouns and REST APIs just to complete a single meal workflow. A member plans a meal on the **Timeline**, marks it as cooked on the **Timeline**, and then must leave the **Timeline** and open a separate Journal view to see cooked servings, read notes, or cast a thumbs-up/down **Rating**. Meanwhile, the **Timeline** view already fetches both datasets over the network only to discard everything from the cooking record except a boolean cooked flag. Maintaining two overlapping models (with duplicate fields for notes, servings, and member attribution) and an extra plugin (`core-cook-tracker`) with unused database tables and stubbed menu items creates unnecessary UI friction and architectural complexity.

## Solution

Unify meal planning, execution tracking, and post-meal feedback into a single **Timeline Entry** domain concept and a single **Timeline** view (`ADR-0001`):

1. **Single Kernel Noun and API:** Replace the split schedule and journal tables, repositories, routes, and event streams with a single **Timeline Entry** noun (`timeline_entries` table, `/api/timeline` REST endpoint, `timeline` kernel/plugin repository, and `timeline:created|updated|deleted` events) carrying `status: 'planned' | 'cooked'` and unified `note` and `servings_override` fields, with no backwards-compatibility shims.
2. **Retire `core-cook-tracker` and Journal Page:** Remove the `core-cook-tracker` plugin and the `/journal` route and navigation item. Fold the cooked status badge and the **Mark as cooked** / **Unmark as cooked** actions directly into `core-timeline`.
3. **Inline Ratings on Cooked Timeline Entries:** Re-key `core-ratings` to reference `timeline_entry_id` and render the member **Rating** controls inline in the `timeline.entry.footer` slot on any **Timeline Entry** card whose `status` is `'cooked'`.
4. **Improved Past-Day History Browsing:** Keep past days collapsed by default into summary lines (prefixing cooked meals with `✓`), expand them into full day cards with inline **Ratings** when clicked, step backward 4 days at a time (`"Show 4 earlier days"`), and default newly added meals on past days (`date < today`) to `status: 'cooked'`.

## User Stories

1. As a household member, I want a single **Timeline** view in the main navigation without a separate Journal tab, so that I have one place to plan upcoming meals, track what was cooked, and review past meals.
2. As a household member, I want to add a recipe or note to a **Meal Slot** on today or a future date, so that it is created as a `'planned'` **Timeline Entry**.
3. As a household member, I want to expand a past day (`date < today`) on the **Timeline** and add a recipe or note I forgot to schedule, so that it is automatically recorded with `status: 'cooked'` without requiring an extra step to mark it cooked.
4. As a household member, I want to click a `'planned'` **Timeline Entry** on the **Timeline** and choose **"Mark as cooked"**, so that its `status` updates to `'cooked'` via the offline-capable outbox and records the cooking member.
5. As a household member, I want to click a `'cooked'` **Timeline Entry** on the **Timeline** and choose **"Unmark as cooked"**, so that I can revert an accidental click back to `status: 'planned'` and clear `cooked_by_member_id`.
6. As a household member, I want to see a **"Cooked"** badge on any **Timeline Entry** card whose `status` is `'cooked'`, so that I can immediately tell which meals on a day card have been prepared.
7. As a household member, I want to see a `✓` indicator next to cooked meals in the collapsed summary line of past days on the **Timeline**, so that I can scan past days at a glance and see what was actually cooked.
8. As a household member, I want to click a collapsed past-day summary line on the **Timeline**, so that the full day card expands inline to show all **Meal Slots**, **Timeline Entries**, notes, servings, and **Ratings**.
9. As a household member, I want to click **"Show 4 earlier days"** at the top of the **Timeline**, so that the **Timeline** window extends backward by 4 days at a time to browse earlier cooking history.
10. As a household member, I want to see thumbs-up and thumbs-down **Rating** buttons directly in the footer of any `'cooked'` **Timeline Entry** card on the **Timeline**, so that I can rate a meal without leaving the **Timeline**.
11. As a household member, I want `'planned'` **Timeline Entry** cards to omit the **Rating** controls in their footer, so that future meal planning cards remain compact and uncluttered.
12. As a household member, I want to click the upvote or downvote **Rating** button on a `'cooked'` **Timeline Entry** card without opening the meal's `entry:interact` action menu, so that rating a meal does not trigger unintended popups.
13. As a household member, I want my upvote or downvote on a `'cooked'` **Timeline Entry** to update the net score on the card and mirror the aggregated score onto the underlying recipe group (`core-ratings.score`), so that recipes can still be sorted by household favorites.
14. As a household member, I want clicking my active upvote or downvote button again on a `'cooked'` **Timeline Entry** to remove my **Rating**, so that I can undo or clear my vote.
15. As a household member, I want the shopping list aggregator (`core-shopping-list`) to only include ingredients from **Timeline Entries** whose `status` is `'planned'` within the selected date range, so that I do not buy ingredients again for meals that have already been cooked.
16. As a household member, I want recurring meal rules (`core-recurring`) and AI meal suggestions (`core-meal-planner-ai`) to create `'planned'` **Timeline Entries** in the unified **Timeline** store, so that automated and assisted scheduling continue to work seamlessly.
17. As a household member, I want deleting an extra **Meal Slot** with `with_entries=true` to delete its associated **Timeline Entries** in a single transaction, so that slot cleanup remains atomic.
18. As a household member, I want the **Timeline** to automatically refresh when `timeline:created`, `timeline:updated`, `timeline:deleted`, or `core-timeline:slots-changed` events arrive over the SSE stream, so that changes made by other household members appear live without reloading the page.
19. As a household member, I want the **Timeline** plugin to warm the offline cache with **Timeline Entries** and their referenced recipes for `today - 2` through `today + 14` on startup and after `timeline:*` events, so that I can browse my plan and recipes while offline.
20. As a household administrator exporting household data as JSON, I want the export payload to contain a single `timeline_entries` collection instead of separate schedule and journal arrays, so that backups reflect the unified domain model.

## Implementation Decisions

### 1. Kernel Schema and Noun Consolidation (`timeline_entries`)
- Replace the `schedule_entries` and `cook_journal` tables in the kernel schema with a single `timeline_entries` table indexed by `date`.
- `timeline_entries` columns:
  - `id` (primary key, client-supplied UUID or server-generated UUID v4)
  - `revision` (integer, optimistic concurrency counter starting at `1`)
  - `date` (ISO `YYYY-MM-DD` calendar date, required)
  - `meal_type` (non-empty string up to 64 chars identifying the **Meal Slot**, required)
  - `entry_type` (`'recipe'` or `'note'`, defaults to `'recipe'`)
  - `recipe_id` (foreign key referencing `recipes(id) ON DELETE SET NULL`, nullable)
  - `title` (string, nullable)
  - `note` (string, nullable — single unified note field for both planning and post-cook notes)
  - `servings_override` (positive float, nullable — single unified servings field)
  - `position` (integer, defaults to `0`)
  - `assigned_cook_id` (foreign key referencing `household_members(id) ON DELETE SET NULL`, nullable)
  - `participant_member_ids` (JSON array of member IDs, defaults to `'[]'`)
  - `status` (`'planned'` or `'cooked'`, defaults to `'planned'`)
  - `cooked_by_member_id` (foreign key referencing `household_members(id) ON DELETE SET NULL`, nullable)
  - `created_at`, `updated_at` (ISO UTC timestamps)
  - `actor_member_id` (nullable string), `origin` (string, defaults to `'member'`)
- Replace the kernel `schedule` and `journal` repositories with a single `timeline` repository exposed as `kernel.timeline` and `ctx.timeline`.
- Emit transactional noun events `timeline:created`, `timeline:updated`, and `timeline:deleted` with `entity_type = "timeline_entry"`.
- When a `timeline_entry` is deleted, cascade-delete its `assets` and `entity_attributes` rows where `entity_type = 'timeline_entry'`.
- When a household member is deleted, remove their ID from `timeline_entries.participant_member_ids` in addition to the `ON DELETE SET NULL` foreign keys on `assigned_cook_id` and `cooked_by_member_id`.
- Update the JSON interop export (`/api/export/json`) to return `timeline_entries` in place of `schedule_entries` and `cook_journal`.

### 2. REST API Contract (`/api/timeline`)
- Replace `/api/schedule` and `/api/journal` with `/api/timeline`:
  - `GET /api/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD&lang=&sort=date,position`: requires `from` and `to` (ordered ISO dates at most 62 days apart), returns `Timeline Entry` rows ordered by `date ASC, position ASC` with each row's resolved `recipe` embedded.
  - `POST /api/timeline`: creates a `Timeline Entry` (`date` and `meal_type` required; `status` optional, validated to `'planned' | 'cooked'`, defaulting to `'planned'`). Returns `201 Created`, or `409 Conflict` if `id` already exists.
  - `GET /api/timeline/{entry_id}?lang=`: returns a single `Timeline Entry` with its embedded `recipe`.
  - `PATCH /api/timeline/{entry_id}`: requires `revision` (`409 Conflict` on mismatch) and updates any subset of mutable fields (`date`, `meal_type`, `entry_type`, `recipe_id`, `title`, `note`, `servings_override`, `position`, `assigned_cook_id`, `participant_member_ids`, `status`, `cooked_by_member_id`).
  - `DELETE /api/timeline/{entry_id}?revision=`: deletes the entry with optimistic revision check and returns `204 No Content`.

### 3. Plugin Consolidation: Retire `core-cook-tracker` into `core-timeline`
- Remove the `core-cook-tracker` plugin directory, its unused leftover/carryover migration tables, its `rebuild` command, and its `/journal` route and navigation item.
- In `core-timeline`:
  - Register `CookedBadge` on the `timeline.entry.badge` slot (`order: 10`), displaying a success `"Cooked"` tag when `entry.status === 'cooked'`.
  - Register a headless `entry:interact` provider (`id: 'toggle-cooked'`, `order: 20`) available whenever `context.entry` is present:
    - When `entry.status !== 'cooked'`, title is `"Mark as cooked"`, icon is `'check'`, and execution enqueues `PATCH /api/timeline/{entry.id}` through `ss.outbox` with `{ revision: entry.revision, status: 'cooked', cooked_by_member_id: entry.assigned_cook_id || ss.store.currentMember.value?.id ?? null }`, optimistically setting `entry.status = 'cooked'` and `entry.revision += 1`.
    - When `entry.status === 'cooked'`, title is `"Unmark as cooked"`, icon is `'undo'`, and execution enqueues `PATCH /api/timeline/{entry.id}` through `ss.outbox` with `{ revision: entry.revision, status: 'planned', cooked_by_member_id: null }`, optimistically setting `entry.status = 'planned'`, `entry.cooked_by_member_id = null`, and `entry.revision += 1`.
  - Remove the stubbed `"Skip meal"` and `"Log leftovers"` providers.
  - Update `TimelinePage` to fetch only `/api/timeline` and `/api/x/core-timeline/slots` (eliminating the extra `/api/journal` request) and subscribe to `timeline:created|updated|deleted` and `core-timeline:slots-changed`.
  - Update offline cache warming in `core-timeline` to fetch `/api/timeline` and listen to `timeline:created|updated|deleted`.
  - Update `TimelineSlotsService` (`core-timeline` backend) to query and delete entries via `ctx.timeline`.

### 4. Timeline Card Structure & Inline Ratings (`core-ratings`)
- Restructure the **Timeline Entry** card component so that the primary interactive area triggers `entry:interact`, while a dedicated footer area renders `<Slot v-if="entry.status === 'cooked'" name="timeline.entry.footer" :context="{ entry }" />` outside or isolated from the menu-opening click handler so clicking footer controls never opens the `entry:interact` popup menu.
- In `core-ratings`:
  - Update `plugin_core_ratings_scores` schema to use `timeline_entry_id TEXT NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE` as part of its primary key `(timeline_entry_id, member_id)`.
  - Update `/api/x/core-ratings` (`GET`, `PUT`, `DELETE`) and score mirroring to accept `timeline_entry_id` instead of `journal_id`, joining `timeline_entries` to `recipes` to mirror `core-ratings.score` on the recipe `group_id`.
  - Mount `VoteRating` into the `timeline.entry.footer` slot (`order: 10`), reading `props.context?.entry?.id` as `timeline_entry_id` and only rendering/fetching when `props.context?.entry?.status === 'cooked'`.

### 5. Past-Day UX and Other Core Plugins
- **Past-day pagination:** Change the backward window button on the **Timeline** from 2 days to 4 days (`"Show 4 earlier days"`, shifting `windowDates.from` by `-4`).
- **Past-day summary line:** In the collapsed past-day summary text, prefix any entry whose `status === 'cooked'` with `✓ ` (e.g., `✓ DINNER Grandma's Tomato Pasta`) so cooked meals are distinguishable before expanding the day.
- **Adding entries on past days:** When `AddEntryDialog` posts to `/api/timeline`, set `status: 'cooked'` (and `cooked_by_member_id: ss.store.currentMember.value?.id ?? null`) if `props.date < localToday()`, and `status: 'planned'` otherwise.
- **`core-shopping-list`:** Query `ctx.timeline.list_entries(from_date=from_date, to_date=to_date)` and skip entries where `entry.get("status") == "cooked"` so only `'planned'` meals contribute ingredients to the shopping list.
- **`core-recurring` & `core-meal-planner-ai`:** Create entries through `ctx.timeline.create_entry(...)` instead of `ctx.schedule.create_entry(...)`.

## Testing Decisions

- **Good tests verify observable external behavior at high seams:** Tests must exercise real HTTP routes, real SQLite transactions/events, and mounted Vue views/routers rather than calling internal helpers or faking kernel events.
- **End-to-End Browser Tests (Playwright):**
  - Update the E2E suite (`phase-3c.e2e.ts`, `ui-plugins.e2e.ts`, `ui-theme-smoke.e2e.ts`) to run the full workflow on `/timeline`: scheduling a meal, marking it cooked via the meal action menu, verifying the `"Cooked"` badge and inline **Rating** controls appear on the **Timeline Entry** card, casting and toggling member votes without opening the action menu, and expanding past days.
- **Backend HTTP & Lifespan Tests (Pytest):**
  - Replace schedule/journal API and repository tests with `/api/timeline` and `TimelineRepo` tests covering CRUD, `status` transitions (`'planned'` ↔ `'cooked'`), 62-day range validation, revision conflict handling (`409`), `timeline:*` event emission, recipe/member deletion cascades, and `/api/export/json`.
  - Update `core-ratings`, `core-shopping-list` (verifying `'cooked'` entries are excluded from ingredient aggregation), `core-timeline` slots, `core-recurring`, and `core-meal-planner-ai` backend tests to use `/api/timeline` and `timeline_entry_id`.
  - Remove `test_plugin_cook_tracker.py` and verify `core-cook-tracker` is no longer in the active plugins list.
- **Frontend Component & Plugin Contract Tests (Vitest):**
  - Update `core-plugin-contracts.spec.ts`, `phase-3c-components.spec.ts`, `timeline.spec.ts`, and `core-ratings.spec.ts` to test the unified `/timeline` route, `timeline.entry.footer` slot, `toggle-cooked` outbox `PATCH /api/timeline/{id}` requests, `"Show 4 earlier days"` pagination, `✓` cooked indicators on collapsed past days, and `status: 'cooked'` default when adding a meal on a past date.

## Out of Scope

- Backwards-compatibility aliases or redirects for `/api/schedule`, `/api/journal`, or the `/journal` frontend route.
- Leftover and carryover tracking tables or workflows (`plugin_core_cook_tracker_leftovers`, `plugin_core_cook_tracker_carryovers`).
- Drag-and-drop reordering of **Timeline Entries** across **Meal Slots** or days.

## Further Notes

- Remember to rebuild both the core plugin bundles (`pnpm --prefix shell build:plugins`) and the frontend shell (`pnpm --prefix shell build`) after modifying the plugin UI packages so that static assets and E2E tests run against the compiled bundles.
- Update `docs/CORE_PLUGINS.md` and `docs/API_REFERENCE.md` during implementation so repository documentation stays aligned with `GLOSSARY.md` and `ADR-0001`.

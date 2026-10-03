# SecretSauce REST API Reference

All API routes are served under `/api` with prefix `/api/`. All responses automatically include `Cache-Control: no-store` unless explicitly specified.

---

## 1. Authentication & Common Headers

### Headers
| Header | Description |
|---|---|
| `Cookie: ss_session=<token>` | Session cookie set by setup, login and passphrase rotation. Required by every kernel route and by plugin routes mounted with `auth="cookie"`. |
| `Authorization: Bearer <ss_tok_...>` | API token issued by a plugin. Accepted only on that plugin's routes mounted with `auth="token"` (the token's scope must equal the route's) and on `GET /api/auth/session`. Everywhere else it answers 401. |
| `X-Actor-Member: <member_id>` | Attributes writes to a household member. Ignored unless the id exists. Bodies cannot set `actor_member_id` or `origin`. |
| `Sec-Fetch-Site` | A cookie-authenticated request with value `cross-site` is rejected with 403. |
| `Last-Event-ID: <seq>` | Replay position for `GET /api/events/stream`. |

Before setup, every route except `/api/health` and `/api/setup` answers `409 setup_required`. While the server is still booting, `/api` routes answer `503 unavailable`.

### Error Envelope
Every error, including validation errors, unknown routes and unhandled exceptions, uses one shape:
```json
{
  "error": {
    "code": "conflict",
    "message": "Revision mismatch",
    "details": {"current": {"id": "…", "revision": 3}}
  }
}
```

| Status | `code` | Notes |
|---|---|---|
| 401 | `unauthorized` | Missing, invalid, expired or revoked session or token. |
| 403 | `forbidden` | Cross-site request with a session cookie. |
| 404 | `not_found` | Unknown resource or route. |
| 405 | `method_not_allowed` | |
| 409 | `conflict` | Revision mismatch or duplicate id; `details.current` is the stored row. |
| 409 | `setup_required` | The household is not set up yet. |
| 413 | `payload_too_large` | Upload or fetched page over its limit. |
| 422 | `validation` | `details.fields` maps each invalid field to a message. |
| 422 | `veto` | A plugin's pre-commit hook refused the write; `details.plugin_id` names it. |
| 429 | `too_many_requests` | Login or passphrase rotation after recent failures; `Retry-After` gives the wait in seconds. |
| 500 | `plugin_error` | Unhandled exception in a plugin route; `details.plugin_id` names it. |
| 500 | `internal_error` | Unhandled kernel exception. |
| 503 | `unavailable` | Server still booting, or a required service (such as AI) is not available. |

---

## 2. System & Health Endpoints

### `GET /api/health`
Returns system status, boot ID, and kernel version.
- **Status:** `200 OK`
- **Response:**
  ```json
  {
    "ok": true,
    "status": "ok",
    "boot_id": "99645eb445944111be07c87c541ea3fe",
    "version": "0.1.0"
  }
  ```

### `GET /api/export`
Generates and downloads a complete system backup as a zip file.
- **Status:** `200 OK`
- **Headers:** `Content-Type: application/zip`, `Content-Disposition: attachment; filename="secretsauce-backup.zip"`
- **Contents:** `secretsauce.db` (hot `VACUUM INTO` copy), `uploads/`, `plugins/`, `site/`, `config.json`.
- **System Restoration:** To restore a generated backup archive into an instance, execute:
  `uv run secretsauce restore <backup.zip> [--data-dir /path/to/data]`

### `GET /api/export/json`
Exports all kernel nouns as a JSON payload for interop.
- **Status:** `200 OK`
- **Response Keys:** `recipes`, `schedule_entries`, `cook_journal`, `household_members`, `assets`, `household_config`.

---

## 3. Setup & Auth Endpoints

### `GET /api/setup`
Whether initial household setup is required. No authentication.
- **Response:** `{"needs_setup": false, "setup_required": false}`

### `POST /api/setup`
Initializes the household in one transaction: configuration, passphrase and first member all succeed or none do. Answers `409 conflict` once a passphrase exists.
- **Request:**
  ```json
  {
    "household_name": "My Home",
    "passphrase": "at least 8 characters",
    "first_member": {"name": "Alex", "color": "#3b82f6", "preferred_language": "en"},
    "languages": {"primary": "en"},
    "units": "metric",
    "meal_types": [{"id": "dinner", "label": "Dinner"}]
  }
  ```
  `first_member.color` becomes the member's `avatar_color`. `languages`, `units` and `meal_types` are optional.
- **Status:** `201 Created`, `{"household_name", "first_member": Member}`; sets `ss_session`. `422 validation` for a passphrase shorter than 8 characters.

### `POST /api/auth/login`
- **Request:** `{"passphrase": "…"}`
- **Status:** `200 OK` `{"status": "ok"}` and sets `ss_session`; `401 unauthorized` for a wrong passphrase; `429 too_many_requests` with `Retry-After` while the client is throttled (after `n` consecutive failures, `min(2^(n-1), 60)` seconds).
- The cookie is `HttpOnly`, `SameSite=Lax`, valid 30 days; `Secure` follows `COOKIE_SECURE` (`auto`: when the request is https).

### `GET /api/auth/session`
Describes the caller's authentication. Accepts the session cookie or a bearer token.
- **Response:** `{"authenticated": true, "logged_in": true, "auth": "cookie" | "token", "plugin_id": <token's plugin or null>, "actor_member_id", "boot_id", "version"}`; `401` without valid credentials.

### `POST /api/auth/logout`
Revokes the session server-side (the same cookie no longer works anywhere) and clears the cookie.
- **Status:** `200 OK` `{"status": "ok"}`

---

## 4. Household Endpoints

### `GET /api/household`
Returns the household configuration.
- **Response:**
  ```json
  {
    "household_name": "My Home",
    "meal_types": [
      {"id": "breakfast", "label": "Breakfast"},
      {"id": "lunch", "label": "Lunch"},
      {"id": "dinner", "label": "Dinner"}
    ],
    "languages": {"primary": "en"},
    "units": "metric",
    "passphrase_version": 1
  }
  ```

### `PATCH /api/household`
Updates any subset of `household_name`, `meal_types`, `languages`, `units` (`metric` or `us_customary`).
- **Status:** `200 OK` with the full configuration.
- **Meal-slot validation (also for setup):** if supplied, `meal_types` must be a non-null, nonempty array with unique ids. Ids match `^[a-z0-9][a-z0-9-]{0,63}$`; labels are 1–64 characters. Invalid values return `422 validation` with field details. Omitting `meal_types` preserves the current/default configuration. Order is display order; renaming a label does not change its stable id. Schedule/journal `meal_type` remains a free string for legacy entries.

### `PUT /api/household/passphrase`
Rotates the household passphrase, increments `passphrase_version`, invalidates all existing sessions, and sets a fresh cookie.
- **Request:** `{"current": "current passphrase", "new": "new passphrase, at least 8 characters"}`
- **Status:** `204 No Content` with a fresh cookie; `401` if `current` is wrong; `429` with `Retry-After` after recent failures (shared with login); `422` if `new` is too short.

---

## 5. Members Endpoints

### `GET /api/members`
Lists household members.
- **Query Parameters:** `sort=name` (optional)
- **Response:** `[Member, ...]`

### `POST /api/members`
Creates a new member.
- **Request:**
  ```json
  {
    "name": "Sarah",
    "avatar_color": "#FF5733",
    "serving_ratio": 1.0,
    "dietary_restrictions": ["vegetarian"],
    "allergies": ["peanuts"],
    "preferred_language": "en"
  }
  ```
- **Status:** `201 Created`

### `PATCH /api/members/{id}`
Updates a member. Requires current `revision` for optimistic concurrency.
- **Request:**
  ```json
  {
    "revision": 1,
    "name": "Sarah J."
  }
  ```
- **Status:** `200 OK` (or `409 Conflict` if revision mismatch)

### `DELETE /api/members/{id}`
Deletes member and cascades unlinking from schedules and journals.
- **Status:** `204 No Content`; `404 not_found` for a missing member, `409 conflict` when deleting the final household member (`details.current` is that member). The count and deletion are checked in one transaction, including concurrent requests.

The browser derives avatar colors from member ids and does not offer a color picker. Existing `avatar_color` data/API writes remain supported.

---

## 6. Recipes Endpoints

Request bodies for members, recipes, schedule and journal are validated: wrong types answer `422 validation` with `details.fields`, unknown keys are ignored (so a fetched row can be sent back), and `origin`/`actor_member_id` in a body are ignored. `PATCH` bodies require `revision`.

### `GET /api/recipes`
One recipe per group, resolved into `lang`: the row in that language, else the household's primary language, else the oldest row. Filters and sorting apply to the resolved row.
- **Query Parameters:**
  - `lang`: Language to resolve into (default: primary language).
  - `q`: Search. Three or more characters use trigram full-text search over `lang` and the primary language, in rank order; shorter terms match titles with `LIKE`, sorted by title.
  - `tag` (repeatable): The resolved row must carry every tag.
  - `attr` (repeatable): Attribute filter `<plugin_id>.<key><op><value>` with `op` in `= != < <= > >=`; numeric values compare against numbers, others against text. Filters combine with AND. A malformed filter answers 422.
  - `sort`: Comma-separated `title`, `created_at`, `updated_at` or `<plugin_id>.<key>`, each optionally prefixed with `-`. Attribute sorts put recipes without the attribute last.
  - `limit` (1–200, default 50), `offset`.
- **Response:** `{"items": [Recipe], "total": <matching groups>, "limit", "offset"}`; each recipe carries `languages`.

### `POST /api/recipes`
Creates a recipe, or adds a language row when `group_id` names an existing recipe.
- **Request:**
  ```json
  {
    "group_id": "optional-client-chosen-id",
    "language": "en",
    "title": "Vegetable Stir Fry",
    "description": "Quick stir fry with vegetables",
    "ingredients": [{"raw_text": "1 bell pepper", "name": "Bell Pepper", "quantity": 1.0, "unit": "pcs"}],
    "steps": [{"instruction": "Slice pepper and stir fry on high heat"}],
    "tags": ["dinner", "vegan"],
    "prep_time_minutes": 10,
    "cook_time_minutes": 10,
    "servings": 2
  }
  ```
  `title` and `language` are required. A `group_id` is 1–64 letters, digits or `-`; the row id is `<group_id>_<language>`.
- **Status:** `201 Created`; `409 conflict` if that row exists; `422 veto` if a plugin hook refuses it.

### `GET /api/recipes/{id}`
`{id}` is a row id (`<group_id>_<language>`), which returns exactly that row, or a group id, which returns the row resolved by `?lang=`.

### `PATCH /api/recipes/{id}`
Updates one row. Body: `{"revision": n, ...fields}`. `409 conflict` on a stale revision.

### `DELETE /api/recipes/{id}`
- Row id with `?revision=`: deletes that language row; references to it are re-pointed to the primary-language or oldest remaining row. Deleting the last row deletes the recipe.
- Group id: deletes every row of the recipe, with its assets and attributes.
- **Status:** `204 No Content`. Each deleted row emits one `recipe:deleted` event.

---

## 7. Schedule & Cook Journal Endpoints

### `GET /api/schedule`
Entries between `from` and `to` (inclusive, `YYYY-MM-DD`, at most 62 days apart), ordered by date and position, each with its `recipe` embedded.

### `POST /api/schedule`
- **Request:**
  ```json
  {
    "date": "2026-09-15",
    "meal_type": "dinner",
    "recipe_id": "rec-123_en",
    "title": null,
    "note": "Early dinner",
    "servings_override": 4,
    "position": 0,
    "assigned_cook_id": "mem_alex",
    "participant_member_ids": ["mem_alex"]
  }
  ```
  `date` and `meal_type` are required.
- **Status:** `201 Created`. `PATCH /api/schedule/{id}` takes `{"revision", ...fields}`; `DELETE /api/schedule/{id}?revision=` deletes.

### `GET /api/journal`
- **Query Parameters:** `from` (default 30 days ago), `to` (default today), `lang`, `sort`.
- **Response:** Array of journal entries with `recipe` embedded.

### `POST /api/journal`
Logs a cooked meal, optionally for a schedule entry (one journal entry per schedule entry).
- **Request:**
  ```json
  {
    "date": "2026-09-15",
    "meal_type": "dinner",
    "recipe_id": "rec-123_en",
    "schedule_entry_id": "sched_456",
    "status": "cooked",
    "servings_cooked": 4,
    "servings_left": 1,
    "cooked_by_member_id": "mem_alex",
    "notes": "Great"
  }
  ```
- **Status:** `201 Created`; `409 conflict` if the schedule entry already has one. `PATCH` and `DELETE` work as for the schedule.

---

## 8. Assets & Attributes Endpoints

### `POST /api/assets`
Uploads a file (`multipart/form-data`).
- **Form Fields:** `file`, `entity_type` (`recipe`, `member`, `schedule_entry`, `journal`), `entity_id`, optional `sub_id` (e.g. a step id) and `slot` (default `primary`).
- **Rules:** At most 20 MB (`413 payload_too_large`, checked while reading). Allowed types are JPEG, PNG, WebP and PDF plus any a plugin allowed; the file's leading bytes must match the declared type (`422 validation` otherwise). The stored file's extension comes from the type, never from the client's filename, and the filename is reduced to its base name.
- **Status:** `201 Created` with the asset row.

### `GET /api/assets?entity_type=&entity_id=` / `GET /api/assets/{id}`
The assets of an entity, or one asset row.

### `GET /api/assets/{id}/file`
The file, with `Cache-Control: private, max-age=31536000, immutable` and `X-Content-Type-Options: nosniff`. Images and PDFs are served `inline`; any other type as an `attachment`.

### `DELETE /api/assets/{id}`
Deletes the row; the file is removed once the deletion commits.

### `GET /api/attributes`
All plugins' attributes of an entity.
- **Query Parameters:** `entity_type`, `entity_id`.
- **Response:** `{"<plugin_id>.<key>": value, ...}`

---

## 9. Plugins & Background Jobs Endpoints

### `GET /api/plugins`
Every discovered plugin as a plain list: `id`, `version`, `state` (`active`, `disabled`, `blocked`, `errored`), `enabled`, `error` (traceback or blocking reason), `applied_schema`, `config` (secrets masked as `••••••••`), manifest fields, and `commands` (`[{"id", "title"}]`).

### `GET /api/plugins/active`
Active plugins with frontend bundle URLs. The URLs include `BASE_PATH` and a content version, so the shell can cache them immutably.
```json
[
  {
    "id": "core-recurring",
    "name": "core-recurring",
    "version": "1.0.0",
    "state": "active",
    "ui_entry": "/api/plugins/core-recurring/ui.js?v=3f9c2a1b7d4e5f60",
    "ui_css": null
  }
]
```

### `GET /api/plugins/{id}/ui.js` / `GET /api/plugins/{id}/ui.css`
The plugin's bundle, only while the plugin is active.
- **Headers:** `ETag: "<sha256>"` (`304 Not Modified` for a matching `If-None-Match`). With `?v=` the response is `Cache-Control: public, max-age=31536000, immutable`, otherwise `no-cache`.

### `GET /api/plugins/{id}`
One plugin, in the same shape as the list.

### `POST /api/plugins/{id}/enable` / `POST /api/plugins/{id}/disable`
Take effect immediately, without a restart. Disabling runs the plugin's `teardown`, cancels its background tasks and jobs, removes its routes, hooks, event handlers and services, and blocks active plugins that require it. Enabling re-activates it and re-evaluates blocked dependents. Both return the plugin.

### `GET /api/plugins/{id}/config` / `PUT /api/plugins/{id}/config`
The configuration with schema defaults applied. Secret fields are stored encrypted and returned as `••••••••`; a `PUT` carrying that mask keeps the stored secret. `PUT` replaces the configuration and returns it masked; the plugin sees the new values immediately.

### `POST /api/plugins/{id}/commands/{command}`
Runs a registered command of an active plugin as a job of type `command:<command>`.
- **Status:** `202 Accepted` `{"job_id": "job_…"}`; `404` for an unknown command or inactive plugin.

### `GET /api/jobs`
Jobs, newest first. Filters: `status` (`pending`, `running`, `done`, `failed`, `cancelled`), `plugin_id`, `limit` (1–200), `offset`.

### `GET /api/jobs/{id}`
Status, `progress` (0–100), `message`, `input`, and `result` or `error`.

### `POST /api/jobs/{id}/cancel`
Marks a pending or running job `cancelled` and cancels its running task. Returns the job.

---

## 10. Core Plugin Extension Endpoints (`/api/x/...`)

Plugins mount custom API routers under the `/api/x/{plugin_id}` namespace.

### Recipe Shortlist Plugin (`/api/x/core-shortlist`)

#### `GET /api/x/core-shortlist`
Lists shortlisted recipes, ordered by most recently added.
- **Query Parameters:** `member_id` (optional, string) to filter by a specific member.
- **Status:** `200 OK`
- **Response:**
  ```json
  [
    {
      "id": "e4a2d813-fdf5-430c-99c0-621458e0a13e",
      "member_id": "c8bbad70-87a4-44aa-9c2b-e10b10be4e2d",
      "recipe_id": "rec_salmon_1",
      "recipe_title": "Lemon Herb Salmon",
      "note": "Friday family dinner",
      "created_at": "2026-09-12T12:00:00Z"
    }
  ]
  ```

#### `POST /api/x/core-shortlist`
Adds a recipe to a member's shortlist or updates an existing entry's note.
- **Headers:** `X-Actor-Member: <member_id>` (optional if provided in body).
- **Body:**
  ```json
  {
    "recipe_id": "rec_salmon_1",
    "note": "Friday family dinner",
    "member_id": "c8bbad70-87a4-44aa-9c2b-e10b10be4e2d"
  }
  ```
- **Status:** `201 Created`
- **Cascade Behavior:** The underlying table `plugin_shortlist_entries` enforces foreign keys with `ON DELETE CASCADE` against `recipes(id)`. When a recipe is deleted, all related shortlist entries across all household members are automatically pruned.

#### `DELETE /api/x/core-shortlist/{id}`
Removes an entry from the shortlist by shortlist entry ID.
- **Status:** `200 OK`
- **Response:** `{"ok": true}`

---

### Ratings Plugin (`/api/x/core-ratings`)

#### `GET /api/x/core-ratings?journal_id=<id>`
The votes on one journal entry.
- **Response:** `{"scores": [{"member_id": "mem_4d5e6f", "score": 1}], "net_score": 1}`

#### `PUT /api/x/core-ratings`
Records or changes a member's vote on a journal entry.
- **Body:** `{"journal_id": "jrn_1a2b3c", "member_id": "mem_4d5e6f", "score": 1}` (`score` is `1` or `-1`).
- **Response:** `{"status": "ok", "net_score": 1}`

#### `DELETE /api/x/core-ratings?journal_id=<id>&member_id=<id>`
Removes a member's vote. **Response:** `{"status": "ok"}`

**Attribute mirroring:** every change recomputes the net score of the recipe behind the journal entry and stores it as the attribute `core-ratings.score` on the recipe group (removed when no votes remain), so `GET /api/recipes?sort=-core-ratings.score` lists the favourites first. The `rebuild` command recomputes every score.

---

### Timeline Day Slots Plugin (`/api/x/core-timeline`)

These routes exist while the plugin is active and require a session cookie; a bearer token alone returns 401. All failures use the standard error envelope. Dates must be strict `YYYY-MM-DD` calendar dates; slot ids use the same pattern as household `meal_types`.

#### `GET /api/x/core-timeline/slots?from=2026-10-01&to=2026-10-03`
Returns every day in the inclusive window, including days with no overrides. Ranges must be ordered and at most **92 inclusive days**; malformed dates, missing endpoints or oversized/reversed windows return `422 validation`.
```json
{"days": {"2026-10-01": [
  {"id": "breakfast", "label": "Breakfast", "kind": "default", "skipped": false},
  {"id": "snack", "label": "Afternoon snack", "kind": "extra", "skipped": false},
  {"id": "dinner", "label": "Dinner", "kind": "default", "skipped": true}
]}}
```
Defaults are live household configuration. Extras appear before their requested default id, or append if that target no longer exists. Extras whose id becomes a default are suppressed by the default. Schedule and journal entries remain separate noun APIs; the UI matches canonical ids before legacy labels, case-insensitively.

#### `PUT /api/x/core-timeline/days/{date}/slots/{meal_type}`
Upserts an override:
- Extra slot: `{"kind":"extra", "label":"Afternoon snack", "before":"dinner"}`. Label required (1–64 characters); `before` optional/null and otherwise a valid slot id. An extra may not use a current default id (409).
- Skip an empty default: `{"kind":"skip"}`. Missing default gives 404; an occupied default gives 409 with `details.current.entry_count`.
- **Response:** `200 {"date":"2026-10-01", "slots":[Slot, ...]}`.

#### `DELETE /api/x/core-timeline/days/{date}/slots/{meal_type}?with_entries=true`
Deletes an existing override, not a household default. Deleting a skip restores its default. Missing override gives 404. An occupied extra gives 409 with `details.current.entry_count` unless `with_entries=true`, which deletes matching schedule entries and the override atomically. If an obsolete extra id has become a household default, only the override is deleted and meals are preserved, even with `with_entries=true`.
- **Response:** `200 {"date":"2026-10-01", "slots":[Slot, ...]}`.

Every successful PUT/DELETE publishes a transient SSE push **after commit**, never on rollback:
```text
event: push
data: {"kind":"push", "name":"core-timeline:slots-changed", "data":{"date":"2026-10-01"}, "plugin_id":"core-timeline"}
```
Deletion of schedule entries also emits normal transactional `schedule:deleted` events. The shell refreshes schedule/journal/slot state without reloading the page; this transient slot push is not replayed after disconnect. Long Timeline windows use 63-inclusive-day chunks to obey the tighter schedule endpoint limit.

---

### Recurring Meals Plugin (`/api/x/core-recurring`)

#### `GET /api/x/core-recurring/rules`
Lists all configured recurring meal rules joined with their target recipe titles.
- **Status:** `200 OK`
- **Response:**
  ```json
  [
    {
      "id": "2a047ae7-55c3-4700-828b-e52ee37498bf",
      "weekday": 2,
      "meal_type": "dinner",
      "recipe_id": "rec_pasta_en",
      "recipe_title": "Wednesday Pasta",
      "created_at": "2026-09-11T12:00:00Z"
    }
  ]
  ```

#### `POST /api/x/core-recurring/rules`
Creates a rule and **immediately** materializes the 14-day horizon (today included) atomically. Weekday is 0 = Monday through 6 = Sunday, not the browser's Sunday-zero numbering. `422` for a weekday outside 0–6 or a meal type outside 1–64 characters; `404` for an unknown recipe. Rules and planned entries are all rolled back if materialization fails/cancels. Timeline is an optional dependency; household slots still work when it is disabled.
- **Body:**
  ```json
  {
    "weekday": 2,
    "meal_type": "dinner",
    "recipe_id": "rec_pasta_en"
  }
  ```
- **Status:** `200 OK`
- **Response:** the created rule's `id`, `weekday`, `meal_type`, `recipe_id`, `created_at`, `recipe_title`, plus `created` (number of newly planned entries in that materialization run).

The hourly background round fills matching unskipped, unoccupied slots and uses canonical ids before legacy labels. Tracking by `(rule_id, date)` survives schedule-entry deletion, preventing removed occurrences from being recreated on later rounds or restart. Existing schema-1 recurring entries are backfilled into tracking.

#### `DELETE /api/x/core-recurring/rules/{id}`
Atomically deletes a rule and its **future, unedited tracked entries** (date after today and revision 1). Today/past, edited and manual entries are preserved. A missing rule returns `404 not_found`.
- **Status:** `200 OK`
- **Response:** `{"ok": true}`

There is **no `/materialize` route or `materialize` command**, and no manual Materialize Now control. Use rule creation and the automatic background service. Like Timeline routes, these require a session cookie and use standard errors.

---

## 11. Server-Sent Events (SSE) Stream

### `GET /api/events/stream`
- **Position:** `Last-Event-ID` header, or `?last_event_id=<seq>` when opening a new `EventSource` (browsers send the header only on automatic reconnects).
- **Format:** `text/event-stream` with named events. Every frame's data carries `kind`.

#### Frames
1. **Hello** (always first):
   ```text
   event: hello
   data: {"kind": "hello", "boot_id": "99645eb445944111be07c87c541ea3fe", "seq": 42}
   ```
   A different `boot_id` than the page was loaded with means the server restarted; the shell reloads.
2. **Replay** (when the given position is below `seq`): every logged event after it up to `seq`, in order, paged through the whole log.
   ```text
   id: 43
   event: event
   data: {"kind": "event", "seq": 43, "name": "recipe:created", "entity_type": "recipe", "entity_id": "rec-1_en", "revision": 1, "actor_member_id": null, "origin": "member", "cause_seq": null, "depth": 0, "created_at": "…"}
   ```
   Event frames carry the envelope only, never `data`.
3. **Live events**: the same frames for events committed after `seq`.
4. **Pushes** (transient, not logged, not replayed):
   ```text
   event: push
   data: {"kind": "push", "name": "job:progress", "data": {"id": "job_…", "percent": 40, "message": "…"}, "plugin_id": null}
   ```
5. **Keep-alive** every 20 s: `: ping`

A client that stops reading is disconnected once 1,000 frames are queued for it; it resumes with `Last-Event-ID` and replays what it missed.

Event names: `recipe:*`, `schedule:*`, `journal:*`, `member:*` (`created`, `updated`, `deleted`), `asset:created|deleted`, `plugin:activated|deactivated`, `job:started|finished`, and plugin events `<plugin_id>:<verb>`.

---

## 12. PWA & App Shell Serving Endpoints

These endpoints are served outside `/api` directly at the application root / `BASE_PATH`.

### `GET /manifest.webmanifest`
Serves the templated Web App Manifest.
- **Cache-Control:** `no-cache`
- **Content-Type:** `application/manifest+json`
- **Response:** When authenticated, includes the household name (`SecretSauce – {household_name}`); otherwise returns generic `SecretSauce`.

### `GET /sw.js`
Serves the Service Worker script template, dynamically substituting `__SS_PRECACHE__` with computed build hash and static asset paths.
- **Cache-Control:** `no-cache`
- **Content-Type:** `text/javascript`

### `GET /static/{file_path}`
Serves immutable frontend assets (bundles, chunks, styles, icons). Refuses direct serving of `sw.js` and `index.html`.
- **Cache-Control:** `public, max-age=31536000, immutable`

### `GET /{full_path}` (SPA Catch-all)
Serves `index.html` with injected `window.__SS__` bootstrap context (`boot_id`, `base_path`, `version`).
Missing `/api/*`, `/static/*`, or `/assets/*` asset paths return a strict `404 Not Found` rather than serving HTML to prevent script MIME type mismatch errors.
- **Cache-Control:** `no-cache`
- **Content-Type:** `text/html`


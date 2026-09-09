# SecretSauce REST API Reference

All API routes are served under `/api` with prefix `/api/`. All responses automatically include `Cache-Control: no-store` unless explicitly specified.

---

## 1. Authentication & Common Headers

### Headers
| Header | Description |
|---|---|
| `Cookie: secretsauce_session=<token>` | Session cookie containing household ID and passphrase version. |
| `Authorization: Bearer <ss_tok_...>` | API token for machine / plugin access. |
| `X-Actor-Member: <member_id>` | Attributes mutating action to a specific household member. |
| `Sec-Fetch-Site: same-origin` | CSRF defense. Value `cross-site` with session cookie is rejected with 403. |
| `Last-Event-ID: <seq>` | Used on `GET /api/events/stream` for log replay. |

### Error Envelope
When an error occurs, the API returns a structured JSON payload:
```json
{
  "error": {
    "code": "conflict",
    "message": "Resource revision mismatch (expected 2, found 1)",
    "details": {
      "expected_revision": 2,
      "current_revision": 1
    }
  }
}
```

Common status codes:
- `400 Bad Request`: `validation_error`
- `401 Unauthorized`: `unauthorized`
- `403 Forbidden`: `forbidden`
- `404 Not Found`: `not_found`
- `409 Conflict`: `conflict` (revision collision) or `setup_required`
- `500 Internal Server Error`: `internal_error`

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

### `GET /api/export/json`
Exports all kernel nouns as a JSON payload for interop.
- **Status:** `200 OK`
- **Response Keys:** `recipes`, `schedule_entries`, `cook_journal`, `household_members`, `assets`, `household_config`.

---

## 3. Setup & Auth Endpoints

### `POST /api/setup`
Initializes a new household. Only accessible when no household passphrase has been configured.
- **Request:**
  ```json
  {
    "household_name": "My Home",
    "passphrase": "master-passphrase",
    "first_member": {
      "name": "Alex",
      "preferred_language": "en"
    }
  }
  ```
- **Status:** `201 Created`
- **Sets Cookie:** `secretsauce_session`

### `POST /api/auth/login`
Authenticates against the household passphrase. Subject to progressive delay rate-limiting.
- **Request:**
  ```json
  {
    "passphrase": "master-passphrase"
  }
  ```
- **Status:** `200 OK`
- **Sets Cookie:** `secretsauce_session`

### `GET /api/auth/session`
Returns the status of the current session and the actor member if provided.
- **Status:** `200 OK`

### `POST /api/auth/logout`
Clears the session cookie.
- **Status:** `204 No Content`

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
Updates household config fields (`household_name`, `meal_types`, `languages`, `units`).
- **Status:** `200 OK`

### `PUT /api/household/passphrase`
Rotates the household passphrase, increments `passphrase_version`, invalidates all existing sessions, and sets a fresh cookie.
- **Request:**
  ```json
  {
    "old_passphrase": "current-passphrase",
    "new_passphrase": "new-strong-passphrase"
  }
  ```
- **Status:** `204 No Content`

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
- **Status:** `204 No Content`

---

## 6. Recipes Endpoints

### `GET /api/recipes`
Searches and lists recipes.
- **Query Parameters:**
  - `q`: Trigram full-text search string.
  - `tag`: Filter by tag name.
  - `lang`: Language preference code (falls back according to household settings).
  - `sort_by_attr`: Sort by numeric entity attribute (e.g. `ratings.score`).
  - `limit`, `offset`: Pagination.

### `POST /api/recipes`
Creates a new recipe language row.
- **Request:**
  ```json
  {
    "group_id": "rec_123",
    "language": "en",
    "title": "Vegetable Stir Fry",
    "description": "Quick stir fry with vegetables",
    "ingredients": [
      {"id": "i1", "raw_text": "1 bell pepper", "name": "Bell Pepper", "quantity": 1.0, "unit": "pcs"}
    ],
    "steps": [
      {"id": "s1", "instruction": "Slice pepper and stir fry on high heat", "timer_minutes": 5}
    ],
    "tags": ["dinner", "vegan"],
    "prep_time_minutes": 10,
    "cook_time_minutes": 10,
    "servings": 2
  }
  ```
- **Status:** `201 Created`

### `GET /api/recipes/{id}`
Gets a specific recipe row by ID (e.g. `rec_123_en`) or by group ID with `?lang=`.
- **Status:** `200 OK`

### `PATCH /api/recipes/{id}`
Updates a recipe row. Guarded by `revision`.
- **Status:** `200 OK` (or `409 Conflict`)

### `DELETE /api/recipes/{id}`
Deletes a single language row. Re-points references to surviving language rows if other translations exist.
- **Status:** `204 No Content`

### `DELETE /api/recipes/groups/{group_id}`
Cascades deletion of all language rows and references.
- **Status:** `204 No Content`

---

## 7. Schedule & Cook Journal Endpoints

### `GET /api/schedule`
Lists scheduled entries. Query parameters: `from`, `to`, `limit`, `offset`.

### `POST /api/schedule`
Schedules a meal.
- **Request:**
  ```json
  {
    "date": "2026-09-15",
    "meal_type": "dinner",
    "recipe_id": "rec_123_en",
    "participant_member_ids": ["mem_alex"],
    "servings": 4
  }
  ```
- **Status:** `201 Created`

### `GET /api/journal`
Lists cook journal entries. Query parameters: `from`, `to`, `limit`, `offset`.

### `POST /api/journal`
Logs a cooked meal or converts a scheduled entry.
- **Request:**
  ```json
  {
    "date": "2026-09-15",
    "meal_type": "dinner",
    "recipe_id": "rec_123_en",
    "schedule_entry_id": "sched_456",
    "servings_cooked": 4,
    "servings_left": 1,
    "cooked_by_member_id": "mem_alex"
  }
  ```
- **Status:** `201 Created`

---

## 8. Assets & Attributes Endpoints

### `POST /api/assets`
Uploads a binary asset (`multipart/form-data`).
- **Form Fields:**
  - `file`: Binary file.
  - `entity_type`: `recipe`, `member`, etc.
  - `entity_id`: ID of target entity.
  - `sub_id`: Optional sub-component ID (e.g. step ID).
  - `slot`: Optional slot identifier (default: `primary`).
- **Status:** `201 Created`

### `GET /api/assets/{id}/file`
Streams binary asset file with `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`.

### `GET /api/attributes`
Returns entity attributes for an entity.
- **Query Parameters:** `entity_type`, `entity_id`.
- **Response:** `{"<plugin_id>.<key>": value, ...}`

---

## 9. Plugins & Background Jobs Endpoints

### `GET /api/plugins`
Lists all discovered plugins, enabled status, and schema versions.

### `POST /api/plugins/{id}/enable` / `POST /api/plugins/{id}/disable`
Enables or disables a plugin at runtime.

### `GET /api/plugins/{id}/config` / `PUT /api/plugins/{id}/config`
Gets or updates plugin configuration. Passwords / secrets are masked as `••••••••`.

### `GET /api/jobs`
Lists background jobs with status filter (`status=pending|running|completed|failed|cancelled`).

### `GET /api/jobs/{id}`
Returns job status, progress (0.0–1.0), and result or error payload.

### `POST /api/jobs/{id}/cancel`
Signals cancellation for a running job.

---

## 10. Server-Sent Events (SSE) Stream

### `GET /api/events/stream`
- **Headers:** `Last-Event-ID` (optional, integer sequence number).
- **Format:** `text/event-stream`

#### Stream Framing
1. **Initial Frame:**
   ```text
   event: hello
   data: {"boot_id": "99645eb445944111be07c87c541ea3fe", "seq": 42}
   ```
2. **Replay Frames** (if `Last-Event-ID` was provided and `< seq`):
   ```text
   id: 43
   event: event
   data: {"kind":"event","seq":43,"name":"recipe:created","entity_type":"recipe","entity_id":"rec_123","created_at":"..."}
   ```
3. **Live Log Events**:
   ```text
   id: 44
   event: event
   data: {"kind":"event","seq":44,"name":"member:updated", ...}
   ```
4. **Transient Pushes**:
   ```text
   event: push
   data: {"kind":"push","name":"notification","data":{"text":"Timer finished"}}
   ```
5. **Keep-Alive Ping** (every 20s):
   ```text
   : ping
   ```

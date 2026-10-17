# Design: AI Meal Suggestions (Decision Models) Plugin

## Context & Intent

SecretSauce currently offers generative AI meal planning via `core-meal-planner-ai`, which asks an LLM to generate unstructured or JSON meal plans from scratch. However, decision models—such as TypeSafe Jev (`typesafe/jev-latest`) and Perplexity Decider (`perplexity/pplx-decider-v1.2`) accessible via OpenRouter's Decisions API (`POST https://openrouter.ai/api/alpha/decisions`)—offer an alternative approach. 

Instead of generating text, decision models evaluate application state and a structured choice question with criteria, returning calibrated probability distributions in tens or hundreds of milliseconds at low cost.

This plugin (`core-meal-decider`) provides an **AI Meal Suggestions** module in the Timeline view sidebar powered by OpenRouter decision models. It evaluates all available recipes in the household library, ranks them by relevance to the user's planning prompt, and extracts a candidate pool of the top $N$ options (typically 10–20 suggestions). Each suggestion can then be scheduled directly into any meal slot (e.g. lunch, dinner) across dates in the timeline.

To ensure minimal latency during planning, available recipes are pre-computed and cached in the database, with automatic cache invalidation driven by recipe events.

---

## Goals & Non-Goals

### Goals
- **Dedicated Plugin Architecture**: A new, clean core plugin `core-meal-decider` with its own backend router, recipe cache, and frontend UI widget.
- **Decision Models Integration**: Interact with OpenRouter's Decisions API (`/api/alpha/decisions`) using typed choice questions.
- **Top $N$ Probabilistic Ranking**: Extract the top 10–20 (configurable) recipes sorted by probability descending from the decision model response.
- **Safe Recipe ID Mapping**: Map internal recipe IDs to safe decision option identifiers (`recipe_0`, `recipe_1`, etc.) and cleanly resolve them back to recipe entities.
- **Pre-computed Recipe Cache**: Index all recipes into a dedicated table (`plugin_core_meal_decider_recipes`) containing title, description, tags, and ingredient names without quantities. Synchronize automatically on `recipe:created`, `recipe:updated`, and `recipe:deleted`.
- **Day and Slot Scheduling**: Allow users to assign any suggested meal to a specific calendar date and meal slot (e.g., lunch, dinner) directly in the timeline sidebar.
- **Plugin Settings Management**: Keep model configuration (`typesafe/jev-latest`, `perplexity/pplx-decider-v1.2`, or custom slug), default counts, and OpenRouter API keys in Plugin Settings with environment variable fallback (`OPENROUTER_API_KEY`).

### Non-Goals
- Replacing or modifying `core-meal-planner-ai`: The new plugin operates independently alongside or as an alternative to the existing generative planner.
- Free-form recipe generation: Decision models select from existing recipes in the household library; they do not hallucinate or create new recipes from scratch.
- Complex inventory tracking: Quantities of ingredients are explicitly omitted from the decision model prompt criteria.

---

## Architectural Specification

### 1. Plugin Identification & Manifest
- **Plugin ID**: `core-meal-decider`
- **Location**: `secretsauce/plugins/core/core-meal-decider/`
- **Requires**: `["core-recipes", "core-timeline?"]`
- **Configuration Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "openrouter_api_key": { "type": "string", "secret": true },
      "model": { "type": "string", "default": "typesafe/jev-latest" },
      "default_count": { "type": "integer", "default": 15, "minimum": 1, "maximum": 50 }
    }
  }
  ```

### 2. Backend Data Storage & Cache Schema

#### Database Tables
1. **Recipe Cache Table**: `plugin_core_meal_decider_cache`
   - `recipe_id TEXT PRIMARY KEY`
   - `title TEXT NOT NULL`
   - `description TEXT`
   - `tags TEXT` (JSON array of strings)
   - `ingredient_names TEXT` (JSON array of string ingredient names without quantities)
   - `criteria_summary TEXT NOT NULL` (pre-formatted string for model criteria: `"Title: ... | Description: ... | Ingredients: ... | Tags: ..."`)
   - `updated_at TEXT NOT NULL`

2. **Suggestions Session Table**: `plugin_core_meal_decider_sessions`
   - `id TEXT PRIMARY KEY`
   - `prompt TEXT`
   - `model TEXT NOT NULL`
   - `count INTEGER NOT NULL`
   - `created_at TEXT NOT NULL`

3. **Suggestions Table**: `plugin_core_meal_decider_suggestions`
   - `id TEXT PRIMARY KEY`
   - `session_id TEXT NOT NULL REFERENCES plugin_core_meal_decider_sessions(id) ON DELETE CASCADE`
   - `recipe_id TEXT NOT NULL`
   - `recipe_title TEXT NOT NULL`
   - `rank INTEGER NOT NULL`
   - `probability REAL NOT NULL`
   - `status TEXT NOT NULL DEFAULT 'suggested'` (`'suggested'`, `'accepted'`, `'dismissed'`)
   - `scheduled_date TEXT`
   - `scheduled_slot TEXT`
   - `created_at TEXT NOT NULL`

### 3. Recipe Cache Synchronization
- At plugin startup or on first access, if the cache table is empty, a full sync reads recipes from `ctx.recipes.list_recipes(limit=1000)` and populates the cache.
- Event listeners hook into kernel recipe lifecycle:
  - `ctx.on("recipe:created", handler)` -> Parses recipe and inserts into cache table.
  - `ctx.on("recipe:updated", handler)` -> Re-computes criteria and updates cache table.
  - `ctx.on("recipe:deleted", handler)` -> Deletes entry from cache table.
- Ingredient name extraction rule:
  - If ingredient is a string: use string directly.
  - If ingredient is an object/dict: extract `"name"` property (ignoring `"amount"`, `"quantity"`, `"unit"`).

### 4. OpenRouter Decision Model Interaction & ID Resolution

1. **Candidate Retrieval**: Read all cached recipes from `plugin_core_meal_decider_cache`.
2. **Key Mapping**:
   - Construct mapping: `option_key = f"opt_{idx}"` <-> `recipe_id`.
   - Criteria dictionary: `{ "opt_0": "Title: ... | Description: ... | Ingredients: ... | Tags: ...", ... }`.
3. **Payload Construction**:
   ```json
   {
     "model": settings.model,
     "state": {
       "user_request": req.prompt or "Suggest delicious and suitable household meals.",
       "household_members": [...]
     },
     "questions": {
       "best_recipe": {
         "type": "choice",
         "instructions": "Pick the recipe that best matches the household request.",
         "criteria": { ... }
       }
     }
   }
   ```
4. **API Endpoint & Auth**:
   - `POST https://openrouter.ai/api/alpha/decisions`
   - Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`
   - API Key resolved from `ctx.config.get("openrouter_api_key")` or `os.environ.get("OPENROUTER_API_KEY")`.
5. **Probability Extraction & Ranking**:
   - From response JSON `answers.best_recipe`:
     - Read `probabilities` dict: `{ "opt_0": 0.28, "opt_1": 0.19, ... }`.
     - Sort option keys descending by probability value.
     - If probabilities dict is absent, place `choice` at rank 1.
   - Slice top $N$ items (where $N = \min(\text{req.count}, \text{total recipes}))$.
   - Resolve each `opt_i` back to its `recipe_id`, recipe title, tags, and ingredient names.
6. **Persistence**:
   - Create a session record and persist the top $N$ suggestions with their rank and probability into `plugin_core_meal_decider_suggestions`.

### 5. API Endpoints (`/api/x/core-meal-decider`)

- `POST /generate`:
  - Request: `{ "count": int (1..50, default 15), "prompt": str | None }`
  - Response: `{ "session_id": str, "count": int, "suggestions": [...] }`
- `GET /suggestions`:
  - Returns current active suggested meals.
- `POST /suggestions/{id}/schedule`:
  - Request: `{ "date": "YYYY-MM-DD", "meal_type": "lunch" | "dinner" | ... }`
  - Schedules meal using `core-timeline` (or writes timeline entry) and updates suggestion status to `'accepted'`.
- `POST /suggestions/{id}/dismiss`:
  - Updates suggestion status to `'dismissed'`.
- `GET /cache/status`:
  - Returns `{ "recipe_count": int, "last_synced": str }`.
- `POST /cache/refresh`:
  - Forces an immediate re-index of the recipe library.

### 6. Frontend UI Widget (`MealDeciderWidget.vue`)
- Mounts in `timeline.sidebar` at order `15`.
- **Top Controls**:
  - Pool size buttons / input: 10, 15, 20 meals.
  - Dietary focus / prompt text input (e.g. "Family weeknight meals, low prep").
  - "Generate Suggestions" action button with loading indicator.
  - Recipe indexing status badge (`"42 recipes cached"`).
- **Candidate Pool List**:
  - Scrollable cards list for all generated suggestions.
  - Each card displays:
    - Rank (#1, #2, ...) & match probability badge (e.g., `"28% match"`).
    - Recipe title (with link to open recipe detail).
    - Ingredients summary (names only).
    - Tags pills.
    - Inline scheduling bar: Date input + Meal Slot dropdown (populated from day's available timeline slots) + "Schedule" button.
    - Dismiss (✕) action.

---

## Error Handling & Edge Cases

1. **No OpenRouter Key Configured**: Returns HTTP 503 (`AIUnavailableError`), and the UI displays a clean notification with a direct link/instructions to set up the key in Plugin Settings.
2. **Empty Recipe Library**: If 0 recipes exist, returns HTTP 400 with a descriptive error message prompt to add recipes first.
3. **Library Size Smaller Than Requested $N$**: If library has 8 recipes and user asks for 15, all 8 recipes are returned ranked by probability without error.
4. **OpenRouter Decisions Rate Limit or Network Failure**: Standard retry / clean HTTP 502/503 exception with user-facing message.
5. **Timeline Plugin Disabled**: If `core-timeline` is disabled or not present, fallback to household config meal types, with scheduled status still tracked locally.

---

## What is Left to the Builder
- Exact layout styling and color contrast matching PrimeVue / SecretSauce design tokens.
- Integration test fixtures for OpenRouter Decisions API mock responses in backend pytest suite.
- Shell build script registration in `shell/scripts/build-plugins.ts` for automated bundling.

# SecretSauce Local Testing Guide (Pre-Containerization)

This guide walks through testing the SecretSauce meal planning application on bare metal before building or deploying Docker containers.

---

## 1. Prerequisites & Environment Rules

Ensure dependencies are installed before running tests or servers:

```bash
# Python backend dependencies (FastAPI, uvicorn, dev tools)
uv sync --extra dev

# Frontend dependencies (run strictly from shell/ workspace)
pnpm --prefix shell install
```

> **Windows / Git Bash note:**
> - Always invoke `python` or `uv run python`. **NEVER** run `python3` (triggers the Windows Store stub).
> - Frontend package commands must always target the shell workspace: `pnpm --prefix shell <cmd>`.

---

## 2. Testing Paths

Choose the test workflow that fits your needs:

| Method | Best For | Start Command | URL / Credentials |
|---|---|---|---|
| **Path 1: Instant Seeded Server** | Fastest manual UI verification | `uv run python shell/e2e/server.py 8998` | `http://localhost:8998`<br>Passphrase: `secretpassphrase` |
| **Path 2: Full Production Build** | Verifying compiled assets & setup wizard | `pnpm --prefix shell build:plugins && pnpm --prefix shell build`<br>`uv run secretsauce serve --port 8080 --data-dir ./test-data` | `http://localhost:8080`<br>Setup wizard on first run |
| **Path 3: Hot-Reload Dev Mode** | Frontend/UI iteration with live HMR | **T1:** `uv run secretsauce serve --port 8000 --data-dir ./dev-data`<br>**T2:** `pnpm --prefix shell dev` | `http://localhost:5173/static/` |

---

### Path 1: Instant Manual Test (Fastest – Pre-seeded Data)

Uses the Playwright E2E harness server to spin up a pre-configured database in `.e2e_data/`:

1. **Start the server:**
   ```bash
   uv run python shell/e2e/server.py 8998
   ```
2. **Open browser:** Navigate to `http://localhost:8998`.
3. **Log in:** Enter passphrase:
   ```
   secretpassphrase
   ```
4. **Pre-seeded data ready:**
   - Household: *SecretSauce E2E House*
   - Members: *Alex* (English), *Charlie* (German)
   - Seeded Recipe: *Grandma's Tomato Pasta*

---

### Path 2: Full Build & Production-Style Local Run

Tests the full production asset pipeline where FastAPI directly serves the compiled Vue shell and plugin bundles:

1. **Compile plugins & shell:**
   ```bash
   pnpm --prefix shell build:plugins
   pnpm --prefix shell build
   ```
2. **Run the server with an isolated data directory:**
   ```bash
   uv run secretsauce serve --port 8080 --data-dir ./test-data
   ```
3. **Open browser:** Go to `http://localhost:8080`.
4. **Complete Setup Wizard:** Configure your household name, primary language, meal types, and set a master passphrase.

---

### Path 3: Hot-Reload Dev Mode (Vite + FastAPI)

Provides instantaneous feedback when editing Vue components or plugin interfaces:

1. **Terminal 1 — Backend API:**
   ```bash
   uv run secretsauce serve --port 8000 --data-dir ./dev-data
   ```
2. **Terminal 2 — Frontend Dev Server:**
   ```bash
   # Ensure plugin bundles are built once
   pnpm --prefix shell build:plugins
   pnpm --prefix shell dev
   ```
3. **Access UI:** Open `http://localhost:5173/static/`. API calls automatically proxy to `http://localhost:8000`.

---

## 3. Meal Planning Feature Verification Checklist

Use this checklist to verify meal planning flows during manual testing:

### 1. Timeline & Schedule (`/timeline`)
- [ ] **Rolling Window:** Verify the 9-day calendar grid (2 compact past days, Today highlighted with badge, and 6 upcoming days).
- [ ] **Schedule a Meal:** Click `+` on Today or an upcoming day, search for a recipe (e.g. "Grandma's Tomato Pasta"), and click **Schedule**.
- [ ] **Meal Card Actions:** Click a scheduled meal to view actions (view recipe, remove from plan).
- [ ] **Member Assignment:** Switch active household member in header picker and verify member-specific tags.

### 2. AI Meal Plan Suggestions (`core-meal-planner-ai`)
- [ ] **Candidate Pool:** Open the AI planner sidebar on the timeline.
- [ ] **Generate Suggestions:** Enter prompt / target days and click generate.
- [ ] **Candidate Acceptance:** Select an unassigned suggestion card and assign it to a date and meal slot (Dinner, Lunch, Breakfast).
- *(Note: Requires AI provider API key configured under Settings -> AI, or test via pytest mock suite).*

### 3. Recipe Scaling & Shortlist (`/recipes`)
- [ ] **Serving Scaler:** Open a recipe, toggle `+` / `-` servings, and confirm ingredient quantities and units scale dynamically.
- [ ] **Shortlist:** Click the star (★) icon on a recipe card; verify the **★ Shortlist** filter toggle isolates favorited meals.

### 4. Dynamic Shopping List (`/shopping-list`)
- [ ] **Aggregation:** Navigate to `/shopping-list`. Verify ingredients from all scheduled timeline meals are aggregated.
- [ ] **Check Off Items:** Tap ingredients as purchased; confirm checked items move to the completed list.
- [ ] **Add Staples / Manual Items:** Add manual items (e.g., milk, olive oil) and verify persistence.

### 5. Cooking Tracker & Journal (`/journal`)
- [ ] **Mark as Cooked:** Mark a scheduled meal as cooked from the timeline card.
- [ ] **Cooking Journal:** Open `/journal` to verify the cook event log.
- [ ] **Family Ratings:** Cast a star rating / vote on the cooked dish.

---

## 4. Automated Verification Commands

Run automated test suites to verify backend logic, UI components, and end-to-end browser flows:

### Backend Pytest Suite
```bash
# Run all backend tests
uv run pytest

# Run meal planner & schedule tests specifically
uv run pytest tests/test_plugin_core_meal_planner_ai.py -v
uv run pytest tests/test_schedule_journal_api.py -v
uv run pytest tests/test_recipes_api.py -v
```

### Frontend Unit & Component Tests (Vitest)
```bash
# Run shell and units package tests
pnpm --prefix shell test
```

### End-to-End Browser Tests (Playwright)
```bash
# Runs full headless browser tests (login, timeline, scheduling, scaling)
pnpm --prefix shell test:e2e
```

---

## 5. Cleanup & Resetting Test State

To reset local state between test runs:

- **Reset Instant Test Data:**
  ```bash
  rm -rf .e2e_data
  ```
- **Reset Manual Test Data:**
  ```bash
  rm -rf test-data/ dev-data/
  ```
- **Stop dangling background processes (Windows / Git Bash):**
  ```bash
  taskkill //F //IM python.exe
  taskkill //F //IM node.exe
  ```

# Phase 3A: Units Engine, Units Plugin, Recurring Plugin & UI Serving Pipeline

**Status:** Approved  
**Date:** 2026-09-11  
**Architecture Spec Reference:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md` (Sections 3.1, 6.1, 6.11, 7.1, 9, 13)

---

## 1. Overview & Goals

Phase 3A implements Stage 6 of the SecretSauce Build Order. The primary objectives are:
1. Build the Python **Units Engine** (`secretsauce/units/`) and unit database (`units.json`) providing canonical alias resolution, structured ingredient line parsing, dimensional conversion, unit system conversion (`metric` vs `us_customary`), and display formatting.
2. Build the browser **`@secretsauce/units`** TypeScript package for client-side live ingredient preview (parsing and formatting only), vendored into the shell's static assets and mapped in the browser import map.
3. Establish the core plugin discovery and **Plugin UI Bundle Serving Pipeline** (`/api/plugins/{id}/ui.js` and `ui.css`) enabling plugins to be served directly from plugin directories with immutable cache headers.
4. Implement the **`units` plugin** (`plugins/units/`), enforcing write-time unit conversion hooks (`recipe:create`, `recipe:update`) and a `reconvert-all` command.
5. Implement the **`recurring` plugin** (`plugins/recurring/`), proving SQLite schema migrations, foreign-key cascading, periodic schedule materialization with `origin="plugin:recurring"`, custom API endpoints, and a frontend UI bundle mounted via `ss.settings.section`.

---

## 2. System Architecture & Components

```
secretsauce-core/
├── secretsauce/
│   ├── units/
│   │   ├── __init__.py           # canonical(), parse(), convert(), to_system(), format()
│   │   └── units.json            # Units, dimensions, systems, factors, aliases
│   ├── api/routes/
│   │   └── plugins.py            # Serves /api/plugins/{id}/ui.js & ui.css
│   └── boot.py                   # Discovers plugins in ./plugins, /app/plugins, /data/plugins
├── shell/
│   ├── packages/
│   │   └── units/                # @secretsauce/units (TypeScript parse & format)
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       ├── src/index.ts
│   │       └── tests/units.spec.ts
│   └── scripts/
│       ├── vendor.ts             # Vendors @secretsauce/units to static/vendor/secretsauce-units.js
│       └── build-plugins.ts      # Builds plugin UI sources to plugins/<id>/ui/dist/index.js
├── plugins/
│   ├── units/
│   │   └── __init__.py           # recipe:create & recipe:update hooks, reconvert-all command
│   └── recurring/
│       ├── __init__.py           # materialize() background task, routes, command
│       ├── migrations/
│       │   └── 0001_rules.sql    # plugin_recurring_rules table
│       └── ui/
│           ├── package.json
│           ├── src/
│           │   ├── index.ts      # ss.settings.section registration
│           │   └── RecurringSettings.vue
│           └── dist/
│               └── index.js      # Bundled ES module output
└── tests/
    ├── test_units.py             # Units engine parsing, conversion, and formatting tests
    └── test_stage6_plugins.py    # Integration tests for units & recurring plugins + UI serving
```

---

## 3. Python Units Engine (`secretsauce/units/`)

### 3.1 Unit Table (`units.json`)
`units.json` acts as the single authoritative source of unit definitions. Base units for dimensions are:
- `mass`: base unit `g` (grams)
- `volume`: base unit `ml` (millilitres)
- `count`: dimensionless counts (pieces, pinch, etc.)
- `temperature`: `c` (Celsius) and `f` (Fahrenheit)

| ID | Dimension | System | Factor (to base) | English Aliases | German Aliases |
|---|---|---|---|---|---|
| `g` | mass | metric | 1 | g, gram, grams | Gramm |
| `kg` | mass | metric | 1000 | kg, kilogram, kilograms | Kilogramm |
| `mg` | mass | metric | 0.001 | mg, milligram, milligrams | Milligramm |
| `oz` | mass | us_customary | 28.3495 | oz, ounce, ounces | Unze, Unzen |
| `lb` | mass | us_customary | 453.592 | lb, lbs, pound, pounds | |
| `ml` | volume | metric | 1 | ml, milliliter, millilitre, milliliters | Milliliter |
| `cl` | volume | metric | 10 | cl, centiliter, centilitre | Zentiliter |
| `dl` | volume | metric | 100 | dl, deciliter, decilitre | Deziliter |
| `l` | volume | metric | 1000 | l, liter, litre, liters, litres | Liter |
| `tsp` | volume | shared | 5 | tsp, teaspoon, teaspoons, t | TL, Teelöffel |
| `tbsp` | volume | shared | 15 | tbsp, tablespoon, tablespoons, T | EL, Esslöffel |
| `cup` | volume | us_customary | 240 | cup, cups, c | |
| `fl_oz` | volume | us_customary | 29.5735 | fl oz, fl. oz., fluid ounce, fluid ounces | |
| `pint` | volume | us_customary | 473.176 | pint, pints, pt | |
| `quart` | volume | us_customary | 946.353 | quart, quarts, qt | |
| `gallon` | volume | us_customary | 3785.41 | gallon, gallons, gal | |
| `c` | temperature | metric | formula | °C, C, celsius | Grad, Grad Celsius |
| `f` | temperature | us_customary | formula | °F, F, fahrenheit | |
| `piece` | count | shared | - | piece, pieces, pc, pcs, x | Stück, St., Stk. |
| `pinch` | count | shared | - | pinch, pinches | Prise, Prisen |
| `dash` | count | shared | - | dash, dashes | Spritzer |
| `drop` | count | shared | - | drop, drops | Tropfen |
| `clove` | count | shared | - | clove, cloves | Zehe, Zehen |
| `slice` | count | shared | - | slice, slices | Scheibe, Scheiben |
| `can` | count | shared | - | can, cans, tin, tins | Dose, Dosen |
| `package` | count | shared | - | package, packages, pack, pkg | Packung, Packungen, Pck., Päckchen |
| `bunch` | count | shared | - | bunch, bunches | Bund |
| `handful` | count | shared | - | handful, handfuls | Handvoll |
| `sprig` | count | shared | - | sprig, sprigs | Zweig, Zweige |
| `stalk` | count | shared | - | stalk, stalks, stick, sticks | Stange, Stangen |
| `leaf` | count | shared | - | leaf, leaves | Blatt, Blätter |

*Note:* German `Pfund` and `Tasse` are deliberately excluded due to regional ambiguities.

### 3.2 Canonical Alias Resolution (`canonical`)
- Single-letter aliases (`T` = tbsp, `t` = tsp) are strictly case-sensitive.
- Multi-letter aliases are case-insensitive and stripped of leading/trailing whitespace and trailing periods.
- Returns canonical ID or `None` if unmapped.

### 3.3 Parsing (`parse`)
Input: `text: str, lang: str` -> Output: `dict` conforming to `Ingredient` schema (`id`, `raw_text`, `name`, `quantity`, `quantity_max`, `quantity_text`, `unit`, `notes`).
- **Quantities**:
  - Vulgar fractions (`½` -> 0.5, `¼` -> 0.25, `¾` -> 0.75, `⅓` -> 0.333, etc.)
  - Decimals with dots or commas (`2.5`, `2,5`)
  - Slash fractions (`1/2`, `1 1/2`)
  - Ranges (`2-3`, `2 – 3`, `2 to 3`, `2 bis 3`): assigns lower bound to `quantity`, upper bound to `quantity_max`.
  - Subjective amounts: `to taste`, `some`, `a little`, `nach Belieben`, `nach Geschmack`, `etwas` set `quantity` and `quantity_max` to `None`.
- **Unit**:
  - Matched against canonical alias table. If recognized, assigned canonical `unit`. If unrecognized but trailing a quantity, remains as free-text unit.
- **Name & Notes**:
  - Notes extracted from trailing parentheticals `(...)` or following the first comma `,`.
  - Remaining string is trimmed and set as `name`.
  - If no quantity or unit pattern matches, entire string becomes `name`.

### 3.4 Conversion & System Targeting (`convert`, `to_system`)
- `convert(quantity: float, from_unit: str, to_unit: str) -> float`:
  - Validates both units belong to the same dimension; raises `ValueError` on cross-dimension conversion.
  - Converts via base factor: `quantity * factor(from_unit) / factor(to_unit)`.
  - Temperature converts via `(f - 32) * 5 / 9` and `(c * 9 / 5) + 32`, rounded to nearest 5.
- `to_system(quantity, quantity_max, unit, system) -> tuple[float | None, float | None, str | None]`:
  - If `unit` is shared (e.g., `tsp`, `tbsp`, count units) or `unit` is `None`, returns as-is.
  - To `metric`:
    - `mass`: becomes `g` if < 1000g, or `kg` if >= 1000g.
    - `volume`: becomes `ml` if < 1000ml, or `l` if >= 1000ml.
    - `temperature`: `f` becomes `c`.
    - Rounding: nearest 1 below 20, nearest 5 below 200, nearest 10 below 1000, and 0.05 step when expressed in `kg` or `l`.
  - To `us_customary`:
    - `mass`: becomes `oz` if < 16oz, or `lb` if >= 16oz.
    - `volume`: becomes `cup` if >= 60ml, `tbsp` if >= 15ml, otherwise `tsp`.
    - `temperature`: `c` becomes `f`.
  - Ranges: converts and rounds both `quantity` and `quantity_max`.

### 3.5 Formatting (`format`)
- Produces clean localized text from `(quantity, quantity_max, unit, lang, system)`.
- For US customary, rounds to the nearest vulgar fraction (`1/8`, `1/4`, `1/3`, `1/2`, `2/3`, `3/4`) or integer if within 4% of the exact value, otherwise formats to 1 decimal place.

---

## 4. Browser Units Package (`shell/packages/units/`)

- Workspace package `shell/packages/units/` exporting `parse()` and `format()`.
- Shares the same test matrix as Python to guarantee 100% parity during live editing.
- Vendoring via `shell/scripts/vendor.ts` outputs bundle to `secretsauce/static/vendor/secretsauce-units.js`.
- Templated into `index.html` import map:
  ```json
  {
    "imports": {
      "@secretsauce/ui": "/static/vendor/secretsauce-ui.js",
      "@secretsauce/units": "/static/vendor/secretsauce-units.js"
    }
  }
  ```

---

## 5. Plugin UI Serving & Core Search Path Discovery

### 5.1 Discovery Search Paths (`secretsauce/boot.py` & `config.py`)
Search paths for `PluginLoader`:
1. Core directory: `os.environ.get("SECRETSAUCE_CORE_PLUGINS_DIR")` -> `/app/plugins` (if exists) -> `./plugins` (repo root in dev).
2. Tenant directory: `{data_dir}/plugins`.

`PluginLoader` stores the resolved directory `plugin_dir` for each discovered plugin.

### 5.2 Bundle Serving (`secretsauce/api/routes/plugins.py`)
- `GET /api/plugins/{plugin_id}/ui.js`:
  - Resolves `plugin_dir / manifest.ui`.
  - Validates path remains within `plugin_dir` (prevent traversal).
  - Returns `FileResponse` with `media_type="text/javascript"`.
  - With query param `v`: `Cache-Control: public, max-age=31536000, immutable`.
- `GET /api/plugins/{plugin_id}/ui.css`:
  - Resolves `plugin_dir / manifest.ui_css` with `media_type="text/css"`.

### 5.3 Build Pipeline (`shell/scripts/build-plugins.ts`)
- Discovers all plugins with `ui/src/index.ts`.
- Builds using Vite library mode:
  - Format: `es`
  - Externals: `vue`, `pinia`, `vue-router`, `@secretsauce/ui`, `@secretsauce/units`, `/^primevue\//`, `/^@primevue\//`, `/^@primeuix\//`
  - Output: `plugins/<id>/ui/dist/index.js` (and `style.css`)
- Integrated into root build commands:
  ```bash
  pnpm --prefix shell build:plugins
  pnpm --prefix shell build          # builds packages, plugins, vendors, and shell
  ```

---

## 6. `units` Plugin (`plugins/units/`)

### 6.1 Manifest & Setup
```python
PLUGIN = {
    "id": "units",
    "name": "Units System",
    "version": "1.0.0",
    "description": "Standardizes ingredient quantities into the household unit system at write time."
}
```

### 6.2 Pre-Commit Hooks
- Hooks `recipe:create` and `recipe:update`:
  - Retrieves `system = await ctx.household.get("units", "metric")`.
  - Iterates through `draft["ingredients"]`:
    - Calls `units.to_system(ing["quantity"], ing["quantity_max"], ing["unit"], system)`.
    - Mutates `draft` in place.
    - Preserves `raw_text` and `quantity_text` unaltered.

### 6.3 `reconvert-all` Command
- When the household changes preference, `ctx.command("reconvert-all")`:
  - Fetches all recipe rows.
  - Re-applies `convert` for the new system.
  - Updates changed recipes via `ctx.recipes.update(..., origin="plugin:units")`.

---

## 7. `recurring` Plugin (`plugins/recurring/`)

### 7.1 Manifest & Migration
```python
PLUGIN = {
    "id": "recurring",
    "name": "Recurring Meals",
    "version": "1.0.0",
    "schema": 1,
    "ui": "ui/dist/index.js",
    "ui_api": 1,
}
```

`plugins/recurring/migrations/0001_rules.sql`:
```sql
CREATE TABLE plugin_recurring_rules (
    id TEXT PRIMARY KEY,
    weekday INTEGER NOT NULL,            -- 0 = Monday, ..., 6 = Sunday
    meal_type TEXT NOT NULL,             -- "dinner", "lunch", etc.
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_recurring_rules_weekday ON plugin_recurring_rules(weekday);
```

### 7.2 Schedule Materializer
- In `setup(ctx)`: `ctx.background(materialize(ctx))`.
- For each rule in `plugin_recurring_rules`:
  - Evaluates next 14 calendar days.
  - When `day.weekday() == rule["weekday"]`, checks if an entry for `(date, meal_type)` already exists.
  - If empty, creates schedule entry with `origin="plugin:recurring"`.

### 7.3 Plugin Routes
Mounted under `/api/x/recurring/rules`:
- `GET /api/x/recurring/rules`: returns rules list with resolved recipe titles.
- `POST /api/x/recurring/rules`: body `{weekday: int, meal_type: str, recipe_id: str}` creates rule.
- `DELETE /api/x/recurring/rules/{id}`: removes rule.

### 7.4 Frontend UI Bundle (`plugins/recurring/ui/`)
- `ui/src/index.ts`:
  ```ts
  export default function activate(ss: SecretSauceUI) {
    ss.settings.section({
      id: "recurring",
      title: "Recurring Meals",
      component: RecurringSettings
    })
  }
  ```
- `RecurringSettings.vue`: PrimeVue component managing weekday recurring rules and manual materialization trigger.

---

## 8. Testing & Verification Strategy

1. **`tests/test_units.py`**:
   - Verification of `units.json` loading and alias canonicalization.
   - Parsing of vulgar fractions, ASCII fractions, decimal commas, ranges, and subjective amounts in English and German.
   - Cross-dimension conversion error handling.
   - Exact numeric rounding and system conversion checks according to Section 9.3.
2. **`shell/packages/units/tests/units.spec.ts`**:
   - Verification of TypeScript `parse()` and `format()` matching Python test vectors.
3. **`tests/test_stage6_plugins.py`**:
   - `units` plugin hook testing: creating a recipe converts units to metric/imperial; `reconvert-all` rewrites with `origin="plugin:units"`.
   - `recurring` plugin testing: migration execution, rule creation, 14-day materialization without duplicates, foreign key cascade on recipe deletion.
   - Serving tests: `GET /api/plugins/recurring/ui.js` returns 200 with immutable headers.
4. **Build & End-to-End Test**:
   - `pnpm --prefix shell build` succeeds with zero errors.
   - All Pytest (78+) and Vitest (32+) test suites pass green.

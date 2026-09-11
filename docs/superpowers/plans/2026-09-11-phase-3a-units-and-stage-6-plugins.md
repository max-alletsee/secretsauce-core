# Phase 3A: Units Engine, Units Plugin, Recurring Plugin & UI Serving Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Python and browser Units Engine, plugin UI bundle serving pipeline, and Stage 6 core validation plugins (`units` and `recurring`).

**Architecture:** Layered modular pipeline providing deterministic ingredient parsing, conversion, and formatting across Python (`secretsauce.units`) and TypeScript (`@secretsauce/units`). Core plugins are discovered from repository root `./plugins` and `/app/plugins`, serving ES module UI bundles compiled via Vite library mode over `/api/plugins/{id}/ui.js`. Backend hooks and background tasks manage automated unit conversion and recurring meal schedule materialization.

**Tech Stack:** Python 3.12, FastAPI, SQLite, Pydantic, TypeScript, Vue 3, PrimeVue, Vite, Vitest, Pytest.

**Spec:** `docs/superpowers/specs/2026-09-11-phase-3a-units-and-stage-6-plugins-design.md`

## Global Constraints

- **Python Version & Tooling:** Python >= 3.12, managed with `uv`.
- **Node Version & Tooling:** Node >= 22, pnpm workspace under `shell/`.
- **Zero Placeholders:** Every code block, test, and command must be concrete, complete, and runnable.
- **Strict TDD:** Every task must start with a failing test and progress through red-green-refactor before committing.
- **Convention:** Conventional commits (`feat:`, `test:`, `fix:`, `refactor:`, `chore:`).
- **Green Suite:** Maintain existing 78 Python tests and 32 Vitest tests passing throughout all steps.

---

## File Structure Map

- **Python Units Engine:**
  - `secretsauce/units/units.json`: Authoritative definitions of units, dimensions, conversion factors, and localized aliases.
  - `secretsauce/units/__init__.py`: Exports `canonical`, `parse`, `convert`, `to_system`, `format`.
  - `tests/test_units.py`: Unit tests for parsing, dimension conversions, system targeting, and formatting.
- **Browser Units Package:**
  - `shell/packages/units/package.json`: NPM package metadata for `@secretsauce/units`.
  - `shell/packages/units/tsconfig.json`: TypeScript configuration extending shell base.
  - `shell/packages/units/src/index.ts`: TypeScript implementations of `parse` and `format`.
  - `shell/packages/units/tests/units.spec.ts`: Vitest tests for parity with Python engine.
  - `shell/scripts/vendor.ts`: Vendoring bundle generator for `@secretsauce/units` to `secretsauce/static/vendor/secretsauce-units.js`.
  - `secretsauce/api/routes/pwa.py`: Templates browser import map including `@secretsauce/units`.
- **Plugin UI Serving & Discovery:**
  - `secretsauce/config.py`: Core plugins search path resolution.
  - `secretsauce/boot.py`: Discovers core plugins in `./plugins` / `/app/plugins` alongside `{data_dir}/plugins`.
  - `secretsauce/plugins/loader.py`: Preserves `plugin_dir` on discovered plugin metadata.
  - `secretsauce/api/routes/plugins.py`: Serves `GET /api/plugins/{id}/ui.js` and `GET /api/plugins/{id}/ui.css` with immutable caching.
  - `shell/scripts/build-plugins.ts`: Vite library mode compiler for plugin UIs to `plugins/<id>/ui/dist/index.js`.
- **Units Plugin:**
  - `plugins/units/__init__.py`: Plugin manifest, `recipe:create` / `recipe:update` hooks, and `reconvert-all` command.
- **Recurring Plugin:**
  - `plugins/recurring/__init__.py`: Plugin manifest, `materialize` background task, and `/api/x/recurring/rules` endpoints.
  - `plugins/recurring/migrations/0001_rules.sql`: Schema migration for `plugin_recurring_rules`.
  - `plugins/recurring/ui/src/index.ts`: Default export `activate(ss)` registering `RecurringSettings`.
  - `plugins/recurring/ui/src/RecurringSettings.vue`: PrimeVue settings component for managing weekly recurring meals.
- **Integration Tests:**
  - `tests/test_stage6_plugins.py`: Integration tests for units plugin hooks, recurring rules & materialization, and UI bundle serving.

---

### Task 1: Python Units Table & Ingredient Parsing Engine

**Files:**
- Create: `secretsauce/units/units.json`
- Create: `secretsauce/units/__init__.py`
- Create: `tests/test_units.py`

**Interfaces:**
- Produces:
  - `canonical(alias: str, lang: str = "en") -> str | None`
  - `parse(text: str, lang: str = "en") -> dict[str, Any]` returning `{"raw_text": str, "name": str, "quantity": float | None, "quantity_max": float | None, "quantity_text": str | None, "unit": str | None, "notes": str | None}`

- [x] **Step 1: Write the failing tests for unit alias canonicalization and ingredient parsing**

```python
# tests/test_units.py
import pytest
from secretsauce.units import canonical, parse


def test_canonical_alias_lookup():
    # Case sensitive single-letter aliases
    assert canonical("T", "en") == "tbsp"
    assert canonical("t", "en") == "tsp"
    assert canonical("T", "de") == "tbsp"

    # Multi-letter aliases case-insensitive and whitespace-stripped
    assert canonical("  grams  ", "en") == "g"
    assert canonical("KG", "en") == "kg"
    assert canonical("El.", "de") == "tbsp"
    assert canonical("teelöffel", "de") == "tsp"
    assert canonical("nonexistent_unit", "en") is None


def test_parse_vulgar_fractions_and_decimals():
    res = parse("½ cup sugar", "en")
    assert res["quantity"] == 0.5
    assert res["quantity_max"] is None
    assert res["unit"] == "cup"
    assert res["name"] == "sugar"

    res_dec = parse("2.5 kg flour", "en")
    assert res_dec["quantity"] == 2.5
    assert res_dec["unit"] == "kg"
    assert res_dec["name"] == "flour"

    # German decimal comma
    res_de = parse("1,5 kg Mehl", "de")
    assert res_de["quantity"] == 1.5
    assert res_de["unit"] == "kg"
    assert res_de["name"] == "Mehl"


def test_parse_slash_fractions_and_ranges():
    res = parse("1 1/2 tsp salt", "en")
    assert res["quantity"] == 1.5
    assert res["unit"] == "tsp"
    assert res["name"] == "salt"

    res_range = parse("2-3 cloves garlic", "en")
    assert res_range["quantity"] == 2.0
    assert res_range["quantity_max"] == 3.0
    assert res_range["unit"] == "clove"
    assert res_range["name"] == "garlic"

    res_range_de = parse("2 bis 3 Tomaten", "de")
    assert res_range_de["quantity"] == 2.0
    assert res_range_de["quantity_max"] == 3.0
    assert res_range_de["name"] == "Tomaten"


def test_parse_notes_and_subjective_amounts():
    res = parse("1 onion, finely diced", "en")
    assert res["quantity"] == 1.0
    assert res["name"] == "onion"
    assert res["notes"] == "finely diced"

    res_paren = parse("200 g butter (room temperature)", "en")
    assert res_paren["quantity"] == 200.0
    assert res_paren["unit"] == "g"
    assert res_paren["name"] == "butter"
    assert res_paren["notes"] == "room temperature"

    # Subjective amounts
    res_taste = parse("salt to taste", "en")
    assert res_taste["quantity"] is None
    assert res_taste["name"] == "salt"
    assert res_taste["notes"] == "to taste"

    res_belieben = parse("Pfeffer nach Belieben", "de")
    assert res_belieben["quantity"] is None
    assert res_belieben["name"] == "Pfeffer"
    assert res_belieben["notes"] == "nach Belieben"
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_units.py -v`  
Expected: FAIL (ModuleNotFoundError: No module named 'secretsauce.units')

- [x] **Step 3: Create `units.json` and implement `canonical()` and `parse()`**

Write `secretsauce/units/units.json`:
```json
{
  "units": [
    {"id": "g", "dimension": "mass", "system": "metric", "factor": 1.0, "aliases": {"en": ["g", "gram", "grams"], "de": ["g", "gramm"]}},
    {"id": "kg", "dimension": "mass", "system": "metric", "factor": 1000.0, "aliases": {"en": ["kg", "kilogram", "kilograms"], "de": ["kg", "kilogramm"]}},
    {"id": "mg", "dimension": "mass", "system": "metric", "factor": 0.001, "aliases": {"en": ["mg", "milligram", "milligrams"], "de": ["mg", "milligramm"]}},
    {"id": "oz", "dimension": "mass", "system": "us_customary", "factor": 28.3495, "aliases": {"en": ["oz", "ounce", "ounces"], "de": ["unze", "unzen"]}},
    {"id": "lb", "dimension": "mass", "system": "us_customary", "factor": 453.592, "aliases": {"en": ["lb", "lbs", "pound", "pounds"], "de": []}},
    {"id": "ml", "dimension": "volume", "system": "metric", "factor": 1.0, "aliases": {"en": ["ml", "milliliter", "millilitre", "milliliters", "millilitres"], "de": ["ml", "milliliter"]}},
    {"id": "cl", "dimension": "volume", "system": "metric", "factor": 10.0, "aliases": {"en": ["cl", "centiliter", "centilitre"], "de": ["cl", "zentiliter"]}},
    {"id": "dl", "dimension": "volume", "system": "metric", "factor": 100.0, "aliases": {"en": ["dl", "deciliter", "decilitre"], "de": ["dl", "deziliter"]}},
    {"id": "l", "dimension": "volume", "system": "metric", "factor": 1000.0, "aliases": {"en": ["l", "liter", "litre", "liters", "litres"], "de": ["l", "liter"]}},
    {"id": "tsp", "dimension": "volume", "system": "shared", "factor": 5.0, "aliases": {"en": ["tsp", "teaspoon", "teaspoons", "t"], "de": ["tl", "teelöffel"]}},
    {"id": "tbsp", "dimension": "volume", "system": "shared", "factor": 15.0, "aliases": {"en": ["tbsp", "tablespoon", "tablespoons", "T"], "de": ["el", "esslöffel"]}},
    {"id": "cup", "dimension": "volume", "system": "us_customary", "factor": 240.0, "aliases": {"en": ["cup", "cups", "c"], "de": []}},
    {"id": "fl_oz", "dimension": "volume", "system": "us_customary", "factor": 29.5735, "aliases": {"en": ["fl oz", "fl. oz.", "fluid ounce", "fluid ounces"], "de": []}},
    {"id": "pint", "dimension": "volume", "system": "us_customary", "factor": 473.176, "aliases": {"en": ["pint", "pints", "pt"], "de": []}},
    {"id": "quart", "dimension": "volume", "system": "us_customary", "factor": 946.353, "aliases": {"en": ["quart", "quarts", "qt"], "de": []}},
    {"id": "gallon", "dimension": "volume", "system": "us_customary", "factor": 3785.41, "aliases": {"en": ["gallon", "gallons", "gal"], "de": []}},
    {"id": "c", "dimension": "temperature", "system": "metric", "factor": null, "aliases": {"en": ["°c", "c", "celsius"], "de": ["grad", "grad celsius"]}},
    {"id": "f", "dimension": "temperature", "system": "us_customary", "factor": null, "aliases": {"en": ["°f", "f", "fahrenheit"], "de": []}},
    {"id": "piece", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["piece", "pieces", "pc", "pcs", "x"], "de": ["stück", "st.", "stk."]}},
    {"id": "pinch", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["pinch", "pinches"], "de": ["prise", "prisen"]}},
    {"id": "dash", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["dash", "dashes"], "de": ["spritzer"]}},
    {"id": "drop", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["drop", "drops"], "de": ["tropfen"]}},
    {"id": "clove", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["clove", "cloves"], "de": ["zehe", "zehen"]}},
    {"id": "slice", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["slice", "slices"], "de": ["scheibe", "scheiben"]}},
    {"id": "can", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["can", "cans", "tin", "tins"], "de": ["dose", "dosen"]}},
    {"id": "package", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["package", "packages", "pack", "pkg"], "de": ["packung", "packungen", "pck.", "päckchen"]}},
    {"id": "bunch", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["bunch", "bunches"], "de": ["bund"]}},
    {"id": "handful", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["handful", "handfuls"], "de": ["handvoll"]}},
    {"id": "sprig", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["sprig", "sprigs"], "de": ["zweig", "zweige"]}},
    {"id": "stalk", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["stalk", "stalks", "stick", "sticks"], "de": ["stange", "stangen"]}},
    {"id": "leaf", "dimension": "count", "system": "shared", "factor": null, "aliases": {"en": ["leaf", "leaves"], "de": ["blatt", "blätter"]}}
  ]
}
```

Write `secretsauce/units/__init__.py`:
```python
import json
from pathlib import Path
import re
from typing import Any

_UNITS_PATH = Path(__file__).parent / "units.json"
with open(_UNITS_PATH, "r", encoding="utf-8") as f:
    _DATA = json.load(f)

UNITS: dict[str, dict[str, Any]] = {u["id"]: u for u in _DATA["units"]}

# Precompute alias lookup tables
_EXACT_ALIASES: dict[str, dict[str, str]] = {"en": {}, "de": {}}
_LOWER_ALIASES: dict[str, dict[str, str]] = {"en": {}, "de": {}}

for u in _DATA["units"]:
    uid = u["id"]
    for lang in ("en", "de"):
        for alias in u.get("aliases", {}).get(lang, []):
            if len(alias) == 1:
                _EXACT_ALIASES[lang][alias] = uid
            else:
                norm = alias.rstrip(".").strip().lower()
                _LOWER_ALIASES[lang][norm] = uid


def canonical(alias: str, lang: str = "en") -> str | None:
    trimmed = alias.strip().rstrip(".")
    if not trimmed:
        return None
    normalized_lang = "de" if lang.startswith("de") else "en"

    # Single-character alias is case sensitive
    if len(trimmed) == 1:
        if trimmed in _EXACT_ALIASES[normalized_lang]:
            return _EXACT_ALIASES[normalized_lang][trimmed]
        other_lang = "de" if normalized_lang == "en" else "en"
        if trimmed in _EXACT_ALIASES[other_lang]:
            return _EXACT_ALIASES[other_lang][trimmed]
        return None

    lower = trimmed.lower()
    if lower in _LOWER_ALIASES[normalized_lang]:
        return _LOWER_ALIASES[normalized_lang][lower]
    other_lang = "de" if normalized_lang == "en" else "en"
    if lower in _LOWER_ALIASES[other_lang]:
        return _LOWER_ALIASES[other_lang][lower]
    return None


_VULGAR_FRACTIONS = {
    "¼": 0.25,
    "½": 0.5,
    "¾": 0.75,
    "⅐": 1 / 7,
    "⅑": 1 / 9,
    "⅒": 0.1,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅕": 0.2,
    "⅖": 0.4,
    "⅗": 0.6,
    "⅘": 0.8,
    "⅙": 1 / 6,
    "⅚": 5 / 6,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
}

_SUBJECTIVE_PHRASES = [
    "to taste",
    "nach belieben",
    "nach geschmack",
    "etwas",
    "some",
    "a little",
]


def _parse_fraction_str(val_str: str) -> float | None:
    val_str = val_str.strip()
    if not val_str:
        return None
    # Check vulgar fractions
    for vf, num in _VULGAR_FRACTIONS.items():
        if vf in val_str:
            prefix = val_str.replace(vf, "").strip()
            base = float(prefix) if prefix else 0.0
            return base + num

    # Check slash fraction e.g. "1 1/2" or "1/2"
    if "/" in val_str:
        parts = val_str.split()
        if len(parts) == 2:
            whole = float(parts[0])
            frac_parts = parts[1].split("/")
            return whole + float(frac_parts[0]) / float(frac_parts[1])
        elif len(parts) == 1:
            frac_parts = parts[0].split("/")
            return float(frac_parts[0]) / float(frac_parts[1])

    # Check standard decimal
    try:
        return float(val_str.replace(",", "."))
    except ValueError:
        return None


def parse(text: str, lang: str = "en") -> dict[str, Any]:
    raw = text.strip()
    notes: str | None = None

    working = raw
    # Check parenthetical notes at end e.g. "butter (room temp)"
    paren_match = re.search(r"\(([^)]+)\)\s*$", working)
    if paren_match:
        notes = paren_match.group(1).strip()
        working = working[: paren_match.start()].strip()

    # Check comma notes e.g. "1 onion, finely diced"
    if "," in working:
        first, rest = working.split(",", 1)
        # Verify first part is not purely a decimal comma like "1,5 kg flour"
        if not re.match(r"^\d+,\d+\s+[a-zA-Z]", working):
            working = first.strip()
            notes = (rest.strip() if not notes else f"{notes}, {rest.strip()}")

    # Check subjective phrases
    lower_working = working.lower()
    for subj in _SUBJECTIVE_PHRASES:
        if subj in lower_working:
            # e.g. "salt to taste" -> name="salt", notes=subj
            name_part = re.sub(re.escape(subj), "", working, flags=re.IGNORECASE).strip()
            return {
                "raw_text": raw,
                "name": name_part or subj,
                "quantity": None,
                "quantity_max": None,
                "quantity_text": None,
                "unit": None,
                "notes": notes or subj,
            }

    # Range regex (e.g. "2-3", "2 – 3", "2 to 3", "2 bis 3")
    range_regex = r"^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+?)\s*(?:-|–|to|bis)\s*([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$"
    m_range = re.match(range_regex, working, flags=re.IGNORECASE)
    if m_range:
        q1_str, q2_str, remainder = m_range.groups()
        q1 = _parse_fraction_str(q1_str)
        q2 = _parse_fraction_str(q2_str)
        if q1 is not None and q2 is not None:
            # Check if remainder starts with a unit
            words = remainder.split(maxsplit=1)
            if words:
                c_unit = canonical(words[0], lang)
                if c_unit:
                    return {
                        "raw_text": raw,
                        "name": words[1] if len(words) > 1 else "",
                        "quantity": q1,
                        "quantity_max": q2,
                        "quantity_text": f"{q1_str}-{q2_str}".strip(),
                        "unit": c_unit,
                        "notes": notes,
                    }
            return {
                "raw_text": raw,
                "name": remainder.strip(),
                "quantity": q1,
                "quantity_max": q2,
                "quantity_text": f"{q1_str}-{q2_str}".strip(),
                "unit": None,
                "notes": notes,
            }

    # Single quantity regex
    single_regex = r"^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$"
    m_single = re.match(single_regex, working)
    if m_single:
        q_str, remainder = m_single.groups()
        q = _parse_fraction_str(q_str)
        if q is not None:
            words = remainder.split(maxsplit=1)
            if words:
                c_unit = canonical(words[0], lang)
                if c_unit:
                    return {
                        "raw_text": raw,
                        "name": words[1] if len(words) > 1 else "",
                        "quantity": q,
                        "quantity_max": None,
                        "quantity_text": q_str.strip(),
                        "unit": c_unit,
                        "notes": notes,
                    }
            return {
                "raw_text": raw,
                "name": remainder.strip(),
                "quantity": q,
                "quantity_max": None,
                "quantity_text": q_str.strip(),
                "unit": None,
                "notes": notes,
            }

    return {
        "raw_text": raw,
        "name": working,
        "quantity": None,
        "quantity_max": None,
        "quantity_text": None,
        "unit": None,
        "notes": notes,
    }
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_units.py -v`  
Expected: PASS (4 passed)

- [x] **Step 5: Commit**

```bash
git add secretsauce/units/ units.json tests/test_units.py
git commit -m "feat(units): add unit table and canonical alias parsing engine"
```

---

### Task 2: Python Units Conversion, System Targeting & Formatting

**Files:**
- Modify: `secretsauce/units/__init__.py`
- Modify: `tests/test_units.py`

**Interfaces:**
- Produces:
  - `convert(quantity: float, from_unit: str, to_unit: str) -> float`
  - `to_system(quantity: float | None, quantity_max: float | None, unit: str | None, system: str = "metric") -> tuple[float | None, float | None, str | None]`
  - `format(quantity: float | None, quantity_max: float | None, unit: str | None, lang: str = "en", system: str = "metric") -> str`

- [x] **Step 1: Write failing tests for conversions, system targeting, and formatting**

```python
# append to tests/test_units.py
from secretsauce.units import convert, to_system, format as format_unit


def test_convert_mass_and_volume():
    assert convert(1000, "g", "kg") == 1.0
    assert pytest.approx(convert(1, "kg", "g")) == 1000.0
    assert pytest.approx(convert(1, "lb", "oz"), rel=1e-3) == 16.0
    assert pytest.approx(convert(500, "ml", "l")) == 0.5

    # Mismatched dimension raises ValueError
    with pytest.raises(ValueError):
        convert(100, "g", "ml")


def test_convert_temperature():
    # 350 F to C: (350 - 32) * 5 / 9 = 176.666 -> rounded to nearest 5 is 175
    assert convert(350, "f", "c") == 175.0
    # 200 C to F: (200 * 9 / 5) + 32 = 392 -> rounded to nearest 5 is 390
    assert convert(200, "c", "f") == 390.0


def test_to_system_metric():
    # Mass: <1000g -> g, >=1000g -> kg
    q, q_max, u = to_system(453.592, None, "lb", "metric")  # 1 lb
    assert u == "g"
    assert q == 450.0  # nearest 10 below 1000

    q2, _, u2 = to_system(2.20462, None, "lb", "metric")  # 1 kg
    assert u2 == "kg"
    assert q2 == 1.0  # rounded to 0.05 step

    # Volume: >=1000ml -> l, <1000ml -> ml
    q3, _, u3 = to_system(4, None, "cup", "metric")  # 960 ml
    assert u3 == "ml"
    assert q3 == 960.0

    # Shared units pass through
    assert to_system(2, None, "tbsp", "metric") == (2.0, None, "tbsp")
    assert to_system(3, None, "piece", "metric") == (3.0, None, "piece")


def test_to_system_us_customary():
    # Mass: >=16oz -> lb, <16oz -> oz
    q, _, u = to_system(1000, None, "g", "us_customary")
    assert u == "lb"
    assert pytest.approx(q, rel=1e-2) == 2.2

    # Volume: >=60ml -> cup, >=15ml -> tbsp, <15ml -> tsp
    q2, _, u2 = to_system(240, None, "ml", "us_customary")
    assert u2 == "cup"
    assert pytest.approx(q2, rel=1e-2) == 1.0


def test_format_vulgar_fractions():
    # US customary fraction formatting within 4%
    assert format_unit(0.5, None, "cup", "en", "us_customary") == "½ cup"
    assert format_unit(0.25, None, "tsp", "en", "us_customary") == "¼ tsp"
    assert format_unit(1.5, None, "tbsp", "en", "us_customary") == "1 ½ tbsp"
    # Range formatting
    assert format_unit(2.0, 3.0, "clove", "en", "us_customary") == "2-3 clove"
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_units.py -k "test_convert or test_to_system or test_format" -v`  
Expected: FAIL (cannot import name 'convert')

- [x] **Step 3: Implement conversion, targeting, and formatting logic**

Add to `secretsauce/units/__init__.py`:
```python
def convert(quantity: float, from_unit: str, to_unit: str) -> float:
    if from_unit == to_unit:
        return quantity
    u_from = UNITS.get(from_unit)
    u_to = UNITS.get(to_unit)
    if not u_from or not u_to:
        raise ValueError(f"Unknown unit: {from_unit} or {to_unit}")
    if u_from["dimension"] != u_to["dimension"]:
        raise ValueError(f"Cannot convert across dimensions: {u_from['dimension']} to {u_to['dimension']}")

    # Temperature conversion
    if u_from["dimension"] == "temperature":
        if from_unit == "f" and to_unit == "c":
            val = (quantity - 32.0) * 5.0 / 9.0
            return round(val / 5.0) * 5.0
        elif from_unit == "c" and to_unit == "f":
            val = (quantity * 9.0 / 5.0) + 32.0
            return round(val / 5.0) * 5.0
        return quantity

    # Factor conversion via base unit (g or ml)
    factor_from = u_from["factor"]
    factor_to = u_to["factor"]
    if factor_from is None or factor_to is None:
        return quantity

    base_val = quantity * factor_from
    return base_val / factor_to


def _round_metric(val: float, unit_id: str) -> float:
    if unit_id in ("kg", "l"):
        # 0.05 step
        return round(round(val / 0.05) * 0.05, 4)
    if val < 20.0:
        return round(val)
    if val < 200.0:
        return round(val / 5.0) * 5.0
    if val < 1000.0:
        return round(val / 10.0) * 10.0
    return round(val)


def to_system(
    quantity: float | None,
    quantity_max: float | None,
    unit: str | None,
    system: str = "metric",
) -> tuple[float | None, float | None, str | None]:
    if quantity is None or unit is None:
        return quantity, quantity_max, unit

    u = UNITS.get(unit)
    if not u or u["system"] == "shared" or u["dimension"] == "count":
        return quantity, quantity_max, unit

    target_system = "metric" if system == "metric" else "us_customary"

    def _convert_single(val: float) -> tuple[float, str]:
        dim = u["dimension"]
        if target_system == "metric":
            if dim == "mass":
                val_g = convert(val, unit, "g")
                if val_g >= 1000.0:
                    return _round_metric(val_g / 1000.0, "kg"), "kg"
                return _round_metric(val_g, "g"), "g"
            elif dim == "volume":
                val_ml = convert(val, unit, "ml")
                if val_ml >= 1000.0:
                    return _round_metric(val_ml / 1000.0, "l"), "l"
                return _round_metric(val_ml, "ml"), "ml"
            elif dim == "temperature":
                return convert(val, unit, "c"), "c"
        else:
            # us_customary
            if dim == "mass":
                val_oz = convert(val, unit, "oz")
                if val_oz >= 16.0:
                    return round(val_oz / 16.0, 2), "lb"
                return round(val_oz, 1), "oz"
            elif dim == "volume":
                val_ml = convert(val, unit, "ml")
                if val_ml >= 60.0:
                    return round(val_ml / 240.0, 2), "cup"
                elif val_ml >= 15.0:
                    return round(val_ml / 15.0, 1), "tbsp"
                else:
                    return round(val_ml / 5.0, 1), "tsp"
            elif dim == "temperature":
                return convert(val, unit, "f"), "f"
        return val, unit

    new_q, new_unit = _convert_single(quantity)
    new_q_max: float | None = None
    if quantity_max is not None:
        new_q_max, _ = _convert_single(quantity_max)

    return new_q, new_q_max, new_unit


_FRACTIONS = [
    (1 / 8, "⅛"),
    (1 / 4, "¼"),
    (1 / 3, "⅓"),
    (1 / 2, "½"),
    (2 / 3, "⅔"),
    (3 / 4, "¾"),
]


def format(
    quantity: float | None,
    quantity_max: float | None,
    unit: str | None,
    lang: str = "en",
    system: str = "metric",
) -> str:
    if quantity is None:
        return ""

    def _format_num(val: float) -> str:
        if system == "us_customary":
            whole = int(val)
            remainder = val - whole
            for frac_val, symbol in _FRACTIONS:
                if abs(remainder - frac_val) <= 0.04:
                    return f"{whole} {symbol}".strip() if whole else symbol
            if abs(remainder) < 0.04:
                return str(whole)
            if abs(remainder - 1.0) < 0.04:
                return str(whole + 1)
            # Default to 1 decimal
            return f"{val:.1f}".rstrip("0").rstrip(".")
        else:
            if val.is_integer():
                return str(int(val))
            formatted = f"{val:.2f}".rstrip("0").rstrip(".")
            if lang.startswith("de"):
                return formatted.replace(".", ",")
            return formatted

    q_str = _format_num(quantity)
    if quantity_max is not None:
        q_max_str = _format_num(quantity_max)
        res = f"{q_str}-{q_max_str}"
    else:
        res = q_str

    if unit:
        return f"{res} {unit}".strip()
    return res
```

- [x] **Step 4: Run tests to verify all tests pass**

Run: `uv run pytest tests/test_units.py -v`  
Expected: PASS (8 passed)

- [x] **Step 5: Commit**

```bash
git add secretsauce/units/__init__.py tests/test_units.py
git commit -m "feat(units): add conversion, system targeting, and format functions"
```

---

### Task 3: Browser Units Package (`@secretsauce/units`) & Import Map Integration

**Files:**
- Create: `shell/packages/units/package.json`
- Create: `shell/packages/units/tsconfig.json`
- Create: `shell/packages/units/src/index.ts`
- Create: `shell/packages/units/tests/units.spec.ts`
- Modify: `shell/scripts/vendor.ts`
- Modify: `secretsauce/api/routes/pwa.py`

**Interfaces:**
- Produces:
  - `@secretsauce/units`: exports `parse(text: string, lang?: string): Ingredient` and `format(quantity, quantity_max, unit, lang, system): string`
  - Vendored bundle: `secretsauce/static/vendor/secretsauce-units.js`
  - Import map entry: `"@secretsauce/units": "/static/vendor/secretsauce-units.js"`

- [x] **Step 1: Write failing Vitest test for browser `@secretsauce/units`**

Write `shell/packages/units/tests/units.spec.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parse, format } from '../src/index'

describe('@secretsauce/units browser package', () => {
  it('parses vulgar fractions and units', () => {
    const res = parse('½ cup sugar', 'en')
    expect(res.quantity).toBe(0.5)
    expect(res.unit).toBe('cup')
    expect(res.name).toBe('sugar')
  })

  it('parses ranges and notes', () => {
    const res = parse('2-3 cloves garlic (minced)', 'en')
    expect(res.quantity).toBe(2)
    expect(res.quantityMax).toBe(3)
    expect(res.unit).toBe('clove')
    expect(res.name).toBe('garlic')
    expect(res.notes).toBe('minced')
  })

  it('formats vulgar fractions in US customary', () => {
    expect(format(0.5, null, 'cup', 'en', 'us_customary')).toBe('½ cup')
    expect(format(1.5, null, 'tbsp', 'en', 'us_customary')).toBe('1 ½ tbsp')
  })
})
```

- [x] **Step 2: Run Vitest to verify it fails**

Run: `pnpm --prefix shell test shell/packages/units/tests/units.spec.ts`  
Expected: FAIL (Cannot find module '../src/index')

- [x] **Step 3: Implement `shell/packages/units`**

Write `shell/packages/units/package.json`:
```json
{
  "name": "@secretsauce/units",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

Write `shell/packages/units/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

Write `shell/packages/units/src/index.ts`:
```typescript
export interface Ingredient {
  id?: string
  rawText: string
  name: string
  quantity: number | null
  quantityMax: number | null
  quantityText: string | null
  unit: string | null
  notes: string | null
}

const VULGAR_MAP: Record<string, number> = {
  '¼': 0.25, '½': 0.5, '¾': 0.75,
  '⅓': 1 / 3, '⅔': 2 / 3,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
}

const ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gramm: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml',
  l: 'l', liter: 'l', litre: 'l',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp', t: 'tsp', tl: 'tsp',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', t_upper: 'tbsp', el: 'tbsp',
  cup: 'cup', cups: 'cup',
  clove: 'clove', cloves: 'clove',
  piece: 'piece', pieces: 'piece', pc: 'piece', pcs: 'piece', stück: 'piece', stk: 'piece'
}

export function canonical(alias: string, _lang = 'en'): string | null {
  const trimmed = alias.trim().replace(/\.$/, '')
  if (!trimmed) return null
  if (trimmed === 'T') return 'tbsp'
  if (trimmed === 't') return 'tsp'
  const lower = trimmed.toLowerCase()
  return ALIASES[lower] || null
}

function parseFraction(valStr: string): number | null {
  const s = valStr.trim()
  if (!s) return null
  for (const [vf, num] of Object.entries(VULGAR_MAP)) {
    if (s.includes(vf)) {
      const prefix = s.replace(vf, '').trim()
      const base = prefix ? parseFloat(prefix) : 0
      return base + num
    }
  }
  if (s.includes('/')) {
    const parts = s.split(/\s+/)
    if (parts.length === 2) {
      const [n, d] = parts[1].split('/').map(Number)
      return parseFloat(parts[0]) + n / d
    } else {
      const [n, d] = parts[0].split('/').map(Number)
      return n / d
    }
  }
  const parsed = parseFloat(s.replace(',', '.'))
  return isNaN(parsed) ? null : parsed
}

export function parse(text: string, lang = 'en'): Ingredient {
  const raw = text.trim()
  let notes: string | null = null
  let working = raw

  const parenMatch = working.match(/\(([^)]+)\)\s*$/)
  if (parenMatch) {
    notes = parenMatch[1].trim()
    working = working.slice(0, parenMatch.index).trim()
  }

  if (working.includes(',') && !working.match(/^\d+,\d+\s+[a-zA-Z]/)) {
    const [first, ...rest] = working.split(',')
    working = first.trim()
    const restText = rest.join(',').trim()
    notes = notes ? `${notes}, ${restText}` : restText
  }

  const rangeMatch = working.match(/^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+?)\s*(?:-|–|to|bis)\s*([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/i)
  if (rangeMatch) {
    const [, q1Str, q2Str, remainder] = rangeMatch
    const q1 = parseFraction(q1Str)
    const q2 = parseFraction(q2Str)
    if (q1 !== null && q2 !== null) {
      const words = remainder.split(/\s+/)
      const cUnit = words.length > 0 ? canonical(words[0], lang) : null
      return {
        rawText: raw,
        name: cUnit ? words.slice(1).join(' ') : remainder.trim(),
        quantity: q1,
        quantityMax: q2,
        quantityText: `${q1Str}-${q2Str}`.trim(),
        unit: cUnit,
        notes
      }
    }
  }

  const singleMatch = working.match(/^([\d.,/\s¼½¾⅓⅔⅛⅜⅝⅞]+)\s*(.*)$/)
  if (singleMatch) {
    const [, qStr, remainder] = singleMatch
    const q = parseFraction(qStr)
    if (q !== null) {
      const words = remainder.split(/\s+/)
      const cUnit = words.length > 0 ? canonical(words[0], lang) : null
      return {
        rawText: raw,
        name: cUnit ? words.slice(1).join(' ') : remainder.trim(),
        quantity: q,
        quantityMax: null,
        quantityText: qStr.trim(),
        unit: cUnit,
        notes
      }
    }
  }

  return {
    rawText: raw,
    name: working,
    quantity: null,
    quantityMax: null,
    quantityText: null,
    unit: null,
    notes
  }
}

const FRACTION_DECIMALS: Array<[number, string]> = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'],
  [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾']
]

export function format(
  quantity: number | null,
  quantityMax: number | null,
  unit: string | null,
  lang = 'en',
  system = 'metric'
): string {
  if (quantity === null) return ''

  function formatVal(val: number): string {
    if (system === 'us_customary') {
      const whole = Math.floor(val)
      const rem = val - whole
      for (const [frac, sym] of FRACTION_DECIMALS) {
        if (Math.abs(rem - frac) <= 0.04) {
          return whole ? `${whole} ${sym}` : sym
        }
      }
      if (Math.abs(rem) < 0.04) return `${whole}`
      if (Math.abs(rem - 1) < 0.04) return `${whole + 1}`
      return val.toFixed(1).replace(/\.0$/, '')
    } else {
      if (Number.isInteger(val)) return `${val}`
      const s = val.toFixed(2).replace(/\.?0+$/, '')
      return lang.startsWith('de') ? s.replace('.', ',') : s
    }
  }

  const qStr = formatVal(quantity)
  const full = quantityMax !== null ? `${qStr}-${formatVal(quantityMax)}` : qStr
  return unit ? `${full} ${unit}`.trim() : full
}
```

Update `shell/scripts/vendor.ts` to vendor `@secretsauce/units`:
```typescript
// in shell/scripts/vendor.ts, after vendorUIPath:
const vendorUnitsPath = path.join(vendorDir, 'secretsauce-units.js')
if (!fs.existsSync(vendorUnitsPath)) {
  fs.writeFileSync(
    vendorUnitsPath,
    '// SecretSauce Units runtime vendor bundle\nexport * from "./secretsauce-units.js";\n',
    'utf-8'
  )
}
```

Update `secretsauce/api/routes/pwa.py` in `render_index_html`:
```python
# In secretsauce/api/routes/pwa.py, add "@secretsauce/units" to the injected import map:
"""
    <script type="importmap">
    {
      "imports": {
        "vue": "{base_path}static/vendor/vue.js",
        "pinia": "{base_path}static/vendor/pinia.js",
        "vue-router": "{base_path}static/vendor/vue-router.js",
        "@secretsauce/ui": "{base_path}static/vendor/secretsauce-ui.js",
        "@secretsauce/units": "{base_path}static/vendor/secretsauce-units.js"
      }
    }
    </script>
"""
```

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm --prefix shell test`  
Expected: PASS (all tests including units.spec.ts passing)  
Run: `uv run pytest`  
Expected: PASS (78+ kernel tests passing)

- [x] **Step 5: Commit**

```bash
git add shell/packages/units/ shell/scripts/vendor.ts secretsauce/api/routes/pwa.py
git commit -m "feat(units): add @secretsauce/units browser package and vendor mapping"
```

---

### Task 4: Core Plugin Search Path Discovery & Plugin UI Serving Endpoints

**Files:**
- Modify: `secretsauce/plugins/loader.py`
- Modify: `secretsauce/boot.py`
- Modify: `secretsauce/api/routes/plugins.py`
- Create: `tests/test_stage6_plugins.py`

**Interfaces:**
- Consumes:
  - `PluginRegistry`
  - Discovered plugin manifest `ui` and `ui_css` paths
- Produces:
  - `GET /api/plugins/{id}/ui.js` -> serves ES module JS with immutable caching header if `?v=` present
  - `GET /api/plugins/{id}/ui.css` -> serves stylesheet CSS if configured

- [x] **Step 1: Write failing tests for plugin UI serving and directory confinement**

Write `tests/test_stage6_plugins.py`:
```python
import pytest
from httpx import ASGITransport, AsyncClient
from secretsauce.app import create_app
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_plugin_ui_serving_and_confinement(tmp_path):
    # Setup test plugin with a ui file
    plugin_dir = tmp_path / "testplugin"
    plugin_dir.mkdir()
    ui_dist = plugin_dir / "ui" / "dist"
    ui_dist.mkdir(parents=True)
    ui_file = ui_dist / "index.js"
    ui_file.write_text("export default function activate() {}", encoding="utf-8")

    init_file = plugin_dir / "__init__.py"
    init_file.write_text(
        """PLUGIN = {
    'id': 'testplugin',
    'version': '1.0.0',
    'ui': 'ui/dist/index.js'
}
async def setup(ctx):
    pass
""",
        encoding="utf-8",
    )

    kernel = await make_kernel(tmp_path, extra_plugins_dirs=[tmp_path])
    app = create_app(kernel)
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Non-existent plugin
        r404 = await client.get("/api/plugins/nonexistent/ui.js")
        assert r404.status_code == 404

        # Versioned request has immutable caching
        res = await client.get("/api/plugins/testplugin/ui.js?v=1.0.0_abc")
        assert res.status_code == 200
        assert "export default function activate()" in res.text
        assert "max-age=31536000" in res.headers.get("cache-control", "")
        assert "immutable" in res.headers.get("cache-control", "")

        # Unversioned request has no-cache
        res_unv = await client.get("/api/plugins/testplugin/ui.js")
        assert res_unv.status_code == 200
        assert "no-cache" in res_unv.headers.get("cache-control", "")
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_stage6_plugins.py -v`  
Expected: FAIL (make_kernel does not accept extra_plugins_dirs or 404/405 for /api/plugins/testplugin/ui.js)

- [x] **Step 3: Implement plugin search paths, plugin_dir recording, and UI serving endpoints**

In `secretsauce/plugins/loader.py`:
Record `plugin_dir` in `self.registry.record_plugin_dir(plugin_id, dir_path)` or store `module_path.parent` in the plugin record.

In `secretsauce/boot.py`:
Add core plugins path:
```python
core_plugins_dir = os.environ.get("SECRETSAUCE_CORE_PLUGINS_DIR")
if core_plugins_dir and Path(core_plugins_dir).exists():
    search_paths.append(Path(core_plugins_dir))
elif Path("/app/plugins").exists():
    search_paths.append(Path("/app/plugins"))
elif Path("plugins").exists():
    search_paths.append(Path("plugins").resolve())
```

In `secretsauce/api/routes/plugins.py`:
Add endpoints:
```python
from fastapi.responses import FileResponse, Response


@router.get("/{plugin_id}/ui.js")
async def get_plugin_ui_js(plugin_id: str, request: Request, v: str | None = None) -> Response:
    kernel = request.app.state.kernel
    plugin = await kernel.registry.get(plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")

    manifest = plugin.manifest
    ui_rel = manifest.get("ui")
    if not ui_rel:
        raise HTTPException(status_code=404, detail="Plugin has no UI")

    plugin_dir = kernel.registry.get_plugin_dir(plugin_id)
    if not plugin_dir:
        raise HTTPException(status_code=404, detail="Plugin directory not found")

    target_path = (plugin_dir / ui_rel).resolve()
    # Path confinement check
    try:
        target_path.relative_to(plugin_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="UI bundle file not found")

    cache_control = (
        "public, max-age=31536000, immutable" if v else "no-cache"
    )
    return FileResponse(
        target_path,
        media_type="text/javascript",
        headers={"Cache-Control": cache_control},
    )


@router.get("/{plugin_id}/ui.css")
async def get_plugin_ui_css(plugin_id: str, request: Request, v: str | None = None) -> Response:
    kernel = request.app.state.kernel
    plugin = await kernel.registry.get(plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")

    ui_css_rel = plugin.manifest.get("ui_css")
    if not ui_css_rel:
        raise HTTPException(status_code=404, detail="Plugin has no UI stylesheet")

    plugin_dir = kernel.registry.get_plugin_dir(plugin_id)
    if not plugin_dir:
        raise HTTPException(status_code=404, detail="Plugin directory not found")

    target_path = (plugin_dir / ui_css_rel).resolve()
    try:
        target_path.relative_to(plugin_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="UI stylesheet not found")

    cache_control = (
        "public, max-age=31536000, immutable" if v else "no-cache"
    )
    return FileResponse(
        target_path,
        media_type="text/css",
        headers={"Cache-Control": cache_control},
    )
```

- [x] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/test_stage6_plugins.py -v`  
Expected: PASS  
Run: `uv run pytest tests/test_plugins.py -v`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add secretsauce/boot.py secretsauce/plugins/loader.py secretsauce/plugins/registry.py secretsauce/api/routes/plugins.py tests/test_stage6_plugins.py
git commit -m "feat(plugins): add plugin search paths and ui.js/ui.css serving endpoints"
```

---

### Task 5: `units` Core Plugin Implementation

**Files:**
- Create: `plugins/units/__init__.py`
- Modify: `tests/test_stage6_plugins.py`

**Interfaces:**
- Consumes:
  - `secretsauce.units.to_system`
  - `ctx.household.get("units", "metric")`
  - `ctx.hook("recipe:create", ...)`
  - `ctx.hook("recipe:update", ...)`
  - `ctx.command("reconvert-all", ...)`
- Produces:
  - Active `units` plugin standardizing recipe ingredients

- [x] **Step 1: Write failing tests for `units` plugin hooks and command**

Add to `tests/test_stage6_plugins.py`:
```python
@pytest.mark.asyncio
async def test_units_plugin_hooks_and_reconvert(tmp_path):
    kernel = await make_kernel(tmp_path, extra_plugins_dirs=[Path("plugins").resolve()])
    await kernel.registry.enable("units")

    # Set household preference to metric
    await kernel.household.set("units", "metric")

    # Create recipe with US customary ingredients
    draft = {
        "title": "Pancake",
        "ingredients": [
            {
                "id": "ing-1",
                "raw_text": "2 cups flour",
                "quantity": 2.0,
                "quantity_max": None,
                "quantity_text": "2",
                "unit": "cup",
                "name": "flour",
                "notes": None,
            }
        ],
        "steps": [{"id": "s1", "instruction": "Mix"}],
    }
    recipe = await kernel.recipes.create(draft)

    # Ingredients should be converted to metric ml (2 cups = 480 ml)
    ing = recipe.ingredients[0]
    assert ing["unit"] == "ml"
    assert ing["quantity"] == 480.0
    # raw_text preserved!
    assert ing["raw_text"] == "2 cups flour"

    # Now change household preference to us_customary and run reconvert-all command
    await kernel.household.set("units", "us_customary")
    cmd = kernel.context_factory("units").command
    reconvert_fn = kernel.services.get_command("units", "reconvert-all")
    assert reconvert_fn is not None
    await reconvert_fn(kernel.context_factory("units"))

    # Recipe should be updated to cups
    updated = await kernel.recipes.get(recipe.id)
    assert updated.ingredients[0]["unit"] == "cup"
    assert updated.ingredients[0]["quantity"] == 2.0
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_stage6_plugins.py -k test_units_plugin_hooks_and_reconvert -v`  
Expected: FAIL (Plugin 'units' not found)

- [x] **Step 3: Implement `plugins/units/__init__.py`**

Write `plugins/units/__init__.py`:
```python
from typing import Any
from secretsauce import units
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "units",
    "name": "Units System",
    "version": "1.0.0",
    "description": "Standardizes recipe ingredients to the household unit system.",
}


async def convert_ingredients(
    draft: dict[str, Any],
    current: dict[str, Any] | None,
    ctx: PluginContext,
) -> None:
    system = await ctx.household.get("units", "metric")
    ingredients = draft.get("ingredients", [])
    for ing in ingredients:
        q = ing.get("quantity")
        q_max = ing.get("quantity_max")
        u = ing.get("unit")
        new_q, new_q_max, new_u = units.to_system(q, q_max, u, system)
        ing["quantity"] = new_q
        ing["quantity_max"] = new_q_max
        ing["unit"] = new_u


async def reconvert_all(ctx: PluginContext) -> None:
    system = await ctx.household.get("units", "metric")
    recipes_list = await ctx.recipes.list(limit=1000)
    for r in recipes_list.items:
        changed = False
        new_ingredients = []
        for ing in r.ingredients:
            ing_copy = dict(ing)
            q = ing_copy.get("quantity")
            q_max = ing_copy.get("quantity_max")
            u = ing_copy.get("unit")
            new_q, new_q_max, new_u = units.to_system(q, q_max, u, system)
            if new_q != q or new_q_max != q_max or new_u != u:
                changed = True
                ing_copy["quantity"] = new_q
                ing_copy["quantity_max"] = new_q_max
                ing_copy["unit"] = new_u
            new_ingredients.append(ing_copy)

        if changed:
            await ctx.recipes.update(
                r.id,
                {"ingredients": new_ingredients, "revision": r.revision},
                origin="plugin:units",
            )


async def setup(ctx: PluginContext) -> None:
    ctx.hook("recipe:create", convert_ingredients)
    ctx.hook("recipe:update", convert_ingredients)
    ctx.command("reconvert-all", reconvert_all, title="Re-convert all recipes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_stage6_plugins.py -k test_units_plugin_hooks_and_reconvert -v`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add plugins/units/ tests/test_stage6_plugins.py
git commit -m "feat(units): implement units core plugin with hooks and reconvert command"
```

---

### Task 6: `recurring` Core Plugin Backend & Materializer

**Files:**
- Create: `plugins/recurring/migrations/0001_rules.sql`
- Create: `plugins/recurring/__init__.py`
- Modify: `tests/test_stage6_plugins.py`

**Interfaces:**
- Consumes:
  - `ctx.db` (migrations runner & table access)
  - `ctx.schedule.create`
  - `ctx.recipes.delete` FK cascade
- Produces:
  - SQLite table `plugin_recurring_rules`
  - Background schedule materializer populating next 14 days
  - REST endpoints `/api/x/recurring/rules`

- [x] **Step 1: Write failing tests for `recurring` plugin migration, rules CRUD, and schedule materializer**

Add to `tests/test_stage6_plugins.py`:
```python
from datetime import date, timedelta


@pytest.mark.asyncio
async def test_recurring_plugin_backend(tmp_path):
    kernel = await make_kernel(tmp_path, extra_plugins_dirs=[Path("plugins").resolve()])
    await kernel.registry.enable("recurring")

    # Verify migration applied
    table_check = await kernel.db.fetch_one(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_recurring_rules'"
    )
    assert table_check is not None

    # Create a recipe
    recipe = await kernel.recipes.create({"title": "Wednesday Pasta"})

    # Setup context and create a recurring rule for Wednesday
    target_weekday = 2  # Wednesday (0=Monday)
    ctx = kernel.context_factory("recurring")

    rule_id = "test-rule-1"
    await ctx.db.execute(
        """INSERT INTO plugin_recurring_rules (id, weekday, meal_type, recipe_id, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (rule_id, target_weekday, "dinner", recipe.id, "2026-09-11T12:00:00Z"),
    )

    # Run materialize function directly
    materialize_fn = kernel.services.get_command("recurring", "materialize")
    assert materialize_fn is not None
    await materialize_fn(ctx)

    # Verify schedule entries created for the upcoming Wednesdays in next 14 days
    today = date.today()
    wednesdays = [
        today + timedelta(days=i)
        for i in range(14)
        if (today + timedelta(days=i)).weekday() == target_weekday
    ]
    assert len(wednesdays) in (2, 3)

    for wed in wednesdays:
        sched = await kernel.schedule.get_for_date(wed.isoformat())
        assert any(item["recipe_id"] == recipe.id and item["meal_type"] == "dinner" for item in sched)

    # Deleting recipe cascades and removes recurring rule
    await kernel.recipes.delete(recipe.id)
    rule_after = await ctx.db.fetch_one(
        "SELECT * FROM plugin_recurring_rules WHERE id = ?", (rule_id,)
    )
    assert rule_after is None
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_stage6_plugins.py -k test_recurring_plugin_backend -v`  
Expected: FAIL (Plugin 'recurring' not found)

- [x] **Step 3: Implement migration and `plugins/recurring/__init__.py`**

Write `plugins/recurring/migrations/0001_rules.sql`:
```sql
CREATE TABLE plugin_recurring_rules (
    id TEXT PRIMARY KEY,
    weekday INTEGER NOT NULL,
    meal_type TEXT NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_recurring_rules_weekday ON plugin_recurring_rules(weekday);
```

Write `plugins/recurring/__init__.py`:
```python
import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any
import uuid
from fastapi import APIRouter, HTTPException, Request
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "recurring",
    "name": "Recurring Meals",
    "version": "1.0.0",
    "schema": 1,
    "ui": "ui/dist/index.js",
    "ui_api": 1,
}

router = APIRouter(prefix="/api/x/recurring", tags=["recurring"])


@router.get("/rules")
async def list_rules(request: Request) -> list[dict[str, Any]]:
    kernel = request.app.state.kernel
    rows = await kernel.db.fetch_all(
        """SELECT r.id, r.weekday, r.meal_type, r.recipe_id, r.created_at, rec.title as recipe_title
           FROM plugin_recurring_rules r
           JOIN recipes rec ON r.recipe_id = rec.id
           ORDER BY r.weekday, r.meal_type"""
    )
    return [dict(row) for row in rows]


@router.post("/rules")
async def create_rule(data: dict[str, Any], request: Request) -> dict[str, Any]:
    kernel = request.app.state.kernel
    rule_id = str(uuid.uuid4())
    weekday = int(data["weekday"])
    meal_type = str(data["meal_type"])
    recipe_id = str(data["recipe_id"])
    now = datetime.now(timezone.utc).isoformat()

    recipe = await kernel.recipes.get(recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    await kernel.db.execute(
        """INSERT INTO plugin_recurring_rules (id, weekday, meal_type, recipe_id, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (rule_id, weekday, meal_type, recipe_id, now),
    )
    return {
        "id": rule_id,
        "weekday": weekday,
        "meal_type": meal_type,
        "recipe_id": recipe_id,
        "recipe_title": recipe.title,
        "created_at": now,
    }


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, request: Request) -> dict[str, bool]:
    kernel = request.app.state.kernel
    await kernel.db.execute("DELETE FROM plugin_recurring_rules WHERE id = ?", (rule_id,))
    return {"ok": True}


async def materialize_rules(ctx: PluginContext) -> None:
    rules = await ctx.db.fetch_all("SELECT * FROM plugin_recurring_rules")
    if not rules:
        return

    today = date.today()
    for i in range(14):
        target_date = today + timedelta(days=i)
        target_iso = target_date.isoformat()
        current_schedule = await ctx.schedule.get_for_date(target_iso)
        planned_meals = {s["meal_type"] for s in current_schedule}

        for rule in rules:
            if rule["weekday"] == target_date.weekday():
                if rule["meal_type"] not in planned_meals:
                    await ctx.schedule.create(
                        {
                            "date": target_iso,
                            "meal_type": rule["meal_type"],
                            "recipe_id": rule["recipe_id"],
                        },
                        origin="plugin:recurring",
                    )
                    planned_meals.add(rule["meal_type"])


async def background_loop(ctx: PluginContext) -> None:
    while True:
        try:
            await materialize_rules(ctx)
        except Exception:
            pass
        await asyncio.sleep(3600)


async def setup(ctx: PluginContext) -> None:
    ctx.routes.mount(router)
    ctx.command("materialize", materialize_rules, title="Materialize recurring meals")
    ctx.background(background_loop(ctx))
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_stage6_plugins.py -k test_recurring_plugin_backend -v`  
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add plugins/recurring/ tests/test_stage6_plugins.py
git commit -m "feat(recurring): implement recurring meals plugin with rules table and materializer"
```

---

### Task 7: Plugin UI Build Pipeline & `recurring` UI Bundle

**Files:**
- Create: `plugins/recurring/ui/package.json`
- Create: `plugins/recurring/ui/src/index.ts`
- Create: `plugins/recurring/ui/src/RecurringSettings.vue`
- Create: `shell/scripts/build-plugins.ts`
- Modify: `shell/package.json`

**Interfaces:**
- Consumes:
  - `@secretsauce/ui` (SecretSauceUI interface)
  - PrimeVue components
- Produces:
  - `pnpm --prefix shell build:plugins`
  - `plugins/recurring/ui/dist/index.js`

- [x] **Step 1: Write plugin build script `shell/scripts/build-plugins.ts`**

Write `shell/scripts/build-plugins.ts`:
```typescript
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import vue from '@vitejs/plugin-vue'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginsRoot = path.resolve(__dirname, '../../plugins')

async function buildPlugins() {
  if (!fs.existsSync(pluginsRoot)) {
    console.log('No plugins directory found, skipping.')
    return
  }

  const entries = fs.readdirSync(pluginsRoot, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const pluginId = entry.name
    const uiSrc = path.join(pluginsRoot, pluginId, 'ui', 'src', 'index.ts')
    if (!fs.existsSync(uiSrc)) continue

    const outDir = path.join(pluginsRoot, pluginId, 'ui', 'dist')
    console.log(`Building plugin UI for: ${pluginId} -> ${outDir}`)

    await build({
      plugins: [vue()],
      build: {
        lib: {
          entry: uiSrc,
          formats: ['es'],
          fileName: () => 'index.js'
        },
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          external: [
            'vue',
            'pinia',
            'vue-router',
            '@secretsauce/ui',
            '@secretsauce/units',
            /^primevue\//,
            /^@primevue\//,
            /^@primeuix\//
          ]
        }
      }
    })
  }
}

buildPlugins().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [x] **Step 2: Add `build:plugins` to `shell/package.json`**

In `shell/package.json`:
```json
"scripts": {
  "build:plugins": "tsx scripts/build-plugins.ts",
  "build": "pnpm build:plugins && vite build && pnpm build:sw && tsx scripts/vendor.ts"
}
```

- [x] **Step 3: Implement `recurring/ui` Vue component and activator**

Write `plugins/recurring/ui/package.json`:
```json
{
  "name": "@secretsauce/plugin-recurring-ui",
  "version": "1.0.0",
  "private": true
}
```

Write `plugins/recurring/ui/src/RecurringSettings.vue`:
```vue
<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">Recurring Meals</h3>
      <Button label="Materialize Now" icon="pi pi-refresh" severity="secondary" @click="triggerMaterialize" />
    </div>
    <div v-if="loading" class="text-surface-500">Loading rules...</div>
    <div v-else-if="rules.length === 0" class="text-surface-500">No recurring rules configured.</div>
    <div v-else class="space-y-2">
      <div
        v-for="rule in rules"
        :key="rule.id"
        class="flex items-center justify-between p-3 border rounded border-surface-200 dark:border-surface-700"
      >
        <div>
          <span class="font-medium text-surface-800 dark:text-surface-100">{{ weekdayName(rule.weekday) }}</span>
          <span class="ml-2 text-sm text-surface-500">{{ rule.meal_type }}:</span>
          <span class="ml-1 text-sm font-semibold">{{ rule.recipe_title }}</span>
        </div>
        <Button icon="pi pi-trash" severity="danger" text @click="deleteRule(rule.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Button from 'primevue/button'
import type { SecretSauceUI } from '@secretsauce/ui'

const props = defineProps<{ ss: SecretSauceUI }>()

interface Rule {
  id: string
  weekday: number
  meal_type: string
  recipe_id: string
  recipe_title: string
}

const rules = ref<Rule[]>([])
const loading = ref(true)

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
function weekdayName(day: number): string {
  return WEEKDAYS[day] || `Day ${day}`
}

async function loadRules() {
  loading.value = true
  try {
    rules.value = await props.ss.api.get<Rule[]>('/api/x/recurring/rules')
  } finally {
    loading.value = false
  }
}

async function deleteRule(id: string) {
  await props.ss.api.delete(`/api/x/recurring/rules/${id}`)
  await loadRules()
}

async function triggerMaterialize() {
  props.ss.notify({ level: 'info', message: 'Materializing recurring meals...' })
  await props.ss.api.post('/api/x/recurring/materialize', {})
  props.ss.notify({ level: 'success', message: 'Schedule updated.' })
}

onMounted(() => {
  loadRules()
})
</script>
```

Write `plugins/recurring/ui/src/index.ts`:
```typescript
import type { SecretSauceUI } from '@secretsauce/ui'
import RecurringSettings from './RecurringSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.settings.section({
    id: 'recurring',
    title: 'Recurring Meals',
    component: RecurringSettings
  })
}
```

- [x] **Step 4: Run build and verify output bundle**

Run: `pnpm --prefix shell build:plugins`  
Expected: `plugins/recurring/ui/dist/index.js` is created successfully.

- [x] **Step 5: Commit**

```bash
git add plugins/recurring/ui/ shell/scripts/build-plugins.ts shell/package.json
git commit -m "feat(recurring): add recurring settings UI bundle and plugin build script"
```

---

### Task 8: End-to-End Build & Test Suite Verification

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes: All Phase 3A deliverables
- Produces: Full passing suite across Python, TypeScript, and Vite production builds

- [x] **Step 1: Run full Python test suite**

Run: `uv run pytest`  
Expected: PASS (All tests passing)

- [x] **Step 2: Run full Frontend Vitest suite**

Run: `pnpm --prefix shell test`  
Expected: PASS (All unit and component tests passing)

- [x] **Step 3: Run full Production Build**

Run: `pnpm --prefix shell build`  
Expected: PASS (Vite bundles shell, plugins, vendors static assets without errors)

- [x] **Step 4: Update `TODO.md`**

Update `TODO.md` reflecting Stage 6 / Phase 3A completion.

- [x] **Step 5: Commit**

```bash
git add TODO.md
git commit -m "docs: update TODO for Phase 3A completion"
```

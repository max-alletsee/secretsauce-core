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
    for subj in _SUBJECTIVE_PHRASES:
        match = re.search(r"\b" + re.escape(subj) + r"\b", working, flags=re.IGNORECASE)
        if match:
            matched_text = match.group(0)
            name_part = (working[:match.start()] + working[match.end():]).strip()
            return {
                "raw_text": raw,
                "name": name_part or matched_text,
                "quantity": None,
                "quantity_max": None,
                "quantity_text": None,
                "unit": None,
                "notes": notes or matched_text,
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


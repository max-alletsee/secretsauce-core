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
    q, q_max, u = to_system(1.0, None, "lb", "metric")  # 1 lb
    assert u == "g"
    assert q == 450.0  # nearest 10 below 1000

    q2, _, u2 = to_system(2.205, None, "lb", "metric")  # ~1 kg
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


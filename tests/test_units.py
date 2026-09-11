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

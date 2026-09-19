import pytest
from pathlib import Path
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_units_plugin_manifest_and_services(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Core plugin 'core-units' should be discovered and active
        p = await k.plugins.get_plugin("core-units")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-units"
        assert p["ui"] == "ui.js"

        # Check service registration
        svc = k.services.get("core-units")
        assert svc is not None
        assert svc.canonical("tbsp") == "tbsp"
        parsed = svc.parse("½ cup sugar")
        assert parsed["quantity"] == 0.5
        assert parsed["unit"] == "cup"
        assert parsed["name"] == "sugar"


@pytest.mark.asyncio
async def test_units_plugin_hooks_convert_recipe(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Create recipe with raw and US customary ingredients
        res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Beef Stew",
                "language": "en",
                "ingredients": [
                    "1 lb beef chuck",
                    {"raw_text": "2 cups beef broth"},
                    {"name": "salt", "quantity": 1, "unit": "tsp", "raw_text": "1 tsp salt"},
                ],
                "steps": ["Brown beef", "Add broth and simmer"],
            },
        )
        assert res.status_code == 201
        created = res.json()
        ingredients = created["ingredients"]

        # First ingredient: "1 lb beef chuck" converted to metric (g)
        ing0 = ingredients[0]
        assert ing0["raw_text"] == "1 lb beef chuck"
        assert ing0["name"] == "beef chuck"
        assert ing0["unit"] == "g"
        assert ing0["quantity"] == 450.0

        # Second ingredient: "2 cups beef broth" converted to metric (ml)
        ing1 = ingredients[1]
        assert ing1["raw_text"] == "2 cups beef broth"
        assert ing1["name"] == "beef broth"
        assert ing1["unit"] == "ml"
        assert ing1["quantity"] == 480.0

        # Third ingredient: "1 tsp salt" (tsp is shared, passes through)
        ing2 = ingredients[2]
        assert ing2["unit"] == "tsp"
        assert ing2["quantity"] == 1.0


@pytest.mark.asyncio
async def test_units_plugin_reconvert_all(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Create a metric recipe
        res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Vanilla Cake",
                "language": "en",
                "ingredients": [
                    "500 g flour",
                    "250 ml milk",
                ],
                "steps": ["Mix ingredients"],
            },
        )
        assert res.status_code == 201
        recipe_id = res.json()["id"]

        # Run reconvert job with target system us_customary
        job_id = await k.jobs.create_job(
            "core-units", "reconvert-all", input_data={"system": "us_customary"}
        )
        run_res = await k.jobs.run_job(job_id)
        assert run_res["status"] == "done"

        # Check updated recipe
        updated_res = await k.client.get(f"/api/recipes/{recipe_id}")
        assert updated_res.status_code == 200
        recipe = updated_res.json()
        assert recipe["origin"] == "plugin:core-units"

        ing0 = recipe["ingredients"][0]
        # 500g -> ~1.1 lb
        assert ing0["unit"] == "lb"
        assert ing0["quantity"] == 1.1

        ing1 = recipe["ingredients"][1]
        # 250ml -> ~1.04 cup
        assert ing1["unit"] == "cup"
        assert ing1["quantity"] == 1.04

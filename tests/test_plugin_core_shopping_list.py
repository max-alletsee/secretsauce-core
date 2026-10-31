from pathlib import Path
import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_shopping_list_discovery_and_schema(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-shopping-list")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-shopping-list"

        t1 = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_shopping_list_staples'"
        )
        assert t1 is not None

        t2 = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_shopping_list_items'"
        )
        assert t2 is not None


@pytest.mark.asyncio
async def test_staples_crud(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # 1. Add staple
        add_res = await k.client.post(
            "/api/x/core-shopping-list/staples",
            json={
                "name": "Extra Virgin Olive Oil",
                "default_quantity": 1,
                "unit": "bottle",
                "category": "Pantry",
                "always_include": True,
            },
        )
        assert add_res.status_code == 201, add_res.text
        staple = add_res.json()
        assert staple["name"] == "Extra Virgin Olive Oil"
        staple_id = staple["id"]

        # 2. List staples
        list_res = await k.client.get("/api/x/core-shopping-list/staples")
        assert list_res.status_code == 200
        staples = list_res.json()
        assert any(s["id"] == staple_id for s in staples)

        # 3. Delete staple
        del_res = await k.client.delete(f"/api/x/core-shopping-list/staples/{staple_id}")
        assert del_res.status_code == 200

        list_res2 = await k.client.get("/api/x/core-shopping-list/staples")
        assert not any(s["id"] == staple_id for s in list_res2.json())


@pytest.mark.asyncio
async def test_aggregate_scheduled_meals_scaled_and_toggle(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # 1. Create always-include staple
        await k.client.post(
            "/api/x/core-shopping-list/staples",
            json={
                "name": "Sea Salt",
                "default_quantity": 1,
                "unit": "box",
                "category": "Pantry",
                "always_include": True,
            },
        )

        # 2. Create Recipe A (servings = 2)
        rec_a_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Carbonara",
                "language": "en",
                "servings": 2,
                "ingredients": [
                    {"name": "Spaghetti", "quantity": 200, "unit": "g"},
                    {"name": "Eggs", "quantity": 2, "unit": "pieces"},
                ],
                "steps": [{"instruction": "Cook pasta and mix eggs"}],
            },
        )
        assert rec_a_res.status_code == 201
        rec_a = rec_a_res.json()

        # 3. Create Recipe B (servings = 4)
        rec_b_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Tomato Pasta",
                "language": "en",
                "servings": 4,
                "ingredients": [
                    {"name": "Spaghetti", "quantity": 100, "unit": "g"},
                    {"name": "Garlic", "quantity": 3, "unit": "cloves"},
                ],
                "steps": [{"instruction": "Saute garlic and toss"}],
            },
        )
        assert rec_b_res.status_code == 201
        rec_b = rec_b_res.json()

        # 4. Schedule meals:
        # Schedule A on 2026-09-22 with servings_override=4 (2x scale!) -> Spaghetti 400g, Eggs 4 pieces
        await k.timeline.create_entry({
            "date": "2026-09-22",
            "meal_type": "dinner",
            "recipe_id": rec_a["id"],
            "servings_override": 4,
        })

        # Schedule B on 2026-09-23 with servings_override=4 (1x scale) -> Spaghetti 100g, Garlic 3 cloves
        await k.timeline.create_entry({
            "date": "2026-09-23",
            "meal_type": "dinner",
            "recipe_id": rec_b["id"],
            "servings_override": 4,
        })

        # Already cooked meal in the same range must NOT be aggregated into shopping list
        await k.timeline.create_entry({
            "date": "2026-09-22",
            "meal_type": "lunch",
            "recipe_id": rec_a["id"],
            "servings_override": 2,
            "status": "cooked",
        })

        # 5. Fetch aggregated shopping list
        res = await k.client.get(
            "/api/x/core-shopping-list",
            params={"from_date": "2026-09-22", "to_date": "2026-09-23"},
        )
        assert res.status_code == 200, res.text
        items = res.json()["items"]

        # Check Spaghetti aggregated: 400 + 100 = 500g
        spaghetti = next((i for i in items if i["name"].lower() == "spaghetti"), None)
        assert spaghetti is not None
        assert spaghetti["quantity"] == 500.0
        assert spaghetti["unit"] == "g"
        assert spaghetti["checked"] is False

        # Check Eggs: 2 * 2 = 4 pieces
        eggs = next((i for i in items if i["name"].lower() == "eggs"), None)
        assert eggs is not None
        assert eggs["quantity"] == 4.0

        # Check Sea Salt staple is included
        salt = next((i for i in items if i["name"].lower() == "sea salt"), None)
        assert salt is not None
        assert salt["source_type"] == "staple"

        # 6. Test idempotent toggle of checked state
        item_key = spaghetti["key"]
        tog_res = await k.client.post(
            "/api/x/core-shopping-list/toggle",
            json={"key": item_key, "checked": True},
        )
        assert tog_res.status_code == 200
        assert tog_res.json()["checked"] is True

        # Idempotent toggle again
        tog_res2 = await k.client.post(
            "/api/x/core-shopping-list/toggle",
            json={"key": item_key, "checked": True},
        )
        assert tog_res2.status_code == 200
        assert tog_res2.json()["checked"] is True

        # 7. Add manual item and verify inclusion
        man_res = await k.client.post(
            "/api/x/core-shopping-list/items",
            json={"name": "Paper Towels", "quantity": 2, "unit": "rolls", "category": "Household"},
        )
        assert man_res.status_code == 201
        man_item = man_res.json()
        assert man_item["name"] == "Paper Towels"

        res3 = await k.client.get(
            "/api/x/core-shopping-list",
            params={"from_date": "2026-09-22", "to_date": "2026-09-23"},
        )
        pt = next((i for i in res3.json()["items"] if i["name"] == "Paper Towels"), None)
        assert pt is not None
        assert pt["source_type"] == "manual"

        # Delete manual item
        del_man = await k.client.delete(f"/api/x/core-shopping-list/items/{man_item['id']}")
        assert del_man.status_code == 200

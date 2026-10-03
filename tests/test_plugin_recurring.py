from datetime import date, timedelta
from pathlib import Path
import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_recurring_plugin_backend_and_materializer(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Verify plugin is discovered and enabled
        p = await k.plugins.get_plugin("core-recurring")
        assert p is not None
        assert p["state"] == "active"

        # 1. Verify migration applied
        table_check = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_recurring_rules'"
        )
        assert table_check is not None

        # 2. Create a recipe
        rec_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Wednesday Pasta",
                "language": "en",
                "ingredients": ["500 g pasta"],
                "steps": ["Boil water"],
            },
        )
        assert rec_res.status_code == 201
        recipe = rec_res.json()
        recipe_id = recipe["id"]

        # 3. Create a recurring rule for Wednesday
        target_weekday = 2  # Wednesday (0=Monday)
        rule_res = await k.client.post(
            "/api/x/core-recurring/rules",
            json={
                "weekday": target_weekday,
                "meal_type": "dinner",
                "recipe_id": recipe_id,
            },
        )
        assert rule_res.status_code == 200, rule_res.text
        rule_data = rule_res.json()
        assert rule_data["recipe_title"] == "Wednesday Pasta"
        rule_id = rule_data["id"]

        # List rules
        list_res = await k.client.get("/api/x/core-recurring/rules")
        assert list_res.status_code == 200
        rules = list_res.json()
        assert len(rules) == 1
        assert rules[0]["id"] == rule_id

        # 4. Creation itself materializes; no manual command/endpoint remains.
        assert rule_data['created'] == 2
        assert (await k.client.post('/api/x/core-recurring/materialize')).status_code == 405
        assert k.services.get_command('core-recurring', 'materialize') is None

        # 5. Verify schedule entries created for upcoming Wednesdays in the next 14 days
        today = date.today()
        wednesdays = [
            today + timedelta(days=i)
            for i in range(14)
            if (today + timedelta(days=i)).weekday() == target_weekday
        ]
        assert len(wednesdays) in (2, 3)

        for wed in wednesdays:
            sched = await k.schedule.list_entries(
                from_date=wed.isoformat(), to_date=wed.isoformat()
            )
            assert any(
                item["recipe_id"] == recipe_id and item["meal_type"] == "dinner"
                for item in sched
            )

        # 6. Deleting recipe cascades and deletes the recurring rule
        del_res = await k.client.delete(
            f"/api/recipes/{recipe_id}?revision={recipe['revision']}"
        )
        assert del_res.status_code == 204

        rule_after = await k.db.fetch_one(
            "SELECT * FROM plugin_core_recurring_rules WHERE id = ?", (rule_id,)
        )
        assert rule_after is None

        # 7. Verify UI bundle is accessible via plugin UI route
        ui_res = await k.client.get("/api/plugins/core-recurring/ui.js")
        assert ui_res.status_code == 200
        assert "javascript" in ui_res.headers.get("content-type", "")
        assert "core-recurring" in ui_res.text or "Recurring" in ui_res.text

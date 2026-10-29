from datetime import date, timedelta
from pathlib import Path
import pytest
from secretsauce.testing import make_kernel


def next_weekday_date(start: date, weekday: int) -> date:
    days_ahead = (weekday - start.weekday()) % 7
    return start + timedelta(days=days_ahead)


@pytest.mark.asyncio
async def test_recurring_plugin_rules_suggestions_approve_dismiss_and_edit(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-recurring")
        assert p is not None
        assert p["state"] == "active"
        assert p["applied_schema"] == 3

        # Default household member created by auto_setup has serving_ratio 1.0;
        # add a second member with serving_ratio 1.5 so household total is 2.5.
        m_res = await k.client.post("/api/members", json={"name": "Alex", "serving_ratio": 1.5})
        assert m_res.status_code == 201

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

        today = date.today()
        target_date = next_weekday_date(today, 2)  # upcoming Wednesday
        next_week_date = target_date + timedelta(days=7)

        # 1. Create a recipe recurring rule without specifying servings -> defaults to household sum (2.5)
        rule_res = await k.client.post(
            "/api/x/core-recurring/rules",
            json={
                "weekday": 2,
                "meal_type": "dinner",
                "recipe_id": recipe_id,
            },
        )
        assert rule_res.status_code == 200, rule_res.text
        rule_data = rule_res.json()
        assert rule_data["entry_type"] == "recipe"
        assert rule_data["recipe_id"] == recipe_id
        assert rule_data["recipe_title"] == "Wednesday Pasta"
        assert rule_data["servings"] == 2.5
        rule_id = rule_data["id"]

        # 2. Creating a rule does NOT automatically materialize schedule entries!
        sched_initial = await k.schedule.list_entries(
            from_date=today.isoformat(),
            to_date=(today + timedelta(days=14)).isoformat(),
        )
        assert sched_initial == []

        # 3. Create a note recurring rule on the same weekday & slot (multiple rules allowed) with custom servings
        note_res = await k.client.post(
            "/api/x/core-recurring/rules",
            json={
                "weekday": 2,
                "meal_type": "dinner",
                "entry_type": "note",
                "title": "Garlic bread on the side",
                "servings": 4,
            },
        )
        assert note_res.status_code == 200, note_res.text
        note_rule = note_res.json()
        assert note_rule["entry_type"] == "note"
        assert note_rule["recipe_id"] is None
        assert note_rule["title"] == "Garlic bread on the side"
        assert note_rule["servings"] == 4.0

        # 4. Query suggestions across 14 days: both rules appear on target_date and next_week_date
        sug_res = await k.client.get(
            "/api/x/core-recurring/suggestions",
            params={"from": today.isoformat(), "to": (today + timedelta(days=13)).isoformat()},
        )
        assert sug_res.status_code == 200, sug_res.text
        suggestions = sug_res.json()
        target_sugs = [s for s in suggestions if s["date"] == target_date.isoformat()]
        assert [s["rule_id"] for s in target_sugs] == [rule_id, note_rule["id"]]

        # 5. Approve the recipe rule on target_date
        app_res = await k.client.post(
            f"/api/x/core-recurring/rules/{rule_id}/approve",
            json={"date": target_date.isoformat()},
        )
        assert app_res.status_code == 200, app_res.text
        approved_entry = app_res.json()["entry"]
        assert approved_entry["date"] == target_date.isoformat()
        assert approved_entry["meal_type"] == "dinner"
        assert approved_entry["entry_type"] == "recipe"
        assert approved_entry["recipe_id"] == recipe_id
        assert approved_entry["servings_override"] == 2.5
        assert approved_entry["origin"] == "plugin:core-recurring"

        # The note rule is STILL suggested on target_date even though the slot now has an entry!
        sug_after_approve = (
            await k.client.get(
                "/api/x/core-recurring/suggestions",
                params={"from": target_date.isoformat(), "to": target_date.isoformat()},
            )
        ).json()
        assert [s["rule_id"] for s in sug_after_approve] == [note_rule["id"]]

        # 6. Dismiss the note rule on target_date
        dis_res = await k.client.post(
            f"/api/x/core-recurring/rules/{note_rule['id']}/dismiss",
            json={"date": target_date.isoformat()},
        )
        assert dis_res.status_code == 200, dis_res.text
        sug_after_dismiss = (
            await k.client.get(
                "/api/x/core-recurring/suggestions",
                params={"from": target_date.isoformat(), "to": target_date.isoformat()},
            )
        ).json()
        assert sug_after_dismiss == []

        # 7. Deleting the approved schedule entry from the timeline does NOT resurrect the ghost suggestion
        del_entry_res = await k.client.delete(
            f"/api/schedule/{approved_entry['id']}?revision={approved_entry['revision']}"
        )
        assert del_entry_res.status_code == 204
        sug_after_delete_entry = (
            await k.client.get(
                "/api/x/core-recurring/suggestions",
                params={"from": target_date.isoformat(), "to": target_date.isoformat()},
            )
        ).json()
        assert sug_after_delete_entry == []

        # 8. Editing the note rule updates its title & servings and clears future dismissals so it reappears!
        edit_res = await k.client.put(
            f"/api/x/core-recurring/rules/{note_rule['id']}",
            json={
                "weekday": 2,
                "meal_type": "dinner",
                "entry_type": "note",
                "title": "Focaccia on the side",
                "servings": 6,
            },
        )
        assert edit_res.status_code == 200, edit_res.text
        edited_note = edit_res.json()
        assert edited_note["title"] == "Focaccia on the side"
        assert edited_note["servings"] == 6.0

        sug_after_edit = (
            await k.client.get(
                "/api/x/core-recurring/suggestions",
                params={"from": target_date.isoformat(), "to": target_date.isoformat()},
            )
        ).json()
        # Note rule was dismissed on target_date -> cleared on edit; recipe rule was approved -> stays handled!
        assert [(s["rule_id"], s["title"], s["servings"]) for s in sug_after_edit] == [
            (note_rule["id"], "Focaccia on the side", 6.0)
        ]

        # 9. Approve the recipe rule on next_week_date, then delete the recipe rule:
        #    the already-approved schedule entry on next_week_date stays untouched!
        app_next = await k.client.post(
            f"/api/x/core-recurring/rules/{rule_id}/approve",
            json={"date": next_week_date.isoformat()},
        )
        assert app_next.status_code == 200
        next_entry_id = app_next.json()["entry"]["id"]

        del_rule_res = await k.client.delete(f"/api/x/core-recurring/rules/{rule_id}")
        assert del_rule_res.status_code == 200
        surviving = await k.client.get(f"/api/schedule/{next_entry_id}")
        assert surviving.status_code == 200
        assert surviving.json()["id"] == next_entry_id

        # 10. Deleting a recipe cascades and deletes any recipe rule referencing it
        rec2 = (
            await k.client.post(
                "/api/recipes", json={"title": "Friday Curry", "language": "en"}
            )
        ).json()
        rule2 = (
            await k.client.post(
                "/api/x/core-recurring/rules",
                json={"weekday": 4, "meal_type": "dinner", "recipe_id": rec2["id"], "servings": 3},
            )
        ).json()
        assert (
            await k.client.delete(f"/api/recipes/{rec2['id']}?revision={rec2['revision']}")
        ).status_code == 204
        rules_now = (await k.client.get("/api/x/core-recurring/rules")).json()
        assert [r["id"] for r in rules_now] == [note_rule["id"]]

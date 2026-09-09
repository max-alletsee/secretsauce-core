import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_schedule_and_journal_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Create a recipe to attach
        rec_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Pasta Pomodoro",
                "language": "en",
                "ingredients": [],
                "steps": [],
            },
        )
        assert rec_res.status_code == 201
        rec = rec_res.json()
        rec_id = rec["id"]

        # 1. Schedule Entry
        sch_res = await k.client.post(
            "/api/schedule",
            json={
                "date": "2026-09-15",
                "meal_type": "dinner",
                "position": 0,
                "recipe_id": rec_id,
                "note": "Quick dinner",
            },
        )
        assert sch_res.status_code == 201
        sch_entry = sch_res.json()
        s_id = sch_entry["id"]
        assert sch_entry["revision"] == 1

        # 2. GET schedule list validation
        # Missing from/to
        bad_range = await k.client.get("/api/schedule")
        assert bad_range.status_code == 422

        # Range > 62 days
        too_long = await k.client.get(
            "/api/schedule?from=2026-01-01&to=2026-04-01"
        )
        assert too_long.status_code == 422

        # Valid range
        sch_list = await k.client.get(
            "/api/schedule?from=2026-09-01&to=2026-09-30"
        )
        assert sch_list.status_code == 200
        items = sch_list.json()
        assert len(items) == 1
        assert items[0]["id"] == s_id
        assert items[0]["recipe"]["title"] == "Pasta Pomodoro"

        # 3. GET single schedule entry
        single_sch = await k.client.get(f"/api/schedule/{s_id}")
        assert single_sch.status_code == 200
        assert single_sch.json()["recipe"]["title"] == "Pasta Pomodoro"

        # 4. PATCH schedule entry
        patch_sch = await k.client.patch(
            f"/api/schedule/{s_id}",
            json={"revision": 1, "note": "Updated note"},
        )
        assert patch_sch.status_code == 200
        assert patch_sch.json()["note"] == "Updated note"
        assert patch_sch.json()["revision"] == 2

        # Stale revision -> 409
        stale_sch = await k.client.patch(
            f"/api/schedule/{s_id}",
            json={"revision": 1, "note": "Stale note"},
        )
        assert stale_sch.status_code == 409

        # 5. Journal Entry
        j_res = await k.client.post(
            "/api/journal",
            json={
                "date": "2026-09-15",
                "meal_type": "dinner",
                "schedule_entry_id": s_id,
                "recipe_id": rec_id,
                "servings_cooked": 3.0,
                "rating": 5,
                "notes": "Turned out fantastic!",
            },
        )
        assert j_res.status_code == 201
        j_entry = j_res.json()
        j_id = j_entry["id"]
        assert j_entry["revision"] == 1

        # Duplicate schedule_entry_id -> 409
        dup_j = await k.client.post(
            "/api/journal",
            json={
                "date": "2026-09-15",
                "meal_type": "dinner",
                "schedule_entry_id": s_id,
            },
        )
        assert dup_j.status_code == 409

        # 6. GET journal list
        j_list = await k.client.get(
            "/api/journal?from=2026-09-01&to=2026-09-30"
        )
        assert j_list.status_code == 200
        assert len(j_list.json()) == 1
        assert j_list.json()[0]["id"] == j_id

        # 7. GET single journal entry
        single_j = await k.client.get(f"/api/journal/{j_id}")
        assert single_j.status_code == 200
        assert single_j.json()["id"] == j_id

        # 8. PATCH journal entry
        patch_j = await k.client.patch(
            f"/api/journal/{j_id}",
            json={"revision": 1, "notes": "Updated review"},
        )
        assert patch_j.status_code == 200
        assert patch_j.json()["notes"] == "Updated review"
        assert patch_j.json()["revision"] == 2

        # 9. DELETE journal entry
        del_j = await k.client.delete(f"/api/journal/{j_id}?revision=2")
        assert del_j.status_code == 204

        # 10. DELETE schedule entry
        del_s = await k.client.delete(f"/api/schedule/{s_id}?revision=2")
        assert del_s.status_code == 204

import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_timeline_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Legacy routes are removed
        assert (await k.client.get("/api/schedule?from=2026-09-01&to=2026-09-30")).status_code == 404
        assert (await k.client.get("/api/journal")).status_code == 404

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

        member = (await k.members.list_members())[0]

        # 1. Create Planned Timeline Entry
        tl_res = await k.client.post(
            "/api/timeline",
            json={
                "date": "2026-09-15",
                "meal_type": "dinner",
                "position": 0,
                "recipe_id": rec_id,
                "note": "Quick dinner",
            },
        )
        assert tl_res.status_code == 201
        tl_entry = tl_res.json()
        entry_id = tl_entry["id"]
        assert tl_entry["revision"] == 1
        assert tl_entry["status"] == "planned"
        assert tl_entry["cooked_by_member_id"] is None

        # Invalid status -> 422
        bad_status = await k.client.post(
            "/api/timeline",
            json={
                "date": "2026-09-15",
                "meal_type": "dinner",
                "status": "invalid",
            },
        )
        assert bad_status.status_code == 422

        # 2. GET timeline list validation
        bad_range = await k.client.get("/api/timeline")
        assert bad_range.status_code == 422

        too_long = await k.client.get(
            "/api/timeline?from=2026-01-01&to=2026-04-01"
        )
        assert too_long.status_code == 422

        # Valid range
        tl_list = await k.client.get(
            "/api/timeline?from=2026-09-01&to=2026-09-30"
        )
        assert tl_list.status_code == 200
        items = tl_list.json()
        assert len(items) == 1
        assert items[0]["id"] == entry_id
        assert items[0]["recipe"]["title"] == "Pasta Pomodoro"

        # 3. GET single timeline entry
        single_tl = await k.client.get(f"/api/timeline/{entry_id}")
        assert single_tl.status_code == 200
        assert single_tl.json()["recipe"]["title"] == "Pasta Pomodoro"

        # 4. PATCH timeline entry to mark as cooked + update note & servings
        patch_cooked = await k.client.patch(
            f"/api/timeline/{entry_id}",
            json={
                "revision": 1,
                "status": "cooked",
                "cooked_by_member_id": member["id"],
                "servings_override": 3.0,
                "note": "Turned out fantastic!",
            },
        )
        assert patch_cooked.status_code == 200
        cooked_body = patch_cooked.json()
        assert cooked_body["status"] == "cooked"
        assert cooked_body["cooked_by_member_id"] == member["id"]
        assert cooked_body["servings_override"] == 3.0
        assert cooked_body["note"] == "Turned out fantastic!"
        assert cooked_body["revision"] == 2

        # Stale revision -> 409
        stale_tl = await k.client.patch(
            f"/api/timeline/{entry_id}",
            json={"revision": 1, "note": "Stale note"},
        )
        assert stale_tl.status_code == 409

        # 5. PATCH timeline entry back to planned (unmark as cooked)
        patch_planned = await k.client.patch(
            f"/api/timeline/{entry_id}",
            json={
                "revision": 2,
                "status": "planned",
                "cooked_by_member_id": None,
            },
        )
        assert patch_planned.status_code == 200
        assert patch_planned.json()["status"] == "planned"
        assert patch_planned.json()["cooked_by_member_id"] is None
        assert patch_planned.json()["revision"] == 3

        # 6. Create directly as cooked (e.g. past day entry)
        past_res = await k.client.post(
            "/api/timeline",
            json={
                "date": "2026-09-10",
                "meal_type": "dinner",
                "recipe_id": rec_id,
                "status": "cooked",
                "cooked_by_member_id": member["id"],
                "servings_override": 2.0,
            },
        )
        assert past_res.status_code == 201
        past_entry = past_res.json()
        assert past_entry["status"] == "cooked"
        assert past_entry["cooked_by_member_id"] == member["id"]

        # 7. DELETE timeline entries
        del_1 = await k.client.delete(f"/api/timeline/{entry_id}?revision=3")
        assert del_1.status_code == 204
        del_2 = await k.client.delete(f"/api/timeline/{past_entry['id']}?revision=1")
        assert del_2.status_code == 204


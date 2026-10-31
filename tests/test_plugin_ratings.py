import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_ratings_upvote_downvote_and_attribute_mirroring(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        client = k.client
        p = await k.plugins.get_plugin("core-ratings")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-ratings"

        # Create member, recipe, and cooked timeline entry
        mem_res = await client.post("/api/members", json={"name": "Alice", "preferred_language": "en"})
        assert mem_res.status_code == 201
        member_id = mem_res.json()["id"]

        rec_res = await client.post("/api/recipes", json={
            "title": "Lasagna",
            "language": "en",
            "ingredients": [],
            "steps": [],
            "servings": 4,
        })
        assert rec_res.status_code == 201
        recipe = rec_res.json()
        recipe_id = recipe["id"]
        group_id = recipe["group_id"]

        tl_res = await client.post("/api/timeline", json={
            "date": "2026-09-13",
            "meal_type": "dinner",
            "recipe_id": recipe_id,
            "servings_override": 4,
            "status": "cooked",
        })
        assert tl_res.status_code == 201
        timeline_entry_id = tl_res.json()["id"]

        # Cast an upvote (+1)
        vote_res = await client.put(
            "/api/x/core-ratings",
            json={"timeline_entry_id": timeline_entry_id, "member_id": member_id, "score": 1},
        )
        assert vote_res.status_code == 200
        assert vote_res.json()["net_score"] == 1

        get_res = await client.get(f"/api/x/core-ratings?timeline_entry_id={timeline_entry_id}")
        assert get_res.status_code == 200
        assert get_res.json() == {"scores": [{"member_id": member_id, "score": 1}], "net_score": 1}

        # Check attribute mirrored to recipe group
        attrs = await k.attributes.get_attributes("recipe", group_id)
        assert attrs.get("core-ratings.score") == 1

        # Delete vote
        del_res = await client.delete(
            f"/api/x/core-ratings?timeline_entry_id={timeline_entry_id}&member_id={member_id}"
        )
        assert del_res.status_code == 200

        attrs_after_del = await k.attributes.get_attributes("recipe", group_id)
        assert "core-ratings.score" not in attrs_after_del

        # Test rebuild command
        rebuild_fn = k.services.get_command("core-ratings", "rebuild")
        assert rebuild_fn is not None
        ctx = k.ctx_for("core-ratings")
        res = await rebuild_fn(ctx)
        assert res["status"] == "ok"

import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_ratings_upvote_downvote_and_attribute_mirroring(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        client = k.client
        p = await k.plugins.get_plugin("ratings")
        assert p is not None
        assert p["state"] == "active"

        # Create member, recipe, and journal entry
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

        journ_res = await client.post("/api/journal", json={
            "date": "2026-09-13",
            "meal_type": "dinner",
            "recipe_id": recipe_id,
            "servings": 4,
        })
        assert journ_res.status_code == 201
        journal_id = journ_res.json()["id"]

        # Cast an upvote (+1)
        vote_res = await client.put(
            "/api/x/ratings",
            json={"journal_id": journal_id, "member_id": member_id, "score": 1},
        )
        assert vote_res.status_code == 200
        assert vote_res.json()["net_score"] == 1

        # Check attribute mirrored to recipe group
        attrs = await k.attributes.get_attributes("recipe", group_id)
        assert attrs.get("ratings.score") == 1

        # Delete vote
        del_res = await client.delete(
            f"/api/x/ratings?journal_id={journal_id}&member_id={member_id}"
        )
        assert del_res.status_code == 200

        attrs_after_del = await k.attributes.get_attributes("recipe", group_id)
        assert "ratings.score" not in attrs_after_del

        # Test rebuild command
        rebuild_fn = k.services.get_command("ratings", "rebuild")
        assert rebuild_fn is not None
        ctx = k.ctx_for("ratings")
        res = await rebuild_fn(ctx)
        assert res["status"] == "ok"

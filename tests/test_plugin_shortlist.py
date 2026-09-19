import pytest
from pathlib import Path
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_shortlist_crud_and_cascade(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        client = k.client

        # 1. Create member & recipe
        mem_res = await client.post("/api/members", json={"name": "Sarah", "preferred_language": "en"})
        assert mem_res.status_code == 201
        member_id = mem_res.json()["id"]

        rec_res = await client.post("/api/recipes", json={
            "title": "Pasta Primavera",
            "language": "en",
            "ingredients": [],
            "steps": [],
            "servings": 2,
        })
        assert rec_res.status_code == 201
        recipe_id = rec_res.json()["id"]

        # 2. Add to shortlist
        add_res = await client.post(
            "/api/x/core-shortlist",
            json={"recipe_id": recipe_id, "note": "Favorite weeknight dinner"},
            headers={"x-actor-member": member_id},
        )
        assert add_res.status_code == 201
        assert add_res.json()["recipe_id"] == recipe_id

        # 3. List shortlist
        list_res = await client.get("/api/x/core-shortlist", headers={"x-actor-member": member_id})
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) == 1
        assert items[0]["recipe_id"] == recipe_id

        # 4. Remove directly via DELETE /api/x/core-shortlist/{recipe_id}
        del_item = await client.delete(f"/api/x/core-shortlist/{recipe_id}", headers={"x-actor-member": member_id})
        assert del_item.status_code == 204
        list_after_remove = await client.get("/api/x/core-shortlist", headers={"x-actor-member": member_id})
        assert len(list_after_remove.json()) == 0

        # 5. Re-add and verify cascade deletion on recipe delete
        await client.post(
            "/api/x/core-shortlist",
            json={"recipe_id": recipe_id, "note": "Favorite weeknight dinner"},
            headers={"x-actor-member": member_id},
        )
        del_res = await client.delete(f"/api/recipes/{recipe_id}?revision=1")
        assert del_res.status_code == 204

        list_after_cascade = await client.get("/api/x/core-shortlist", headers={"x-actor-member": member_id})
        assert len(list_after_cascade.json()) == 0


@pytest.mark.asyncio
async def test_shortlist_invalid_recipe_404(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        client = k.client
        mem_res = await client.post("/api/members", json={"name": "Sarah", "preferred_language": "en"})
        member_id = mem_res.json()["id"]

        res = await client.post(
            "/api/x/core-shortlist",
            json={"recipe_id": "nonexistent_recipe", "note": "Won't work"},
            headers={"x-actor-member": member_id},
        )
        assert res.status_code == 404

import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_recipes_api_lifecycle(tmp_path):
    async with make_kernel(tmp_path) as k:
        # 1. Create recipe row (English)
        rec_data = {
            "title": "Vegetable Curry",
            "language": "en",
            "ingredients": [
                {
                    "id": "i1",
                    "raw_text": "1 yellow onion",
                    "name": "Onion",
                    "quantity": 1.0,
                    "unit": "pcs",
                    "notes": "",
                }
            ],
            "steps": [
                {
                    "id": "s1",
                    "instruction": "Chop and sauté onion",
                    "timer_minutes": 5,
                }
            ],
            "tags": ["dinner", "vegan"],
        }
        res = await k.client.post("/api/recipes", json=rec_data)
        assert res.status_code == 201
        created_en = res.json()
        assert created_en["title"] == "Vegetable Curry"
        group_id = created_en["group_id"]
        en_row_id = created_en["id"]
        assert en_row_id == f"{group_id}_en"

        # 2. Add German translation row to the same group
        de_data = {
            "group_id": group_id,
            "language": "de",
            "title": "Gemüsecurry",
            "ingredients": [
                {
                    "id": "i1",
                    "raw_text": "1 Zwiebel",
                    "name": "Zwiebel",
                    "quantity": 1.0,
                    "unit": "Stück",
                    "notes": "",
                }
            ],
            "steps": [
                {
                    "id": "s1",
                    "instruction": "Zwiebel schneiden und anbraten",
                    "timer_minutes": 5,
                }
            ],
            "tags": ["dinner", "vegan"],
        }
        res_de = await k.client.post("/api/recipes", json=de_data)
        assert res_de.status_code == 201
        created_de = res_de.json()
        assert created_de["group_id"] == group_id
        de_row_id = created_de["id"]

        # 3. List recipes
        list_res = await k.client.get("/api/recipes")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] == 1
        assert len(list_data["items"]) == 1
        assert list_data["items"][0]["title"] == "Vegetable Curry"

        # List with lang=de
        list_de = await k.client.get("/api/recipes?lang=de")
        assert list_de.status_code == 200
        assert list_de.json()["items"][0]["title"] == "Gemüsecurry"

        # List with tag filter
        list_tag = await k.client.get("/api/recipes?tag=vegan")
        assert list_tag.status_code == 200
        assert list_tag.json()["total"] == 1

        list_tag_miss = await k.client.get("/api/recipes?tag=dessert")
        assert list_tag_miss.status_code == 200
        assert list_tag_miss.json()["total"] == 0

        # List with trigram search q >= 3
        list_q = await k.client.get("/api/recipes?q=Curry")
        assert list_q.status_code == 200
        assert list_q.json()["total"] == 1

        # List with short search q < 3
        list_short = await k.client.get("/api/recipes?q=cu")
        assert list_short.status_code == 200
        assert list_short.json()["total"] == 1

        # 4. GET exact row by id
        row_res = await k.client.get(f"/api/recipes/{en_row_id}")
        assert row_res.status_code == 200
        assert row_res.json()["id"] == en_row_id

        # 5. GET resolved group by group_id with lang
        grp_de = await k.client.get(f"/api/recipes/{group_id}?lang=de")
        assert grp_de.status_code == 200
        assert grp_de.json()["title"] == "Gemüsecurry"

        # 6. PATCH recipe row with revision
        patch_res = await k.client.patch(
            f"/api/recipes/{en_row_id}",
            json={"revision": 1, "title": "Delicious Veg Curry"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Delicious Veg Curry"
        assert patch_res.json()["revision"] == 2

        # PATCH with stale revision -> 409
        stale_res = await k.client.patch(
            f"/api/recipes/{en_row_id}",
            json={"revision": 1, "title": "Stale Update"},
        )
        assert stale_res.status_code == 409

        # 7. DELETE single row with ?revision=
        del_row = await k.client.delete(f"/api/recipes/{en_row_id}?revision=2")
        assert del_row.status_code == 204

        # Verify English row is gone but German row remains
        not_found_en = await k.client.get(f"/api/recipes/{en_row_id}")
        assert not_found_en.status_code == 404

        still_grp = await k.client.get(f"/api/recipes/{group_id}")
        assert still_grp.status_code == 200
        assert still_grp.json()["language"] == "de"

        # 8. DELETE group
        del_grp = await k.client.delete(f"/api/recipes/{group_id}")
        assert del_grp.status_code == 204

        # Entire group is gone
        grp_gone = await k.client.get(f"/api/recipes/{group_id}")
        assert grp_gone.status_code == 404

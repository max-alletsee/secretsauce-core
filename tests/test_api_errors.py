from secretsauce.testing import make_kernel


async def test_body_validation_uses_the_error_envelope(tmp_path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.post("/api/recipes", json={"title": "No language"})
        assert res.status_code == 422
        body = res.json()["error"]
        assert body["code"] == "validation"
        assert "language" in body["details"]["fields"]

        created = (await k.client.post("/api/recipes", json={"title": "Soup", "language": "en"})).json()
        no_revision = await k.client.patch(f"/api/recipes/{created['id']}", json={"title": "Stew"})
        assert no_revision.status_code == 422
        assert "revision" in no_revision.json()["error"]["details"]["fields"]

        bad_date = await k.client.post("/api/schedule", json={"date": "tomorrow", "meal_type": "dinner"})
        assert bad_date.status_code == 422
        assert "date" in bad_date.json()["error"]["details"]["fields"]

        bad_type = await k.client.post(
            "/api/recipes", json={"title": "Soup", "language": "en", "servings": "lots"}
        )
        assert bad_type.status_code == 422


async def test_http_errors_use_the_error_envelope(tmp_path):
    async with make_kernel(tmp_path) as k:
        missing = await k.client.get("/api/nothing-here")
        assert missing.status_code == 404
        assert missing.json()["error"]["code"] == "not_found"

        wrong_method = await k.client.put("/api/members")
        assert wrong_method.status_code == 405
        assert wrong_method.json()["error"]["code"] == "method_not_allowed"

        conflict = await k.client.get("/api/recipes/nope_en")
        assert conflict.json()["error"]["code"] == "not_found"


async def test_rest_writes_cannot_spoof_origin_or_actor(tmp_path):
    async with make_kernel(tmp_path) as k:
        member = (await k.members.list_members())[0]
        res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Soup",
                "language": "en",
                "origin": "plugin:core-translator",
                "actor_member_id": "someone-else",
            },
            headers={"X-Actor-Member": member["id"]},
        )
        assert res.status_code == 201
        assert res.json()["origin"] == "member"
        assert res.json()["actor_member_id"] == member["id"]

        unknown_actor = await k.client.post(
            "/api/schedule",
            json={"date": "2026-09-24", "meal_type": "dinner"},
            headers={"X-Actor-Member": "ghost"},
        )
        assert unknown_actor.json()["actor_member_id"] is None


async def test_export_json_decodes_json_columns(tmp_path):
    async with make_kernel(tmp_path) as k:
        await k.client.post(
            "/api/recipes",
            json={"title": "Soup", "language": "en", "tags": ["warm"], "ingredients": [{"name": "leek"}]},
        )
        await k.client.post(
            "/api/schedule",
            json={"date": "2026-09-24", "meal_type": "dinner", "participant_member_ids": ["a"]},
        )
        data = (await k.client.get("/api/export/json")).json()
        assert data["recipes"][0]["tags"] == ["warm"]
        assert data["recipes"][0]["ingredients"][0]["name"] == "leek"
        assert data["schedule_entries"][0]["participant_member_ids"] == ["a"]
        assert isinstance(data["household_members"][0]["allergies"], list)
        assert "passphrase_version" not in data["household_config"]

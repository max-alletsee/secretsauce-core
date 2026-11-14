"""Outside-in production-path tests for Recipe Tags."""

from contextlib import asynccontextmanager

import httpx

from secretsauce.app import build_app
from secretsauce.config import Config


@asynccontextmanager
async def runtime(tmp_path):
    app = build_app(data_dir=tmp_path, config=Config(cookie_secure="false"))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://testserver",
        ) as client:
            setup = await client.post(
                "/api/setup",
                json={
                    "household_name": "Tag Test Home",
                    "passphrase": "long enough",
                    "first_member": {"name": "Ann"},
                },
            )
            assert setup.status_code == 201
            yield app.state.kernel, client


async def test_recipe_tags_aggregation_precedence_and_filtering_past_50(tmp_path, monkeypatch):
    for var in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(var, raising=False)

    async with runtime(tmp_path) as (_kernel, client):
        # 55 recipes with "Weeknight" and varying tags so we exceed the default limit=50
        for i in range(55):
            tags = ["Weeknight"]
            if i < 3:
                tags.append("beta")
            if i < 3:
                tags.append("Alpha")
            if i == 54:
                tags.extend(["RareGem", "  ", ""])
            res = await client.post(
                "/api/recipes",
                json={"title": f"Recipe {i:02d}", "language": "en", "tags": tags},
            )
            assert res.status_code == 201, res.text

        # Multi-translation group: French created first, English (primary) created second
        fr_res = await client.post(
            "/api/recipes",
            json={"title": "Soupe", "language": "fr", "tags": ["fr-only", "Shared"]},
        )
        assert fr_res.status_code == 201
        fr_group = fr_res.json()["group_id"]

        en_res = await client.post(
            "/api/recipes",
            json={
                "group_id": fr_group,
                "title": "Soup",
                "language": "en",
                "tags": ["en-only", "Shared"],
            },
        )
        assert en_res.status_code == 201

        # Default aggregation picks primary language ("en") for the multi-translation group
        tags_res = await client.get("/api/recipes/tags")
        assert tags_res.status_code == 200, tags_res.text
        assert tags_res.json()["items"] == [
            {"name": "Weeknight", "count": 55},
            {"name": "Alpha", "count": 3},
            {"name": "beta", "count": 3},
            {"name": "en-only", "count": 1},
            {"name": "RareGem", "count": 1},
            {"name": "Shared", "count": 1},
        ]

        # Explicit ?lang=fr picks French translation for that group, falling back to en for others
        fr_tags = await client.get("/api/recipes/tags", params={"lang": "fr"})
        assert fr_tags.status_code == 200
        assert fr_tags.json()["items"] == [
            {"name": "Weeknight", "count": 55},
            {"name": "Alpha", "count": 3},
            {"name": "beta", "count": 3},
            {"name": "fr-only", "count": 1},
            {"name": "RareGem", "count": 1},
            {"name": "Shared", "count": 1},
        ]

        # Server-side filtering finds RareGem even though it was the 55th recipe created
        filtered = await client.get("/api/recipes", params={"tag": "RareGem"})
        assert filtered.status_code == 200
        assert [r["title"] for r in filtered.json()["items"]] == ["Recipe 54"]


async def test_recipe_tags_bulk_rename_merge_delete_and_validation(tmp_path, monkeypatch):
    for var in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(var, raising=False)

    async with runtime(tmp_path) as (kernel, client):
        r1 = (
            await client.post(
                "/api/recipes",
                json={"title": "Lentil Stew", "language": "en", "tags": ["veggie", "cozy"]},
            )
        ).json()
        r2 = (
            await client.post(
                "/api/recipes",
                json={
                    "title": "Roasted Broccoli",
                    "language": "en",
                    "tags": ["vegetarian", "veggie", "quick"],
                },
            )
        ).json()
        r3_de = (
            await client.post(
                "/api/recipes",
                json={"title": "Linseneintopf", "language": "de", "tags": ["veggie"]},
            )
        ).json()

        # Blank inputs rejected with 422
        assert (
            await client.post(
                "/api/recipes/tags/rename", json={"from_name": "   ", "to_name": "vegetarian"}
            )
        ).status_code == 422
        assert (
            await client.post(
                "/api/recipes/tags/rename", json={"from_name": "veggie", "to_name": ""}
            )
        ).status_code == 422
        assert (await client.post("/api/recipes/tags/delete", json={"name": "  "})).status_code == 422

        # Rename + merge "veggie" -> "vegetarian" across all matching translation rows
        rename_res = await client.post(
            "/api/recipes/tags/rename",
            json={"from_name": "veggie", "to_name": "vegetarian"},
        )
        assert rename_res.status_code == 200, rename_res.text
        assert rename_res.json() == {"updated_count": 3, "updated_rows": 3}

        r1_after = (await client.get(f"/api/recipes/{r1['id']}")).json()
        r2_after = (await client.get(f"/api/recipes/{r2['id']}")).json()
        r3_after = (await client.get(f"/api/recipes/{r3_de['id']}")).json()
        assert r1_after["tags"] == ["vegetarian", "cozy"]
        assert r1_after["revision"] == r1["revision"] + 1
        # Merge deduplicates without duplicating "vegetarian"
        assert r2_after["tags"] == ["vegetarian", "quick"]
        assert r2_after["revision"] == r2["revision"] + 1
        assert r3_after["tags"] == ["vegetarian"]

        # FTS reflects renamed tag (per requested/primary language)
        assert len((await client.get("/api/recipes", params={"q": "veggie"})).json()["items"]) == 0
        assert len((await client.get("/api/recipes", params={"q": "vegetarian"})).json()["items"]) == 2
        de_hits = (await client.get("/api/recipes", params={"q": "vegetarian", "lang": "de"})).json()["items"]
        assert sorted(r["title"] for r in de_hits) == ["Lentil Stew", "Linseneintopf", "Roasted Broccoli"]

        # Delete "cozy" across all matching rows
        del_res = await client.post("/api/recipes/tags/delete", json={"name": "cozy"})
        assert del_res.status_code == 200, del_res.text
        assert del_res.json() == {"updated_count": 1, "updated_rows": 1}
        r1_final = (await client.get(f"/api/recipes/{r1['id']}")).json()
        assert r1_final["tags"] == ["vegetarian"]
        assert r1_final["revision"] == r1_after["revision"] + 1
        assert len((await client.get("/api/recipes", params={"q": "cozy"})).json()["items"]) == 0

        # Events emitted for each update
        events = await kernel.events.get_events_after(0)
        tag_update_events = [e for e in events if e.name == "recipe:updated"]
        assert len(tag_update_events) == 4


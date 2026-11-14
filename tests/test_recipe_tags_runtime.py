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

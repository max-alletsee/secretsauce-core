"""Outside-in production-path tests for Recipe Sources."""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch

import httpx
import pytest

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
                    "household_name": "Source Test Home",
                    "passphrase": "long enough",
                    "first_member": {"name": "Ann"},
                },
            )
            assert setup.status_code == 201
            yield app.state.kernel, client


async def test_recipe_sources_end_to_end_lifecycle(tmp_path, monkeypatch):
    for var in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(var, raising=False)

    async with runtime(tmp_path) as (kernel, client):
        # 1. Create recipes with structured sources and one unattributed recipe
        r_book = (
            await client.post(
                "/api/recipes",
                json={
                    "title": "Roasted Eggplant",
                    "language": "en",
                    "source": {
                        "type": "cookbook",
                        "name": "Simple",
                        "author": "Yotam Ottolenghi",
                        "page": "142",
                    },
                },
            )
        )
        assert r_book.status_code == 201, r_book.text
        book_rec = r_book.json()
        assert book_rec["source"] == {
            "type": "cookbook",
            "name": "Simple",
            "author": "Yotam Ottolenghi",
            "page": "142",
        }

        r_web = (
            await client.post(
                "/api/recipes",
                json={
                    "title": "Skillet Ravioli",
                    "language": "en",
                    "source": {
                        "type": "website",
                        "name": "Smitten Kitchen",
                        "url": "https://smittenkitchen.com/2021/05/skillet-ravioli/",
                    },
                },
            )
        )
        assert r_web.status_code == 201, r_web.text

        r_none = await client.post(
            "/api/recipes",
            json={"title": "House Chili", "language": "en"},
        )
        assert r_none.status_code == 201, r_none.text

        # 2. Add a translation to book_rec group without specifying source -> inherits source
        r_book_de = await client.post(
            "/api/recipes",
            json={
                "group_id": book_rec["group_id"],
                "language": "de",
                "title": "Geröstete Aubergine",
            },
        )
        assert r_book_de.status_code == 201, r_book_de.text
        assert r_book_de.json()["source"] == book_rec["source"]

        # 3. GET /api/recipes/sources aggregates distinct sources by group count (not row count)
        sources_res = await client.get("/api/recipes/sources")
        assert sources_res.status_code == 200, sources_res.text
        sources_items = sources_res.json()["items"]
        assert sources_items == [
            {
                "name": "Simple",
                "type": "cookbook",
                "author": "Yotam Ottolenghi",
                "count": 1,
            },
            {
                "name": "Smitten Kitchen",
                "type": "website",
                "author": None,
                "count": 1,
            },
        ]

        # 4. Multi-select source filtering (disjunctive OR + none)
        f1 = await client.get("/api/recipes", params=[("source", "Simple")])
        assert f1.status_code == 200
        assert [r["title"] for r in f1.json()["items"]] == ["Roasted Eggplant"]

        f_multi = await client.get(
            "/api/recipes", params=[("source", "Simple"), ("source", "Smitten Kitchen")]
        )
        assert [r["title"] for r in f_multi.json()["items"]] == [
            "Roasted Eggplant",
            "Skillet Ravioli",
        ]

        f_none = await client.get("/api/recipes", params=[("source", "none")])
        assert [r["title"] for r in f_none.json()["items"]] == ["House Chili"]

        f_combo = await client.get(
            "/api/recipes", params=[("source", "Simple"), ("source", "none")]
        )
        assert [r["title"] for r in f_combo.json()["items"]] == [
            "House Chili",
            "Roasted Eggplant",
        ]

        # 5. FTS search matches source name and author
        q_author = await client.get("/api/recipes", params={"q": "Ottolenghi"})
        assert [r["title"] for r in q_author.json()["items"]] == ["Roasted Eggplant"]

        q_site = await client.get("/api/recipes", params={"q": "Smitten"})
        assert [r["title"] for r in q_site.json()["items"]] == ["Skillet Ravioli"]

        # 6. Updating source on one translation synchronizes sibling rows in group
        patch_res = await client.patch(
            f"/api/recipes/{book_rec['id']}",
            json={
                "revision": book_rec["revision"],
                "source": {
                    "type": "cookbook",
                    "name": "Ottolenghi Simple",
                    "author": "Yotam Ottolenghi",
                    "page": "143",
                },
            },
        )
        assert patch_res.status_code == 200, patch_res.text
        de_after = (await client.get(f"/api/recipes/{r_book_de.json()['id']}")).json()
        assert de_after["source"]["name"] == "Ottolenghi Simple"
        assert de_after["source"]["page"] == "143"

        # 7. Batch rename consolidates source names across recipes & updates FTS
        rename_res = await client.post(
            "/api/recipes/sources/rename",
            json={
                "from_name": "Ottolenghi Simple",
                "to_name": "Simple",
                "author": "Yotam Ottolenghi",
            },
        )
        assert rename_res.status_code == 200, rename_res.text
        assert rename_res.json()["updated_count"] >= 1
        assert [
            r["title"]
            for r in (await client.get("/api/recipes", params=[("source", "Simple")])).json()["items"]
        ] == ["Roasted Eggplant"]
        assert [
            r["title"]
            for r in (await client.get("/api/recipes", params={"q": "Simple"})).json()["items"]
        ] == ["Roasted Eggplant"]

        # 8. URL importer strips tracking params, extracts og:site_name, and saves source
        assert (
            await client.put(
                "/api/x/core-ai-provider/settings",
                json={"provider": "openai", "openai_api_key": "test-key"},
            )
        ).status_code == 200

        ai_svc = kernel.services.get("core-ai-provider")
        imported_draft = {
            "title": "Crispy Chickpeas",
            "description": "Crunchy snack",
            "servings": 4,
            "language": "en",
            "ingredients": [{"name": "Chickpeas", "quantity": 400, "unit": "g"}],
            "steps": [{"instruction": "Roast until crisp."}],
            "tags": ["snack"],
            "source": None,
        }
        mock_html = (
            "<html><head>"
            '<meta property="og:site_name" content="NYT Cooking" />'
            "<title>Crispy Chickpeas - NYT Cooking</title>"
            "</head><body><p>400g chickpeas</p></body></html>"
        )
        with patch("secretsauce.net.fetch_public_text", AsyncMock(return_value=mock_html)), patch.object(
            ai_svc, "_complete_openai_compatible", AsyncMock(return_value=(imported_draft, 10, 5))
        ):
            parsed = await client.post(
                "/api/x/core-recipe-importer/parse-url",
                json={
                    "url": "https://cooking.nytimes.com/recipes/1234-crispy-chickpeas?utm_source=newsletter&fbclid=abc123&ref=share",
                    "auto_save": True,
                },
            )
            assert parsed.status_code == 200, parsed.text
            saved_import = (await client.get(f"/api/recipes/{parsed.json()['recipe_id']}")).json()
            assert saved_import["source"] == {
                "type": "website",
                "name": "NYT Cooking",
                "url": "https://cooking.nytimes.com/recipes/1234-crispy-chickpeas",
            }

        # 9. Translator and Customize-Recipe preserve source
        translated_payload = {
            "title": "Berenjena Asada",
            "ingredients": [{"name": "Berenjena", "quantity": 1, "unit": "pcs"}],
            "steps": [{"instruction": "Asar la berenjena."}],
            "tags": [],
        }
        with patch.object(
            ai_svc, "_complete_openai_compatible", AsyncMock(return_value=(translated_payload, 10, 5))
        ):
            tr = await client.post(
                "/api/x/core-translator/translate",
                json={"recipe_id": book_rec["id"], "target_language": "es"},
            )
            assert tr.status_code == 200, tr.text
            assert tr.json()["source"]["name"] == "Simple"

        adapted_payload = {
            "title": "Roasted Eggplant (Vegan)",
            "description": "Adapted",
            "servings": 2,
            "ingredients": [{"name": "Eggplant", "quantity": 1, "unit": "pcs"}],
            "steps": [{"instruction": "Roast."}],
            "tags": ["vegan"],
            "adaptation_summary": "Made vegan.",
        }
        with patch.object(
            ai_svc, "_complete_openai_compatible", AsyncMock(return_value=(adapted_payload, 10, 5))
        ):
            cust = await client.post(
                "/api/x/core-customize-recipe/customize",
                json={"action_id": "vegetarian", "recipe": book_rec},
            )
            assert cust.status_code == 200, cust.text
            assert cust.json()["source"]["name"] == "Simple"

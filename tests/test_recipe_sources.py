"""Unit and migration tests for Recipe Sources."""

from pathlib import Path
from unittest.mock import AsyncMock, patch

import aiosqlite
import pytest

from secretsauce.db import Database, split_sql_script
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_migration_0003_rebuilds_fts_with_existing_sources(tmp_path):
    db_path = tmp_path / "migrate.db"
    migrations_dir = Path("secretsauce/migrations")
    m1 = (migrations_dir / "0001_initial.sql").read_text(encoding="utf-8")
    m2 = (migrations_dir / "0002_hardening.sql").read_text(encoding="utf-8")
    m3 = (migrations_dir / "0003_recipes_fts_source.sql").read_text(encoding="utf-8")

    conn = await aiosqlite.connect(db_path)
    try:
        for script in (m1, m2):
            for stmt in split_sql_script(script):
                await conn.execute(stmt)
        await conn.execute(
            """
            INSERT INTO recipes (
                id, group_id, language, revision, title, description,
                ingredients, steps, tags, source, created_at, updated_at, origin
            ) VALUES (
                'grp1_en', 'grp1', 'en', 1, 'Cauliflower Cake', 'Savory cake',
                '[{"name": "Cauliflower"}, {"name": "Eggs"}]',
                '[{"instruction": "Bake"}]',
                '["savory"]',
                '{"type": "cookbook", "name": "Plenty More", "author": "Yotam Ottolenghi", "page": "88"}',
                '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'member'
            );
            """
        )
        await conn.commit()
        for stmt in split_sql_script(m3):
            await conn.execute(stmt)
        await conn.commit()
    finally:
        await conn.close()

    db = Database(db_path)
    await db.connect()
    try:
        repo = RecipesRepo(db, household_repo=HouseholdRepo(db))
        by_author = await repo.list_recipes(q="Ottolenghi")
        assert [r["id"] for r in by_author["items"]] == ["grp1_en"]
        by_book = await repo.list_recipes(q="Plenty")
        assert [r["id"] for r in by_book["items"]] == ["grp1_en"]
        by_ing = await repo.list_recipes(q="Cauliflower")
        assert [r["id"] for r in by_ing["items"]] == ["grp1_en"]
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_source_validation_and_clearing_across_group(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        bad_type = await k.client.post(
            "/api/recipes",
            json={
                "title": "Bad source type",
                "language": "en",
                "source": {"type": "magazine", "name": "Bon Appetit"},
            },
        )
        assert bad_type.status_code == 422

        blank_name = await k.client.post(
            "/api/recipes",
            json={
                "title": "Blank source name",
                "language": "en",
                "source": {"type": "cookbook", "name": "   "},
            },
        )
        assert blank_name.status_code == 422

        bad_rename = await k.client.post(
            "/api/recipes/sources/rename",
            json={"from_name": " ", "to_name": "Simple"},
        )
        assert bad_rename.status_code == 422

        created = (
            await k.client.post(
                "/api/recipes",
                json={
                    "title": "Shakshuka",
                    "language": "en",
                    "source": {"type": "cookbook", "name": "Jerusalem", "page": "66"},
                },
            )
        ).json()
        de = (
            await k.client.post(
                "/api/recipes",
                json={"group_id": created["group_id"], "language": "de", "title": "Schakschuka"},
            )
        ).json()
        assert de["source"]["name"] == "Jerusalem"

        # Clear source via PATCH source=None -> clears both rows and FTS/sources list
        cleared = await k.client.patch(
            f"/api/recipes/{created['id']}",
            json={"revision": created["revision"], "source": None},
        )
        assert cleared.status_code == 200
        assert cleared.json()["source"] is None
        de_after = (await k.client.get(f"/api/recipes/{de['id']}")).json()
        assert de_after["source"] is None
        assert (await k.client.get("/api/recipes/sources")).json()["items"] == []
        assert (await k.client.get("/api/recipes", params={"q": "Jerusalem"})).json()["total"] == 0


@pytest.mark.asyncio
async def test_importer_url_domain_fallback_and_text_cookbook_extraction(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")

        # 1. URL with no og:site_name and meaningful query param + tracking params
        html_no_meta = "<html><head><title>Best Chocolate Chip Cookies</title></head><body>Cookies</body></html>"
        draft_no_source = {
            "title": "Best Chocolate Chip Cookies",
            "servings": 12,
            "language": "en",
            "ingredients": [{"name": "Butter", "quantity": 200, "unit": "g"}],
            "steps": [{"instruction": "Bake."}],
            "tags": [],
            "source": None,
        }
        with patch("secretsauce.net.fetch_public_text", AsyncMock(return_value=html_no_meta)), patch.object(
            ai_svc, "complete", AsyncMock(return_value=draft_no_source)
        ):
            res = await k.client.post(
                "/api/x/core-recipe-importer/parse-url",
                json={
                    "url": "https://www.smittenkitchen.com/recipe?id=99&utm_medium=social&gclid=xyz",
                    "auto_save": False,
                },
            )
            assert res.status_code == 200
            assert res.json()["source"] == {
                "type": "website",
                "name": "smittenkitchen.com",
                "url": "https://www.smittenkitchen.com/recipe?id=99",
            }

        # 2. Text / photo import extracts cookbook details
        cookbook_draft = {
            "title": "Charred Broccoli",
            "servings": 4,
            "language": "en",
            "ingredients": [{"name": "Broccoli", "quantity": 500, "unit": "g"}],
            "steps": [{"instruction": "Char in oven."}],
            "tags": ["sides"],
            "source": {
                "type": "cookbook",
                "name": "Simple",
                "author": "Yotam Ottolenghi",
                "page": "74",
            },
        }
        with patch.object(ai_svc, "complete", AsyncMock(return_value=cookbook_draft)):
            text_res = await k.client.post(
                "/api/x/core-recipe-importer/parse-text",
                json={"text": "From Simple by Ottolenghi, p. 74: Charred Broccoli...", "auto_save": True},
            )
            assert text_res.status_code == 200
            saved = (await k.client.get(f"/api/recipes/{text_res.json()['recipe_id']}")).json()
            assert saved["source"] == {
                "type": "cookbook",
                "name": "Simple",
                "author": "Yotam Ottolenghi",
                "page": "74",
            }


@pytest.mark.asyncio
async def test_rename_preserves_author_when_omitted_and_handles_missing_source(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        noop = await k.client.post(
            "/api/recipes/sources/rename",
            json={"from_name": "Nonexistent", "to_name": "Other"},
        )
        assert noop.status_code == 200
        assert noop.json() == {"updated_count": 0, "updated_rows": 0}

        await k.client.post(
            "/api/recipes",
            json={
                "title": "Saffron Rice",
                "language": "en",
                "source": {"type": "cookbook", "name": "Salt Fat Acid", "author": "Samin Nosrat", "page": "210"},
            },
        )
        renamed = await k.client.post(
            "/api/recipes/sources/rename",
            json={"from_name": "Salt Fat Acid", "to_name": "Salt, Fat, Acid, Heat"},
        )
        assert renamed.status_code == 200
        assert renamed.json() == {"updated_count": 1, "updated_rows": 1}

        items = (await k.client.get("/api/recipes/sources")).json()["items"]
        assert items == [
            {
                "name": "Salt, Fat, Acid, Heat",
                "type": "cookbook",
                "author": "Samin Nosrat",
                "count": 1,
            }
        ]

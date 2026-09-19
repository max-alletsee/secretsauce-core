from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from secretsauce.testing import make_kernel


MOCK_SPANISH_TRANSLATION = {
    "title": "Pan de Plátano Clásico",
    "description": "Pan de plátano húmedo y delicioso",
    "ingredients": [
        {"name": "plátanos maduros", "quantity": 3, "unit": "piezas", "raw_text": "3 plátanos maduros"},
        {"name": "harina", "quantity": 250, "unit": "g", "raw_text": "250g harina para todo uso"},
    ],
    "steps": [
        {"instruction": "Triturar los plátanos en un tazón grande."},
        {"instruction": "Hornear a 350F durante 60 minutos."},
    ],
    "tags": ["repostería", "postre"],
}


@pytest.mark.asyncio
async def test_translator_discovery_and_schema(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-translator")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-translator"
        assert "core-ai-provider" in p.get("requires", [])

        table = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_translator_history'"
        )
        assert table is not None


@pytest.mark.asyncio
async def test_translate_recipe_into_group(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        # 1. Create source recipe (English)
        rec_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Classic Banana Bread",
                "description": "Moist and delicious banana bread",
                "language": "en",
                "ingredients": [
                    {"name": "ripe bananas", "quantity": 3, "unit": "pieces", "raw_text": "3 ripe bananas"},
                    {"name": "flour", "quantity": 250, "unit": "g", "raw_text": "250g all-purpose flour"},
                ],
                "steps": [
                    {"instruction": "Mash the bananas in a large bowl."},
                    {"instruction": "Bake at 350F for 60 minutes."},
                ],
            },
        )
        assert rec_res.status_code == 201
        source_rec = rec_res.json()
        recipe_id = source_rec["id"]
        group_id = source_rec["group_id"]

        # 2. Call translate endpoint
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = dict(MOCK_SPANISH_TRANSLATION)

            res = await k.client.post(
                "/api/x/core-translator/translate",
                json={"recipe_id": recipe_id, "target_language": "es"},
            )
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["language"] == "es"
            assert data["title"] == "Pan de Plátano Clásico"
            assert data["group_id"] == group_id

        # 3. Verify recipe group contains both en and es
        group_recipes = await k.db.read_all("SELECT language FROM recipes WHERE group_id = ?", (group_id,))
        langs = {r["language"] for r in group_recipes}
        assert "en" in langs
        assert "es" in langs


@pytest.mark.asyncio
async def test_translator_job_and_history(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")

        rec_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Pancake Stack",
                "language": "en",
                "ingredients": [{"name": "flour", "quantity": 200, "unit": "g"}],
                "steps": [{"instruction": "Cook on griddle"}],
            },
        )
        rec = rec_res.json()

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = {
                "title": "Pile de Crêpes",
                "description": "Délicieuses crêpes",
                "ingredients": [{"name": "farine", "quantity": 200, "unit": "g"}],
                "steps": [{"instruction": "Cuire sur la plaque"}],
                "tags": ["petit-déjeuner"],
            }

            job_id = await k.jobs.create_job(
                "core-translator",
                "translate-recipe",
                {"recipe_id": rec["id"], "target_language": "fr"},
            )
            run_res = await k.jobs.run_job(job_id)
            assert run_res["status"] == "done"
            assert run_res["result"]["title"] == "Pile de Crêpes"

        hist_res = await k.client.get("/api/x/core-translator/history")
        assert hist_res.status_code == 200
        history = hist_res.json()
        assert len(history) >= 1
        assert history[0]["target_lang"] == "fr"


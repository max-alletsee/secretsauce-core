from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from secretsauce.testing import make_kernel


def get_mock_recipe():
    return {
        "title": "Classic Banana Bread",
        "description": "Moist and delicious banana bread",
        "servings": 8,
        "prep_time_minutes": 15,
        "cook_time_minutes": 60,
        "language": "en",
        "ingredients": [
            {"name": "ripe bananas", "quantity": 3, "unit": "pieces", "raw_text": "3 ripe bananas"},
            {"name": "flour", "quantity": 250, "unit": "g", "raw_text": "250g all-purpose flour"},
        ],
        "steps": [
            {"instruction": "Mash the bananas in a large bowl."},
            {"instruction": "Bake at 350F for 60 minutes."},
        ],
        "tags": ["baking", "dessert"],
    }


@pytest.mark.asyncio
async def test_recipe_importer_discovery_and_schema(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-recipe-importer")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-recipe-importer"
        assert "core-ai-provider" in p.get("requires", [])

        table = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_recipe_importer_history'"
        )
        assert table is not None


@pytest.mark.asyncio
async def test_parse_text_and_auto_save(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = get_mock_recipe()

            res = await k.client.post(
                "/api/x/core-recipe-importer/parse-text",
                json={
                    "text": "3 ripe bananas, 250g flour. Mash bananas and bake for 60 min.",
                    "auto_save": True,
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["title"] == "Classic Banana Bread"
            assert data.get("recipe_id") is not None

            # Verify recipe actually saved in database
            saved_recipe = await k.recipes.get_recipe(data["recipe_id"])
            assert saved_recipe["title"] == "Classic Banana Bread"
            assert len(saved_recipe["ingredients"]) == 2

            # Verify history record
            history_rows = await k.db.read_all("SELECT * FROM plugin_core_recipe_importer_history")
            assert len(history_rows) == 1
            assert history_rows[0]["source_type"] == "text"
            assert history_rows[0]["status"] == "success"
            assert history_rows[0]["recipe_id"] == data["recipe_id"]


@pytest.mark.asyncio
async def test_parse_url_and_history(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        mock_html = "<html><body><h1>Banana Bread</h1><p>3 bananas, 250g flour</p></body></html>"

        with patch("secretsauce.net.fetch_public_text", AsyncMock(return_value=mock_html)), \
             patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = get_mock_recipe()

            res = await k.client.post(
                "/api/x/core-recipe-importer/parse-url",
                json={"url": "https://example.com/banana-bread", "auto_save": False},
            )
            assert res.status_code == 200

        data = res.json()
        assert data["title"] == "Classic Banana Bread"
        assert data.get("recipe_id") is None  # auto_save was False

        # Check history
        history_res = await k.client.get("/api/x/core-recipe-importer/history")
        assert history_res.status_code == 200
        items = history_res.json()
        assert len(items) >= 1
        assert items[0]["source_type"] == "url"
        assert items[0]["source_url"] == "https://example.com/banana-bread"


@pytest.mark.asyncio
async def test_import_url_background_job(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")

        mock_html = "<html><body><h1>Banana Bread</h1><p>3 bananas, 250g flour</p></body></html>"

        job_id = await k.jobs.create_job(
            "core-recipe-importer",
            "import-url",
            input_data={"url": "https://example.com/banana-bread", "auto_save": True},
        )

        with patch("secretsauce.net.fetch_public_text", AsyncMock(return_value=mock_html)), \
             patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = get_mock_recipe()

            run_res = await k.jobs.run_job(job_id)

        assert run_res["status"] == "done"
        output = run_res["result"]
        assert output["title"] == "Classic Banana Bread"
        assert output.get("recipe_id") is not None



@pytest.mark.asyncio
async def test_parse_url_refuses_internal_addresses(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        res = await k.client.post(
            "/api/x/core-recipe-importer/parse-url",
            json={"url": "http://127.0.0.1:8080/api/export", "auto_save": False},
        )
        assert res.status_code == 422
        history = (await k.client.get("/api/x/core-recipe-importer/history")).json()
        assert history[0]["status"] == "failed"

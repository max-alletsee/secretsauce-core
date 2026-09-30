"""Production HTTP/lifespan import path; only the outbound paid LLM is replaced."""
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import httpx
import pytest

from secretsauce.app import build_app
from secretsauce.config import Config


@asynccontextmanager
async def runtime(tmp_path):
    app = build_app(data_dir=tmp_path, config=Config(cookie_secure="false"))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url="http://testserver") as client:
            response = await client.post("/api/setup", json={
                "household_name": "Import tests", "passphrase": "long enough",
                "first_member": {"name": "Ann"},
            })
            assert response.status_code == 201
            yield app.state.kernel, client


@pytest.mark.parametrize("provider", ["gemini", "openai", "openrouter"])
async def test_unconfigured_importer_returns_unavailable(tmp_path, monkeypatch, provider):
    for variable in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(variable, raising=False)
    async with runtime(tmp_path) as (kernel, client):
        service = kernel.services.get("core-ai-provider")
        outbound = AsyncMock(side_effect=AssertionError("unconfigured AI must not leave the process"))
        monkeypatch.setattr(service, "_complete_openai_compatible", outbound)
        monkeypatch.setattr(service, "_complete_gemini", outbound)
        configured = await client.put("/api/x/core-ai-provider/settings", json={"provider": provider})
        assert configured.status_code == 200
        response = await client.post("/api/x/core-recipe-importer/parse-text", json={"text": "Soup", "auto_save": False})
        assert response.status_code == 503, response.text
        assert response.json()["error"]["code"] == "unavailable"
        outbound.assert_not_called()


async def test_unconfigured_translator_preserves_standard_unavailable_error(tmp_path, monkeypatch):
    for variable in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(variable, raising=False)
    async with runtime(tmp_path) as (kernel, client):
        source = await client.post("/api/recipes", json={"title": "Pasta", "language": "en"})
        assert source.status_code == 201
        assert (await client.put("/api/x/core-ai-provider/settings", json={"provider": "openai"})).status_code == 200
        outbound = AsyncMock(side_effect=AssertionError("unconfigured AI must not leave the process"))
        monkeypatch.setattr(kernel.services.get("core-ai-provider"), "_complete_openai_compatible", outbound)
        response = await client.post("/api/x/core-translator/translate", json={
            "recipe_id": source.json()["id"], "target_language": "es",
        })
        assert response.status_code == 503, response.text
        assert response.json()["error"]["code"] == "unavailable"
        assert (await client.get("/api/recipes")).json()["total"] == 1
        outbound.assert_not_called()


async def test_extracted_draft_is_not_saved_until_real_recipe_write(tmp_path, monkeypatch):
    draft = {"title": "Chickpea lemon soup", "language": "en", "servings": 3,
             "ingredients": [{"name": "Chickpeas", "quantity": 400, "unit": "g"}],
             "steps": [{"instruction": "Simmer for ten minutes."}], "tags": ["soup"]}
    async with runtime(tmp_path) as (kernel, client):
        outbound = AsyncMock(return_value=(draft, 12, 8))
        monkeypatch.setattr(kernel.services.get("core-ai-provider"), "_complete_openai_compatible", outbound)
        assert (await client.put("/api/x/core-ai-provider/settings", json={"provider": "openai", "openai_api_key": "test-key"})).status_code == 200
        extracted = await client.post("/api/x/core-recipe-importer/parse-text", json={"text": "Chickpea soup", "auto_save": False})
        assert extracted.status_code == 200, extracted.text
        assert (await client.get("/api/recipes")).json()["total"] == 0
        saved = await client.post("/api/recipes", json=extracted.json())
        assert saved.status_code == 201, saved.text
        reloaded = (await client.get(f"/api/recipes/{saved.json()['id']}")).json()
        assert reloaded["ingredients"][0]["name"] == "Chickpeas"
        assert reloaded["steps"][0]["instruction"] == "Simmer for ten minutes."
        assert (await client.get("/api/x/core-ai-provider/usage")).json()["total_input_tokens"] == 12

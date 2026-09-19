from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from pydantic import BaseModel
import pytest

from secretsauce.testing import make_kernel


class ItemSchema(BaseModel):
    title: str
    count: int


@pytest.mark.asyncio
async def test_core_ai_provider_boots_and_registers_service(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-ai-provider")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-ai-provider"

        # Check migration created plugin_core_ai_provider_usage table
        table = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_ai_provider_usage'"
        )
        assert table is not None

        # Verify service registered under both core-ai-provider and ai
        svc = k.services.get("core-ai-provider")
        assert svc is not None
        svc_alias = k.services.get("ai")
        assert svc_alias is not None
        assert hasattr(svc, "complete")


@pytest.mark.asyncio
async def test_gemini_driver_completion_with_schema(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        svc = k.services.get("core-ai-provider")
        assert svc is not None

        mock_response = MagicMock()
        mock_response.text = '{"title": "Pancake Recipe", "count": 4}'
        mock_response.usage_metadata = MagicMock(
            prompt_token_count=120,
            candidates_token_count=45,
            total_token_count=165,
        )

        mock_generate_content = AsyncMock(return_value=mock_response)
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = mock_generate_content

        with patch("google.genai.Client", return_value=mock_client):
            result = await svc.complete(
                schema=ItemSchema,
                prompt="Extract items",
                call_type="extract",
                calling_plugin="test-plugin",
            )

        assert isinstance(result, dict)
        assert result["title"] == "Pancake Recipe"
        assert result["count"] == 4

        # Verify usage logged in database
        row = await k.db.fetch_one(
            "SELECT * FROM plugin_core_ai_provider_usage WHERE calling_plugin = 'test-plugin'"
        )
        assert row is not None
        assert row["provider"] == "gemini"
        assert row["model"] == "gemini-3.8-flash"
        assert row["input_tokens"] == 120
        assert row["output_tokens"] == 45
        assert row["estimated_cost_usd"] > 0


@pytest.mark.asyncio
async def test_budget_enforcement(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        svc = k.services.get("core-ai-provider")
        assert svc is not None

        # Configure enforce_budget=True and a tiny monthly_budget
        await svc.update_settings({
            "enforce_budget": True,
            "monthly_budget": 0.005,
        })

        # Insert historical usage exceeding budget in the current month
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        await k.db.write(
            """
            INSERT INTO plugin_core_ai_provider_usage
            (id, timestamp, calling_plugin, provider, model, call_type, input_tokens, output_tokens, estimated_cost_usd)
            VALUES ('u1', ?, 'test', 'gemini', 'gemini-3.8-flash', 'test', 100000, 50000, 0.05)
            """,
            (now_iso,),
        )

        # Attempting completion should raise budget error
        with pytest.raises(Exception) as exc:
            await svc.complete(
                schema=None,
                prompt="Hello",
                call_type="chat",
                calling_plugin="test-plugin",
            )
        assert "budget exceeded" in str(exc.value).lower()


@pytest.mark.asyncio
async def test_ai_provider_usage_and_settings_api(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        client = k.client

        # 1. Check settings route
        settings_res = await client.get("/api/x/core-ai-provider/settings")
        assert settings_res.status_code == 200
        settings_data = settings_res.json()
        assert settings_data["model"] == "gemini-3.8-flash"
        assert settings_data["provider"] == "gemini"

        # 2. Update settings via PUT
        put_res = await client.put(
            "/api/x/core-ai-provider/settings",
            json={
                "model": "gemini-3.8-flash",
                "enforce_budget": True,
                "monthly_budget": 15.0,
            },
        )
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["enforce_budget"] is True
        assert updated["monthly_budget"] == 15.0

        # 3. Usage endpoint
        usage_res = await client.get("/api/x/core-ai-provider/usage")
        assert usage_res.status_code == 200
        usage_data = usage_res.json()
        assert "total_cost_usd" in usage_data
        assert "month_cost_usd" in usage_data
        assert "breakdown_by_plugin" in usage_data


@pytest.mark.asyncio
async def test_openai_and_openrouter_providers(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        svc = k.services.get("core-ai-provider")

        # 1. Test OpenAI
        await svc.update_settings({
            "provider": "openai",
            "model": "gpt-4o-mini",
            "openai_api_key": "sk-mock-key",
        })

        mock_openai_response = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": '{"title": "OpenAI Recipe", "count": 2}',
                }
            }],
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 50,
            },
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = mock_openai_response
            mock_post.return_value = mock_resp

            res = await svc.complete(
                schema=ItemSchema,
                prompt="Parse recipe",
                call_type="openai_test",
                calling_plugin="test-plugin",
            )
            assert res["title"] == "OpenAI Recipe"
            assert res["count"] == 2
            assert "api.openai.com" in mock_post.call_args[0][0]

        # 2. Test OpenRouter
        await svc.update_settings({
            "provider": "openrouter",
            "model": "anthropic/claude-3.5-haiku",
            "openrouter_api_key": "sk-or-mock-key",
        })

        mock_or_response = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "Raw string response",
                }
            }],
            "usage": {
                "prompt_tokens": 80,
                "completion_tokens": 20,
            },
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = mock_or_response
            mock_post.return_value = mock_resp

            res_raw = await svc.complete(
                schema=None,
                prompt="Say hello",
                call_type="or_test",
                calling_plugin="test-plugin",
            )
            assert res_raw == "Raw string response"
            assert "openrouter.ai" in mock_post.call_args[0][0]


@pytest.mark.asyncio
async def test_budget_disabled_allows_overage(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        svc = k.services.get("core-ai-provider")

        await svc.update_settings({
            "enforce_budget": False,
            "monthly_budget": 0.001,
        })

        # Insert high historical usage
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        await k.db.write(
            """
            INSERT INTO plugin_core_ai_provider_usage
            (id, timestamp, calling_plugin, provider, model, call_type, input_tokens, output_tokens, estimated_cost_usd)
            VALUES ('u2', ?, 'test', 'gemini', 'gemini-3.8-flash', 'test', 100000, 50000, 10.0)
            """,
            (now_iso,),
        )

        mock_response = MagicMock()
        mock_response.text = "OK"
        mock_response.usage_metadata = MagicMock(prompt_token_count=10, candidates_token_count=5)
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)

        with patch("google.genai.Client", return_value=mock_client):
            # Should NOT raise an exception because enforce_budget is False
            res = await svc.complete(schema=None, prompt="Test", call_type="test")
            assert res == "OK"


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

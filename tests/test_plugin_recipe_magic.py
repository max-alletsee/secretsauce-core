from pathlib import Path
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_magic_discovery(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-recipe-magic")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-recipe-magic"
        assert "core-ai-provider" in p.get("requires", [])

@pytest.mark.asyncio
async def test_get_default_actions(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        resp = await k.client.get("/api/x/core-recipe-magic/actions")
        assert resp.status_code == 200
        actions = resp.json()
        assert len(actions) >= 5
        ids = [a["id"] for a in actions]
        assert "vegetarian" in ids
        assert "ten-ingredients" in ids
        assert "fast" in ids
        assert "pantry-friendly" in ids
        assert "easy-prep" in ids

@pytest.mark.asyncio
async def test_update_and_reset_actions(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        custom_actions = [
            {"id": "spicy", "title": "Make it spicy", "description": "Add heat", "prompt": "Make it hot"}
        ]
        put_resp = await k.client.put("/api/x/core-recipe-magic/actions", json=custom_actions)
        assert put_resp.status_code == 200
        assert put_resp.json() == custom_actions

        get_resp = await k.client.get("/api/x/core-recipe-magic/actions")
        assert get_resp.json() == custom_actions

        reset_resp = await k.client.post("/api/x/core-recipe-magic/actions/reset")
        assert reset_resp.status_code == 200
        assert len(reset_resp.json()) >= 5
        ids = [a["id"] for a in reset_resp.json()]
        assert "vegetarian" in ids

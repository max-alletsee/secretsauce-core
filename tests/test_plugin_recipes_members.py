import pytest
from pathlib import Path
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_core_members_discovery(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-members")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-members"
        assert p["ui"] == "ui.js"

        r = await k.plugins.get_plugin("core-recipes")
        assert r is not None
        assert r["state"] == "active"
        assert r["name"] == "core-recipes"
        assert r["ui"] == "ui.js"


@pytest.mark.asyncio
async def test_plugin_ui_bundle_serving(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        client = k.client

        assert await k.plugins.get_plugin("core-cook-tracker") is None

        for pid in ["core-members", "core-recipes", "core-shortlist", "core-timeline", "core-ratings"]:
            res = await client.get(f"/api/plugins/{pid}/ui.js")
            assert res.status_code == 200
            assert "javascript" in res.headers["content-type"].lower()
            assert res.headers.get("cache-control") == "no-cache"

            res_ver = await client.get(f"/api/plugins/{pid}/ui.js?v=1.0.0")
            assert res_ver.status_code == 200
            assert "public, max-age=31536000, immutable" in res_ver.headers.get("cache-control", "")

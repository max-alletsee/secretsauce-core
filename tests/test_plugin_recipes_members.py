import pytest
from pathlib import Path
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_core_members_discovery(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-members")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "Household Members"
        assert p["ui"] == "ui.js"

        r = await k.plugins.get_plugin("core-recipes")
        assert r is not None
        assert r["state"] == "active"
        assert r["name"] == "Recipes"
        assert r["ui"] == "ui.js"

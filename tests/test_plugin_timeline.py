import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_core_timeline_plugin_boots_cleanly(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-timeline")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "Timeline"
        assert p["ui"] == "ui.js"

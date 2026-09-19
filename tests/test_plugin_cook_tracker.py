import pytest
from pathlib import Path
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_cook_tracker_boots_and_runs_rebuild(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-cook-tracker")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-cook-tracker"
        assert p["ui"] == "ui.js"

        # Check migrations applied
        rows = await k.db.read_all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'plugin_core_cook_tracker_%';"
        )
        table_names = {r["name"] for r in rows}
        assert "plugin_core_cook_tracker_leftovers" in table_names
        assert "plugin_core_cook_tracker_carryovers" in table_names

        # Run rebuild command
        rebuild_fn = k.services.get_command("core-cook-tracker", "rebuild")
        assert rebuild_fn is not None
        ctx = k.ctx_for("core-cook-tracker")
        res = await rebuild_fn(ctx)
        assert res["status"] == "ok"

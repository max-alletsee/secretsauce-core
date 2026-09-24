import pytest
from pathlib import Path
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_plugin_ui_routes_and_active_list(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Create a sample plugin with ui.js and ui.css in plugins_dir
        sample_dir = k.plugins_dir / "sample-ui"
        sample_dir.mkdir(parents=True, exist_ok=True)
        (sample_dir / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "sample-ui",
    "version": "1.0.0",
    "name": "Sample UI Plugin",
    "ui": "ui.js",
    "ui_css": "ui.css"
}
async def setup(ctx):
    pass
""",
            encoding="utf-8",
        )
        (sample_dir / "ui.js").write_text(
            "export default { name: 'sample-ui' };", encoding="utf-8"
        )
        (sample_dir / "ui.css").write_text(
            ".sample-ui { color: red; }", encoding="utf-8"
        )

        # Create another plugin without UI
        no_ui_dir = k.plugins_dir / "no-ui"
        no_ui_dir.mkdir(parents=True, exist_ok=True)
        (no_ui_dir / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "no-ui",
    "version": "1.0.0",
    "name": "No UI Plugin"
}
async def setup(ctx):
    pass
""",
            encoding="utf-8",
        )

        # Rescan plugins
        await k.loader.discover_and_sync()

        # 1. Test GET /api/plugins/active
        res_active = await k.client.get("/api/plugins/active")
        assert res_active.status_code == 200
        active_list = res_active.json()
        ids = [p["id"] for p in active_list]
        assert "sample-ui" in ids
        assert "no-ui" in ids

        sample_p = next(p for p in active_list if p["id"] == "sample-ui")
        # Versioned by content so the shell may cache the bundle immutably.
        assert sample_p["ui_entry"].startswith("/api/plugins/sample-ui/ui.js?v=")
        assert sample_p["ui_css"].startswith("/api/plugins/sample-ui/ui.css?v=")

        no_ui_p = next(p for p in active_list if p["id"] == "no-ui")
        assert no_ui_p["ui_entry"] is None
        assert no_ui_p["ui_css"] is None

        # 2. Test GET /api/plugins/sample-ui/ui.js
        res_ui_js = await k.client.get("/api/plugins/sample-ui/ui.js")
        assert res_ui_js.status_code == 200
        assert "text/javascript" in res_ui_js.headers["content-type"]
        assert "export default" in res_ui_js.text
        etag = res_ui_js.headers.get("etag")
        assert etag is not None

        # 3. Test 304 If-None-Match
        res_304 = await k.client.get(
            "/api/plugins/sample-ui/ui.js", headers={"If-None-Match": etag}
        )
        assert res_304.status_code == 304

        # 4. Test versioned cache-control
        res_versioned = await k.client.get("/api/plugins/sample-ui/ui.js?v=boot123")
        assert res_versioned.status_code == 200
        assert "immutable" in res_versioned.headers["cache-control"]

        # 5. Test GET /api/plugins/sample-ui/ui.css
        res_ui_css = await k.client.get("/api/plugins/sample-ui/ui.css")
        assert res_ui_css.status_code == 200
        assert "text/css" in res_ui_css.headers["content-type"]
        assert ".sample-ui" in res_ui_css.text

        # 6. Test 404 for plugin without UI
        res_missing_js = await k.client.get("/api/plugins/no-ui/ui.js")
        assert res_missing_js.status_code == 404

        res_missing_css = await k.client.get("/api/plugins/no-ui/ui.css")
        assert res_missing_css.status_code == 404

        # 7. Test 404 for non-existent plugin
        res_nonexistent = await k.client.get("/api/plugins/non-existent/ui.js")
        assert res_nonexistent.status_code == 404

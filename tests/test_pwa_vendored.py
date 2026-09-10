import pytest
from pathlib import Path
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_pwa_vendored_static_assets(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # 1. Root index.html serving
        res_root = await k.client.get("/")
        assert res_root.status_code == 200
        assert "window.__SS__" in res_root.text
        assert res_root.headers["cache-control"] == "no-cache"

        # 2. Service worker serving
        res_sw = await k.client.get("/sw.js")
        assert res_sw.status_code == 200
        assert res_sw.headers["content-type"].startswith("text/javascript")
        assert res_sw.headers["cache-control"] == "no-cache"
        assert "__SS_PRECACHE__" not in res_sw.text  # replaced by json payload

        # 3. Static icon serving
        res_icon = await k.client.get("/static/icons/icon-192.png")
        assert res_icon.status_code == 200
        assert res_icon.headers["cache-control"] == "public, max-age=31536000, immutable"

        # 4. Vendor file serving
        res_vendor = await k.client.get("/static/vendor/secretsauce-ui.js")
        assert res_vendor.status_code == 200
        assert res_vendor.headers["cache-control"] == "public, max-age=31536000, immutable"

        # 5. Manifest serving
        res_manifest = await k.client.get("/manifest.webmanifest")
        assert res_manifest.status_code == 200
        data = res_manifest.json()
        assert len(data["icons"]) == 3

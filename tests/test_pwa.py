import hashlib
import json
from pathlib import Path
import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_pwa_manifest_without_session(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        res = await k.client.get("/manifest.webmanifest")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("application/manifest+json")
        assert res.headers["cache-control"] == "no-cache"
        data = res.json()
        assert data["name"] == "SecretSauce"
        assert data["short_name"] == "SecretSauce"
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#c2410c"
        assert data["share_target"]["action"] == "/share"


@pytest.mark.asyncio
async def test_pwa_manifest_with_session(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        await k.client.post("/api/setup", json={
            "household_name": "Familie Müller",
            "passphrase": "correct-horse-battery-staple",
            "first_member": {"name": "Alice", "preferred_language": "de"}
        })
        res = await k.client.get("/manifest.webmanifest")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "SecretSauce – Familie Müller"

        # Anonymous client without session cookie gets generic name even when setup is done
        k.client.cookies.clear()
        res_anon = await k.client.get("/manifest.webmanifest")
        assert res_anon.status_code == 200
        assert res_anon.json()["name"] == "SecretSauce"


@pytest.mark.asyncio
async def test_pwa_sw_js_templating(tmp_path: Path):
    static_dir = Path("secretsauce/static")
    static_dir.mkdir(parents=True, exist_ok=True)
    dummy_sw = static_dir / "sw.js"
    dummy_sw.write_text("const precache = __SS_PRECACHE__;", encoding="utf-8")
    try:
        async with make_kernel(tmp_path) as k:
            res = await k.client.get("/sw.js")
            assert res.status_code == 200
            assert "text/javascript" in res.headers["content-type"]
            assert res.headers["cache-control"] == "no-cache"
            assert "__SS_PRECACHE__" not in res.text
            assert "const precache = {" in res.text
            assert '"build":' in res.text
            assert '"files":' in res.text
    finally:
        if dummy_sw.exists():
            dummy_sw.unlink()


@pytest.mark.asyncio
async def test_pwa_static_file_serving(tmp_path: Path):
    static_dir = Path("secretsauce/static")
    static_dir.mkdir(parents=True, exist_ok=True)
    dummy_file = static_dir / "test-asset.abc1234.js"
    dummy_file.write_text("console.log('hello');", encoding="utf-8")
    try:
        async with make_kernel(tmp_path) as k:
            res = await k.client.get("/static/test-asset.abc1234.js")
            assert res.status_code == 200
            assert res.headers["cache-control"] == "public, max-age=31536000, immutable"
            assert res.text == "console.log('hello');"

            # sw.js and index.html must not be served via /static/
            res_sw = await k.client.get("/static/sw.js")
            assert res_sw.status_code in (403, 404)
    finally:
        if dummy_file.exists():
            dummy_file.unlink()


@pytest.mark.asyncio
async def test_pwa_spa_index_fallback(tmp_path: Path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.get("/recipes/123")
        assert res.status_code == 200
        assert "text/html" in res.headers["content-type"]
        assert res.headers["cache-control"] == "no-cache"
        assert "window.__SS__ = {" in res.text
        assert k.boot_id in res.text

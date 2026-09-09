import io
import zipfile
import pytest
from secretsauce.testing import make_kernel
from secretsauce.app import build_app
from secretsauce.gc import run_garbage_collection


@pytest.mark.asyncio
async def test_boot_and_export(tmp_path):
    async with make_kernel(tmp_path) as k:
        # 1. Health endpoint
        health = await k.client.get("/api/health")
        assert health.status_code == 200
        data = health.json()
        assert "boot_id" in data
        assert data.get("ok") is True or data.get("status") == "ok"

        # Create dummy config.json in tmp_path
        (tmp_path / "config.json").write_text("{}", encoding="utf-8")

        # 2. Export zip endpoint
        exp = await k.client.get("/api/export")
        assert exp.status_code == 200
        assert "application/zip" in exp.headers["content-type"]

        with zipfile.ZipFile(io.BytesIO(exp.content)) as z:
            names = z.namelist()
            assert "secretsauce.db" in names
            assert "config.json" in names

        # 3. Export JSON endpoint
        exp_json = await k.client.get("/api/export/json")
        assert exp_json.status_code == 200
        payload = exp_json.json()
        assert "recipes" in payload
        assert "schedule_entries" in payload
        assert "cook_journal" in payload
        assert "household_members" in payload
        assert "assets" in payload
        assert "household_config" in payload


@pytest.mark.asyncio
async def test_garbage_collector(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Create an orphaned file in uploads/
        uploads_dir = tmp_path / "uploads"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        orphan_file = uploads_dir / "orphan.jpg"
        orphan_file.write_bytes(b"orphan-data")

        # Run GC
        deleted_files = await run_garbage_collection(k.db, tmp_path)
        assert not orphan_file.exists()
        assert "orphan.jpg" in deleted_files


@pytest.mark.asyncio
async def test_build_app_lifespan(tmp_path):
    import httpx
    from httpx import ASGITransport

    app = build_app(data_dir=tmp_path)
    # Testing lifespan execution
    async with httpx.AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        # Note: In ASGI Lifespan, ASGITransport might not trigger lifespan unless handled,
        # but lifespan can be entered via asynccontextmanager
        from contextlib import asynccontextmanager

        async with app.router.lifespan_context(app):
            assert hasattr(app.state, "kernel")
            assert app.state.kernel.boot_id is not None
            res = await client.get("/api/health")
            assert res.status_code == 200
            assert res.json()["boot_id"] == app.state.kernel.boot_id


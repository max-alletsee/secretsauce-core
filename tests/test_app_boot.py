import os
import time
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
        assert "timeline_entries" in payload
        assert "schedule_entries" not in payload
        assert "cook_journal" not in payload
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
        nested_orphan = uploads_dir / "2026" / "01" / "lost.png"
        nested_orphan.parent.mkdir(parents=True)
        nested_orphan.write_bytes(b"lost")
        fresh_file = uploads_dir / "2026" / "01" / "in-flight.png"
        fresh_file.write_bytes(b"uploading")
        an_hour_ago = time.time() - 7200
        for old in (orphan_file, nested_orphan):
            os.utime(old, (an_hour_ago, an_hour_ago))

        # Run GC
        deleted_files = await run_garbage_collection(k.db, tmp_path)
        assert not orphan_file.exists()
        assert not nested_orphan.exists()
        assert "orphan.jpg" in deleted_files
        assert "2026/01/lost.png" in deleted_files
        # Younger than the grace period: may belong to an upload not yet committed.
        assert fresh_file.exists()


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


@pytest.mark.asyncio
async def test_booted_kernel_plugins_endpoint(tmp_path):
    import httpx
    from httpx import ASGITransport

    app = build_app(data_dir=tmp_path)
    async with app.router.lifespan_context(app):
        kernel = app.state.kernel
        assert hasattr(kernel, "plugins")
        assert kernel.plugins is kernel.registry

        async with httpx.AsyncClient(
            transport=ASGITransport(app=app), base_url="http://testserver"
        ) as client:
            # Setup household
            setup_res = await client.post(
                "/api/setup",
                json={
                    "household_name": "Test Home",
                    "passphrase": "super-passphrase",
                    "first_member": {"name": "Alice"},
                },
            )
            assert setup_res.status_code == 201

            # GET /api/plugins should now return 200 with session cookie
            plugins_res = await client.get("/api/plugins")
            assert plugins_res.status_code == 200
            assert isinstance(plugins_res.json(), list)



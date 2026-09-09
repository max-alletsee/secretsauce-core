import asyncio
import json
import pytest
from secretsauce.plugins.manifest import PluginManifest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_jobs_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Create a job
        job_id = await k.jobs.create_job(
            plugin_id="core-test",
            job_type="test_job",
            input_data={"param": 42},
        )

        # GET /api/jobs
        res = await k.client.get("/api/jobs")
        assert res.status_code == 200
        jobs = res.json()
        assert len(jobs) == 1
        assert jobs[0]["id"] == job_id
        assert jobs[0]["job_type"] == "test_job"

        # GET /api/jobs/{id}
        single_res = await k.client.get(f"/api/jobs/{job_id}")
        assert single_res.status_code == 200
        assert single_res.json()["id"] == job_id

        # POST /api/jobs/{id}/cancel
        cancel_res = await k.client.post(f"/api/jobs/{job_id}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_plugins_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Register a plugin manifest
        manifest = PluginManifest(
            id="test-plugin",
            name="Test Plugin",
            version="1.0.0",
            description="Plugin for test",
        )
        k.plugins.register_manifest(manifest)
        await k.plugins.upsert_plugin_record(manifest.id, manifest.version, "active")

        # GET /api/plugins
        res = await k.client.get("/api/plugins")
        assert res.status_code == 200
        plugins = res.json()
        assert any(p["id"] == "test-plugin" for p in plugins)

        # GET /api/plugins/{id}
        p_res = await k.client.get("/api/plugins/test-plugin")
        assert p_res.status_code == 200
        assert p_res.json()["name"] == "Test Plugin"

        # POST /api/plugins/{id}/disable
        dis_res = await k.client.post("/api/plugins/test-plugin/disable")
        assert dis_res.status_code == 200
        assert dis_res.json()["enabled"] is False

        # POST /api/plugins/{id}/enable
        en_res = await k.client.post("/api/plugins/test-plugin/enable")
        assert en_res.status_code == 200
        assert en_res.json()["enabled"] is True


@pytest.mark.asyncio
async def test_sse_stream_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Append an event
        async with k.db.transaction() as tx:
            await k.events.append(
                tx,
                name="recipe:created",
                entity_type="recipe",
                entity_id="r1",
                data={"title": "Test Recipe"},
            )

        # Connect to stream with Last-Event-ID: 0
        # With live=false, yields 'hello' then replayed 'event' with id 1, then closes cleanly
        headers = {"Last-Event-ID": "0"}
        response = await k.client.get("/api/events/stream?live=false", headers=headers)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        text = response.text
        assert "event: hello" in text
        assert "event: event" in text
        assert "id: 1" in text


@pytest.mark.asyncio
async def test_sse_stream_live_events_and_push(tmp_path):
    async with make_kernel(tmp_path) as k:
        async def send_later():
            await asyncio.sleep(0.05)
            k.broadcaster.broadcast_push("test:ping", {"msg": "hello_world"})

        asyncio.create_task(send_later())

        # Ask for limit=2 (1 for hello, 1 for push)
        res = await k.client.get("/api/events/stream?limit=2")
        assert res.status_code == 200
        text = res.text
        assert "event: hello" in text
        assert "event: push" in text
        assert "hello_world" in text


"""The production path: build_app + lifespan runs the event pump and the job runner."""

import asyncio
import sys

import httpx

from secretsauce.app import build_app
from secretsauce.config import Config
from secretsauce.testing import make_kernel

PROBE_PLUGIN = '''
PLUGIN = {"id": "probe", "version": "1.0.0"}
SEEN = []

async def setup(ctx):
    async def on_recipe(event):
        SEEN.append((event.name, event.entity_id))

    async def echo(input_data, handle):
        await handle.set_progress(50, "halfway")
        return {"echo": input_data.get("value")}

    ctx.on("recipe:*", on_recipe)
    ctx.jobs.register("echo", echo)
'''


async def _eventually(predicate, timeout: float = 5.0):
    deadline = asyncio.get_running_loop().time() + timeout
    while not await predicate():
        if asyncio.get_running_loop().time() > deadline:
            raise AssertionError("condition not reached in time")
        await asyncio.sleep(0.02)


async def test_production_app_delivers_events_and_runs_jobs(tmp_path):
    (tmp_path / "plugins").mkdir()
    (tmp_path / "plugins" / "probe.py").write_text(PROBE_PLUGIN, encoding="utf-8")

    app = build_app(data_dir=tmp_path, config=Config(cookie_secure="false"))
    async with app.router.lifespan_context(app):
        kernel = app.state.kernel
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as client:
            setup = await client.post(
                "/api/setup",
                json={
                    "household_name": "Home",
                    "passphrase": "long enough",
                    "first_member": {"name": "Ann"},
                },
            )
            assert setup.status_code == 201
            recipe = (
                await client.post("/api/recipes", json={"title": "Soup", "language": "en"})
            ).json()

            probe = sys.modules["ss_plugin_probe"]

            async def delivered():
                return ("recipe:created", recipe["id"]) in probe.SEEN

            await _eventually(delivered)

            job_id = await kernel.jobs.create_job("probe", "echo", {"value": 7})

            async def finished():
                return (await kernel.jobs.get_job(job_id))["status"] == "done"

            await _eventually(finished)
            assert (await kernel.jobs.get_job(job_id))["result"] == {"echo": 7}

            names = [
                r["name"]
                for r in await kernel.db.read_all(
                    "SELECT name FROM events WHERE entity_id = ? ORDER BY seq;", (job_id,)
                )
            ]
            assert names == ["job:started", "job:finished"]


async def test_cancel_stops_a_running_job(tmp_path):
    async with make_kernel(tmp_path, services=True) as k:
        started = asyncio.Event()
        cancelled = asyncio.Event()

        async def forever(input_data, handle):
            started.set()
            try:
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                cancelled.set()
                raise

        k.jobs.register_handler("tester", "forever", forever)
        job_id = await k.jobs.create_job("tester", "forever")
        await asyncio.wait_for(started.wait(), timeout=5)

        await k.jobs.cancel_job(job_id)
        await asyncio.wait_for(cancelled.wait(), timeout=5)

        job = await k.jobs.get_job(job_id)
        assert job["status"] == "cancelled"
        finished = await k.db.read_one(
            "SELECT data FROM events WHERE name = 'job:finished' AND entity_id = ?;", (job_id,)
        )
        assert '"cancelled"' in finished["data"]


async def test_job_cancelled_before_start_never_runs(tmp_path):
    async with make_kernel(tmp_path) as k:
        ran = []

        async def handler(input_data, handle):
            ran.append(True)

        k.jobs.register_handler("tester", "noop", handler)
        job_id = await k.jobs.create_job("tester", "noop")
        await k.jobs.cancel_job(job_id)

        result = await k.jobs.run_job(job_id)
        assert result["status"] == "cancelled"
        assert ran == []


async def test_job_without_handler_stays_pending(tmp_path):
    async with make_kernel(tmp_path, services=True) as k:
        job_id = await k.jobs.create_job("nobody", "unknown")
        await asyncio.sleep(0.1)
        assert (await k.jobs.get_job(job_id))["status"] == "pending"


async def test_progress_is_pushed_not_logged(tmp_path):
    async with make_kernel(tmp_path) as k:
        queue = await k.broadcaster.subscribe()

        async def handler(input_data, handle):
            await handle.set_progress(40, "working")

        k.jobs.register_handler("tester", "p", handler)
        job_id = await k.jobs.create_job("tester", "p")
        await k.jobs.run_job(job_id)

        pushes = []
        while not queue.empty():
            kind, content = queue.get_nowait()
            if kind == "push":
                pushes.append(content)
        assert {"kind": "push", "name": "job:progress", "plugin_id": None,
                "data": {"id": job_id, "percent": 40, "message": "working"}} in pushes
        assert await k.db.read_val("SELECT COUNT(*) FROM events WHERE name = 'job:progress';") == 0


async def test_failing_handler_backs_off_and_other_plugins_continue(tmp_path, monkeypatch):
    import secretsauce.events as events_mod

    monkeypatch.setattr(events_mod, "_RETRY_BACKOFF_SECONDS", (0.05, 0.05, 0.05, 0.05))
    async with make_kernel(tmp_path, services=True) as k:
        k.pump.fallback_seconds = 0.05
        calls = {"bad": 0, "good": 0}

        async def bad(event):
            calls["bad"] += 1
            raise RuntimeError("boom")

        async def good(event):
            calls["good"] += 1

        bad_ctx, good_ctx = k.ctx_for("bad-plugin"), k.ctx_for("good-plugin")
        for ctx, handler in ((bad_ctx, bad), (good_ctx, good)):
            await ctx._dispatcher.ensure_cursor(start_at_head=True)
            ctx.on("test:*", handler, include_self=True)
            k.pump.add(ctx._dispatcher)

        await good_ctx.emit("test:thing", {})

        async def both_ran():
            return calls["good"] == 1 and calls["bad"] >= 2

        await _eventually(both_ran)
        cursor = await bad_ctx._dispatcher.get_cursor()
        assert cursor["attempts"] >= 1
        assert "boom" in cursor["last_error"]

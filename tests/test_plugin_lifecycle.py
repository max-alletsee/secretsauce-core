import asyncio
import json
import sys
from pathlib import Path

from secretsauce.secrets import MASK_STRING
from secretsauce.testing import drain_events, make_kernel


def write_plugin(root: Path, plugin_id: str, body: str, *, requires=(), schema=0, files=None):
    plugin_dir = root / "plugins" / plugin_id
    plugin_dir.mkdir(parents=True, exist_ok=True)
    header = f"PLUGIN = {{'id': '{plugin_id}', 'version': '1.0.0', 'requires': {list(requires)!r}, 'schema': {schema}}}\n"
    (plugin_dir / "__init__.py").write_text(header + body, encoding="utf-8")
    for name, content in (files or {}).items():
        path = plugin_dir / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return plugin_dir


ORDER_BODY = """
import builtins
async def setup(ctx):
    builtins.SS_SETUP_ORDER.append(ctx.plugin_id)
"""


async def test_setup_follows_dependency_order_and_cycles_are_blocked(tmp_path):
    import builtins

    builtins.SS_SETUP_ORDER = []
    write_plugin(tmp_path, "alpha", ORDER_BODY, requires=["zeta"])
    write_plugin(tmp_path, "zeta", ORDER_BODY)
    write_plugin(tmp_path, "cyc-a", ORDER_BODY, requires=["cyc-b"])
    write_plugin(tmp_path, "cyc-b", ORDER_BODY, requires=["cyc-a"])
    write_plugin(tmp_path, "top", ORDER_BODY, requires=["middle"])
    write_plugin(tmp_path, "middle", ORDER_BODY, requires=["missing-dep"])
    try:
        async with make_kernel(tmp_path) as k:
            order = builtins.SS_SETUP_ORDER
            assert order.index("zeta") < order.index("alpha")
            for pid in ("cyc-a", "cyc-b"):
                row = await k.plugins.get_plugin(pid)
                assert row["state"] == "blocked" and "cycle" in row["error"]
            assert (await k.plugins.get_plugin("middle"))["state"] == "blocked"
            top = await k.plugins.get_plugin("top")
            assert top["state"] == "blocked" and "middle" in top["error"]
            assert "top" not in order and "cyc-a" not in order
    finally:
        del builtins.SS_SETUP_ORDER


async def test_failed_migration_marks_plugin_errored_and_boot_continues(tmp_path):
    write_plugin(
        tmp_path,
        "bad-mig",
        "async def setup(ctx):\n    pass\n",
        schema=1,
        files={"migrations/0001_init.sql": "CREATE TABLE plugin_bad_mig_ok (id TEXT);\nTHIS IS NOT SQL;"},
    )
    async with make_kernel(tmp_path) as k:
        row = await k.plugins.get_plugin("bad-mig")
        assert row["state"] == "errored"
        assert row["applied_schema"] == 0
        # Atomic: the valid statement before the error was rolled back too.
        assert await k.db.read_val(
            "SELECT COUNT(*) FROM sqlite_master WHERE name = 'plugin_bad_mig_ok';"
        ) == 0
        assert (await k.plugins.get_plugin("core-recipes"))["state"] == "active"


RUNTIME_BODY = """
import asyncio
from fastapi import APIRouter, Depends
from secretsauce.plugins.context import current_ctx
from .helpers import greeting

STATE = {"hook_calls": 0, "events": [], "bg_cancelled": False}

async def setup(ctx):
    router = APIRouter(prefix="/api/x/runtime")

    @router.get("/hello")
    async def hello(plugin_ctx=Depends(current_ctx)):
        return {"greeting": greeting(), "plugin": plugin_ctx.plugin_id}

    @router.get("/crash")
    async def crash():
        raise RuntimeError("kaboom")

    async def hook(draft, current=None, hook_ctx=None):
        STATE["hook_calls"] += 1
        return draft

    async def on_recipe(event):
        STATE["events"].append(event.name)

    async def forever():
        try:
            await asyncio.sleep(3600)
        except asyncio.CancelledError:
            STATE["bg_cancelled"] = True
            raise

    ctx.router(router)
    ctx.hook("recipe:create", hook)
    ctx.on("recipe:*", on_recipe)
    ctx.services.register("runtime-svc", object())
    ctx.background(forever())
"""


async def test_disable_and_enable_take_effect_at_runtime(tmp_path):
    write_plugin(
        tmp_path,
        "runtime",
        RUNTIME_BODY,
        files={"helpers.py": "def greeting():\n    return 'hi from a submodule'\n"},
    )
    write_plugin(tmp_path, "dependent", "async def setup(ctx):\n    pass\n", requires=["runtime"])
    async with make_kernel(tmp_path) as k:
        module = sys.modules["ss_plugin_runtime"]
        hello = await k.client.get("/api/x/runtime/hello")
        assert hello.json() == {"greeting": "hi from a submodule", "plugin": "runtime"}
        await k.client.post("/api/recipes", json={"title": "Soup", "language": "en"})
        await drain_events(k)
        assert module.STATE["hook_calls"] == 1
        assert module.STATE["events"] == ["recipe:created"]

        res = await k.client.post("/api/plugins/runtime/disable")
        assert res.json()["state"] == "disabled"
        await asyncio.sleep(0)
        assert module.STATE["bg_cancelled"] is True
        assert (await k.plugins.get_plugin("dependent"))["state"] == "blocked"
        assert (await k.client.get("/api/x/runtime/hello")).status_code == 404
        assert k.services.get("runtime-svc") is None
        await k.client.post("/api/recipes", json={"title": "Stew", "language": "en"})
        assert module.STATE["hook_calls"] == 1

        res = await k.client.post("/api/plugins/runtime/enable")
        assert res.json()["state"] == "active"
        assert (await k.plugins.get_plugin("dependent"))["state"] == "active"
        assert (await k.client.get("/api/x/runtime/hello")).status_code == 200
        # The cursor was kept while disabled, so the plugin catches up.
        await drain_events(k)
        assert module.STATE["events"] == ["recipe:created", "recipe:created"]

        names = [r["name"] for r in await k.db.read_all(
            "SELECT name FROM events WHERE entity_id = 'runtime' ORDER BY seq;"
        )]
        assert names[-3:] == ["plugin:activated", "plugin:deactivated", "plugin:activated"]


async def test_plugin_route_errors_use_the_plugin_error_envelope(tmp_path):
    write_plugin(
        tmp_path, "runtime", RUNTIME_BODY, files={"helpers.py": "def greeting():\n    return 'hi'\n"}
    )
    async with make_kernel(tmp_path) as k:
        res = await k.client.get("/api/x/runtime/crash")
        assert res.status_code == 500
        assert res.json() == {
            "error": {"code": "plugin_error", "message": "kaboom", "details": {"plugin_id": "runtime"}}
        }


async def test_new_plugin_cursor_starts_at_head(tmp_path):
    async with make_kernel(tmp_path) as k:
        await k.client.post("/api/recipes", json={"title": "Old news", "language": "en"})
        write_plugin(
            tmp_path,
            "latecomer",
            "SEEN = []\nasync def setup(ctx):\n    ctx.on('recipe:*', lambda e: _note(e))\n"
            "async def _note(e):\n    SEEN.append(e.name)\n",
        )
        await k.loader.discover_and_sync()
        await drain_events(k)
        assert sys.modules["ss_plugin_latecomer"].SEEN == []


async def test_routes_outside_the_plugin_namespace_are_refused(tmp_path):
    write_plugin(
        tmp_path,
        "squatter",
        "from fastapi import APIRouter\nasync def setup(ctx):\n"
        "    r = APIRouter()\n    @r.get('/api/recipes/hijack')\n    async def h():\n        return {}\n"
        "    ctx.router(r)\n",
    )
    async with make_kernel(tmp_path) as k:
        row = await k.plugins.get_plugin("squatter")
        assert row["state"] == "errored"
        assert "/api/x/squatter/" in row["error"]
        assert (await k.client.get("/api/recipes/hijack")).status_code == 404


async def test_secret_config_is_encrypted_masked_and_decrypted_for_the_plugin(tmp_path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.put(
            "/api/plugins/core-ai-provider/config",
            json={"provider": "openai", "openai_api_key": "sk-live-123"},
        )
        assert res.status_code == 200
        assert res.json()["openai_api_key"] == MASK_STRING

        raw = json.loads(await k.db.read_val("SELECT config FROM plugins WHERE id = 'core-ai-provider';"))
        assert raw["openai_api_key"] != "sk-live-123"
        for url in ("/api/plugins", "/api/plugins/core-ai-provider", "/api/plugins/core-ai-provider/config"):
            assert "sk-live-123" not in (await k.client.get(url)).text

        ctx = k.ctx_for("core-ai-provider")
        assert ctx.config["openai_api_key"] == "sk-live-123"
        assert ctx.config["model"] == "gemini-3.8-flash"  # schema default

        # Sending the mask back keeps the stored secret.
        await k.client.put(
            "/api/plugins/core-ai-provider/config",
            json={"provider": "openrouter", "openai_api_key": MASK_STRING},
        )
        assert ctx.config["openai_api_key"] == "sk-live-123"
        assert ctx.config["provider"] == "openrouter"


async def test_commands_run_as_jobs(tmp_path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.post("/api/plugins/core-ratings/commands/rebuild")
        assert res.status_code == 202
        job = await k.jobs.run_job(res.json()["job_id"])
        assert job["job_type"] == "command:rebuild"
        assert job["status"] == "done"
        missing = await k.client.post("/api/plugins/core-ratings/commands/nope")
        assert missing.status_code == 404

import httpx
import pytest

from secretsauce.app import build_app, configure_app
from secretsauce.auth import RateLimiter, hash_passphrase, verify_passphrase
from secretsauce.config import Config
from secretsauce.testing import make_kernel

TOKEN_PLUGIN = '''
from fastapi import APIRouter

PLUGIN = {"id": "feed", "version": "1.0.0"}

async def setup(ctx):
    token_router = APIRouter(prefix="/api/x/feed")

    @token_router.get("/calendar.ics")
    async def calendar():
        return {"feed": True}

    cookie_router = APIRouter(prefix="/api/x/feed")

    @cookie_router.get("/settings")
    async def settings():
        return {"ok": True}

    ctx.router(token_router, auth="token", scope="read:calendar")
    ctx.router(cookie_router)
'''


async def _kernel_with_feed(tmp_path):
    (tmp_path / "plugins").mkdir(parents=True, exist_ok=True)
    (tmp_path / "plugins" / "feed.py").write_text(TOKEN_PLUGIN, encoding="utf-8")
    return make_kernel(tmp_path)


async def test_tokens_work_only_on_their_token_routes(tmp_path):
    async with await _kernel_with_feed(tmp_path) as k:
        token = await k.ctx_for("feed").tokens.issue("read:calendar", "Kitchen")
        wrong_scope = await k.ctx_for("feed").tokens.issue("write:calendar", "Other")
        other_plugin = await k.ctx_for("intruder").tokens.issue("read:calendar", "Spoof")
        cookie = k.client.cookies.get("ss_session")
        k.client.cookies.clear()
        bearer = lambda t: {"Authorization": f"Bearer {t}"}  # noqa: E731

        assert (await k.client.get("/api/x/feed/calendar.ics", headers=bearer(token))).status_code == 200
        assert (await k.client.get("/api/x/feed/calendar.ics", headers=bearer(wrong_scope))).status_code == 401
        assert (await k.client.get("/api/x/feed/calendar.ics", headers=bearer(other_plugin))).status_code == 401
        # A token is not a session: kernel and cookie routes refuse it.
        assert (await k.client.get("/api/recipes", headers=bearer(token))).status_code == 401
        assert (await k.client.get("/api/x/feed/settings", headers=bearer(token))).status_code == 401
        # ...except the session probe, which reports what the token is.
        session = await k.client.get("/api/auth/session", headers=bearer(token))
        assert session.status_code == 200
        assert session.json()["auth"] == "token" and session.json()["plugin_id"] == "feed"

        # A cookie alone does not open a token route.
        k.client.cookies.set("ss_session", cookie)
        assert (await k.client.get("/api/x/feed/calendar.ics")).status_code == 401
        assert (await k.client.get("/api/x/feed/settings")).status_code == 200


async def test_logout_revokes_the_session_server_side(tmp_path):
    async with make_kernel(tmp_path) as k:
        cookie = k.client.cookies.get("ss_session")
        assert (await k.client.post("/api/auth/logout")).status_code == 200
        k.client.cookies.set("ss_session", cookie)
        assert (await k.client.get("/api/recipes")).status_code == 401
        # Survives a restart: revocations are persisted.
        assert await k.db.read_val("SELECT COUNT(*) FROM revoked_sessions;") == 1
        k.sessions._revoked.clear()
        await k.sessions.load()
        assert (await k.client.get("/api/recipes")).status_code == 401


async def test_setup_validates_maps_color_and_is_atomic(tmp_path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        short = await k.client.post(
            "/api/setup",
            json={"household_name": "H", "passphrase": "short", "first_member": {"name": "A"}},
        )
        assert short.status_code == 422
        assert short.json()["error"]["code"] == "validation"
        assert "passphrase" in short.json()["error"]["details"]["fields"]
        assert await k.household.get_passphrase_info() is None

        ok = await k.client.post(
            "/api/setup",
            json={
                "household_name": "H",
                "passphrase": "long enough",
                "first_member": {"name": "Ann", "color": "#ff0000"},
            },
        )
        assert ok.status_code == 201
        assert ok.json()["first_member"]["avatar_color"] == "#ff0000"

        again = await k.client.post(
            "/api/setup",
            json={"household_name": "X", "passphrase": "long enough", "first_member": {"name": "B"}},
        )
        assert again.status_code == 409
        assert len(await k.members.list_members()) == 1


@pytest.mark.parametrize(
    ("setting", "base_url", "secure"),
    [("auto", "https://home", True), ("auto", "http://home", False), ("true", "http://home", True)],
)
async def test_cookie_secure_follows_config(tmp_path, setting, base_url, secure):
    async with make_kernel(tmp_path, auto_setup=False, config=Config(cookie_secure=setting)) as k:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=k.app), base_url=base_url
        ) as client:
            res = await client.post(
                "/api/setup",
                json={"household_name": "H", "passphrase": "long enough", "first_member": {"name": "A"}},
            )
        assert res.status_code == 201
        assert ("secure" in res.headers["set-cookie"].lower()) is secure


async def test_api_fails_closed_without_a_kernel():
    from fastapi import FastAPI

    app = FastAPI()
    configure_app(app)
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://t"
    ) as client:
        res = await client.get("/api/recipes")
    assert res.status_code == 503
    assert res.json()["error"]["code"] == "unavailable"


def test_passphrase_hash_format_and_legacy_hashes():
    stored = hash_passphrase("correct horse")
    assert stored.startswith("scrypt$32768$8$1$")
    assert verify_passphrase("correct horse", stored)
    assert not verify_passphrase("wrong", stored)

    import hashlib

    salt = b"\x01" * 16
    legacy = "scrypt$" + salt.hex() + "$" + hashlib.scrypt(
        b"old secret", salt=salt, n=16384, r=8, p=1
    ).hex()
    assert verify_passphrase("old secret", legacy)
    assert not verify_passphrase("nope", legacy)


def test_rate_limiter_memory_is_bounded():
    limiter = RateLimiter(max_entries=100)
    for i in range(1000):
        limiter.record_login_failure(f"10.0.{i // 256}.{i % 256}")
    assert len(limiter._failures) == 100


async def test_passphrase_rotation_requires_minimum_length(tmp_path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.put(
            "/api/household/passphrase", json={"current": "test_passphrase", "new": "short"}
        )
        assert res.status_code == 422


async def test_build_app_boots_with_default_services(tmp_path):
    app = build_app(data_dir=tmp_path)
    async with app.router.lifespan_context(app):
        kernel = app.state.kernel
        assert kernel.pump.running
        assert kernel.jobs._runner is not None

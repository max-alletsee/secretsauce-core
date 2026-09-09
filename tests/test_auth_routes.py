import pytest
from secretsauce.auth import hash_passphrase
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_setup_and_login_lifecycle(tmp_path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        # Before setup: 409 setup_required on protected endpoint
        res = await k.client.get("/api/auth/session")
        assert res.status_code == 409
        assert res.json()["error"]["code"] == "setup_required"

        # Setup
        setup_res = await k.client.post(
            "/api/setup",
            json={
                "household_name": "Alletsee Home",
                "passphrase": "super-secret-pass",
                "first_member": {"name": "Max", "preferred_language": "en"},
            },
        )
        assert setup_res.status_code == 201
        assert "ss_session" in setup_res.cookies

        # Setup again fails with 409 conflict
        setup_again = await k.client.post(
            "/api/setup",
            json={
                "household_name": "Other Home",
                "passphrase": "another-pass",
                "first_member": {"name": "Eve"},
            },
        )
        assert setup_again.status_code == 409

        # Now authorized session check
        session_res = await k.client.get("/api/auth/session")
        assert session_res.status_code == 200
        assert session_res.json()["authenticated"] is True

        # Logout clears session
        logout_res = await k.client.post("/api/auth/logout")
        assert logout_res.status_code == 200

        # After logout, unauthorized
        session_res2 = await k.client.get("/api/auth/session")
        assert session_res2.status_code == 401

        # Login with correct passphrase
        login_res = await k.client.post(
            "/api/auth/login", json={"passphrase": "super-secret-pass"}
        )
        assert login_res.status_code == 200
        assert "ss_session" in login_res.cookies

        # Session is valid again
        session_res3 = await k.client.get("/api/auth/session")
        assert session_res3.status_code == 200


@pytest.mark.asyncio
async def test_login_failure_and_rate_limiting(tmp_path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        await k.client.post(
            "/api/setup",
            json={
                "household_name": "Test Home",
                "passphrase": "correct-passphrase",
                "first_member": {"name": "Max"},
            },
        )
        # Clear cookies to test login
        k.client.cookies.clear()

        # Failed login
        res = await k.client.post(
            "/api/auth/login", json={"passphrase": "wrong-password"}
        )
        assert res.status_code == 401

        # Consecutive failed attempts trigger rate limit
        for _ in range(5):
            res = await k.client.post(
                "/api/auth/login", json={"passphrase": "wrong-password"}
            )

        assert res.status_code == 429
        assert "Retry-After" in res.headers


@pytest.mark.asyncio
async def test_cross_site_request_blocking(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Cross-site cookie request is blocked with 403
        res = await k.client.get(
            "/api/auth/session",
            headers={"Sec-Fetch-Site": "cross-site"},
        )
        assert res.status_code == 403
        assert res.json()["error"]["code"] == "forbidden"

        # Same-origin or same-site is allowed
        res_ok = await k.client.get(
            "/api/auth/session",
            headers={"Sec-Fetch-Site": "same-origin"},
        )
        assert res_ok.status_code == 200


@pytest.mark.asyncio
async def test_passphrase_rotation_invalidates_session(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Session is initially valid
        res = await k.client.get("/api/auth/session")
        assert res.status_code == 200

        # Rotate passphrase to version 2
        await k.household.set_passphrase(hash_passphrase("new_passphrase"))

        # Older session with version 1 is now rejected with 401
        res_after = await k.client.get("/api/auth/session")
        assert res_after.status_code == 401


@pytest.mark.asyncio
async def test_actor_member_header(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        members = await k.members.list_members()
        admin_id = members[0]["id"]

        # With actor header
        res = await k.client.get(
            "/api/auth/session",
            headers={"X-Actor-Member": admin_id},
        )
        assert res.status_code == 200
        assert res.json()["actor_member_id"] == admin_id

        # Non-existent actor header falls back to None
        res_nonexistent = await k.client.get(
            "/api/auth/session",
            headers={"X-Actor-Member": "mbr_doesnotexist"},
        )
        assert res_nonexistent.status_code == 200
        assert res_nonexistent.json()["actor_member_id"] is None


@pytest.mark.asyncio
async def test_bearer_token_auth(tmp_path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Issue an API token
        token = await k.tokens.issue(
            plugin_id="calendar-sync",
            scope="read:calendar",
            label="Feed Reader",
        )

        # Clear cookie to verify bearer auth independently
        k.client.cookies.clear()

        # Without token or cookie: 401
        res_unauth = await k.client.get("/api/auth/session")
        assert res_unauth.status_code == 401

        # With valid Bearer token
        res_auth = await k.client.get(
            "/api/auth/session",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res_auth.status_code == 200
        assert res_auth.json()["authenticated"] is True



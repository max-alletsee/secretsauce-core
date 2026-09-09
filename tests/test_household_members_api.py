import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_household_and_members_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # GET household
        res = await k.client.get("/api/household")
        assert res.status_code == 200
        data = res.json()
        assert data["household_name"] == "Test Household"
        assert data["units"] == "metric"

        # PATCH household
        patch_res = await k.client.patch(
            "/api/household",
            json={"household_name": "Updated Family", "units": "us_customary"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["household_name"] == "Updated Family"
        assert patch_res.json()["units"] == "us_customary"

        # PUT passphrase
        # Wrong current passphrase -> 401
        bad_pass = await k.client.put(
            "/api/household/passphrase",
            json={"current": "wrong", "new": "new_secret_passphrase"},
        )
        assert bad_pass.status_code == 401

        # Correct current passphrase -> 204 + new cookie
        rot_res = await k.client.put(
            "/api/household/passphrase",
            json={"current": "test_passphrase", "new": "new_secret_passphrase"},
        )
        assert rot_res.status_code == 204
        assert "ss_session" in rot_res.cookies

        # Member CRUD
        m_res = await k.client.post(
            "/api/members",
            json={"name": "Sarah", "serving_ratio": 1.0, "color": "#00ff00"},
        )
        assert m_res.status_code == 201
        m_id = m_res.json()["id"]
        assert m_res.json()["name"] == "Sarah"
        assert m_res.json()["revision"] == 1

        # Conflict on duplicate id
        dup_res = await k.client.post(
            "/api/members",
            json={"id": m_id, "name": "Duplicate Sarah"},
        )
        assert dup_res.status_code == 409

        # GET single member
        get_res = await k.client.get(f"/api/members/{m_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == m_id

        # PATCH member with revision
        patch_mem = await k.client.patch(
            f"/api/members/{m_id}",
            json={"revision": 1, "name": "Sarah Connor"},
        )
        assert patch_mem.status_code == 200
        assert patch_mem.json()["name"] == "Sarah Connor"
        assert patch_mem.json()["revision"] == 2

        # PATCH with stale revision -> 409
        stale_patch = await k.client.patch(
            f"/api/members/{m_id}",
            json={"revision": 1, "name": "Sarah Stale"},
        )
        assert stale_patch.status_code == 409

        # DELETE member with stale revision -> 409
        stale_del = await k.client.delete(f"/api/members/{m_id}?revision=1")
        assert stale_del.status_code == 409

        # DELETE member with correct revision -> 204
        ok_del = await k.client.delete(f"/api/members/{m_id}?revision=2")
        assert ok_del.status_code == 204

        # GET deleted member -> 404
        not_found = await k.client.get(f"/api/members/{m_id}")
        assert not_found.status_code == 404


@pytest.mark.asyncio
async def test_members_sorting_and_validation(tmp_path):
    async with make_kernel(tmp_path) as k:
        await k.client.post("/api/members", json={"name": "Bob"})
        await k.client.post("/api/members", json={"name": "Alice"})

        # Sort by name
        res = await k.client.get("/api/members?sort=name")
        assert res.status_code == 200
        names = [m["name"] for m in res.json()]
        assert "Alice" in names
        assert "Bob" in names
        assert names.index("Alice") < names.index("Bob")

        # Missing revision on PATCH -> 422
        members = res.json()
        m_id = members[0]["id"]
        bad_patch = await k.client.patch(f"/api/members/{m_id}", json={"name": "No Rev"})
        assert bad_patch.status_code == 422


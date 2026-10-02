"""Setup/Settings validation through the production HTTP entry points and lifespan."""
from contextlib import asynccontextmanager

import httpx
import pytest

from secretsauce.app import build_app
from secretsauce.config import Config

SETUP = {"household_name": "Slots household", "passphrase": "secretpassphrase", "first_member": {"name": "Alex"}}
INVALID_SLOTS = [
    pytest.param(None, id="null"), pytest.param([], id="empty-list"),
    pytest.param([{"id": "Dinner", "label": "Dinner"}], id="uppercase-id"),
    pytest.param([{"id": "-dinner", "label": "Dinner"}], id="leading-hyphen"),
    pytest.param([{"id": "dinner!", "label": "Dinner"}], id="punctuation"),
    pytest.param([{"id": "晚餐", "label": "Dinner"}], id="non-ascii-id"),
    pytest.param([{"id": "x" * 65, "label": "Dinner"}], id="long-id"),
    pytest.param([{"id": "", "label": "Dinner"}], id="empty-id"),
    pytest.param([{"id": "dinner", "label": "x" * 65}], id="long-label"),
    pytest.param([{"id": "dinner", "label": ""}], id="empty-label"),
    pytest.param([{"id": "dinner", "label": "Dinner"}, {"id": "dinner", "label": "Evening"}], id="duplicate-id"),
]


@asynccontextmanager
async def runtime(tmp_path, configured=True):
    app = build_app(data_dir=tmp_path, config=Config(cookie_secure="false"))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url="http://testserver") as client:
            if configured:
                assert (await client.post("/api/setup", json=SETUP)).status_code == 201
            yield app, client


@pytest.mark.parametrize("slots", INVALID_SLOTS)
@pytest.mark.parametrize("entry", ["setup", "patch"])
async def test_setup_and_patch_reject_invalid_meal_types_atomically(tmp_path, slots, entry):
    async with runtime(tmp_path, configured=entry == "patch") as (app, client):
        kernel = app.state.kernel
        before_config = await kernel.household.get_config()
        before_members = await kernel.db.read_all("SELECT * FROM household_members ORDER BY id")
        if entry == "setup":
            response = await client.post("/api/setup", json={**SETUP, "meal_types": slots})
        else:
            response = await client.patch("/api/household", json={"household_name": "Must not persist", "meal_types": slots})
        assert response.status_code == 422, response.text
        assert response.json()["error"]["code"] == "validation"
        assert await kernel.household.get_config() == before_config
        assert await kernel.db.read_all("SELECT * FROM household_members ORDER BY id") == before_members
        if entry == "setup":
            assert await kernel.household.get_passphrase_info() is None
            assert not client.cookies
            assert (await client.get("/api/setup")).json()["needs_setup"] is True


async def test_valid_slots_keep_posted_order_and_omission_preserves_value(tmp_path):
    slots = [{"id": "dinner", "label": "Evening meal"}, {"id": "brunch-2", "label": "Sunday brunch"}]
    async with runtime(tmp_path, configured=False) as (_, client):
        assert (await client.post("/api/setup", json={**SETUP, "meal_types": slots})).status_code == 201
        assert (await client.get("/api/household")).json()["meal_types"] == slots
        reverse = list(reversed(slots))
        response = await client.patch("/api/household", json={"meal_types": reverse})
        assert response.status_code == 200, response.text
        assert response.json()["meal_types"] == reverse
        assert (await client.patch("/api/household", json={"household_name": "Renamed"})).json()["meal_types"] == reverse


async def test_setup_omission_preserves_default_slots(tmp_path):
    async with runtime(tmp_path) as (_, client):
        assert (await client.get("/api/household")).json()["meal_types"] == [
            {"id": "breakfast", "label": "Breakfast"}, {"id": "lunch", "label": "Lunch"}, {"id": "dinner", "label": "Dinner"},
        ]

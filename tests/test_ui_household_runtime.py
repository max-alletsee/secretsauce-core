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


async def test_predefined_notes_on_meal_types_and_household(tmp_path):
    async with runtime(tmp_path) as (_, client):
        # Initial config should have default predefined_notes
        initial = (await client.get("/api/household")).json()
        assert initial["predefined_notes"] == ["Dining out", "Leftovers", "Takeout", "Quick meal"]

        # Patch custom predefined notes on a meal slot (e.g. take-out)
        slots_with_notes = [
            {"id": "breakfast", "label": "Breakfast", "predefined_notes": ["Quick meal"]},
            {"id": "dinner", "label": "Dinner", "predefined_notes": ["Dining out", "Leftovers", "Takeout", "Quick meal", "take-out"]},
        ]
        res = await client.patch("/api/household", json={"meal_types": slots_with_notes})
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["meal_types"] == slots_with_notes

        # Get confirms persistence
        fetched = (await client.get("/api/household")).json()
        assert fetched["meal_types"] == slots_with_notes

        # Household-level predefined_notes update
        res2 = await client.patch("/api/household", json={"predefined_notes": ["Dining out", "Leftovers", "take-out"]})
        assert res2.status_code == 200, res2.text
        assert res2.json()["predefined_notes"] == ["Dining out", "Leftovers", "take-out"]


async def test_predefined_notes_validation(tmp_path):
    async with runtime(tmp_path) as (_, client):
        # Blank note in slot
        bad_slot_blank = [{"id": "dinner", "label": "Dinner", "predefined_notes": ["   "]}]
        res = await client.patch("/api/household", json={"meal_types": bad_slot_blank})
        assert res.status_code == 422

        # Note too long in slot (>64 chars)
        bad_slot_long = [{"id": "dinner", "label": "Dinner", "predefined_notes": ["x" * 65]}]
        res = await client.patch("/api/household", json={"meal_types": bad_slot_long})
        assert res.status_code == 422

        # Blank note on household
        res = await client.patch("/api/household", json={"predefined_notes": [""]})
        assert res.status_code == 422

        # Note too long on household (>64 chars)
        res = await client.patch("/api/household", json={"predefined_notes": ["y" * 65]})
        assert res.status_code == 422

        # Deduplication works cleanly
        res = await client.patch("/api/household", json={
            "predefined_notes": ["take-out", "take-out", "  take-out  ", "Takeout"],
            "meal_types": [{"id": "dinner", "label": "Dinner", "predefined_notes": ["take-out", "take-out"]}],
        })
        assert res.status_code == 200
        assert res.json()["predefined_notes"] == ["take-out", "Takeout"]
        assert res.json()["meal_types"][0]["predefined_notes"] == ["take-out"]


@pytest.mark.parametrize(
    "bad_value",
    [
        pytest.param(0, id="zero"),
        pytest.param(-5, id="negative"),
        pytest.param(3651, id="above-max"),
        pytest.param(None, id="null"),
        pytest.param("30", id="string"),
        pytest.param(True, id="boolean"),
        pytest.param(14.5, id="float"),
    ],
)
async def test_event_retention_validation_and_persistence(tmp_path, bad_value):
    async with runtime(tmp_path) as (app, client):
        kernel = app.state.kernel
        initial = (await client.get("/api/household")).json()
        assert initial["event_retention_days"] == 60

        res = await client.patch("/api/household", json={"event_retention_days": bad_value})
        assert res.status_code == 422, res.text
        assert res.json()["error"]["code"] == "validation"
        assert (await kernel.household.get_config())["event_retention_days"] == 60


async def test_event_retention_update_and_gc_pruning_runtime(tmp_path):
    import asyncio
    from datetime import datetime, timedelta, timezone
    from secretsauce.gc import run_garbage_collection

    async with runtime(tmp_path) as (app, client):
        kernel = app.state.kernel

        # Create real events via HTTP API
        r1 = await client.post("/api/recipes", json={"title": "Soup", "language": "en"})
        assert r1.status_code == 201
        r2 = await client.post("/api/recipes", json={"title": "Salad", "language": "en"})
        assert r2.status_code == 201

        head_seq = await kernel.events.get_head_seq()
        # Wait for all active plugins' cursors to reach head through the live EventPump
        deadline = asyncio.get_running_loop().time() + 5.0
        while True:
            min_seq = await kernel.db.read_val(
                "SELECT MIN(c.last_seq) FROM event_cursors c "
                "JOIN plugins p ON p.id = c.plugin_id WHERE p.state = 'active';"
            )
            if min_seq is None or min_seq >= head_seq:
                break
            if asyncio.get_running_loop().time() > deadline:
                raise AssertionError(f"Active plugins did not drain to {head_seq} (min_seq={min_seq})")
            await asyncio.sleep(0.02)

        evts = await kernel.db.read_all(
            "SELECT seq FROM events WHERE name = 'recipe:created' ORDER BY seq;"
        )
        assert len(evts) == 2
        seq_old, seq_mid = evts[0]["seq"], evts[1]["seq"]

        now = datetime.now(timezone.utc)
        ts_70d = (now - timedelta(days=70)).strftime("%Y-%m-%dT%H:%M:%SZ")
        ts_45d = (now - timedelta(days=45)).strftime("%Y-%m-%dT%H:%M:%SZ")
        await kernel.db.write("UPDATE events SET created_at = ? WHERE seq = ?;", (ts_70d, seq_old))
        await kernel.db.write("UPDATE events SET created_at = ? WHERE seq = ?;", (ts_45d, seq_mid))

        # Default 60 days: prunes 70-day-old event, keeps 45-day-old event
        await run_garbage_collection(kernel.db, tmp_path)
        assert await kernel.db.read_one("SELECT seq FROM events WHERE seq = ?;", (seq_old,)) is None
        assert await kernel.db.read_one("SELECT seq FROM events WHERE seq = ?;", (seq_mid,)) is not None

        # Shortening retention to 30 days does not prune synchronously inside PATCH
        patch_res = await client.patch("/api/household", json={"event_retention_days": 30})
        assert patch_res.status_code == 200, patch_res.text
        assert patch_res.json()["event_retention_days"] == 30
        assert await kernel.db.read_one("SELECT seq FROM events WHERE seq = ?;", (seq_mid,)) is not None

        # Omitting event_retention_days on subsequent PATCH preserves 30
        patch2 = await client.patch("/api/household", json={"household_name": "Updated Home"})
        assert patch2.status_code == 200
        assert patch2.json()["event_retention_days"] == 30

        # Next GC run prunes the 45-day-old event under the 30-day setting
        await run_garbage_collection(kernel.db, tmp_path)
        assert await kernel.db.read_one("SELECT seq FROM events WHERE seq = ?;", (seq_mid,)) is None

        # Active-plugin cursor guard: an active plugin lagging behind prevents pruning even past retention,
        # while a disabled plugin does not block pruning.
        r3 = await client.post("/api/recipes", json={"title": "Pasta", "language": "en"})
        assert r3.status_code == 201
        seq_guarded = (
            await kernel.db.read_one(
                "SELECT seq FROM events WHERE entity_id = ? AND name = 'recipe:created';",
                (r3.json()["id"],),
            )
        )["seq"]
        ts_90d = (now - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
        await kernel.db.write("UPDATE events SET created_at = ? WHERE seq = ?;", (ts_90d, seq_guarded))

        active_plugin = await kernel.db.read_val(
            "SELECT id FROM plugins WHERE state = 'active' LIMIT 1;"
        )
        assert active_plugin is not None
        await kernel.db.write(
            "UPDATE event_cursors SET last_seq = ? WHERE plugin_id = ?;",
            (seq_guarded - 1, active_plugin),
        )
        await run_garbage_collection(kernel.db, tmp_path)
        assert await kernel.db.read_one("SELECT seq FROM events WHERE seq = ?;", (seq_guarded,)) is not None

        # Disabling that plugin lets GC prune the 90-day-old event
        disable_res = await client.post(f"/api/plugins/{active_plugin}/disable")
        assert disable_res.status_code == 200
        await run_garbage_collection(kernel.db, tmp_path)
        assert await kernel.db.read_one("SELECT seq FROM events WHERE seq = ?;", (seq_guarded,)) is None

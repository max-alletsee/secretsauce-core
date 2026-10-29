"""Migration, validation, slot conflicts, and atomic failure boundaries for core-recurring."""
import importlib
from pathlib import Path
import shutil

import pytest

from test_ui_household_runtime import runtime
from test_ui_recurring_runtime import (
    BASE,
    MONDAY,
    WEDNESDAY_1,
    WEDNESDAY_2,
    END,
    recurring_clock,
    recipe,
    create_rule,
    meals,
    suggestions,
)


@pytest.mark.parametrize('timeline_enabled', [True, False])
async def test_skipped_slots_hide_suggestions_and_block_approval_while_occupied_slots_allow_both(
    tmp_path, recurring_clock, timeline_enabled
):
    async with runtime(tmp_path) as (_, client):
        item = await recipe(client)
        if timeline_enabled:
            assert (await client.put(f'/api/x/core-timeline/days/{WEDNESDAY_1}/slots/dinner', json={'kind': 'skip'})).status_code == 200
        else:
            assert (await client.post('/api/plugins/core-timeline/disable')).status_code == 200

        # Occupying WEDNESDAY_2 does NOT hide the suggestion or block approving it
        manual = (
            await client.post(
                '/api/schedule',
                json={'date': WEDNESDAY_2, 'meal_type': 'Dinner', 'entry_type': 'note', 'title': 'Manual occupied meal'},
            )
        ).json()
        rule = await create_rule(client, item['id'], servings=2)

        sugs = await suggestions(client)
        expected_dates = [WEDNESDAY_2] if timeline_enabled else [WEDNESDAY_1, WEDNESDAY_2]
        assert [s['date'] for s in sugs] == expected_dates

        if timeline_enabled:
            # Approving on a skipped slot is rejected with 409
            skip_approve = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_1})
            assert skip_approve.status_code == 409

        # Approving on the occupied slot succeeds alongside the existing manual meal
        ok_approve = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_2})
        assert ok_approve.status_code == 200
        day_entries = await meals(client, start=WEDNESDAY_2, end=WEDNESDAY_2)
        assert len(day_entries) == 2
        assert {e['id'] for e in day_entries} == {manual['id'], ok_approve.json()['entry']['id']}


async def snapshot(app, client):
    return (
        await meals(client),
        (await client.get(BASE + '/rules')).json(),
        await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized ORDER BY rule_id, date'),
        await app.state.kernel.db.read_all('SELECT * FROM events ORDER BY seq'),
    )


async def test_approval_rolls_back_schedule_entry_when_tracking_insert_fails(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        rule = await create_rule(client, item['id'])
        await app.state.kernel.db.write(
            "CREATE TRIGGER reject_tracking BEFORE INSERT ON plugin_core_recurring_materialized "
            "BEGIN SELECT RAISE(ABORT, 'tracking failed'); END;"
        )
        before = await snapshot(app, client)
        response = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_1})
        assert response.status_code == 500, response.text
        assert await snapshot(app, client) == before


async def test_duplicate_approve_or_wrong_weekday_is_rejected(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (_, client):
        item = await recipe(client)
        rule = await create_rule(client, item['id'], weekday=2)

        # Wrong weekday (Monday instead of Wednesday) -> 422
        wrong_day = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': MONDAY})
        assert wrong_day.status_code == 422

        # First approve -> 200
        first = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_1})
        assert first.status_code == 200

        # Second approve on same date -> 409
        second = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_1})
        assert second.status_code == 409

        # Dismissing an already-approved date -> 409
        dis_approved = await client.post(f"{BASE}/rules/{rule['id']}/dismiss", json={'date': WEDNESDAY_1})
        assert dis_approved.status_code == 409


async def test_deleting_or_editing_rule_preserves_approved_schedule_entries(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        rule = await create_rule(client, item['id'], weekday=2, meal_type='dinner', servings=3)
        approved = (await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_1})).json()['entry']
        assert (await client.post(f"{BASE}/rules/{rule['id']}/dismiss", json={'date': WEDNESDAY_2})).status_code == 200

        # Edit rule to a note rule on the same weekday/slot -> WEDNESDAY_2 dismissal is cleared, WEDNESDAY_1 approval stays
        edit_res = await client.put(
            f"{BASE}/rules/{rule['id']}",
            json={'weekday': 2, 'meal_type': 'dinner', 'entry_type': 'note', 'title': 'Taco night', 'servings': 5},
        )
        assert edit_res.status_code == 200
        assert [s['date'] for s in await suggestions(client)] == [WEDNESDAY_2]

        # Delete the rule -> approved schedule entry on WEDNESDAY_1 still exists
        assert (await client.delete(f"{BASE}/rules/{rule['id']}")).json() == {'ok': True}
        remaining = await meals(client)
        assert [row['id'] for row in remaining] == [approved['id']]
        assert (await client.get(BASE + '/rules')).json() == []
        assert await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized') == []


async def test_unknown_rule_and_removed_materializer_routes(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        assert (await client.delete(BASE + '/rules/missing')).status_code == 404
        assert (await client.put(BASE + '/rules/missing', json={'weekday': 0, 'meal_type': 'dinner', 'title': 'Note'})).status_code == 404
        assert (await client.post(BASE + '/rules/missing/approve', json={'date': MONDAY})).status_code == 404
        assert (await client.post(BASE + '/rules/missing/dismiss', json={'date': MONDAY})).status_code == 404
        assert (await client.get(BASE + '/materialize')).status_code == 404
        assert (await client.post(BASE + '/materialize')).status_code == 405
        assert app.state.kernel.services.get_command('core-recurring', 'materialize') is None


async def test_schema_one_to_three_migration_preserves_rules_and_entries(tmp_path, recurring_clock, monkeypatch):
    old_plugins = tmp_path / 'old-plugins'
    shutil.copytree(Path(__file__).parent / 'fixtures/core-recurring-v1', old_plugins / 'core-recurring')
    boot = importlib.import_module('secretsauce.boot')
    with monkeypatch.context() as old:
        old.setattr(boot, 'CORE_PLUGINS_DIR', old_plugins)
        async with runtime(tmp_path) as (app, client):
            item = await recipe(client)
            rule = await create_rule(client, item['id'])
            assert (await app.state.kernel.registry.get_plugin('core-recurring'))['applied_schema'] == 1
    async with runtime(tmp_path, configured=False) as (app, client):
        assert (await client.post('/api/auth/login', json={'passphrase': 'secretpassphrase'})).status_code == 200
        assert (await app.state.kernel.registry.get_plugin('core-recurring'))['applied_schema'] == 3
        rules = (await client.get(BASE + '/rules')).json()
        assert len(rules) == 1
        assert rules[0]['id'] == rule['id']
        assert rules[0]['entry_type'] == 'recipe'
        assert rules[0]['recipe_id'] == item['id']

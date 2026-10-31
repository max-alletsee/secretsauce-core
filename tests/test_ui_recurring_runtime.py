"""Recurring meal rules and explicit approval through the real HTTP runtime."""
from datetime import date
import pytest

from secretsauce.plugins.loader import PluginLoader
from test_ui_household_runtime import runtime

BASE = '/api/x/core-recurring'
MONDAY = '2026-09-28'
WEDNESDAY_1 = '2026-09-30'
WEDNESDAY_2 = '2026-10-07'
END = '2026-10-11'


class FixedDate(date):
    @classmethod
    def today(cls):
        return cls(2026, 9, 28)


@pytest.fixture
def recurring_clock(monkeypatch):
    original_import = PluginLoader._import

    def instrument(loader, plugin_id, *args):
        candidate = original_import(loader, plugin_id, *args)
        if plugin_id == 'core-recurring' and candidate.module:
            candidate.module.date = FixedDate
        return candidate

    monkeypatch.setattr(PluginLoader, '_import', instrument)


async def recipe(client, title='Weekly lentil soup'):
    response = await client.post('/api/recipes', json={'title': title, 'language': 'en'})
    assert response.status_code == 201, response.text
    return response.json()


async def create_rule(client, recipe_id=None, weekday=2, meal_type='dinner', **extra):
    payload = {'weekday': weekday, 'meal_type': meal_type, **extra}
    if recipe_id is not None:
        payload['recipe_id'] = recipe_id
    response = await client.post(BASE + '/rules', json=payload)
    assert response.status_code == 200, response.text
    return response.json()


async def meals(client, start=MONDAY, end=END):
    response = await client.get(f'/api/timeline?from={start}&to={end}')
    assert response.status_code == 200, response.text
    return response.json()


async def suggestions(client, start=MONDAY, end=END):
    response = await client.get(f'{BASE}/suggestions?from={start}&to={end}')
    assert response.status_code == 200, response.text
    return response.json()


async def test_creating_rules_emits_suggestions_without_auto_scheduling(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        # Verify no background loop task was spawned by core-recurring
        ctx = app.state.kernel.active_ctx('core-recurring')
        assert ctx is not None
        assert len(ctx._tasks) == 0

        item = await recipe(client)
        rec_rule = await create_rule(client, item['id'], servings=3.5)
        note_rule = await create_rule(client, entry_type='note', title='Leftovers night', weekday=2, meal_type='dinner', servings=2)

        assert await meals(client) == []

        sugs = await suggestions(client, start='2026-09-21', end=END)
        # Past Wednesday (2026-09-23) is excluded because date < today (2026-09-28)
        assert [(s['date'], s['rule_id'], s['entry_type'], s['title'], s['servings']) for s in sugs] == [
            (WEDNESDAY_1, rec_rule['id'], 'recipe', 'Weekly lentil soup', 3.5),
            (WEDNESDAY_1, note_rule['id'], 'note', 'Leftovers night', 2.0),
            (WEDNESDAY_2, rec_rule['id'], 'recipe', 'Weekly lentil soup', 3.5),
            (WEDNESDAY_2, note_rule['id'], 'note', 'Leftovers night', 2.0),
        ]


async def test_approving_and_dismissing_persist_across_deleted_entries_and_restarts(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        rule = await create_rule(client, item['id'], servings=4)

        # Approve first Wednesday, dismiss second Wednesday
        app_res = await client.post(f"{BASE}/rules/{rule['id']}/approve", json={'date': WEDNESDAY_1})
        assert app_res.status_code == 200, app_res.text
        entry = app_res.json()['entry']
        assert entry['origin'] == 'plugin:core-recurring'
        assert entry['servings_override'] == 4.0

        dis_res = await client.post(f"{BASE}/rules/{rule['id']}/dismiss", json={'date': WEDNESDAY_2})
        assert dis_res.status_code == 200, dis_res.text

        assert await suggestions(client) == []
        assert [row['date'] for row in await meals(client)] == [WEDNESDAY_1]

        # Delete the approved timeline entry -> suggestion stays handled (does not resurrect)
        assert (await client.delete(f"/api/timeline/{entry['id']}?revision={entry['revision']}")).status_code == 204
        assert await meals(client) == []
        assert await suggestions(client) == []

    # Restart the app and verify decisions persist
    async with runtime(tmp_path, configured=False) as (_, client):
        assert (await client.post('/api/auth/login', json={'passphrase': 'secretpassphrase'})).status_code == 200
        assert await suggestions(client) == []
        assert await meals(client) == []

"""Recurring plans through HTTP and observed production background rounds."""
import asyncio
from datetime import date
from pathlib import Path

import pytest

from secretsauce.plugins.loader import PluginLoader
from test_ui_household_runtime import runtime

BASE = '/api/x/core-recurring'
MONDAY = '2026-09-28'
END = '2026-10-11'


class FixedDate(date):
    @classmethod
    def today(cls):
        return cls(2026, 9, 28)


@pytest.fixture
def recurring_clock(monkeypatch):
    original_import = PluginLoader._import
    observations = {'rounds': 0, 'failures': 0}

    def instrument(loader, plugin_id, *args):
        candidate = original_import(loader, plugin_id, *args)
        if plugin_id == 'core-recurring' and candidate.module:
            module = candidate.module
            module.date = FixedDate
            module.LOOP_INTERVAL_SECONDS = .02
            original_materialize = module.materialize_rules
            original_background = module.background_loop
            background_tasks = set()

            async def materialize(ctx):
                is_round = asyncio.current_task() in background_tasks
                try:
                    return await original_materialize(ctx)
                except Exception:
                    if is_round: observations['failures'] += 1
                    raise
                finally:
                    if is_round: observations['rounds'] += 1

            async def background(ctx):
                task = asyncio.current_task()
                background_tasks.add(task)
                try:
                    await original_background(ctx)
                finally:
                    background_tasks.discard(task)

            module.materialize_rules = materialize
            module.background_loop = background
        return candidate

    monkeypatch.setattr(PluginLoader, '_import', instrument)
    return observations


async def eventually(predicate):
    async with asyncio.timeout(5):
        while not await predicate():
            await asyncio.sleep(.01)


async def rounds_after(observations, baseline):
    async def done(): return observations['rounds'] >= baseline + 2
    await eventually(done)


async def recipe(client):
    response = await client.post('/api/recipes', json={'title':'Weekly lentil soup','language':'en'})
    assert response.status_code == 201, response.text
    return response.json()


async def create_rule(client, recipe_id, weekday=2, meal_type='dinner'):
    response = await client.post(BASE+'/rules', json={'recipe_id':recipe_id,'weekday':weekday,'meal_type':meal_type})
    assert response.status_code == 200, response.text
    return response.json()


async def meals(client):
    response = await client.get(f'/api/schedule?from={MONDAY}&to={END}')
    assert response.status_code == 200, response.text
    return response.json()


async def test_creating_rule_materializes_before_the_http_response(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (_, client):
        item = await recipe(client)
        rule = await create_rule(client, item['id'])
        assert rule.get('created') == 2
        assert [(entry['date'],entry['meal_type'],entry['recipe_id'],entry['origin']) for entry in await meals(client)] == [
            ('2026-09-30','dinner',item['id'],'plugin:core-recurring'),
            ('2026-10-07','dinner',item['id'],'plugin:core-recurring'),
        ]


async def test_deleted_recurring_meal_stays_deleted_across_loop_and_restart(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        rule = await create_rule(client, item['id'])
        # Wait for actual scheduling even on the old implementation: this test
        # diagnoses resurrection independently of the immediate-create test.
        async def populated(): return len(await meals(client)) == 2
        await eventually(populated)
        entry = (await meals(client))[0]
        assert (await client.delete(f"/api/schedule/{entry['id']}?revision={entry['revision']}")).status_code == 204
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert [row['date'] for row in await meals(client)] == ['2026-10-07']
        tracking = await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized WHERE rule_id=? ORDER BY date', (rule['id'],))
        assert [row['date'] for row in tracking] == ['2026-09-30','2026-10-07']
    async with runtime(tmp_path, configured=False) as (_, client):
        assert (await client.post('/api/auth/login', json={'passphrase':'secretpassphrase'})).status_code == 200
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert [row['date'] for row in await meals(client)] == ['2026-10-07']

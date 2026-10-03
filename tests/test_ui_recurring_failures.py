"""Migration, concurrency and atomic failure boundaries through the real app."""
import asyncio
import importlib
from pathlib import Path
import shutil

import pytest

from test_ui_household_runtime import runtime
from test_ui_recurring_runtime import BASE, MONDAY, recurring_clock, recipe, create_rule, meals, eventually, rounds_after


@pytest.mark.parametrize('timeline_enabled', [True, False])
async def test_skipped_and_occupied_legacy_slots_are_not_materialized(tmp_path, recurring_clock, timeline_enabled):
    async with runtime(tmp_path) as (_, client):
        item = await recipe(client)
        if timeline_enabled:
            assert (await client.put('/api/x/core-timeline/days/2026-09-30/slots/dinner', json={'kind':'skip'})).status_code == 200
        else:
            assert (await client.post('/api/plugins/core-timeline/disable')).status_code == 200
        manual = (await client.post('/api/schedule', json={'date':'2026-10-07','meal_type':'Dinner','entry_type':'note','title':'Manual occupied meal'})).json()
        rule = await create_rule(client, item['id'])
        assert rule.get('created') == (0 if timeline_enabled else 1)
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        entries = await meals(client)
        assert [entry['date'] for entry in entries] == (['2026-10-07'] if timeline_enabled else ['2026-09-30','2026-10-07'])
        assert (await client.get('/api/schedule/'+manual['id'])).json()['title'] == 'Manual occupied meal'


async def snapshot(app, client):
    return (await meals(client), (await client.get(BASE+'/rules')).json(),
            await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized ORDER BY rule_id,date'),
            await app.state.kernel.db.read_all('SELECT * FROM events ORDER BY seq'))


async def test_rule_and_horizon_roll_back_when_tracking_insert_fails(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        await app.state.kernel.db.write("CREATE TRIGGER reject_tracking BEFORE INSERT ON plugin_core_recurring_materialized BEGIN SELECT RAISE(ABORT, 'tracking failed'); END;")
        before = await snapshot(app, client)
        response = await client.post(BASE+'/rules', json={'recipe_id':item['id'],'weekday':2,'meal_type':'dinner'})
        assert response.status_code == 500, response.text
        assert await snapshot(app, client) == before


async def test_materialization_tracking_failure_rolls_back_the_entry(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        blockers = []
        for day in ['2026-09-30','2026-10-07']:
            blockers.append((await client.post('/api/schedule', json={'date':day,'meal_type':'dinner','entry_type':'note','title':'Block rule initially'})).json())
        await create_rule(client, item['id'])
        await app.state.kernel.db.write("CREATE TRIGGER reject_tracking BEFORE INSERT ON plugin_core_recurring_materialized BEGIN SELECT RAISE(ABORT, 'tracking failed'); END;")
        for row in blockers:
            assert (await client.delete(f"/api/schedule/{row['id']}?revision={row['revision']}")).status_code == 204
        before = await snapshot(app, client)
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert recurring_clock['failures'] >= 2
        assert await snapshot(app, client) == before
        await app.state.kernel.db.write('DROP TRIGGER reject_tracking')
        async def populated(): return len(await meals(client)) == 2
        await eventually(populated)


async def test_concurrent_requests_and_background_rounds_track_one_entry_per_rule_day(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        first, second = await asyncio.gather(create_rule(client,item['id']),create_rule(client,item['id']))
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        entries = await meals(client)
        assert [row['date'] for row in entries] == ['2026-09-30','2026-10-07']
        history = await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized ORDER BY rule_id,date')
        assert len(history) == 4
        for rule in [first,second]:
            assert [row['entry_id'] for row in history if row['rule_id']==rule['id']] == [row['id'] for row in entries]


async def test_shared_meals_survive_until_their_final_rule_is_removed_even_after_restart(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        first, second = await asyncio.gather(create_rule(client,item['id']),create_rule(client,item['id']))
        initial = await meals(client)
        assert len(initial) == 2
        assert (await client.delete(BASE+'/rules/'+first['id'])).status_code == 200
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert [row['id'] for row in await meals(client)] == [row['id'] for row in initial]
        history = await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized ORDER BY date')
        assert [row['rule_id'] for row in history] == [second['id'],second['id']]
    async with runtime(tmp_path, configured=False) as (_, client):
        assert (await client.post('/api/auth/login', json={'passphrase':'secretpassphrase'})).status_code == 200
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert [row['id'] for row in await meals(client)] == [row['id'] for row in initial]
        assert (await client.delete(BASE+'/rules/'+second['id'])).status_code == 200
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert await meals(client) == []


async def test_deleting_rule_preserves_today_past_and_edited_entries(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        monday_rule = await create_rule(client,item['id'],weekday=0)
        edited_rule = await create_rule(client,item['id'],weekday=2,meal_type='lunch')
        entries = await meals(client)
        today = next(row for row in entries if row['date']==MONDAY)
        edited = next(row for row in entries if row['date']=='2026-10-07')
        assert (await client.patch('/api/schedule/'+edited['id'], json={'revision':edited['revision'],'title':'Edited keep'})).status_code == 200
        past = (await client.post('/api/schedule', json={'date':'2026-09-21','meal_type':'dinner','recipe_id':item['id']})).json()
        manual = (await client.post('/api/schedule', json={'date':'2026-10-05','meal_type':'dinner','recipe_id':item['id'],'title':'Manual keep'})).json()
        # Arrange historical tracking below HTTP without inventing noun events
        # or calling the materializer. All schedule entries are real HTTP writes.
        await app.state.kernel.db.write('INSERT INTO plugin_core_recurring_materialized VALUES (?,?,?)', (monday_rule['id'],'2026-09-21',past['id']))
        for rule in [monday_rule,edited_rule]:
            assert (await client.delete(BASE+'/rules/'+rule['id'])).json() == {'ok':True}
        remaining = (await client.get('/api/schedule?from=2026-09-21&to=2026-10-11')).json()
        named = {past['id']:'past',today['id']:'today',edited['id']:'edited',manual['id']:'manual'}
        assert sorted(named[row['id']] for row in remaining) == ['edited','manual','past','today']
        assert (await client.get(BASE+'/rules')).json() == []
        assert await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized') == []


async def test_deleting_rule_rolls_back_after_second_entry_failure(tmp_path, recurring_clock, monkeypatch):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        rule = await create_rule(client,item['id'])
        before = await snapshot(app, client)
        original = app.state.kernel.schedule.delete_entry
        calls = 0
        async def failing_delete(*args, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2: raise RuntimeError('second deletion failed')
            return await original(*args, **kwargs)
        monkeypatch.setattr(app.state.kernel.schedule,'delete_entry',failing_delete)
        response = await client.delete(BASE+'/rules/'+rule['id'])
        assert response.status_code == 500, response.text
        assert await snapshot(app, client) == before
        monkeypatch.setattr(app.state.kernel.schedule,'delete_entry',original)
        assert (await client.delete(BASE+'/rules/'+rule['id'])).status_code == 200
        assert await meals(client) == []


async def test_cancelled_rule_creation_rolls_back_rule_entries_history_and_events(tmp_path, recurring_clock, monkeypatch):
    async with runtime(tmp_path) as (app, client):
        item = await recipe(client)
        before = await snapshot(app, client)
        inserted = asyncio.Event()
        original = app.state.kernel.schedule.create_entry
        async def pause_after_insert(*args, **kwargs):
            entry = await original(*args, **kwargs)
            inserted.set()
            await asyncio.Event().wait()
            return entry
        monkeypatch.setattr(app.state.kernel.schedule, 'create_entry', pause_after_insert)
        task = asyncio.create_task(client.post(BASE+'/rules', json={'recipe_id':item['id'],'weekday':2,'meal_type':'dinner'}))
        try:
            await asyncio.wait_for(inserted.wait(), 5)
            task.cancel()
            with pytest.raises(asyncio.CancelledError): await task
            baseline = recurring_clock['rounds']
            await rounds_after(recurring_clock, baseline)
            assert await snapshot(app, client) == before
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            monkeypatch.setattr(app.state.kernel.schedule,'create_entry',original)
        assert (await create_rule(client, item['id']))['created'] == 2


async def test_removed_materializer_route_command_and_unknown_rule(tmp_path, recurring_clock):
    async with runtime(tmp_path) as (app, client):
        assert (await client.delete(BASE+'/rules/missing')).status_code == 404
        assert (await client.get(BASE+'/materialize')).status_code == 404
        assert (await client.post(BASE+'/materialize')).status_code == 405
        assert app.state.kernel.services.get_command('core-recurring','materialize') is None
        assert 'materialize' not in str((await client.get('/api/plugins/core-recurring')).json().get('commands',[]))


async def test_schema_one_entries_are_backfilled_without_duplicates(tmp_path, recurring_clock, monkeypatch):
    old_plugins = tmp_path / 'old-plugins'
    shutil.copytree(Path(__file__).parent/'fixtures/core-recurring-v1', old_plugins/'core-recurring')
    boot = importlib.import_module('secretsauce.boot')
    with monkeypatch.context() as old:
        old.setattr(boot,'CORE_PLUGINS_DIR',old_plugins)
        async with runtime(tmp_path) as (app, client):
            item = await recipe(client)
            rule = await create_rule(client,item['id'])
            async def populated(): return len(await meals(client)) == 2
            await eventually(populated)
            old_entries = await meals(client)
            assert (await app.state.kernel.registry.get_plugin('core-recurring'))['applied_schema'] == 1
    async with runtime(tmp_path, configured=False) as (app, client):
        assert (await client.post('/api/auth/login', json={'passphrase':'secretpassphrase'})).status_code == 200
        baseline = recurring_clock['rounds']
        await rounds_after(recurring_clock, baseline)
        assert (await app.state.kernel.registry.get_plugin('core-recurring'))['applied_schema'] == 2
        assert [row['id'] for row in await meals(client)] == [row['id'] for row in old_entries]
        history = await app.state.kernel.db.read_all('SELECT * FROM plugin_core_recurring_materialized WHERE rule_id=? ORDER BY date', (rule['id'],))
        assert [row['entry_id'] for row in history] == [row['id'] for row in old_entries]

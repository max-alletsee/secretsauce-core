"""Day slots through HTTP/lifespan, real noun writes and actual SSE delivery."""
import asyncio

import pytest

from test_ui_household_runtime import runtime
from test_stream_format import _frames

BASE = '/api/x/core-timeline'
DAY = '2026-09-28'


def path(slot, day=DAY):
    return f'{BASE}/days/{day}/slots/{slot}'


async def put(client, slot, body, day=DAY):
    response = await client.put(path(slot, day), json=body)
    assert response.status_code == 200, response.text
    return response.json()['slots']


async def test_day_slots_resolve_extras_before_defaults_in_creation_order(tmp_path):
    async with runtime(tmp_path) as (_, client):
        await put(client, 'brunch', {'kind': 'extra', 'label': 'Brunch', 'before': 'lunch'})
        slots = await put(client, 'coffee', {'kind': 'extra', 'label': 'Coffee', 'before': 'lunch'})
        assert [slot['id'] for slot in slots] == ['breakfast', 'brunch', 'coffee', 'lunch', 'dinner']
        slots = await put(client, 'brunch', {'kind': 'extra', 'label': 'Sunday brunch', 'before': 'lunch'})
        assert [slot['id'] for slot in slots] == ['breakfast', 'brunch', 'coffee', 'lunch', 'dinner']
        assert slots[1]['label'] == 'Sunday brunch'
        slots = await put(client, 'brunch', {'kind': 'extra', 'label': 'Late brunch', 'before': 'missing'})
        assert [slot['id'] for slot in slots] == ['breakfast', 'coffee', 'lunch', 'dinner', 'brunch']
        await client.patch('/api/household', json={'meal_types': [{'id': 'breakfast', 'label': 'Breakfast'}, {'id': 'dinner', 'label': 'Dinner'}]})
        response = await client.get(f'{BASE}/slots?from={DAY}&to={DAY}')
        assert [slot['id'] for slot in response.json()['days'][DAY]] == ['breakfast', 'dinner', 'brunch', 'coffee']


async def test_skip_and_undo_are_per_day(tmp_path):
    async with runtime(tmp_path) as (_, client):
        slots = await put(client, 'lunch', {'kind': 'skip'})
        assert slots[1] == {'id': 'lunch', 'label': 'Lunch', 'kind': 'default', 'skipped': True}
        days = (await client.get(f'{BASE}/slots?from={DAY}&to=2026-09-29')).json()['days']
        assert days['2026-09-29'][1]['skipped'] is False
        response = await client.delete(path('lunch'))
        assert response.status_code == 200
        assert response.json()['slots'][1]['skipped'] is False


@pytest.mark.parametrize(('slot', 'body', 'status'), [
    ('dinner', {'kind': 'extra', 'label': 'Extra dinner'}, 409),
    ('unknown', {'kind': 'skip'}, 404),
    ('Bad-ID', {'kind': 'extra', 'label': 'Bad'}, 422),
    ('x'*65, {'kind': 'extra', 'label': 'Long id'}, 422),
    ('valid', {'kind': 'extra', 'label': ''}, 422),
    ('valid', {'kind': 'extra', 'label': 'x'*65}, 422),
    ('valid', {'kind': 'extra'}, 422),
])
async def test_slot_writes_validate_ids_and_default_conflicts(tmp_path, slot, body, status):
    async with runtime(tmp_path) as (_, client):
        response = await client.put(path(slot), json=body)
        assert response.status_code == status, response.text
        assert response.json()['error']['code'] == {409:'conflict',404:'not_found',422:'validation'}[status]


@pytest.mark.parametrize(('start', 'end'), [('2026-9-28','2026-09-29'), ('2026-02-30','2026-03-01'), ('2026-09-29','2026-09-28'), ('2026-01-01','2026-04-03')])
async def test_slot_ranges_are_strict_calendar_dates_and_bounded(tmp_path, start, end):
    async with runtime(tmp_path) as (_, client):
        response = await client.get(f'{BASE}/slots?from={start}&to={end}')
        assert response.status_code == 422, response.text
        assert response.json()['error']['code'] == 'validation'
        for method in ('put', 'delete'):
            if start in ('2026-9-28', '2026-02-30'):
                response = await client.request(method.upper(), path('lunch', start), json={'kind':'skip'} if method=='put' else None)
                assert response.status_code == 422
        valid = await client.get(f'{BASE}/slots?from=2026-01-01&to=2026-04-02')
        assert valid.status_code == 200, valid.text
        assert len(valid.json()['days']) == 92


@pytest.mark.parametrize('legacy', ['Dinner', 'DINNER', 'Evening meal'])
async def test_occupied_slot_checks_include_legacy_label_aliases(tmp_path, legacy):
    async with runtime(tmp_path) as (_, client):
        await client.patch('/api/household', json={'meal_types':[{'id':'dinner','label':'Evening meal'}]})
        assert (await client.post('/api/schedule', json={'date':DAY,'meal_type':legacy,'entry_type':'note','title':'Legacy meal'})).status_code == 201
        response = await client.put(path('dinner'), json={'kind':'skip'})
        assert response.status_code == 409, response.text
        assert response.json()['error']['details']['current']['entry_count'] == 1


async def test_deleting_extra_with_entries_is_atomic(tmp_path, monkeypatch):
    async with runtime(tmp_path) as (app, client):
        await put(client, 'brunch', {'kind':'extra','label':'Sunday brunch'})
        for alias in ['brunch', 'Sunday Brunch']:
            assert (await client.post('/api/schedule', json={'date':DAY,'meal_type':alias,'entry_type':'note','title':alias})).status_code == 201
        response = await client.delete(path('brunch'))
        assert response.status_code == 409
        assert response.json()['error']['details']['current']['entry_count'] == 2
        kernel = app.state.kernel
        async def snapshot():
            return [(await client.get(f'/api/schedule?from={DAY}&to={DAY}')).json(), (await client.get(f'{BASE}/slots?from={DAY}&to={DAY}')).json(), await kernel.db.read_all('SELECT * FROM events ORDER BY seq')]
        before = await snapshot()
        original = kernel.schedule.delete_entry
        calls = 0
        async def failing_delete(*args, **kwargs):
            nonlocal calls
            calls += 1
            if calls == 2: raise RuntimeError('Second delete failed')
            return await original(*args, **kwargs)
        pushes = []
        async def capture_push(*args): pushes.append(args)
        monkeypatch.setattr(kernel.schedule, 'delete_entry', failing_delete)
        monkeypatch.setattr(kernel.active_ctx('core-timeline'), 'push', capture_push)
        response = await client.delete(path('brunch')+'?with_entries=true')
        assert response.status_code == 500, response.text
        assert await snapshot() == before
        assert pushes == []
        monkeypatch.setattr(kernel.schedule, 'delete_entry', original)
        response = await client.delete(path('brunch')+'?with_entries=true')
        assert response.status_code == 200
        assert (await client.get(f'/api/schedule?from={DAY}&to={DAY}')).json() == []
        assert [slot['id'] for slot in response.json()['slots']] == ['breakfast','lunch','dinner']
        assert len(pushes) == 1


@pytest.mark.parametrize('timeline_enabled', [True, False])
async def test_ai_planner_consumes_resolved_slots_or_household_fallback(tmp_path, monkeypatch, timeline_enabled):
    from unittest.mock import AsyncMock
    async with runtime(tmp_path) as (app, client):
        if timeline_enabled:
            await put(client, 'brunch', {'kind':'extra','label':'Brunch','before':'lunch'})
            await put(client, 'lunch', {'kind':'skip'})
        else:
            assert (await client.post('/api/plugins/core-timeline/disable')).status_code == 200
        outbound = AsyncMock(return_value=({'title':'Candidate pool','suggestions':[]}, 12, 8))
        monkeypatch.setattr(app.state.kernel.services.get('core-ai-provider'), '_complete_openai_compatible', outbound)
        assert (await client.put('/api/x/core-ai-provider/settings', json={'provider':'openai','openai_api_key':'test-key'})).status_code == 200
        response = await client.post('/api/x/core-meal-planner-ai/generate', json={'start_date':DAY,'days':2})
        assert response.status_code == 200, response.text
        prompt = outbound.call_args.kwargs['prompt']
        import json
        assert 'Available slots by date: ' in prompt
        days = json.loads(prompt.split('Available slots by date: ', 1)[1].splitlines()[0])
        assert days[DAY] == (['breakfast','brunch','dinner'] if timeline_enabled else ['breakfast','lunch','dinner'])
        assert days['2026-09-29'] == ['breakfast','lunch','dinner']


@pytest.mark.parametrize('start', ['2026-9-28', '2026-02-30', 'nonsense', '9999-12-31'])
async def test_planner_invalid_calendar_dates_fail_before_paid_completion(tmp_path, monkeypatch, start):
    from unittest.mock import AsyncMock
    async with runtime(tmp_path) as (app, client):
        outbound = AsyncMock(return_value=({'title':'Unused','suggestions':[]}, 12, 8))
        monkeypatch.setattr(app.state.kernel.services.get('core-ai-provider'), '_complete_openai_compatible', outbound)
        await client.put('/api/x/core-ai-provider/settings', json={'provider':'openai','openai_api_key':'test-key'})
        before = await app.state.kernel.db.read_all('SELECT * FROM plugin_core_meal_planner_plans')
        response = await client.post('/api/x/core-meal-planner-ai/generate', json={'start_date':start,'days':2})
        assert response.status_code == 422, response.text
        assert response.json()['error']['code'] == 'validation'
        assert outbound.await_count == 0
        assert await app.state.kernel.db.read_all('SELECT * FROM plugin_core_meal_planner_plans') == before


async def test_removing_obsolete_extra_override_does_not_delete_new_default_meals(tmp_path):
    async with runtime(tmp_path) as (_, client):
        await put(client, 'brunch', {'kind':'extra','label':'Brunch'})
        entry = (await client.post('/api/schedule', json={'date':DAY,'meal_type':'brunch','entry_type':'note','title':'Keep this meal'})).json()
        response = await client.patch('/api/household', json={'meal_types':[{'id':'brunch','label':'Daily brunch'},{'id':'dinner','label':'Dinner'}]})
        assert response.status_code == 200
        response = await client.delete(path('brunch')+'?with_entries=true')
        assert response.status_code == 200, response.text
        assert response.json()['slots'][0] == {'id':'brunch','label':'Daily brunch','kind':'default','skipped':False}
        assert (await client.get('/api/schedule/'+entry['id'])).status_code == 200


async def test_id_matches_take_priority_over_another_slots_label(tmp_path):
    async with runtime(tmp_path) as (_, client):
        await client.patch('/api/household', json={'meal_types':[{'id':'breakfast','label':'Dinner'},{'id':'dinner','label':'Evening meal'}]})
        await client.post('/api/schedule', json={'date':DAY,'meal_type':'DINNER','entry_type':'note','title':'Canonical dinner'})
        assert (await client.put(path('breakfast'), json={'kind':'skip'})).status_code == 200
        assert (await client.put(path('dinner'), json={'kind':'skip'})).status_code == 409


async def test_timeline_push_reaches_the_real_sse_client_after_commit(tmp_path):
    async with runtime(tmp_path) as (app, client):
        kernel = app.state.kernel
        head = await kernel.events.get_head_seq()
        task = asyncio.create_task(client.get(f'/api/events/stream?limit=2&last_event_id={head}'))
        try:
            async with asyncio.timeout(5):
                while kernel.broadcaster.subscriber_count == 0: await asyncio.sleep(.01)
            await put(client, 'brunch', {'kind':'extra','label':'Brunch'})
            response = await asyncio.wait_for(task, 5)
            frame = _frames(response.text)[1]
            assert frame['event'] == 'push'
            assert frame['data'] == {'kind':'push','name':'core-timeline:slots-changed','data':{'date':DAY},'plugin_id':'core-timeline'}
            assert (await client.get(f'{BASE}/slots?from={DAY}&to={DAY}')).json()['days'][DAY][-1]['id'] == 'brunch'
        finally:
            if not task.done(): task.cancel()
            await asyncio.gather(task, return_exceptions=True)

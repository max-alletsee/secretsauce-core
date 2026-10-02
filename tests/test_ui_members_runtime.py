"""Member edits/deletion through production HTTP, with serialized writer transactions."""
import asyncio

from test_ui_household_runtime import runtime


async def test_last_member_delete_is_rejected(tmp_path):
    async with runtime(tmp_path) as (app, client):
        before = (await client.get('/api/members')).json()
        event_rows = await app.state.kernel.db.read_all('SELECT * FROM events ORDER BY seq')
        response = await client.delete(f"/api/members/{before[0]['id']}?revision=1")
        assert response.status_code == 409, response.text
        assert response.json()['error']['code'] == 'conflict'
        assert (await client.get('/api/members')).json() == before
        assert await app.state.kernel.db.read_all('SELECT * FROM events ORDER BY seq') == event_rows


async def test_concurrent_member_deletes_keep_one_survivor(tmp_path):
    async with runtime(tmp_path) as (_, client):
        assert (await client.post('/api/members', json={'name': 'Second'})).status_code == 201
        members = (await client.get('/api/members')).json()
        responses = await asyncio.gather(*(client.delete(f"/api/members/{member['id']}?revision={member['revision']}") for member in members))
        assert sorted(response.status_code for response in responses) == [204, 409]
        assert len((await client.get('/api/members')).json()) == 1


async def test_stale_member_edit_preserves_concurrent_preferences(tmp_path):
    async with runtime(tmp_path) as (_, client):
        member = (await client.get('/api/members')).json()[0]
        updated = await client.patch(f"/api/members/{member['id']}", json={'revision': 1, 'serving_ratio': 1.75, 'allergies': ['peanut']})
        assert updated.status_code == 200, updated.text
        current = updated.json()
        response = await client.patch(f"/api/members/{member['id']}", json={'revision': 1, 'name': 'Stale name'})
        assert response.status_code == 409
        assert response.json()['error']['details']['current'] == current
        assert (await client.get(f"/api/members/{member['id']}")).json() == current
        # The compatibility field remains writable although the UI ignores it.
        assert (await client.patch(f"/api/members/{member['id']}", json={'revision': 2, 'avatar_color': '#123456'})).status_code == 200

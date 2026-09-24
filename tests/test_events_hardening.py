import asyncio

import pytest

from secretsauce.db import Database
from secretsauce.errors import PluginRuntimeError
from secretsauce.events import Event, EventDispatcher, EventLog
from secretsauce.stream import EventBroadcaster


@pytest.fixture
async def db(tmp_path):
    database = Database(tmp_path / "events.db")
    await database.connect()
    await database.run_migrations()
    yield database
    await database.close()


async def test_broadcast_happens_only_after_commit(db):
    log = EventLog(db)
    broadcaster = EventBroadcaster()
    log.set_broadcaster(broadcaster)
    queue = await broadcaster.subscribe()

    with pytest.raises(RuntimeError):
        async with db.transaction() as tx:
            await log.append(tx, name="recipe:created")
            assert queue.empty()
            raise RuntimeError("rollback")
    assert queue.empty()

    async with db.transaction() as tx:
        seq = await log.append(tx, name="recipe:created")
        assert queue.empty()
    kind, evt = queue.get_nowait()
    assert kind == "event"
    assert evt.seq == seq


async def test_commit_wakes_registered_listeners(db):
    log = EventLog(db)
    woken: list[int] = []
    log.add_commit_listener(lambda: woken.append(1))

    async with db.transaction() as tx:
        await log.append(tx, name="a:b")
        await log.append(tx, name="a:c")
    assert woken == [1]


async def test_writes_inside_handler_record_cause_and_depth(db):
    log = EventLog(db)
    dispatcher = EventDispatcher(db, plugin_id="chain-plugin")

    async def on_first(event: Event):
        async with db.transaction() as tx:
            await log.append(tx, name="chain:second", origin="plugin:chain-plugin")

    dispatcher.subscribe("chain:first", on_first)
    async with db.transaction() as tx:
        first_seq = await log.append(tx, name="chain:first")

    await dispatcher.drain_to_head()

    second = await db.read_one("SELECT * FROM events WHERE name = 'chain:second';")
    assert second["cause_seq"] == first_seq
    assert second["depth"] == 1


async def test_self_triggering_handler_is_stopped_by_depth_limit(db):
    log = EventLog(db)
    dispatcher = EventDispatcher(db, plugin_id="loop-plugin")

    async def echo(event: Event):
        async with db.transaction() as tx:
            await log.append(tx, name="loop:tick")

    dispatcher.subscribe("loop:tick", echo)
    async with db.transaction() as tx:
        await log.append(tx, name="loop:tick")

    # Depths 0..8 are allowed; the write that would reach depth 9 is refused,
    # so the chain ends instead of looping forever.
    with pytest.raises(PluginRuntimeError):
        await asyncio.wait_for(dispatcher.drain_to_head(), timeout=5)

    count = await db.read_val("SELECT COUNT(*) FROM events WHERE name = 'loop:tick';")
    assert count == 9


async def test_concurrent_drains_deliver_each_event_once(db):
    log = EventLog(db)
    dispatcher = EventDispatcher(db, plugin_id="concurrent-plugin")
    received: list[int] = []

    async def slow_handler(event: Event):
        await asyncio.sleep(0.01)
        received.append(event.seq)

    dispatcher.subscribe("x:*", slow_handler)
    async with db.transaction() as tx:
        for _ in range(5):
            await log.append(tx, name="x:y")

    await asyncio.gather(dispatcher.drain_to_head(), dispatcher.drain_to_head())
    assert sorted(received) == sorted(set(received))
    assert len(received) == 5


async def test_unmatched_events_advance_cursor_without_per_event_writes(db):
    log = EventLog(db)
    dispatcher = EventDispatcher(db, plugin_id="picky-plugin")
    dispatcher.subscribe("wanted:event", lambda e: asyncio.sleep(0))
    async with db.transaction() as tx:
        for _ in range(3):
            await log.append(tx, name="other:event")
        last = await log.append(tx, name="other:event")

    await dispatcher.drain_to_head()
    cursor = await dispatcher.get_cursor()
    assert cursor["last_seq"] == last


async def test_dispatcher_can_start_new_cursor_at_head(db):
    log = EventLog(db)
    async with db.transaction() as tx:
        head = await log.append(tx, name="old:event")

    dispatcher = EventDispatcher(db, plugin_id="new-plugin")
    received: list[str] = []

    async def handler(event: Event):
        received.append(event.name)

    dispatcher.subscribe("*", handler)
    await dispatcher.ensure_cursor(start_at_head=True)
    await dispatcher.drain_to_head()
    assert received == []
    assert (await dispatcher.get_cursor())["last_seq"] == head

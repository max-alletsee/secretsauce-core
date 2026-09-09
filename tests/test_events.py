import pytest
from secretsauce.db import Database
from secretsauce.events import Event, EventDispatcher, EventLog


@pytest.mark.asyncio
async def test_event_logging_and_dispatch(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()

    event_log = EventLog(db)
    received = []

    async def sample_handler(event: Event):
        received.append(event)

    dispatcher = EventDispatcher(db, plugin_id="test-plugin")
    dispatcher.subscribe("recipe:created", sample_handler)

    # Append event in transaction
    async with db.transaction() as tx:
        seq = await event_log.append(
            tx,
            name="recipe:created",
            entity_type="recipe",
            entity_id="rec_1",
            origin="member",
            data={"after": {"title": "Tacos"}},
        )
    assert seq >= 1

    processed = await dispatcher.drain_to_head()
    assert processed == 1
    assert len(received) == 1
    assert received[0].name == "recipe:created"
    assert received[0].data["after"]["title"] == "Tacos"

    # Verify cursor advanced
    cursor = await dispatcher.get_cursor()
    assert cursor["last_seq"] == seq

    await db.close()


@pytest.mark.asyncio
async def test_wildcard_subscription(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()

    event_log = EventLog(db)
    received = []

    async def handler(event: Event):
        received.append(event.name)

    dispatcher = EventDispatcher(db, plugin_id="wildcard-plugin")
    dispatcher.subscribe("recipe:*", handler)

    async with db.transaction() as tx:
        await event_log.append(tx, name="recipe:created")
        await event_log.append(tx, name="recipe:updated")
        await event_log.append(tx, name="schedule:created")

    await dispatcher.drain_to_head()
    assert received == ["recipe:created", "recipe:updated"]

    await db.close()


@pytest.mark.asyncio
async def test_event_depth_limit(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    event_log = EventLog(db)

    async with db.transaction() as tx:
        with pytest.raises(ValueError) as exc:
            await event_log.append(tx, name="loop:event", depth=9)
        assert "depth" in str(exc.value).lower()

    await db.close()


@pytest.mark.asyncio
async def test_event_failure_and_skip(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    event_log = EventLog(db)

    attempts = 0

    async def failing_handler(event: Event):
        nonlocal attempts
        attempts += 1
        raise RuntimeError("Handler failure")

    dispatcher = EventDispatcher(db, plugin_id="failing-plugin")
    dispatcher.subscribe("fail:event", failing_handler)

    async with db.transaction() as tx:
        seq = await event_log.append(tx, name="fail:event")

    # First drain attempt fails and records attempt
    with pytest.raises(RuntimeError):
        await dispatcher.drain_to_head()

    cursor = await dispatcher.get_cursor()
    assert cursor["attempts"] == 1
    assert cursor["failing_seq"] == seq
    assert cursor["last_seq"] == 0

    # Simulate 19 more attempts to reach 20 max attempts
    async with db.transaction() as tx:
        await tx.execute(
            "UPDATE event_cursors SET attempts = 19 WHERE plugin_id = 'failing-plugin';"
        )

    # Now drain: 20th attempt fails and event is skipped!
    await dispatcher.drain_to_head()
    cursor_after = await dispatcher.get_cursor()
    assert cursor_after["last_seq"] == seq
    assert cursor_after["failing_seq"] is None
    assert cursor_after["attempts"] == 0

    await db.close()

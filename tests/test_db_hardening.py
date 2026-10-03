import asyncio
import sqlite3

import pytest

from secretsauce.db import Database, split_sql_script


@pytest.fixture
async def db(tmp_path):
    database = Database(tmp_path / "test.db")
    await database.connect()
    await database.run_migrations()
    try:
        yield database
    finally:
        await database.close()


async def test_cancelled_transaction_rolls_back_and_releases_writer(db):
    await db.write("CREATE TABLE t (x INTEGER);")

    async def slow_writer():
        async with db.transaction() as tx:
            await tx.execute("INSERT INTO t VALUES (1);")
            await asyncio.sleep(10)

    task = asyncio.create_task(slow_writer())
    await asyncio.sleep(0.05)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    # The next write must succeed and the cancelled insert must be gone.
    await asyncio.wait_for(db.write("INSERT INTO t VALUES (2);"), timeout=3)
    rows = await db.read_all("SELECT x FROM t ORDER BY x;")
    assert [r["x"] for r in rows] == [2]


async def test_failed_kernel_migration_leaves_no_partial_schema(tmp_path):
    mig_dir = tmp_path / "migs"
    mig_dir.mkdir()
    (mig_dir / "0001_ok.sql").write_text("CREATE TABLE a (x);", encoding="utf-8")
    (mig_dir / "0002_bad.sql").write_text(
        "CREATE TABLE b (x);\nCREATE TABLE b (x);", encoding="utf-8"
    )
    database = Database(tmp_path / "m.db")
    await database.connect()
    try:
        with pytest.raises(sqlite3.OperationalError):
            await database.run_migrations(mig_dir)

        tables = {
            r["name"]
            for r in await database.read_all(
                "SELECT name FROM sqlite_master WHERE type='table';"
            )
        }
        assert "a" in tables
        assert "b" not in tables
        applied = await database.read_all("SELECT number FROM kernel_migrations;")
        assert [r["number"] for r in applied] == [1]
    finally:
        await database.close()


def test_split_sql_script_keeps_trigger_bodies_and_strings_intact():
    script = """
    CREATE TABLE t (x TEXT DEFAULT 'a;b');
    -- comment; with semicolon
    CREATE TRIGGER trg AFTER INSERT ON t BEGIN
        UPDATE t SET x = 'c' WHERE rowid = new.rowid;
        SELECT 1;
    END;
    INSERT INTO t (x) VALUES ('d');
    """
    statements = split_sql_script(script)
    assert len(statements) == 3
    assert statements[0].startswith("CREATE TABLE t")
    assert statements[1].startswith("-- comment; with semicolon")
    assert statements[1].rstrip().endswith("END;")
    assert statements[2].startswith("INSERT INTO t")


async def test_vacuum_into_accepts_paths_with_quotes(db, tmp_path):
    target_dir = tmp_path / "o'brien"
    target_dir.mkdir()
    target = target_dir / "backup.db"
    await db.vacuum_into(target)
    assert target.is_file()


async def test_after_commit_callbacks_run_only_on_commit(db):
    fired: list[str] = []

    async with db.transaction():
        db.after_commit(lambda: fired.append("committed"))
    assert fired == ["committed"]

    with pytest.raises(RuntimeError):
        async with db.transaction():
            db.after_commit(lambda: fired.append("rolled-back"))
            raise RuntimeError("boom")
    assert fired == ["committed"]


async def test_after_commit_awaits_async_callbacks_outside_the_writer(db):
    await db.write("CREATE TABLE async_commit (value INTEGER);")
    observed = []

    async def announce():
        observed.append(await db.read_val("SELECT value FROM async_commit;"))
        # A callback is outside the completed writer and can open a new transaction.
        await db.write("INSERT INTO async_commit VALUES (2);")

    async with db.transaction() as tx:
        await tx.execute("INSERT INTO async_commit VALUES (1);")
        db.after_commit(announce)
        assert observed == []
    assert observed == [1]
    assert await db.read_all("SELECT value FROM async_commit ORDER BY value;") == [{"value": 1}, {"value": 2}]


async def test_cancelled_async_commit_hook_leaves_committed_data_and_writer_available(db):
    await db.write('CREATE TABLE hook_cancel (value INTEGER)')
    started = asyncio.Event()
    async def hook():
        started.set()
        await asyncio.Event().wait()
    async def write():
        async with db.transaction() as tx:
            await tx.execute('INSERT INTO hook_cancel VALUES (1)')
            db.after_commit(hook)
    task = asyncio.create_task(write())
    try:
        await asyncio.wait_for(started.wait(), 3)
        # A waiting hook must not own the writer or block another request.
        await asyncio.wait_for(db.write('INSERT INTO hook_cancel VALUES (2)'), 3)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert await db.read_all('SELECT value FROM hook_cancel ORDER BY value') == [{'value':1},{'value':2}]
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


async def test_async_commit_hooks_drop_rolled_back_savepoints_and_continue_after_failure(db, caplog):
    observed = []
    async def announce(value):
        observed.append(value)
        if value == 'failure': raise RuntimeError('hook failure')
    async with db.transaction():
        db.after_commit(lambda: announce('outer'))
        with pytest.raises(RuntimeError):
            async with db.transaction():
                db.after_commit(lambda: announce('rolled-back'))
                raise RuntimeError('savepoint failure')
        db.after_commit(lambda: announce('failure'))
        db.after_commit(lambda: announce('after'))
    assert observed == ['outer','failure','after']
    assert 'after_commit callback failed' in caplog.text


async def test_nested_transaction_in_same_task_joins_instead_of_deadlocking(db):
    await db.write("CREATE TABLE t (x INTEGER);")

    async def nested():
        async with db.transaction() as outer:
            await outer.execute("INSERT INTO t VALUES (1);")
            # A hook or helper writing through db.write() inside the outer
            # transaction must join it, not wait on the writer lock forever.
            await db.write("INSERT INTO t VALUES (2);")
            with pytest.raises(RuntimeError):
                async with db.transaction() as inner:
                    await inner.execute("INSERT INTO t VALUES (3);")
                    raise RuntimeError("inner failure")

    await asyncio.wait_for(nested(), timeout=3)
    rows = await db.read_all("SELECT x FROM t ORDER BY x;")
    assert [r["x"] for r in rows] == [1, 2]


async def test_nested_rollback_drops_its_after_commit_callbacks(db):
    fired: list[str] = []
    async with db.transaction():
        db.after_commit(lambda: fired.append("outer"))
        with pytest.raises(RuntimeError):
            async with db.transaction():
                db.after_commit(lambda: fired.append("inner"))
                raise RuntimeError("inner failure")
    assert fired == ["outer"]


async def test_other_tasks_still_wait_for_the_writer(db):
    await db.write("CREATE TABLE t (x INTEGER);")
    order: list[str] = []

    async def holder():
        async with db.transaction() as tx:
            await tx.execute("INSERT INTO t VALUES (1);")
            await asyncio.sleep(0.1)
            order.append("holder-done")

    async def waiter():
        await asyncio.sleep(0.02)
        async with db.transaction() as tx:
            order.append("waiter-start")
            await tx.execute("INSERT INTO t VALUES (2);")

    await asyncio.gather(holder(), waiter())
    assert order == ["holder-done", "waiter-start"]


async def test_after_commit_outside_transaction_is_rejected(db):
    with pytest.raises(RuntimeError):
        db.after_commit(lambda: None)


async def test_reads_see_committed_writes_while_other_reads_run(tmp_path):
    """Concurrent readers share one connection; none may pin an old snapshot."""
    db = Database(tmp_path / "snap.db")
    await db.connect()
    try:
        await db.write("CREATE TABLE t (n INTEGER);")
        for i in range(200):
            await db.write("INSERT INTO t VALUES (?);", (i,))
        stop = False

        async def noise():
            while not stop:
                await db.read_all("SELECT * FROM t;")

        tasks = [asyncio.create_task(noise()) for _ in range(4)]
        try:
            for i in range(30):
                await db.write("INSERT INTO t VALUES (?);", (1000 + i,))
                assert await db.read_val("SELECT COUNT(*) FROM t;") == 201 + i
        finally:
            stop = True
            await asyncio.gather(*tasks)
    finally:
        await db.close()

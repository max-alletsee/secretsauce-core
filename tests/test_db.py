import pytest
from secretsauce.db import Database


@pytest.mark.asyncio
async def test_database_init_and_pragmas(tmp_path):
    db_path = tmp_path / "secretsauce.db"
    db = Database(db_path)
    await db.connect()
    try:
        # Check pragmas
        journal_mode = await db.read_val("PRAGMA journal_mode;")
        assert journal_mode.lower() == "wal"
        fk = await db.read_val("PRAGMA foreign_keys;")
        assert fk == 1

        # Run migrations
        await db.run_migrations()
        tables = await db.read_all("SELECT name FROM sqlite_master WHERE type='table';")
        table_names = {t["name"] for t in tables}
        assert "recipes" in table_names
        assert "schedule_entries" in table_names
        assert "cook_journal" in table_names
        assert "household_members" in table_names
        assert "assets" in table_names
        assert "entity_attributes" in table_names
        assert "events" in table_names
        assert "event_cursors" in table_names
        assert "plugins" in table_names
        assert "jobs" in table_names
        assert "api_tokens" in table_names
        assert "household_config" in table_names
        assert "kernel_migrations" in table_names
        assert "recipes_fts" in table_names
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_database_transactions_and_lock(tmp_path):
    db_path = tmp_path / "secretsauce.db"
    db = Database(db_path)
    await db.connect()
    await db.run_migrations()
    try:
        # Test write and transaction
        async with db.transaction() as conn:
            await conn.execute(
                "INSERT INTO household_config (key, value, updated_at) VALUES (?, ?, ?);",
                ("test_key", '{"foo": "bar"}', "2026-09-09T12:00:00Z"),
            )

        # Read back with read_one
        row = await db.read_one(
            "SELECT key, value FROM household_config WHERE key = ?;", ("test_key",)
        )
        assert row is not None
        assert row["key"] == "test_key"
        assert row["value"] == '{"foo": "bar"}'

        # Verify rollback on error inside transaction
        with pytest.raises(RuntimeError):
            async with db.transaction() as conn:
                await conn.execute(
                    "INSERT INTO household_config (key, value, updated_at) VALUES (?, ?, ?);",
                    ("fail_key", '{"fail": true}', "2026-09-09T12:00:00Z"),
                )
                raise RuntimeError("Boom")

        fail_row = await db.read_one(
            "SELECT key FROM household_config WHERE key = ?;", ("fail_key",)
        )
        assert fail_row is None
    finally:
        await db.close()

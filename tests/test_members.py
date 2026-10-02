import pytest
from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.members import MembersRepo


@pytest.fixture
async def db(tmp_path):
    database = Database(tmp_path / "test.db")
    await database.connect()
    try:
        await database.run_migrations()
        yield database
    finally:
        await database.close()


@pytest.mark.asyncio
async def test_member_crud_and_revision_conflict(db):
    repo = MembersRepo(db)
    await repo.create_member({"name": "Survivor"})

    m = await repo.create_member(
        {"name": "Alice", "serving_ratio": 1.5, "preferred_language": "en"}
    )
    assert m["name"] == "Alice"
    assert m["revision"] == 1
    assert m["serving_ratio"] == 1.5
    assert m["dietary_restrictions"] == []
    assert m["allergies"] == []
    assert m["disliked_ingredients"] == []
    assert m["favorite_cuisines"] == []

    # Read back
    m_read = await repo.get_member(m["id"])
    assert m_read["id"] == m["id"]
    assert m_read["name"] == "Alice"

    # Successful update
    m2 = await repo.update_member(m["id"], revision=1, data={"name": "Alice A."})
    assert m2["revision"] == 2
    assert m2["name"] == "Alice A."

    # Stale revision conflict
    with pytest.raises(ConflictError) as exc:
        await repo.update_member(m["id"], revision=1, data={"name": "Alice B."})
    assert exc.value.status_code == 409
    assert exc.value.details["current"]["revision"] == 2

    # Delete with wrong revision
    with pytest.raises(ConflictError):
        await repo.delete_member(m["id"], revision=1)

    # Delete with correct revision
    await repo.delete_member(m["id"], revision=2)

    # Verify not found
    with pytest.raises(NotFoundError):
        await repo.get_member(m["id"])


@pytest.mark.asyncio
async def test_member_delete_cleans_participants(db):
    repo = MembersRepo(db)

    m1 = await repo.create_member({"name": "Member 1"})
    m2 = await repo.create_member({"name": "Member 2"})

    # Insert a schedule entry referencing m1 and m2 in participant_member_ids
    async with db.transaction() as conn:
        await conn.execute(
            """
            INSERT INTO schedule_entries (
                id, revision, date, meal_type, entry_type,
                participant_member_ids, created_at, updated_at, origin
            ) VALUES (?, 1, '2026-09-10', 'dinner', 'note', ?, '2026-09-09T12:00:00Z', '2026-09-09T12:00:00Z', 'member');
            """,
            ("sched-1", f'["{m1["id"]}", "{m2["id"]}"]'),
        )

    # Delete m1
    await repo.delete_member(m1["id"], revision=1)

    # Verify schedule entry has m1 removed from participant_member_ids
    row = await db.read_one(
        "SELECT participant_member_ids FROM schedule_entries WHERE id = 'sched-1';"
    )
    import json

    participants = json.loads(row["participant_member_ids"])
    assert m1["id"] not in participants
    assert m2["id"] in participants

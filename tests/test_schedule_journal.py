import pytest
from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.journal import JournalRepo
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.schedule import ScheduleRepo


@pytest.mark.asyncio
async def test_schedule_and_journal_flow(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    recipe_repo = RecipesRepo(db)
    sched_repo = ScheduleRepo(db, recipes_repo=recipe_repo)
    journal_repo = JournalRepo(db, recipes_repo=recipe_repo)

    # 1. Create recipe
    rec = await recipe_repo.create_recipe({"title": "Pasta", "language": "en"})

    # 2. Create schedule entry
    entry = await sched_repo.create_entry(
        {
            "date": "2026-09-10",
            "meal_type": "dinner",
            "recipe_id": rec["id"],
            "servings_override": 4.0,
            "participant_member_ids": ["m1", "m2"],
        }
    )
    assert entry["recipe_id"] == rec["id"]
    assert entry["revision"] == 1
    assert entry["participant_member_ids"] == ["m1", "m2"]
    assert entry["recipe"]["title"] == "Pasta"

    # 3. Update schedule entry
    updated_entry = await sched_repo.update_entry(
        entry["id"], revision=1, data={"note": "Extra cheese"}
    )
    assert updated_entry["revision"] == 2
    assert updated_entry["note"] == "Extra cheese"

    # 4. Schedule revision conflict
    with pytest.raises(ConflictError):
        await sched_repo.update_entry(
            entry["id"], revision=1, data={"note": "Conflict"}
        )

    # 5. Create cook journal entry
    journal = await journal_repo.create_entry(
        {
            "date": "2026-09-10",
            "meal_type": "dinner",
            "recipe_id": rec["id"],
            "schedule_entry_id": entry["id"],
            "status": "cooked",
            "servings_cooked": 4.0,
        }
    )
    assert journal["status"] == "cooked"
    assert journal["revision"] == 1
    assert journal["schedule_entry_id"] == entry["id"]
    assert journal["recipe"]["title"] == "Pasta"

    # 6. Duplicate journal entry for same schedule entry raises ConflictError
    with pytest.raises(ConflictError):
        await journal_repo.create_entry(
            {
                "date": "2026-09-10",
                "meal_type": "dinner",
                "schedule_entry_id": entry["id"],
                "status": "cooked",
            }
        )

    # 7. Update journal entry
    j2 = await journal_repo.update_entry(
        journal["id"], revision=1, data={"servings_left": 1.0}
    )
    assert j2["revision"] == 2
    assert j2["servings_left"] == 1.0

    # 8. List queries with date range
    sched_list = await sched_repo.list_entries(
        from_date="2026-09-01", to_date="2026-09-30"
    )
    assert len(sched_list) == 1
    assert sched_list[0]["id"] == entry["id"]

    journal_list = await journal_repo.list_entries(
        from_date="2026-09-01", to_date="2026-09-30"
    )
    assert len(journal_list) == 1
    assert journal_list[0]["id"] == journal["id"]

    # 9. Delete schedule and journal
    await journal_repo.delete_entry(journal["id"], revision=2)
    with pytest.raises(NotFoundError):
        await journal_repo.get_entry(journal["id"])

    await sched_repo.delete_entry(entry["id"], revision=2)
    with pytest.raises(NotFoundError):
        await sched_repo.get_entry(entry["id"])

    await db.close()


@pytest.mark.asyncio
async def test_schedule_recipe_deletion_sets_null(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    recipe_repo = RecipesRepo(db)
    sched_repo = ScheduleRepo(db, recipes_repo=recipe_repo)
    journal_repo = JournalRepo(db, recipes_repo=recipe_repo)

    rec = await recipe_repo.create_recipe({"title": "Curry", "language": "en"})
    entry = await sched_repo.create_entry(
        {
            "date": "2026-09-11",
            "meal_type": "lunch",
            "recipe_id": rec["id"],
        }
    )
    journal = await journal_repo.create_entry(
        {
            "date": "2026-09-11",
            "meal_type": "lunch",
            "recipe_id": rec["id"],
            "status": "cooked",
        }
    )

    # Delete recipe
    await recipe_repo.delete_recipe_row(rec["id"], revision=1)

    # Verify recipe_id became NULL in both schedule and journal
    entry_read = await sched_repo.get_entry(entry["id"])
    assert entry_read["recipe_id"] is None
    assert entry_read["recipe"] is None

    journal_read = await journal_repo.get_entry(journal["id"])
    assert journal_read["recipe_id"] is None
    assert journal_read["recipe"] is None

    await db.close()

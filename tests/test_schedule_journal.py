import pytest
from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.timeline import TimelineRepo


@pytest.mark.asyncio
async def test_timeline_entry_flow(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    recipe_repo = RecipesRepo(db)
    timeline_repo = TimelineRepo(db, recipes_repo=recipe_repo)

    # 1. Create recipe
    rec = await recipe_repo.create_recipe({"title": "Pasta", "language": "en"})

    # 2. Create planned timeline entry
    entry = await timeline_repo.create_entry(
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
    assert entry["status"] == "planned"
    assert entry["participant_member_ids"] == ["m1", "m2"]
    assert entry["recipe"]["title"] == "Pasta"

    # 3. Update timeline entry (mark cooked and add note)
    updated_entry = await timeline_repo.update_entry(
        entry["id"],
        revision=1,
        data={"note": "Extra cheese", "status": "cooked", "servings_override": 3.0},
    )
    assert updated_entry["revision"] == 2
    assert updated_entry["note"] == "Extra cheese"
    assert updated_entry["status"] == "cooked"
    assert updated_entry["servings_override"] == 3.0

    # 4. Revision conflict
    with pytest.raises(ConflictError):
        await timeline_repo.update_entry(
            entry["id"], revision=1, data={"note": "Conflict"}
        )

    # 5. List queries with date range
    tl_list = await timeline_repo.list_entries(
        from_date="2026-09-01", to_date="2026-09-30"
    )
    assert len(tl_list) == 1
    assert tl_list[0]["id"] == entry["id"]

    # 6. Delete timeline entry
    await timeline_repo.delete_entry(entry["id"], revision=2)
    with pytest.raises(NotFoundError):
        await timeline_repo.get_entry(entry["id"])

    await db.close()


@pytest.mark.asyncio
async def test_timeline_recipe_deletion_sets_null(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    recipe_repo = RecipesRepo(db)
    timeline_repo = TimelineRepo(db, recipes_repo=recipe_repo)

    rec = await recipe_repo.create_recipe({"title": "Curry", "language": "en"})
    entry = await timeline_repo.create_entry(
        {
            "date": "2026-09-11",
            "meal_type": "lunch",
            "recipe_id": rec["id"],
            "status": "cooked",
        }
    )

    # Delete recipe
    await recipe_repo.delete_recipe_row(rec["id"], revision=1)

    # Verify recipe_id became NULL in timeline entry
    entry_read = await timeline_repo.get_entry(entry["id"])
    assert entry_read["recipe_id"] is None
    assert entry_read["recipe"] is None

    await db.close()


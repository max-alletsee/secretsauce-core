import pytest
from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.recipes import RecipesRepo


@pytest.mark.asyncio
async def test_recipe_trigram_search_and_group_languages(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = RecipesRepo(db)

    # Create English row
    r_en = await repo.create_recipe(
        {
            "title": "Potato Salad",
            "language": "en",
            "ingredients": [
                {
                    "id": "i1",
                    "raw_text": "2 potatoes",
                    "name": "Potatoes",
                    "quantity": 2.0,
                    "unit": "pcs",
                    "notes": "",
                }
            ],
            "steps": [
                {"id": "s1", "instruction": "Boil potatoes.", "timer_minutes": 20}
            ],
        }
    )
    group_id = r_en["group_id"]
    assert r_en["language"] == "en"
    assert r_en["id"] == f"{group_id}_en"
    assert r_en["languages"] == ["en"]

    # Add German row to same group
    r_de = await repo.create_recipe(
        {
            "group_id": group_id,
            "title": "Kartoffelsalat",
            "language": "de",
            "ingredients": [
                {
                    "id": "i1",
                    "raw_text": "2 Kartoffeln",
                    "name": "Kartoffeln",
                    "quantity": 2.0,
                    "unit": "Stück",
                    "notes": "",
                }
            ],
            "steps": [
                {
                    "id": "s1",
                    "instruction": "Kartoffeln kochen.",
                    "timer_minutes": 20,
                }
            ],
        }
    )
    assert r_de["id"] == f"{group_id}_de"
    assert set(r_de["languages"]) == {"en", "de"}

    # Trigram FTS5 search inside word "salat"
    search_res = await repo.list_recipes(lang="de", q="salat")
    assert search_res["total"] == 1
    assert search_res["items"][0]["title"] == "Kartoffelsalat"

    # Fallback LIKE search for q < 3 chars
    short_res = await repo.list_recipes(lang="de", q="Ka")
    assert short_res["total"] == 1
    assert short_res["items"][0]["title"] == "Kartoffelsalat"

    await db.close()


@pytest.mark.asyncio
async def test_recipe_get_and_fallback(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = RecipesRepo(db)

    r_en = await repo.create_recipe({"title": "Apple Pie", "language": "en"})
    group_id = r_en["group_id"]
    await repo.create_recipe(
        {"group_id": group_id, "title": "Apfelkuchen", "language": "de"}
    )

    # Get by specific row id
    row = await repo.get_recipe(f"{group_id}_de")
    assert row["title"] == "Apfelkuchen"
    assert set(row["languages"]) == {"en", "de"}

    # Get by group_id with requested language "de"
    by_grp_de = await repo.get_recipe(group_id, lang="de")
    assert by_grp_de["title"] == "Apfelkuchen"

    # Get by group_id with requested language "fr" (should fall back to primary "en")
    by_grp_fr = await repo.get_recipe(group_id, lang="fr")
    assert by_grp_fr["title"] == "Apple Pie"

    await db.close()


@pytest.mark.asyncio
async def test_recipe_update_and_conflict(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = RecipesRepo(db)

    r = await repo.create_recipe({"title": "Soup", "language": "en"})
    assert r["revision"] == 1

    r2 = await repo.update_recipe(r["id"], revision=1, data={"title": "Hot Soup"})
    assert r2["revision"] == 2
    assert r2["title"] == "Hot Soup"

    with pytest.raises(ConflictError):
        await repo.update_recipe(r["id"], revision=1, data={"title": "Cold Soup"})

    await db.close()


@pytest.mark.asyncio
async def test_recipe_delete_repoints_references(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = RecipesRepo(db)

    r_en = await repo.create_recipe({"title": "Pancakes", "language": "en"})
    group_id = r_en["group_id"]
    r_de = await repo.create_recipe(
        {"group_id": group_id, "title": "Pfannkuchen", "language": "de"}
    )

    # Create timeline entry referencing r_de
    async with db.transaction() as conn:
        await conn.execute(
            """
            INSERT INTO timeline_entries (
                id, revision, date, meal_type, entry_type,
                recipe_id, created_at, updated_at, origin
            ) VALUES (?, 1, '2026-09-10', 'breakfast', 'recipe', ?, '2026-09-09T12:00:00Z', '2026-09-09T12:00:00Z', 'member');
            """,
            ("tl-pancakes", r_de["id"]),
        )

    # Delete r_de row
    await repo.delete_recipe_row(r_de["id"], revision=1)

    # Verify timeline entry re-pointed to r_en
    row = await db.read_one(
        "SELECT recipe_id FROM timeline_entries WHERE id = 'tl-pancakes';"
    )
    assert row["recipe_id"] == r_en["id"]

    # Now delete the last remaining row (r_en)
    await repo.delete_recipe_row(r_en["id"], revision=1)

    # Verify timeline entry was set to NULL by foreign key
    row2 = await db.read_one(
        "SELECT recipe_id FROM timeline_entries WHERE id = 'tl-pancakes';"
    )
    assert row2["recipe_id"] is None

    await db.close()

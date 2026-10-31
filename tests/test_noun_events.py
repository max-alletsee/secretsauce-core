import json

import pytest

from secretsauce.db import Database
from secretsauce.errors import ValidationError, VetoError
from secretsauce.events import EventLog, acting_as
from secretsauce.hooks import HookRegistry
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.members import MembersRepo
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.timeline import TimelineRepo


class Repos:
    def __init__(self, db: Database, uploads_dir):
        self.db = db
        self.events = EventLog(db)
        self.hooks = HookRegistry()
        self.household = HouseholdRepo(db)
        self.recipes = RecipesRepo(
            db, household_repo=self.household, hooks=self.hooks, events=self.events
        )
        self.timeline = TimelineRepo(db, recipes_repo=self.recipes, events=self.events)
        self.members = MembersRepo(db, events=self.events)
        self.assets = AssetsRepo(db, uploads_dir=uploads_dir, events=self.events)

    async def events_named(self, name: str) -> list[dict]:
        rows = await self.db.read_all(
            "SELECT * FROM events WHERE name = ? ORDER BY seq;", (name,)
        )
        for r in rows:
            r["data"] = json.loads(r["data"])
        return rows


@pytest.fixture
async def repos(tmp_path):
    db = Database(tmp_path / "nouns.db")
    await db.connect()
    await db.run_migrations()
    yield Repos(db, tmp_path / "uploads")
    await db.close()


async def test_recipe_create_update_delete_emit_events(repos):
    created = await repos.recipes.create_recipe(
        {"title": "Soup", "language": "en", "actor_member_id": "m1"}
    )
    updated = await repos.recipes.update_recipe(created["id"], 1, {"title": "Stew"})
    await repos.recipes.delete_recipe_group(created["group_id"])

    [c] = await repos.events_named("recipe:created")
    assert c["entity_type"] == "recipe"
    assert c["entity_id"] == created["id"]
    assert c["revision"] == 1
    assert c["actor_member_id"] == "m1"
    assert c["origin"] == "member"
    assert c["data"]["after"]["title"] == "Soup"
    assert c["data"]["after"]["group_id"] == created["group_id"]

    [u] = await repos.events_named("recipe:updated")
    assert u["revision"] == updated["revision"] == 2
    assert u["data"]["before"]["title"] == "Soup"
    assert u["data"]["after"]["title"] == "Stew"

    [d] = await repos.events_named("recipe:deleted")
    assert d["entity_id"] == created["id"]
    assert d["data"]["before"]["title"] == "Stew"


async def test_deleting_one_language_row_emits_one_deleted_event(repos):
    en = await repos.recipes.create_recipe({"title": "Soup", "language": "en"})
    await repos.recipes.create_recipe(
        {"title": "Suppe", "language": "de", "group_id": en["group_id"]}
    )
    await repos.recipes.delete_recipe_row(en["id"], revision=1)

    deleted = await repos.events_named("recipe:deleted")
    assert [d["entity_id"] for d in deleted] == [en["id"]]


async def test_vetoed_create_writes_neither_row_nor_event(repos):
    async def veto(draft, current=None, ctx=None):
        raise VetoError("Contains peanuts", plugin_id="allergy")

    repos.hooks.register("recipe:create", "allergy", veto)
    with pytest.raises(VetoError):
        await repos.recipes.create_recipe({"title": "PB&J", "language": "en"})

    assert await repos.db.read_val("SELECT COUNT(*) FROM recipes;") == 0
    assert await repos.events_named("recipe:created") == []


async def test_hook_writes_join_the_recipe_transaction(repos):
    async def tagging_hook(draft, current=None, ctx=None):
        await repos.db.write(
            "INSERT INTO household_config (key, value, updated_at) VALUES ('hook_ran', 'yes', 'now');"
        )
        return draft

    repos.hooks.register("recipe:update", "tagger", tagging_hook)
    created = await repos.recipes.create_recipe({"title": "Soup", "language": "en"})
    await repos.recipes.update_recipe(created["id"], 1, {"title": "Stew"})
    assert await repos.db.read_val(
        "SELECT value FROM household_config WHERE key = 'hook_ran';"
    ) == "yes"


async def test_update_origin_is_per_write_not_inherited(repos):
    created = await repos.recipes.create_recipe(
        {"title": "Soup", "language": "en", "origin": "plugin:core-translator"}
    )
    updated = await repos.recipes.update_recipe(created["id"], 1, {"title": "Stew"})
    assert updated["origin"] == "member"


async def test_writes_inside_plugin_context_default_to_plugin_origin(repos):
    with acting_as("plugin:core-recurring"):
        entry = await repos.timeline.create_entry(
            {"date": "2026-09-24", "meal_type": "dinner"}
        )
    assert entry["origin"] == "plugin:core-recurring"
    [e] = await repos.events_named("timeline:created")
    assert e["origin"] == "plugin:core-recurring"


async def test_timeline_member_asset_events(repos):
    await repos.members.create_member({"name": "Survivor"})
    member = await repos.members.create_member({"name": "Ann"})
    await repos.members.update_member(member["id"], 1, {"name": "Anna"})

    entry = await repos.timeline.create_entry({"date": "2026-09-24", "meal_type": "dinner"})
    await repos.timeline.update_entry(entry["id"], 1, {"note": "early", "status": "cooked"})
    await repos.timeline.delete_entry(entry["id"], revision=2)

    asset = await repos.assets.save_asset(
        "member", member["id"], "a.png", "image/png", b"\x89PNG\r\n\x1a\n" + b"0" * 16
    )
    await repos.assets.delete_asset(asset["id"])
    await repos.members.delete_member(member["id"], revision=2)

    names = [
        r["name"]
        for r in await repos.db.read_all("SELECT name FROM events ORDER BY seq;")
    ]
    assert names == [
        "member:created",  # survivor
        "member:created",
        "member:updated",
        "timeline:created",
        "timeline:updated",
        "timeline:deleted",
        "asset:created",
        "asset:deleted",
        "member:deleted",
    ]
    [tl_update] = await repos.events_named("timeline:updated")
    assert tl_update["entity_type"] == "timeline_entry"
    assert tl_update["data"]["after"]["note"] == "early"
    assert tl_update["data"]["after"]["status"] == "cooked"
    assert "recipe" not in tl_update["data"]["after"]


async def test_missing_required_fields_raise_validation_errors(repos):
    with pytest.raises(ValidationError):
        await repos.recipes.create_recipe({"title": "No language"})
    with pytest.raises(ValidationError):
        await repos.timeline.create_entry({"meal_type": "dinner"})
    with pytest.raises(ValidationError):
        await repos.timeline.create_entry({"date": "2026-09-24"})
    with pytest.raises(ValidationError):
        await repos.members.create_member({})

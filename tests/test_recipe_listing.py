import pytest

from secretsauce.db import Database
from secretsauce.errors import ValidationError
from secretsauce.nouns.attributes import AttributesRepo
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.recipes import RecipesRepo


@pytest.fixture
async def repos(tmp_path):
    db = Database(tmp_path / "list.db")
    await db.connect()
    await db.run_migrations()
    household = HouseholdRepo(db)
    await household.update_config({"languages": {"primary": "en"}})
    yield db, RecipesRepo(db, household_repo=household), AttributesRepo(db)
    await db.close()


async def _recipe(repo, title, lang="en", group_id=None, tags=()):
    data = {"title": title, "language": lang, "tags": list(tags)}
    if group_id:
        data["group_id"] = group_id
    return await repo.create_recipe(data)


async def test_attr_filters_and_attribute_sort(repos):
    db, repo, attrs = repos
    a = await _recipe(repo, "Apple pie")
    b = await _recipe(repo, "Banana bread")
    c = await _recipe(repo, "Cherry tart")
    for rec, score in ((a, 3), (b, 5), (c, 1)):
        await attrs.set_attribute("core-ratings", "recipe", rec["group_id"], "score", score)

    res = await repo.list_recipes(attrs=["core-ratings.score>=3"])
    assert [r["title"] for r in res["items"]] == ["Apple pie", "Banana bread"]
    assert res["total"] == 2

    res = await repo.list_recipes(sort="-core-ratings.score")
    assert [r["title"] for r in res["items"]] == ["Banana bread", "Apple pie", "Cherry tart"]

    with pytest.raises(ValidationError):
        await repo.list_recipes(attrs=["not a filter"])


async def test_sort_and_page_use_the_resolved_language_row(repos):
    db, repo, _ = repos
    first = await _recipe(repo, "Zucchini soup")
    await _recipe(repo, "Apfelkuchen", lang="de", group_id=first["group_id"])
    await _recipe(repo, "Mushroom risotto")
    await _recipe(repo, "banana bread")

    en = await repo.list_recipes(sort="title")
    assert [r["title"] for r in en["items"]] == ["banana bread", "Mushroom risotto", "Zucchini soup"]

    de = await repo.list_recipes(lang="de", sort="-title")
    assert [r["title"] for r in de["items"]] == ["Mushroom risotto", "banana bread", "Apfelkuchen"]
    assert de["items"][2]["languages"] == ["en", "de"]

    page = await repo.list_recipes(sort="title", limit=2, offset=2)
    assert page["total"] == 3 and [r["title"] for r in page["items"]] == ["Zucchini soup"]


async def test_tags_filter_the_resolved_row(repos):
    db, repo, _ = repos
    soup = await _recipe(repo, "Soup", tags=["vegan"])
    await _recipe(repo, "Suppe", lang="de", group_id=soup["group_id"], tags=[])
    assert (await repo.list_recipes(tags=["vegan"]))["total"] == 1
    assert (await repo.list_recipes(lang="de", tags=["vegan"]))["total"] == 0


async def test_listing_takes_a_constant_number_of_queries(repos):
    db, repo, _ = repos
    for i in range(30):
        await _recipe(repo, f"Recipe {i:02d}", tags=["weeknight"])

    calls = 0
    original = db._fetch

    async def counting(*args, **kwargs):
        nonlocal calls
        calls += 1
        return await original(*args, **kwargs)

    db._fetch = counting
    res = await repo.list_recipes(tags=["weeknight"], limit=50)
    assert res["total"] == 30
    assert calls <= 3

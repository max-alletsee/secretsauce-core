from datetime import date, timedelta

from secretsauce.testing import make_kernel


async def test_units_hook_follows_the_household_unit_system(tmp_path):
    async with make_kernel(tmp_path) as k:
        await k.client.patch("/api/household", json={"units": "us_customary"})
        res = await k.client.post(
            "/api/recipes",
            json={"title": "Cake", "language": "en", "ingredients": ["500 g flour"]},
        )
        ingredient = res.json()["ingredients"][0]
        assert ingredient["unit"] not in ("g", "kg")


async def test_units_reconvert_covers_every_language_row(tmp_path):
    async with make_kernel(tmp_path) as k:
        en = (await k.client.post(
            "/api/recipes", json={"title": "Cake", "language": "en", "ingredients": ["1 cup milk"]}
        )).json()
        de = (await k.client.post(
            "/api/recipes",
            json={"title": "Kuchen", "language": "de", "group_id": en["group_id"], "ingredients": ["1 cup Milch"]},
        )).json()
        job_id = await k.jobs.create_job("core-units", "reconvert-all", {"system": "metric"})
        result = await k.jobs.run_job(job_id)
        assert result["result"]["updated"] == 2
        for row_id in (en["id"], de["id"]):
            assert (await k.recipes.get_recipe(row_id))["revision"] == 2


async def test_recurring_rules_are_validated_and_materializing_is_idempotent(tmp_path):
    async with make_kernel(tmp_path) as k:
        bad = await k.client.post(
            "/api/x/core-recurring/rules", json={"weekday": 9, "meal_type": "dinner", "recipe_id": "x"}
        )
        assert bad.status_code == 422
        missing = await k.client.post(
            "/api/x/core-recurring/rules", json={"weekday": 1, "meal_type": "dinner", "recipe_id": "nope_en"}
        )
        assert missing.status_code == 404

        recipe = (await k.client.post("/api/recipes", json={"title": "Pie", "language": "en"})).json()
        await k.client.post(
            "/api/x/core-recurring/rules",
            json={"weekday": date.today().weekday(), "meal_type": "dinner", "recipe_id": recipe["id"]},
        )
        first = (await k.client.post("/api/x/core-recurring/materialize")).json()
        second = (await k.client.post("/api/x/core-recurring/materialize")).json()
        assert first["created"] == 2 and second["created"] == 0
        entries = await k.schedule.list_entries(
            from_date=date.today().isoformat(), to_date=(date.today() + timedelta(days=13)).isoformat()
        )
        assert all(e["origin"] == "plugin:core-recurring" for e in entries)


async def test_shortlist_ignores_unknown_actor_headers(tmp_path):
    async with make_kernel(tmp_path) as k:
        recipe = (await k.client.post("/api/recipes", json={"title": "Pie", "language": "en"})).json()
        res = await k.client.post(
            "/api/x/core-shortlist", json={"recipe_id": recipe["id"]}, headers={"x-actor-member": "ghost"}
        )
        assert res.status_code == 422

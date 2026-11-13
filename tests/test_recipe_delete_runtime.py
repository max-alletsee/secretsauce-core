"""Outside-in production-path tests for Recipe Deletion."""

from contextlib import asynccontextmanager

import httpx
import pytest

from secretsauce.app import build_app
from secretsauce.config import Config


@asynccontextmanager
async def runtime(tmp_path):
    app = build_app(data_dir=tmp_path, config=Config(cookie_secure="false"))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://testserver",
        ) as client:
            setup = await client.post(
                "/api/setup",
                json={
                    "household_name": "Delete Test Home",
                    "passphrase": "long enough",
                    "first_member": {"name": "Ann"},
                },
            )
            assert setup.status_code == 201
            member_id = setup.json()["first_member"]["id"]
            yield app.state.kernel, client, member_id


@pytest.mark.asyncio
async def test_delete_missing_recipe_group_returns_404(tmp_path):
    async with runtime(tmp_path) as (_, client, _member_id):
        res = await client.delete("/api/recipes/nonexistent-group-id")
        assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_recipe_group_snapshots_timeline_titles_and_cascades(tmp_path):
    async with runtime(tmp_path) as (kernel, client, member_id):
        # 1. Create a multi-language recipe (en + de)
        en_res = await client.post(
            "/api/recipes",
            json={
                "title": "Vegetable Curry",
                "language": "en",
                "ingredients": [{"name": "Onion", "quantity": 1, "unit": "pcs"}],
                "steps": [{"instruction": "Cook curry"}],
            },
        )
        assert en_res.status_code == 201
        en_rec = en_res.json()
        group_id = en_rec["group_id"]

        de_res = await client.post(
            "/api/recipes",
            json={
                "group_id": group_id,
                "language": "de",
                "title": "Gemüsecurry",
                "ingredients": [{"name": "Zwiebel", "quantity": 1, "unit": "Stück"}],
                "steps": [{"instruction": "Curry kochen"}],
            },
        )
        assert de_res.status_code == 201
        de_rec = de_res.json()

        # 2. Add to shortlist and recurring rules
        sl_res = await client.post(
            "/api/x/core-shortlist",
            json={"recipe_id": en_rec["id"], "member_id": member_id},
        )
        assert sl_res.status_code == 201

        rec_res = await client.post(
            "/api/x/core-recurring/rules",
            json={
                "recipe_id": en_rec["id"],
                "meal_type": "dinner",
                "weekday": 0,
            },
        )
        assert rec_res.status_code in (200, 201)

        # 3. Create Timeline Entries:
        #    a) without a custom title (should snapshot the linked translation's title)
        #    b) with an explicit custom title (should preserve the custom title)
        tl_plain = await client.post(
            "/api/timeline",
            json={
                "date": "2026-10-01",
                "meal_type": "dinner",
                "entry_type": "recipe",
                "recipe_id": de_rec["id"],
            },
        )
        assert tl_plain.status_code == 201
        tl_plain_id = tl_plain.json()["id"]

        tl_custom = await client.post(
            "/api/timeline",
            json={
                "date": "2026-10-02",
                "meal_type": "dinner",
                "entry_type": "recipe",
                "recipe_id": en_rec["id"],
                "title": "Birthday Curry Night",
            },
        )
        assert tl_custom.status_code == 201
        tl_custom_id = tl_custom.json()["id"]

        # 4. Delete the whole recipe group
        del_res = await client.delete(f"/api/recipes/{group_id}")
        assert del_res.status_code == 204

        # 5. Recipe group and all translations are gone
        assert (await client.get(f"/api/recipes/{group_id}")).status_code == 404
        assert (await client.get(f"/api/recipes/{en_rec['id']}")).status_code == 404
        assert (await client.get(f"/api/recipes/{de_rec['id']}")).status_code == 404
        assert (await client.get("/api/recipes")).json()["total"] == 0

        # 6. Shortlist and recurring rules are cascaded
        assert (await client.get("/api/x/core-shortlist")).json() == []
        rules_res = await client.get("/api/x/core-recurring/rules")
        assert rules_res.status_code == 200
        assert rules_res.json() == []

        # 7. Timeline Entries remain, unlinked, with empty title snapshotted and custom title kept
        tl_plain_after = (await client.get(f"/api/timeline/{tl_plain_id}")).json()
        assert tl_plain_after["recipe_id"] is None
        assert tl_plain_after["recipe"] is None
        assert tl_plain_after["title"] == "Gemüsecurry"

        tl_custom_after = (await client.get(f"/api/timeline/{tl_custom_id}")).json()
        assert tl_custom_after["recipe_id"] is None
        assert tl_custom_after["recipe"] is None
        assert tl_custom_after["title"] == "Birthday Curry Night"

        # 8. recipe:deleted events were emitted for every deleted translation row
        deleted_events = await kernel.db.read_all(
            "SELECT entity_id FROM events WHERE name = 'recipe:deleted' ORDER BY seq ASC;"
        )
        assert {row["entity_id"] for row in deleted_events} == {en_rec["id"], de_rec["id"]}

from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from secretsauce.testing import make_kernel


MOCK_PLAN_OUTPUT = {
    "title": "3-Day Healthy Dinners",
    "suggestions": [
        {
            "recipe_id": "placeholder_rec_1",
            "recipe_title": "Tofu Stir-fry",
            "meal_type": "dinner",
            "suggested_date": None,  # unassigned pool
            "reasoning": "High protein, quick weeknight meal",
            "confidence": 0.95,
        },
        {
            "recipe_id": "placeholder_rec_2",
            "recipe_title": "Lentil Soup",
            "meal_type": "dinner",
            "suggested_date": None,  # unassigned pool
            "reasoning": "Nutritious and comforting",
            "confidence": 0.88,
        },
    ],
}


@pytest.mark.asyncio
async def test_meal_planner_discovery_and_schema(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-meal-planner-ai")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-meal-planner-ai"
        assert "core-ai-provider" in p.get("requires", [])

        table = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_meal_planner_plans'"
        )
        assert table is not None

        table_sug = await k.db.fetch_one(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='plugin_core_meal_planner_suggestions'"
        )
        assert table_sug is not None


@pytest.mark.asyncio
async def test_generate_meal_plan_candidate_pool_and_accept(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        # 1. Create a recipe
        rec_res = await k.client.post(
            "/api/recipes",
            json={
                "title": "Tofu Stir-fry",
                "language": "en",
                "ingredients": [{"name": "firm tofu", "quantity": 400, "unit": "g"}],
                "steps": [{"instruction": "Stir fry in wok"}],
            },
        )
        assert rec_res.status_code == 201
        rec = rec_res.json()

        mock_data = {
            "title": "3-Day Healthy Dinners",
            "suggestions": [
                {
                    "recipe_id": rec["id"],
                    "recipe_title": "Tofu Stir-fry",
                    "meal_type": "dinner",
                    "suggested_date": None,
                    "reasoning": "High protein, quick weeknight meal",
                    "confidence": 0.95,
                }
            ],
        }

        # 2. Call generate
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = mock_data

            res = await k.client.post(
                "/api/x/core-meal-planner-ai/generate",
                json={"days": 3, "prompt": "Vegetarian high-protein"},
            )
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["title"] == "3-Day Healthy Dinners"
            assert len(data["suggestions"]) == 1
            sug = data["suggestions"][0]
            assert sug["status"] == "suggested"
            assert sug["suggested_date"] is None  # Unassigned candidate pool!
            sug_id = sug["id"]

        # 3. Accept suggestion with date
        acc_res = await k.client.post(
            f"/api/x/core-meal-planner-ai/suggestions/{sug_id}/accept",
            json={"date": "2026-09-21", "meal_type": "dinner"},
        )
        assert acc_res.status_code == 200, acc_res.text
        acc_data = acc_res.json()
        assert acc_data["status"] == "accepted"
        assert acc_data.get("schedule_entry_id") is not None

        # Verify entry exists in schedule
        sched_entries = await k.schedule.list_entries(from_date="2026-09-21", to_date="2026-09-21")
        assert len(sched_entries) == 1
        assert sched_entries[0]["recipe_id"] == rec["id"]

        # 4. Dismiss another suggestion test
        # Create plan with 2nd suggestion
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = mock_data
            res2 = await k.client.post(
                "/api/x/core-meal-planner-ai/generate",
                json={"days": 1},
            )
            sug2_id = res2.json()["suggestions"][0]["id"]

        dis_res = await k.client.post(f"/api/x/core-meal-planner-ai/suggestions/{sug2_id}/dismiss")
        assert dis_res.status_code == 200
        assert dis_res.json()["status"] == "dismissed"

        # 5. Verify GET /plans and GET /plans/{plan_id}
        plans_res = await k.client.get("/api/x/core-meal-planner-ai/plans")
        assert plans_res.status_code == 200
        assert len(plans_res.json()) >= 1

        get_res = await k.client.get(f"/api/x/core-meal-planner-ai/plans/{data['id']}")
        assert get_res.status_code == 200
        assert len(get_res.json()["suggestions"]) == 1

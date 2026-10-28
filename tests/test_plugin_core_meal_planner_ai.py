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


async def _plan_with(k, suggestions):
    ai_svc = k.services.get("core-ai-provider")
    with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
        mock_complete.return_value = {"title": "Plan", "suggestions": suggestions}
        res = await k.client.post("/api/x/core-meal-planner-ai/generate", json={"days": 1})
    assert res.status_code == 200, res.text
    return res.json()


@pytest.mark.asyncio
async def test_accept_is_atomic_and_only_once(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        rec = (await k.client.post("/api/recipes", json={"title": "Dal", "language": "en"})).json()
        plan = await _plan_with(
            k,
            [
                {"recipe_id": rec["id"], "recipe_title": "Dal"},
                {"recipe_id": "invented_en", "recipe_title": "Hallucinated"},
            ],
        )
        assert [s["recipe_id"] for s in plan["suggestions"]] == [rec["id"]]
        sug_id = plan["suggestions"][0]["id"]
        url = f"/api/x/core-meal-planner-ai/suggestions/{sug_id}/accept"

        # A failing schedule write leaves the suggestion untouched.
        bad = await k.client.post(url, json={"date": "2026-09-21", "meal_type": ""})
        assert bad.status_code == 422
        row = await k.db.fetch_one(
            "SELECT status FROM plugin_core_meal_planner_suggestions WHERE id = ?", (sug_id,)
        )
        assert row["status"] == "suggested"

        assert (await k.client.post(url, json={"date": "2026-09-21"})).status_code == 200
        again = await k.client.post(url, json={"date": "2026-09-22"})
        assert again.status_code == 409
        entries = await k.schedule.list_entries(from_date="2026-09-21", to_date="2026-09-22")
        assert len(entries) == 1


@pytest.mark.asyncio
async def test_meal_planner_generate_model_key_resolves_through_ai_provider(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        cfg_res = await k.client.get("/api/plugins/core-meal-planner-ai/config")
        assert cfg_res.status_code == 200
        assert cfg_res.json() == {"generate_model_key": "default"}

        rec = (await k.client.post("/api/recipes", json={"title": "Dal", "language": "en"})).json()
        assert (
            await k.client.put(
                "/api/x/core-ai-provider/settings",
                json={
                    "provider": "openai",
                    "openai_api_key": "sk-test",
                    "models": {"default": "gpt-4o-mini", "fast": "gpt-4o-nano"},
                },
            )
        ).status_code == 200
        assert (
            await k.client.put(
                "/api/plugins/core-meal-planner-ai/config",
                json={"generate_model_key": "fast"},
            )
        ).status_code == 200

        ai_svc = k.services.get("core-ai-provider")
        seen_models: list[str] = []

        async def fake_outbound(base_url, api_key, model, schema, prompt, images=None):
            seen_models.append(model)
            return {
                "title": "Fast Plan",
                "suggestions": [{"recipe_id": rec["id"], "recipe_title": "Dal"}],
            }, 20, 10

        with patch.object(ai_svc, "_complete_openai_compatible", side_effect=fake_outbound):
            res = await k.client.post("/api/x/core-meal-planner-ai/generate", json={"days": 2})
            assert res.status_code == 200

        assert seen_models == ["gpt-4o-nano"]


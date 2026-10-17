from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_magic_discovery(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-recipe-magic")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-recipe-magic"
        assert "core-ai-provider" in p.get("requires", [])

@pytest.mark.asyncio
async def test_get_default_actions(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        resp = await k.client.get("/api/x/core-recipe-magic/actions")
        assert resp.status_code == 200
        actions = resp.json()
        assert len(actions) >= 5
        ids = [a["id"] for a in actions]
        assert "vegetarian" in ids
        assert "ten-ingredients" in ids
        assert "fast" in ids
        assert "pantry-friendly" in ids
        assert "easy-prep" in ids

@pytest.mark.asyncio
async def test_update_and_reset_actions(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        custom_actions = [
            {"id": "spicy", "title": "Make it spicy", "description": "Add heat", "prompt": "Make it hot"}
        ]
        put_resp = await k.client.put("/api/x/core-recipe-magic/actions", json=custom_actions)
        assert put_resp.status_code == 200
        assert put_resp.json() == custom_actions

        get_resp = await k.client.get("/api/x/core-recipe-magic/actions")
        assert get_resp.json() == custom_actions

        reset_resp = await k.client.post("/api/x/core-recipe-magic/actions/reset")
        assert reset_resp.status_code == 200
        assert len(reset_resp.json()) >= 5
        ids = [a["id"] for a in reset_resp.json()]
        assert "vegetarian" in ids

MOCK_ADAPTED_RECIPE = {
    "title": "Vegetarian Shepherd's Pie",
    "description": "Hearty mushroom and lentil pie",
    "servings": 4,
    "prep_time_minutes": 20,
    "cook_time_minutes": 35,
    "tags": ["vegetarian", "comfort-food"],
    "ingredients": [
        {"name": "brown lentils", "quantity": 250, "unit": "g", "notes": "rinsed"},
        {"name": "cremini mushrooms", "quantity": 300, "unit": "g", "notes": "diced"},
        {"name": "potatoes", "quantity": 800, "unit": "g", "notes": "mashed"},
    ],
    "steps": [
        {"instruction": "Boil potatoes and mash with butter.", "timer_minutes": 15},
        {"instruction": "Sauté mushrooms and simmer with lentils.", "timer_minutes": 20},
    ],
    "adaptation_summary": "Replaced ground lamb with lentils and cremini mushrooms for deep umami.",
}

@pytest.mark.asyncio
async def test_adapt_recipe_success(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = dict(MOCK_ADAPTED_RECIPE)

            payload = {
                "action_id": "vegetarian",
                "recipe": {
                    "title": "Classic Shepherd's Pie",
                    "description": "Traditional lamb pie",
                    "servings": 4,
                    "prep_time_minutes": 25,
                    "cook_time_minutes": 50,
                    "tags": ["meat", "dinner"],
                    "ingredients": [
                        {"name": "ground lamb", "quantity": 500, "unit": "g"},
                        {"name": "potatoes", "quantity": 800, "unit": "g"},
                    ],
                    "steps": [
                        {"instruction": "Brown lamb in skillet."},
                        {"instruction": "Top with mashed potatoes and bake."},
                    ],
                },
            }
            res = await k.client.post("/api/x/core-recipe-magic/adapt", json=payload)
            assert res.status_code == 200, res.text
            adapted = res.json()
            assert adapted["title"] == "Vegetarian Shepherd's Pie"
            assert adapted["adaptation_summary"].startswith("Replaced ground lamb")
            assert len(adapted["ingredients"]) == 3
            assert mock_complete.called
            call_kwargs = mock_complete.call_args.kwargs
            assert call_kwargs["calling_plugin"] == "core-recipe-magic"
            assert "vegetarian" in call_kwargs["prompt"].lower()

@pytest.mark.asyncio
async def test_adapt_recipe_with_custom_prompt(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = dict(MOCK_ADAPTED_RECIPE)

            payload = {
                "action_id": "custom",
                "custom_prompt": "Make it strictly nut-free and dairy-free.",
                "recipe": {
                    "title": "Pesto Pasta",
                    "ingredients": [{"name": "pine nuts", "quantity": 50, "unit": "g"}],
                    "steps": [{"instruction": "Blend pesto ingredients."}],
                },
            }
            res = await k.client.post("/api/x/core-recipe-magic/adapt", json=payload)
            assert res.status_code == 200
            call_kwargs = mock_complete.call_args.kwargs
            assert "nut-free and dairy-free" in call_kwargs["prompt"]

@pytest.mark.asyncio
async def test_adapt_recipe_ai_unavailable(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        k.services.register("core-ai-provider", None)

        payload = {
            "action_id": "vegetarian",
            "recipe": {
                "title": "Salad",
                "ingredients": [{"name": "lettuce", "quantity": 1, "unit": "head"}],
                "steps": [{"instruction": "Toss."}],
            },
        }
        res = await k.client.post("/api/x/core-recipe-magic/adapt", json=payload)
        assert res.status_code == 503
        data = res.json()
        assert data["error"]["code"] == "unavailable"


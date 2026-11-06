from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_customize_recipe_discovery(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        p = await k.plugins.get_plugin("core-customize-recipe")
        assert p is not None
        assert p["state"] == "active"
        assert p["name"] == "core-customize-recipe"
        assert "core-ai-provider" in p.get("requires", [])
        assert "core-units?" in p.get("requires", [])
        # Old plugin should not exist
        old = await k.plugins.get_plugin("core-recipe-magic")
        assert old is None


@pytest.mark.asyncio
async def test_get_default_shorthand_actions(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        resp = await k.client.get("/api/x/core-customize-recipe/actions")
        assert resp.status_code == 200
        actions = resp.json()
        assert len(actions) == 8
        by_id = {a["id"]: a for a in actions}
        assert list(by_id.keys()) == [
            "metric",
            "imperial",
            "substitute",
            "vegetarian",
            "ten-ingredients",
            "fast",
            "pantry-friendly",
            "easy-prep",
        ]
        assert by_id["metric"]["title"] == "Convert to Metric"
        assert by_id["imperial"]["title"] == "Convert to Imperial"
        assert by_id["substitute"]["title"] == "Substitute ingredients"
        assert by_id["ten-ingredients"]["title"] == "Make it 10 ingredients or less"
        assert by_id["easy-prep"]["title"] == "Make it easier to prepare"


@pytest.mark.asyncio
async def test_update_and_reset_actions(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        custom_actions = [
            {"id": "spicy", "title": "Make it spicy", "description": "Add heat", "prompt": "Make it hot"}
        ]
        put_resp = await k.client.put("/api/x/core-customize-recipe/actions", json=custom_actions)
        assert put_resp.status_code == 200
        assert put_resp.json() == custom_actions

        get_resp = await k.client.get("/api/x/core-customize-recipe/actions")
        assert get_resp.json() == custom_actions

        reset_resp = await k.client.post("/api/x/core-customize-recipe/actions/reset")
        assert reset_resp.status_code == 200
        assert len(reset_resp.json()) == 8
        ids = [a["id"] for a in reset_resp.json()]
        assert "metric" in ids
        assert "imperial" in ids
        assert "substitute" in ids
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
async def test_customize_recipe_success_and_multi_turn_history(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = dict(MOCK_ADAPTED_RECIPE)

            payload = {
                "action_id": "vegetarian",
                "custom_prompt": "Swap the lamb for lentils and mushrooms",
                "messages": [
                    {"role": "user", "content": "Make it vegetarian"},
                    {"role": "assistant", "content": "Replaced lamb with lentils."},
                ],
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
            res = await k.client.post("/api/x/core-customize-recipe/customize", json=payload)
            assert res.status_code == 200, res.text
            adapted = res.json()
            assert adapted["title"] == "Vegetarian Shepherd's Pie"
            assert adapted["adaptation_summary"].startswith("Replaced ground lamb")
            assert len(adapted["ingredients"]) == 3
            assert mock_complete.called
            call_kwargs = mock_complete.call_args.kwargs
            assert call_kwargs["calling_plugin"] == "core-customize-recipe"
            assert "lentils and mushrooms" in call_kwargs["prompt"].lower()
            assert "make it vegetarian" in call_kwargs["prompt"].lower()


@pytest.mark.asyncio
async def test_unit_conversion_uses_core_units_when_active(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        units_svc = k.services.get("core-units")
        assert units_svc is not None
        ai_svc = k.services.get("core-ai-provider")

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = {
                "title": "Roast Chicken",
                "description": "Crispy roast",
                "servings": 4,
                "prep_time_minutes": 10,
                "cook_time_minutes": 60,
                "tags": [],
                "ingredients": [
                    {"name": "butter", "quantity": 999, "unit": "g"},  # AI guess should be overridden by core-units
                ],
                "steps": [
                    {"instruction": "Bake at 200°C for 60 minutes.", "timer_minutes": 60},
                ],
                "adaptation_summary": "Converted units and oven temperature to metric.",
            }

            payload = {
                "action_id": "metric",
                "recipe": {
                    "title": "Roast Chicken",
                    "description": "Crispy roast",
                    "servings": 4,
                    "prep_time_minutes": 10,
                    "cook_time_minutes": 60,
                    "tags": [],
                    "ingredients": [
                        {"name": "butter", "quantity": 4, "unit": "oz"},
                        {"name": "milk", "quantity": 1, "unit": "cup"},
                    ],
                    "steps": [
                        {"instruction": "Bake at 400°F for 60 minutes.", "timer_minutes": 60},
                    ],
                },
            }
            res = await k.client.post("/api/x/core-customize-recipe/customize", json=payload)
            assert res.status_code == 200, res.text
            data = res.json()
            # core-units converts 4 oz -> 115 g and 1 cup -> 240 ml deterministically
            assert data["ingredients"][0]["unit"] == "g"
            assert data["ingredients"][0]["quantity"] == 115
            assert data["ingredients"][1]["unit"] == "ml"
            assert data["ingredients"][1]["quantity"] == 240
            assert data["steps"][0]["instruction"] == "Bake at 200°C for 60 minutes."


@pytest.mark.asyncio
async def test_unit_conversion_bypass_route_when_core_units_inactive(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Disable core-units at runtime
        await k.loader.disable("core-units")
        assert k.services.get("core-units") is None

        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = {
                "title": "Pancakes",
                "description": "Fluffy pancakes",
                "servings": 2,
                "prep_time_minutes": 10,
                "cook_time_minutes": 10,
                "tags": [],
                "ingredients": [
                    {"name": "flour", "quantity": 120, "unit": "g"},
                    {"name": "milk", "quantity": 240, "unit": "ml"},
                ],
                "steps": [
                    {"instruction": "Whisk 120 g flour and 240 ml milk."},
                ],
                "adaptation_summary": "Converted imperial cups to metric grams and milliliters via AI.",
            }

            payload = {
                "action_id": "metric",
                "recipe": {
                    "title": "Pancakes",
                    "ingredients": [
                        {"name": "flour", "quantity": 1, "unit": "cup"},
                        {"name": "milk", "quantity": 1, "unit": "cup"},
                    ],
                    "steps": [
                        {"instruction": "Whisk 1 cup flour and 1 cup milk."},
                    ],
                },
            }
            res = await k.client.post("/api/x/core-customize-recipe/customize", json=payload)
            assert res.status_code == 200, res.text
            data = res.json()
            assert mock_complete.called
            assert data["ingredients"][0] == {
                "name": "flour",
                "quantity": 120,
                "unit": "g",
                "preserve_units": True,
            }
            assert data["adaptation_summary"].startswith("Converted imperial cups")


@pytest.mark.asyncio
async def test_saving_customized_recipe_preserves_custom_units(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        # Household default is metric
        hh = await k.household.get_config()
        assert hh.get("units", "metric") == "metric"

        # Create a base metric recipe
        created_resp = await k.client.post(
            "/api/recipes",
            json={
                "title": "Shortbread",
                "language": "en",
                "servings": 4,
                "ingredients": [{"name": "butter", "quantity": 225, "unit": "g"}],
                "steps": [{"instruction": "Bake at 180°C."}],
            },
        )
        assert created_resp.status_code == 201
        base_recipe = created_resp.json()
        assert base_recipe["ingredients"][0]["unit"] == "g"

        # Customize to imperial
        ai_svc = k.services.get("core-ai-provider")
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = {
                "title": "Shortbread",
                "description": "",
                "servings": 4,
                "prep_time_minutes": 10,
                "cook_time_minutes": 20,
                "tags": [],
                "ingredients": [{"name": "butter", "quantity": 8, "unit": "oz"}],
                "steps": [{"instruction": "Bake at 350°F."}],
                "adaptation_summary": "Converted to imperial.",
            }
            cust_resp = await k.client.post(
                "/api/x/core-customize-recipe/customize",
                json={"action_id": "imperial", "recipe": base_recipe},
            )
            assert cust_resp.status_code == 200
            customized = cust_resp.json()
            assert customized["ingredients"][0]["unit"] == "oz"

        # 1. Update existing recipe via customize save endpoint -> must preserve 'oz' even though household is metric
        save_update_resp = await k.client.post(
            "/api/x/core-customize-recipe/save",
            json={
                "recipe_id": base_recipe["id"],
                "revision": base_recipe["revision"],
                "recipe": {**customized, "language": "en"},
            },
        )
        assert save_update_resp.status_code == 200, save_update_resp.text
        updated = save_update_resp.json()
        assert updated["ingredients"][0]["unit"] == "oz"
        assert updated["ingredients"][0]["quantity"] == 7.8  # 225g -> 7.8oz via core-units

        # 2. Save as new recipe via customize save endpoint -> must also preserve 'oz'
        save_new_resp = await k.client.post(
            "/api/x/core-customize-recipe/save",
            json={
                "recipe": {**customized, "title": "Imperial Shortbread", "language": "en"},
            },
        )
        assert save_new_resp.status_code == 201, save_new_resp.text
        forked = save_new_resp.json()
        assert forked["ingredients"][0]["unit"] == "oz"

        # 3. Saving via standard PATCH /api/recipes/:id after Apply to Editor (with preserve_units flag) -> must also preserve 'oz'
        patch_resp = await k.client.patch(
            f"/api/recipes/{updated['id']}",
            json={
                "revision": updated["revision"],
                "title": "Shortbread Edited",
                "ingredients": customized["ingredients"],
            },
        )
        assert patch_resp.status_code == 200
        patched = patch_resp.json()
        assert patched["ingredients"][0]["unit"] == "oz"


@pytest.mark.asyncio
async def test_customize_recipe_ai_unavailable(tmp_path: Path):
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
        res = await k.client.post("/api/x/core-customize-recipe/customize", json=payload)
        assert res.status_code == 503
        data = res.json()
        assert data["error"]["code"] == "unavailable"


@pytest.mark.asyncio
async def test_customize_recipe_adapt_model_key_resolves_through_ai_provider(tmp_path: Path):
    async with make_kernel(tmp_path, auto_setup=True) as k:
        cfg_res = await k.client.get("/api/plugins/core-customize-recipe/config")
        assert cfg_res.status_code == 200
        assert cfg_res.json().get("adapt_model_key") == "default"

        assert (
            await k.client.put(
                "/api/x/core-ai-provider/settings",
                json={
                    "provider": "openai",
                    "openai_api_key": "sk-test",
                    "models": {"default": "gpt-4o-mini", "chef": "gpt-4o"},
                },
            )
        ).status_code == 200

        current_cfg = cfg_res.json()
        assert (
            await k.client.put(
                "/api/plugins/core-customize-recipe/config",
                json={**current_cfg, "adapt_model_key": "chef"},
            )
        ).status_code == 200

        ai_svc = k.services.get("core-ai-provider")
        seen_models: list[str] = []

        async def fake_outbound(base_url, api_key, model, schema, prompt, images=None):
            seen_models.append(model)
            return dict(MOCK_ADAPTED_RECIPE), 25, 15

        with patch.object(ai_svc, "_complete_openai_compatible", side_effect=fake_outbound):
            res = await k.client.post(
                "/api/x/core-customize-recipe/customize",
                json={
                    "action_id": "vegetarian",
                    "recipe": {
                        "title": "Shepherd's Pie",
                        "ingredients": [{"name": "lamb", "quantity": 500, "unit": "g"}],
                        "steps": [{"instruction": "Brown lamb."}],
                    },
                },
            )
            assert res.status_code == 200

        assert seen_models == ["gpt-4o"]

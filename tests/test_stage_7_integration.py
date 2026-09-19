from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from secretsauce.testing import make_kernel


MOCK_IMPORT_RECIPE = {
    "title": "Avocado Sourdough Toast",
    "description": "Crispy toast with creamy mashed avocado and chili flakes",
    "servings": 2,
    "prep_time_minutes": 5,
    "cook_time_minutes": 5,
    "ingredients": [
        {"name": "Sourdough bread", "quantity": 2, "unit": "slices", "raw_text": "2 slices sourdough bread"},
        {"name": "Ripe avocado", "quantity": 1, "unit": "piece", "raw_text": "1 ripe avocado"},
        {"name": "Chili flakes", "quantity": 1, "unit": "pinch", "raw_text": "1 pinch chili flakes"},
    ],
    "steps": [
        {"instruction": "Toast sourdough slices until golden."},
        {"instruction": "Mash avocado and spread onto toast, sprinkle with chili flakes."},
    ],
    "tags": ["breakfast", "quick", "vegetarian"],
}

MOCK_TRANSLATION_ES = {
    "title": "Tostada de Aguacate y Masa Madre",
    "description": "Tostada crujiente con aguacate cremoso y copos de chile",
    "ingredients": [
        {"name": "Pan de masa madre", "quantity": 2, "unit": "rebanadas"},
        {"name": "Aguacate maduro", "quantity": 1, "unit": "pieza"},
        {"name": "Copos de chile", "quantity": 1, "unit": "pizca"},
    ],
    "steps": [
        {"instruction": "Tostar las rebanadas de masa madre hasta que estén doradas."},
        {"instruction": "Triturar el aguacate y untar sobre la tostada."},
    ],
    "tags": ["desayuno", "rápido", "vegetariano"],
}


@pytest.mark.asyncio
async def test_stage_7_full_lifecycle_integration(tmp_path: Path):
    """
    End-to-end multi-plugin lifecycle test across all 5 Stage 7 plugins:
    1. core-ai-provider: service booted & operational
    2. core-recipe-importer: extract recipe from text and auto-save to library
    3. core-translator: translate recipe to Spanish within the same group
    4. core-meal-planner-ai: generate candidate suggestion pool from library
    5. accept candidate suggestion -> schedules meal with servings override (4 servings = 2x scale)
    6. core-shopping-list: aggregates scheduled meal with pantry staples and handles checkbox toggles
    """
    async with make_kernel(tmp_path, auto_setup=True) as k:
        ai_svc = k.services.get("core-ai-provider")
        assert ai_svc is not None

        # -------------------------------------------------------------
        # Step 1: Add a pantry staple in core-shopping-list
        # -------------------------------------------------------------
        staple_res = await k.client.post(
            "/api/x/core-shopping-list/staples",
            json={
                "name": "Olive Oil",
                "default_quantity": 1,
                "unit": "bottle",
                "category": "Pantry",
                "always_include": True,
            },
        )
        assert staple_res.status_code == 201

        # -------------------------------------------------------------
        # Step 2: Import recipe using core-recipe-importer
        # -------------------------------------------------------------
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = dict(MOCK_IMPORT_RECIPE)

            imp_res = await k.client.post(
                "/api/x/core-recipe-importer/parse-text",
                json={
                    "text": "Toast sourdough slices, mash avocado on top, season with chili flakes.",
                    "auto_save": True,
                },
            )
            assert imp_res.status_code == 200, imp_res.text
            imported_rec = imp_res.json()
            assert imported_rec["title"] == "Avocado Sourdough Toast"
            rec_id = imported_rec["id"]
            group_id = imported_rec["group_id"]

        # -------------------------------------------------------------
        # Step 3: Translate recipe using core-translator
        # -------------------------------------------------------------
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = dict(MOCK_TRANSLATION_ES)

            trans_res = await k.client.post(
                "/api/x/core-translator/translate",
                json={"recipe_id": rec_id, "target_language": "es"},
            )
            assert trans_res.status_code == 200, trans_res.text
            trans_rec = trans_res.json()
            assert trans_rec["language"] == "es"
            assert trans_rec["group_id"] == group_id

        # -------------------------------------------------------------
        # Step 4: Generate candidate pool with core-meal-planner-ai
        # -------------------------------------------------------------
        with patch.object(ai_svc, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = {
                "title": "Weekend Breakfast Ideas",
                "suggestions": [
                    {
                        "recipe_id": rec_id,
                        "recipe_title": "Avocado Sourdough Toast",
                        "meal_type": "breakfast",
                        "suggested_date": None,
                        "reasoning": "Quick morning breakfast",
                        "confidence": 0.98,
                    }
                ],
            }

            plan_res = await k.client.post(
                "/api/x/core-meal-planner-ai/generate",
                json={"days": 2, "prompt": "Healthy quick breakfast"},
            )
            assert plan_res.status_code == 200, plan_res.text
            plan = plan_res.json()
            suggestion = plan["suggestions"][0]
            assert suggestion["status"] == "suggested"
            assert suggestion["suggested_date"] is None

        # -------------------------------------------------------------
        # Step 5: Accept candidate suggestion and schedule it with 4 servings (2x scale)
        # -------------------------------------------------------------
        acc_res = await k.client.post(
            f"/api/x/core-meal-planner-ai/suggestions/{suggestion['id']}/accept",
            json={"date": "2026-09-25", "meal_type": "breakfast", "servings": 4},
        )
        assert acc_res.status_code == 200
        assert acc_res.json()["status"] == "accepted"

        # Verify entry was created in schedule
        sched_entries = await k.schedule.list_entries(from_date="2026-09-25", to_date="2026-09-25")
        assert len(sched_entries) == 1
        assert sched_entries[0]["recipe_id"] == rec_id

        # -------------------------------------------------------------
        # Step 6: Query core-shopping-list
        # -------------------------------------------------------------
        shop_res = await k.client.get(
            "/api/x/core-shopping-list",
            params={"from_date": "2026-09-25", "to_date": "2026-09-25"},
        )
        assert shop_res.status_code == 200, shop_res.text
        shop_items = shop_res.json()["items"]

        # Scaled ingredient: 2 slices * (4 servings / 2 servings) = 4 slices
        bread = next((i for i in shop_items if "sourdough" in i["name"].lower()), None)
        assert bread is not None
        assert bread["quantity"] == 4.0

        # Scaled ingredient: 1 avocado * 2 = 2 avocados
        avo = next((i for i in shop_items if "avocado" in i["name"].lower()), None)
        assert avo is not None
        assert avo["quantity"] == 2.0

        # Pantry staple included
        oil = next((i for i in shop_items if "olive oil" in i["name"].lower()), None)
        assert oil is not None
        assert oil["source_type"] == "staple"

        # Checkbox toggle
        tog_res = await k.client.post(
            "/api/x/core-shopping-list/toggle",
            json={"key": bread["key"], "checked": True},
        )
        assert tog_res.status_code == 200
        assert tog_res.json()["checked"] is True

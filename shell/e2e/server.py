import os
import sys
import shutil
import tempfile
import asyncio
import json
import re
from contextlib import asynccontextmanager
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from secretsauce.boot import boot
from secretsauce.auth import hash_passphrase
from secretsauce.app import build_app

DATA_DIR = PROJECT_ROOT / ".e2e_data"
if DATA_DIR.exists():
    shutil.rmtree(DATA_DIR, ignore_errors=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
os.environ["SECRETSAUCE_DATA_DIR"] = str(DATA_DIR)
# Never let a developer's real credential turn a browser test into a paid request.
for variable in ("GEMINI_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
    os.environ.pop(variable, None)


async def deterministic_completion(self, base_url, api_key, model, schema, prompt, images=None):
    """Replace only the outbound paid helper, not routes, validation or persistence."""
    if schema.__name__ == "RecipeDraftSchema":
        result = {"title": "Chickpea lemon soup", "description": "A bright weeknight soup", "servings": 3,
                  "language": "en", "ingredients": [{"name": "Chickpeas", "quantity": 400, "unit": "g"}],
                  "steps": [{"instruction": "Simmer for ten minutes."}], "tags": ["soup"]}
    elif schema.__name__ == "RecipeTranslationSchema":
        language = re.search(r"to language '([^']+)'", prompt).group(1)
        result = {"title": "Pasta traducida" if language == "es" else f"Translated pasta ({language})",
                  "ingredients": [{"name": "Tomates", "quantity": 400, "unit": "g"}],
                  "steps": [{"instruction": "Cocinar la pasta."}]}
    elif schema.__name__ == "MealPlanSchema":
        library = json.loads(re.search(r"Available recipes in library: ([^\n]+)", prompt).group(1))
        result = {"title": "Weeknight suggestions", "suggestions": [
            {"recipe_id": library[0]["id"], "recipe_title": library[0]["title"], "meal_type": "dinner",
             "reasoning": "Easy weeknight meal", "confidence": 0.95}]} if library else {"suggestions": []}
    elif schema.__name__ == "RecipeAdaptationResponse":
        result = {
            "title": "Vegetarian Pasta",
            "description": "Plant-based pasta adaptation",
            "servings": 4,
            "prep_time_minutes": 15,
            "cook_time_minutes": 20,
            "tags": ["vegetarian", "pasta"],
            "ingredients": [{"name": "Mushrooms", "quantity": 300, "unit": "g", "notes": "sliced"}],
            "steps": [{"instruction": "Sauté mushrooms and toss with pasta."}],
            "adaptation_summary": "Replaced ground meat with sautéed mushrooms.",
        }
    else:
        raise AssertionError(f"Unexpected paid AI schema: {schema}")
    return schema.model_validate(result).model_dump(), 12, 8


def build_e2e_app():
    app = build_app()
    production_lifespan = app.router.lifespan_context

    @asynccontextmanager
    async def lifespan(app):
        async with production_lifespan(app):
            service_type = type(app.state.kernel.services.get("core-ai-provider"))
            original = service_type._complete_openai_compatible
            # The loader retains this module but creates a new service instance
            # on reactivation. Patch only the outbound helper on its class so
            # plugin toggles cannot restore paid network calls during a test.
            service_type._complete_openai_compatible = deterministic_completion
            try:
                yield
            finally:
                service_type._complete_openai_compatible = original

    app.router.lifespan_context = lifespan
    return app

async def seed_e2e_data():
    kernel = await boot(DATA_DIR)
    pass_hash = hash_passphrase("secretpassphrase")
    await kernel.household.update_config({
        "household_name": "SecretSauce E2E House",
        "languages": {"primary": "en", "translations": ["de"]},
        "units": "metric",
        "meal_types": [
            {"id": "breakfast", "label": "Breakfast"},
            {"id": "dinner", "label": "Dinner"},
        ],
    })
    await kernel.household.set_passphrase(pass_hash)
    await kernel.services.get("core-ai-provider").update_settings({
        "provider": "openai", "model": "gpt-4o-mini", "openai_api_key": "e2e-test-key",
    })

    alex = await kernel.members.create_member({
        "name": "Alex",
        "avatar_color": "#3b82f6",
        "preferred_language": "en",
    })
    charlie = await kernel.members.create_member({
        "name": "Charlie",
        "avatar_color": "#10b981",
        "preferred_language": "de",
    })

    recipe = await kernel.recipes.create_recipe({
        "title": "Grandma's Tomato Pasta",
        "language": "en",
        "servings": 2,
        "prep_time_minutes": 10,
        "cook_time_minutes": 15,
        "tags": ["pasta", "italian", "dinner"],
        "ingredients": [
            {"name": "Spaghetti", "quantity": 200, "unit": "g"},
            {"name": "Canned Tomatoes", "quantity": 400, "unit": "g"},
            {"name": "Olive Oil", "quantity": 2, "unit": "tbsp"},
        ],
        "steps": [
            {"order": 1, "text": "Boil pasta in salted water.", "timer_minutes": 10},
            {"order": 2, "text": "Simmer canned tomatoes with olive oil.", "timer_minutes": 15},
        ],
    })
    print(f"E2E Data seeded: members=[{alex['id']}, {charlie['id']}], recipe={recipe['id']}")
    await kernel.shutdown()

if __name__ == "__main__":
    asyncio.run(seed_e2e_data())

    import uvicorn
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8998
    print(f"Starting E2E server on port {port}...")
    uvicorn.run(
        build_e2e_app(),
        host="127.0.0.1",
        port=port,
        log_level="info",
    )

import os
import sys
import shutil
import tempfile
import asyncio
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from secretsauce.boot import boot
from secretsauce.auth import hash_passphrase

DATA_DIR = PROJECT_ROOT / ".e2e_data"
if DATA_DIR.exists():
    shutil.rmtree(DATA_DIR, ignore_errors=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
os.environ["SECRETSAUCE_DATA_DIR"] = str(DATA_DIR)

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
        "secretsauce.app:build_app",
        host="127.0.0.1",
        port=port,
        factory=True,
        log_level="info",
    )

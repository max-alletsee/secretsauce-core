from datetime import datetime, timezone
import json
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from secretsauce.plugins.context import PluginContext, current_ctx

PLUGIN = {
    "id": "core-translator",
    "name": "core-translator",
    "version": "1.0.0",
    "description": "Multi-language recipe translation using AI with automatic household member language syncing",
    "core": True,
    "schema": 1,
    "requires": ["core-ai-provider"],
    "ui": "ui.js",
    "config_schema": {
        "properties": {
            "auto_translate_members": {"type": "boolean", "default": False},
        }
    },
}

router = APIRouter(prefix="/api/x/core-translator", tags=["core-translator"])


class TranslatedIngredient(BaseModel):
    name: str
    quantity: float | None = None
    quantity_max: float | None = None
    unit: str | None = None
    raw_text: str | None = None


class TranslatedStep(BaseModel):
    instruction: str


class RecipeTranslationSchema(BaseModel):
    title: str
    description: str | None = None
    ingredients: list[TranslatedIngredient] = Field(default_factory=list)
    steps: list[TranslatedStep] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class TranslateRequest(BaseModel):
    recipe_id: str
    target_language: str


class TranslateAllRequest(BaseModel):
    target_language: str


async def translate_recipe(
    ctx: PluginContext,
    recipe_id: str,
    target_lang: str,
) -> dict[str, Any]:
    source_recipe = await ctx.recipes.get_recipe(recipe_id)
    if not source_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    source_lang = source_recipe.get("language", "en")
    group_id = source_recipe["group_id"]

    if source_lang == target_lang:
        return source_recipe

    rows = await ctx.db.read_all("SELECT * FROM recipes WHERE group_id = ?", (group_id,))
    existing_target = next((dict(r) for r in rows if r["language"] == target_lang), None)

    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    if not ai_svc:
        raise HTTPException(status_code=503, detail="AI Provider service ('core-ai-provider') is not available")

    prompt = (
        f"Translate the following recipe from language '{source_lang}' to language '{target_lang}'. "
        "Keep measurements and culinary terminology accurate and natural in the target language. "
        "Return the structured translation matching the schema.\n\n"
        f"Title: {source_recipe.get('title')}\n"
        f"Description: {source_recipe.get('description') or ''}\n"
        f"Ingredients: {json.dumps(source_recipe.get('ingredients', []))}\n"
        f"Steps: {json.dumps(source_recipe.get('steps', []))}\n"
        f"Tags: {json.dumps(source_recipe.get('tags', []))}\n"
    )

    translated = await ai_svc.complete(
        schema=RecipeTranslationSchema,
        prompt=prompt,
        call_type="recipe_translate",
        calling_plugin="core-translator",
    )
    if not isinstance(translated, dict):
        translated = json.loads(translated)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if existing_target:
        updated = await ctx.recipes.update_recipe(
            recipe_id=existing_target["id"],
            revision=existing_target["revision"],
            data={
                "title": translated["title"],
                "description": translated.get("description"),
                "ingredients": translated.get("ingredients", []),
                "steps": translated.get("steps", []),
                "tags": translated.get("tags", []),
                "origin": "plugin:core-translator",
            },
        )
        saved_id = updated["id"]
        res_data = updated
    else:
        created = await ctx.recipes.create_recipe({
            "group_id": group_id,
            "title": translated["title"],
            "description": translated.get("description"),
            "servings": source_recipe.get("servings", 4),
            "prep_time_minutes": source_recipe.get("prep_time_minutes"),
            "cook_time_minutes": source_recipe.get("cook_time_minutes"),
            "language": target_lang,
            "ingredients": translated.get("ingredients", []),
            "steps": translated.get("steps", []),
            "tags": translated.get("tags", []),
            "origin": "plugin:core-translator",
        })
        saved_id = created["id"]
        res_data = created

    history_id = str(uuid.uuid4())
    await ctx.db.write(
        """
        INSERT INTO plugin_core_translator_history
        (id, recipe_id, group_id, source_lang, target_lang, status, translated_recipe_id, created_at)
        VALUES (?, ?, ?, ?, ?, 'success', ?, ?)
        """,
        (history_id, recipe_id, group_id, source_lang, target_lang, saved_id, now),
    )
    return res_data


@router.post("/translate")
async def translate_endpoint(req: TranslateRequest, ctx: PluginContext = Depends(current_ctx)):
    try:
        return await translate_recipe(ctx, req.recipe_id, req.target_language)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {e}")


@router.post("/translate-all")
async def translate_all_endpoint(req: TranslateAllRequest, ctx: PluginContext = Depends(current_ctx)):
    # Picked up by the kernel's job runner; progress reaches the browser as job:progress pushes.
    job_id = await ctx.jobs.create("translate-all", {"target_language": req.target_language})
    return {"job_id": job_id, "status": "pending"}


@router.get("/history")
async def get_history_endpoint(ctx: PluginContext = Depends(current_ctx)):
    rows = await ctx.db.read_all(
        "SELECT * FROM plugin_core_translator_history ORDER BY created_at DESC LIMIT 50"
    )
    return [dict(r) for r in rows]


class TranslatorService:
    def __init__(self, ctx: PluginContext):
        self.ctx = ctx

    async def translate_recipe(self, recipe_id: str, target_lang: str) -> dict[str, Any]:
        return await translate_recipe(self.ctx, recipe_id, target_lang)


async def setup(ctx: PluginContext):
    service = TranslatorService(ctx)
    ctx.services.register("core-translator", service)
    ctx.router(router)

    async def translate_recipe_job(input_data: dict[str, Any], handle: Any = None) -> dict[str, Any]:
        recipe_id = input_data["recipe_id"]
        target_lang = input_data["target_language"]
        if handle:
            await handle.set_progress(20, f"Translating recipe {recipe_id} to {target_lang}")
        res = await translate_recipe(ctx, recipe_id, target_lang)
        if handle:
            await handle.set_progress(100, "Done")
        return res

    async def translate_all_job(input_data: dict[str, Any], handle: Any = None) -> dict[str, Any]:
        target_lang = input_data["target_language"]
        recipes_res = await ctx.recipes.list_recipes(limit=500)
        recipes = recipes_res.get("items", []) if isinstance(recipes_res, dict) else recipes_res
        total = len(recipes)
        translated_count = 0
        for idx, r in enumerate(recipes):
            rows = await ctx.db.read_all("SELECT language FROM recipes WHERE group_id = ?", (r["group_id"],))
            if not any(item["language"] == target_lang for item in rows):
                await translate_recipe(ctx, r["id"], target_lang)
                translated_count += 1
            if handle:
                await handle.set_progress(int(((idx + 1) / max(total, 1)) * 100))
        return {"translated_count": translated_count, "target_language": target_lang}

    ctx.jobs.register("translate-recipe", translate_recipe_job)
    ctx.jobs.register("translate-all", translate_all_job)

    # Recipe create hook for auto translation if configured
    async def on_recipe_create(draft: dict[str, Any], current: Any = None, hook_ctx: Any = None) -> dict[str, Any]:
        # Don't translate in hook directly (keep creation fast), background sync or no-op if disabled
        return draft

    ctx.hook("recipe:create", on_recipe_create)

import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from secretsauce.errors import SecretSauceError
from secretsauce.plugins.context import PluginContext, current_ctx

DEFAULT_ACTIONS = [
    {
        "id": "vegetarian",
        "title": "Make it vegetarian",
        "description": "Swap meats and poultry for flavorful plant-based substitutes",
        "prompt": "Adapt this recipe to be completely vegetarian. Replace animal proteins with plant-based alternatives that match texture, cooking time, and savory depth (e.g. mushrooms, lentils, beans, firm tofu, halloumi). Adjust stocks and seasonings to preserve rich umami.",
    },
    {
        "id": "ten-ingredients",
        "title": "10 ingredients or less",
        "description": "Streamline ingredient list without sacrificing core flavors",
        "prompt": "Adapt this recipe so the entire ingredient list contains 10 ingredients or fewer (excluding salt, black pepper, and water). Consolidate complex spice blends into singular versatile spices, eliminate non-essential garnish, and focus on maximum flavor efficiency.",
    },
    {
        "id": "fast",
        "title": "Make it fast (under 30 min)",
        "description": "Speed up prep and cook time using efficient culinary techniques",
        "prompt": "Adapt this recipe so total active prep and cooking takes 30 minutes or less. Use quicker cooking methods (e.g. high-heat sauté, grating vegetables, using pre-cooked beans or quick grains), without losing balanced flavor.",
    },
    {
        "id": "pantry-friendly",
        "title": "Make it pantry-friendly",
        "description": "Use accessible kitchen staples instead of hard-to-find items",
        "prompt": "Adapt this recipe using standard pantry and supermarket staples. Replace rare or specialty ingredients with widely available alternatives (e.g. dried herbs for fresh, lemon juice for sumac, standard pantry oils, canned tomatoes, garlic powder if needed).",
    },
    {
        "id": "easy-prep",
        "title": "Easier to prepare",
        "description": "Simplify multi-pan processes and reduce cleanup",
        "prompt": "Adapt this recipe to minimize equipment, simultaneous pans, and knife work. Consolidate cooking into a single pot, sheet pan, or skillet wherever possible. Simplify step instructions to make execution straightforward and foolproof.",
    },
]

PLUGIN = {
    "id": "core-recipe-magic",
    "name": "core-recipe-magic",
    "version": "1.0.0",
    "description": "AI recipe adaptation inspired by Ottolenghi's SIMPLE cookbook with customizable actions and prompts",
    "core": True,
    "schema": 1,
    "requires": ["core-ai-provider"],
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "actions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                        "prompt": {"type": "string"},
                    },
                    "required": ["id", "title", "prompt"],
                },
                "default": DEFAULT_ACTIONS,
            }
        },
    },
}

router = APIRouter(prefix="/api/x/core-recipe-magic", tags=["core-recipe-magic"])


class AIUnavailableError(SecretSauceError):
    code = "unavailable"
    status_code = 503


class ActionModel(BaseModel):
    id: str
    title: str
    description: str = ""
    prompt: str


class AdaptedIngredient(BaseModel):
    name: str
    quantity: float | None = None
    quantity_max: float | None = None
    unit: str | None = None
    notes: str | None = None


class AdaptedStep(BaseModel):
    instruction: str
    timer_minutes: int | None = None


class RecipeAdaptationResponse(BaseModel):
    title: str
    description: str | None = None
    servings: int = 2
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    tags: list[str] = Field(default_factory=list)
    ingredients: list[AdaptedIngredient] = Field(default_factory=list)
    steps: list[AdaptedStep] = Field(default_factory=list)
    adaptation_summary: str = Field(description="Brief culinary explanation of the changes made")


class AdaptRecipeRequest(BaseModel):
    action_id: str
    custom_prompt: str | None = None
    recipe: dict[str, Any]


@router.get("/actions")
async def get_actions(ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    actions = ctx.config.get("actions")
    if actions is None:
        return [dict(a) for a in DEFAULT_ACTIONS]
    return actions


@router.put("/actions")
async def update_actions(actions: list[ActionModel], ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    payload = [a.model_dump() for a in actions]
    await ctx.save_config({"actions": payload})
    return payload


@router.post("/actions/reset")
async def reset_actions(ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    default_payload = [dict(a) for a in DEFAULT_ACTIONS]
    await ctx.save_config({"actions": default_payload})
    return default_payload


@router.post("/adapt")
async def adapt_recipe(
    req: AdaptRecipeRequest, ctx: PluginContext = Depends(current_ctx)
) -> dict[str, Any]:
    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    if not ai_svc:
        raise AIUnavailableError("AI Provider service ('core-ai-provider') is not available")

    actions = ctx.config.get("actions") or DEFAULT_ACTIONS
    action_dict = {a["id"]: a for a in actions}

    instruction = req.custom_prompt
    if not instruction and req.action_id in action_dict:
        instruction = action_dict[req.action_id].get("prompt")
    if not instruction:
        instruction = f"Adapt recipe according to: {req.action_id}"

    recipe_data = req.recipe or {}
    prompt = (
        f"You are an expert chef adapting this recipe according to the following instruction: '{instruction}'.\n\n"
        "Guidelines:\n"
        "- Maintain the culinary soul, flavor balance, and texture of the dish.\n"
        "- Return precise quantities, standard units, and clear instructions.\n"
        "- Provide a concise 'adaptation_summary' explaining what substitutions or technique changes you made.\n\n"
        f"Original Recipe Title: {recipe_data.get('title', 'Recipe')}\n"
        f"Description: {recipe_data.get('description') or ''}\n"
        f"Servings: {recipe_data.get('servings', 2)}\n"
        f"Prep time (min): {recipe_data.get('prep_time_minutes')}\n"
        f"Cook time (min): {recipe_data.get('cook_time_minutes')}\n"
        f"Ingredients: {json.dumps(recipe_data.get('ingredients', []))}\n"
        f"Steps: {json.dumps(recipe_data.get('steps', []))}\n"
        f"Tags: {json.dumps(recipe_data.get('tags', []))}\n"
    )

    try:
        adapted = await ai_svc.complete(
            schema=RecipeAdaptationResponse,
            prompt=prompt,
            call_type="recipe_magic",
            calling_plugin="core-recipe-magic",
        )
    except SecretSauceError:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adaptation failed: {e}")

    if isinstance(adapted, str):
        adapted = json.loads(adapted)
    elif isinstance(adapted, BaseModel):
        adapted = adapted.model_dump()

    return adapted


async def setup(ctx: PluginContext):
    ctx.router(router)

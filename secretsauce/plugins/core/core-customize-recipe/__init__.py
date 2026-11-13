import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from secretsauce.errors import SecretSauceError
from secretsauce.plugins.context import PluginContext, current_ctx

DEFAULT_ACTIONS = [
    {
        "id": "metric",
        "title": "Convert to Metric",
        "description": "Convert ingredient weights, volumes, and step temperatures to metric units",
        "prompt": "Convert all ingredient quantities and units, as well as any measurements, dimensions, and temperatures in the step instructions, to metric units (g, kg, ml, l, °C, cm). Use culinary weight conversions where appropriate.",
    },
    {
        "id": "imperial",
        "title": "Convert to Imperial",
        "description": "Convert ingredient weights, volumes, and step temperatures to imperial/US units",
        "prompt": "Convert all ingredient quantities and units, as well as any measurements, dimensions, and temperatures in the step instructions, to imperial / US customary units (oz, lb, cups, tbsp, tsp, °F, inches).",
    },
    {
        "id": "substitute",
        "title": "Substitute ingredients",
        "description": "Swap specific ingredients with suitable culinary alternatives",
        "prompt": "Substitute [ingredient] with a suitable replacement, adjusting quantities, seasonings, and cooking steps to keep flavor and texture balanced.",
    },
    {
        "id": "vegetarian",
        "title": "Make it vegetarian",
        "description": "Swap meats and poultry for flavorful plant-based substitutes",
        "prompt": "Adapt this recipe to be completely vegetarian. Replace animal proteins with plant-based alternatives that match texture, cooking time, and savory depth (e.g. mushrooms, lentils, beans, firm tofu, halloumi). Adjust stocks and seasonings to preserve rich umami.",
    },
    {
        "id": "ten-ingredients",
        "title": "Make it 10 ingredients or less",
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
        "title": "Make it easier to prepare",
        "description": "Simplify multi-pan processes and reduce cleanup",
        "prompt": "Adapt this recipe to minimize equipment, simultaneous pans, and knife work. Consolidate cooking into a single pot, sheet pan, or skillet wherever possible. Simplify step instructions to make execution straightforward and foolproof.",
    },
]

PLUGIN = {
    "id": "core-customize-recipe",
    "name": "core-customize-recipe",
    "version": "1.0.0",
    "description": "Flexible AI and unit-aware recipe customization with inline diffing and customizable shorthand prompts",
    "core": True,
    "schema": 1,
    "requires": ["core-ai-provider", "core-units?"],
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "adapt_model_key": {"type": "string", "default": "default"},
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
            },
        },
    },
}

router = APIRouter(prefix="/api/x/core-customize-recipe", tags=["core-customize-recipe"])


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
    preserve_units: bool | None = None


class AdaptedStep(BaseModel):
    instruction: str
    timer_minutes: int | None = None


class RecipeAdaptationResponse(BaseModel):
    title: str
    description: str | None = None
    servings: float = 2
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    tags: list[str] = Field(default_factory=list)
    ingredients: list[AdaptedIngredient] = Field(default_factory=list)
    steps: list[AdaptedStep] = Field(default_factory=list)
    adaptation_summary: str = Field(description="Brief culinary explanation of the changes made")


class ChatMessage(BaseModel):
    role: str
    content: str


class CustomizeRecipeRequest(BaseModel):
    action_id: str | None = None
    custom_prompt: str | None = None
    messages: list[ChatMessage] = Field(default_factory=list)
    recipe: dict[str, Any]


class SaveCustomizedRecipeRequest(BaseModel):
    recipe_id: str | None = None
    revision: int | None = None
    recipe: dict[str, Any]


def _convert_ingredients_via_units_svc(
    units_svc: Any, ingredients: list[Any], target_system: str, lang: str = "en"
) -> list[dict[str, Any]]:
    converted: list[dict[str, Any]] = []
    for raw_item in ingredients:
        item = dict(raw_item) if isinstance(raw_item, dict) else {"name": str(raw_item)}
        qty = item.get("quantity")
        qty_max = item.get("quantity_max")
        unit = item.get("unit")
        if unit and qty is not None:
            canonical_unit = units_svc.canonical(str(unit), lang) or str(unit)
            new_q, new_q_max, new_unit = units_svc.to_system(
                float(qty),
                float(qty_max) if qty_max is not None else None,
                canonical_unit,
                target_system,
            )
            item["quantity"] = new_q
            item["quantity_max"] = new_q_max
            item["unit"] = new_unit
        item["preserve_units"] = True
        converted.append(item)
    return converted


@router.get("/actions")
async def get_actions(ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    actions = ctx.config.get("actions")
    if actions is None:
        return [dict(a) for a in DEFAULT_ACTIONS]
    return actions


@router.put("/actions")
async def update_actions(
    actions: list[ActionModel], ctx: PluginContext = Depends(current_ctx)
) -> list[dict[str, Any]]:
    payload = [a.model_dump() for a in actions]
    await ctx.save_config({"actions": payload})
    return payload


@router.post("/actions/reset")
async def reset_actions(ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    default_payload = [dict(a) for a in DEFAULT_ACTIONS]
    await ctx.save_config({"actions": default_payload})
    return default_payload


@router.post("/customize")
@router.post("/adapt")
async def customize_recipe(
    req: CustomizeRecipeRequest, ctx: PluginContext = Depends(current_ctx)
) -> dict[str, Any]:
    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    actions = ctx.config.get("actions") or DEFAULT_ACTIONS
    action_dict = {a["id"]: a for a in actions}

    instruction = (req.custom_prompt or "").strip()
    if not instruction and req.action_id and req.action_id in action_dict:
        instruction = action_dict[req.action_id].get("prompt", "")
    if not instruction:
        instruction = f"Customize recipe according to: {req.action_id or 'user request'}"

    recipe_data = dict(req.recipe or {})
    lang = recipe_data.get("language") or "en"

    # Determine if this is a unit conversion action ("metric" or "imperial")
    unit_action: str | None = None
    if req.action_id in ("metric", "imperial"):
        default_unit_prompt = (action_dict.get(req.action_id, {}).get("prompt") or "").strip()
        if not req.custom_prompt or req.custom_prompt.strip() == default_unit_prompt:
            unit_action = req.action_id
    elif instruction == action_dict.get("metric", {}).get("prompt"):
        unit_action = "metric"
    elif instruction == action_dict.get("imperial", {}).get("prompt"):
        unit_action = "imperial"

    units_svc = ctx.services.get("core-units")
    preconverted_ingredients: list[dict[str, Any]] | None = None
    if unit_action and units_svc is not None:
        target_system = "metric" if unit_action == "metric" else "us_customary"
        preconverted_ingredients = _convert_ingredients_via_units_svc(
            units_svc, recipe_data.get("ingredients", []), target_system, lang=lang
        )
        if not ai_svc:
            label = "metric" if unit_action == "metric" else "imperial"
            return {
                "title": recipe_data.get("title", "Recipe"),
                "description": recipe_data.get("description") or "",
                "servings": recipe_data.get("servings", 2),
                "prep_time_minutes": recipe_data.get("prep_time_minutes"),
                "cook_time_minutes": recipe_data.get("cook_time_minutes"),
                "tags": list(recipe_data.get("tags") or []),
                "ingredients": preconverted_ingredients,
                "steps": list(recipe_data.get("steps") or []),
                "source": recipe_data.get("source"),
                "adaptation_summary": f"Converted ingredient units to {label} using core-units.",
            }

    if not ai_svc:
        raise AIUnavailableError("AI Provider service ('core-ai-provider') is not available")

    history_block = ""
    if req.messages:
        lines = [f"{m.role.upper()}: {m.content}" for m in req.messages]
        history_block = "Previous conversation history:\n" + "\n".join(lines) + "\n\n"

    ingredients_for_prompt = (
        preconverted_ingredients
        if preconverted_ingredients is not None
        else recipe_data.get("ingredients", [])
    )

    prompt = (
        f"You are an expert chef customizing this recipe according to the following instruction: '{instruction}'.\n\n"
        f"{history_block}"
        "Guidelines:\n"
        "- Maintain the culinary soul, flavor balance, and texture of the dish.\n"
        "- Return precise quantities, standard units, and clear instructions.\n"
        "- Provide a concise 'adaptation_summary' explaining what substitutions, unit conversions, or technique changes you made.\n\n"
        f"Original Recipe Title: {recipe_data.get('title', 'Recipe')}\n"
        f"Description: {recipe_data.get('description') or ''}\n"
        f"Servings: {recipe_data.get('servings', 2)}\n"
        f"Prep time (min): {recipe_data.get('prep_time_minutes')}\n"
        f"Cook time (min): {recipe_data.get('cook_time_minutes')}\n"
        f"Ingredients: {json.dumps(ingredients_for_prompt)}\n"
        f"Steps: {json.dumps(recipe_data.get('steps', []))}\n"
        f"Tags: {json.dumps(recipe_data.get('tags', []))}\n"
    )

    try:
        adapted = await ai_svc.complete(
            schema=RecipeAdaptationResponse,
            prompt=prompt,
            call_type="customize_recipe",
            calling_plugin="core-customize-recipe",
            model_key=ctx.config.get("adapt_model_key") or "default",
        )
    except SecretSauceError:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Customization failed: {e}")

    if isinstance(adapted, str):
        adapted = json.loads(adapted)
    elif isinstance(adapted, BaseModel):
        adapted = adapted.model_dump()

    # If core-units is active and this was a unit conversion action, use core-units' deterministic ingredient conversion
    if preconverted_ingredients is not None:
        adapted["ingredients"] = preconverted_ingredients
    else:
        for ing in adapted.get("ingredients", []):
            if isinstance(ing, dict):
                ing["preserve_units"] = True

    if recipe_data.get("source") is not None:
        adapted["source"] = recipe_data.get("source")

    return adapted


@router.post("/save")
async def save_customized_recipe(
    req: SaveCustomizedRecipeRequest,
    request: Request,
    response: Response,
    ctx: PluginContext = Depends(current_ctx),
) -> dict[str, Any]:
    data = dict(req.recipe or {})
    for drop_key in ("id", "revision", "created_at", "updated_at", "languages", "adaptation_summary"):
        data.pop(drop_key, None)

    ingredients = data.get("ingredients")
    if isinstance(ingredients, list):
        cleaned_ings = []
        for item in ingredients:
            if isinstance(item, dict):
                cleaned_ings.append({**item, "preserve_units": True})
            else:
                cleaned_ings.append(item)
        data["ingredients"] = cleaned_ings

    actor = getattr(request.state, "actor_member_id", None)
    if actor:
        data["actor_member_id"] = actor
    data["origin"] = ctx.origin

    if req.recipe_id:
        if req.revision is None:
            existing = await ctx.recipes.get_recipe(req.recipe_id)
            revision = existing["revision"]
        else:
            revision = req.revision
        return await ctx.recipes.update_recipe(
            recipe_id=req.recipe_id, revision=revision, data=data
        )

    if not data.get("language"):
        data["language"] = "en"
    response.status_code = 201
    return await ctx.recipes.create_recipe(data)


async def setup(ctx: PluginContext):
    ctx.router(router)

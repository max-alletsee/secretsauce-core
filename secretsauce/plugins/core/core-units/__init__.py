from typing import Any
from secretsauce.plugins.context import PluginContext
from secretsauce.units import (
    canonical,
    convert,
    format as format_unit,
    parse,
    to_system,
)

PLUGIN = {
    "id": "core-units",
    "version": "1.0.0",
    "name": "core-units",
    "description": "Standardized unit conversion and ingredient parsing engine",
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "default_system": {
                "type": "string",
                "enum": ["metric", "us_customary"],
                "default": "metric",
            }
        },
    },
}


class UnitsService:
    @staticmethod
    def canonical(alias: str, lang: str = "en") -> str | None:
        return canonical(alias, lang)

    @staticmethod
    def parse(text: str, lang: str = "en") -> dict[str, Any]:
        return parse(text, lang)

    @staticmethod
    def convert(quantity: float, from_unit: str, to_unit: str) -> float:
        return convert(quantity, from_unit, to_unit)

    @staticmethod
    def to_system(
        quantity: float | None,
        quantity_max: float | None,
        unit: str | None,
        system: str = "metric",
    ) -> tuple[float | None, float | None, str | None]:
        return to_system(quantity, quantity_max, unit, system)

    @staticmethod
    def format(
        quantity: float | None,
        quantity_max: float | None,
        unit: str | None,
        lang: str = "en",
        system: str = "metric",
    ) -> str:
        return format_unit(quantity, quantity_max, unit, lang, system)


def _convert_single_ingredient(
    item: Any, target_system: str, lang: str = "en"
) -> dict[str, Any]:
    if isinstance(item, dict) and item.get("preserve_units"):
        return dict(item)
    if isinstance(item, str):
        parsed = parse(item, lang=lang)
    elif isinstance(item, dict):
        if not item.get("quantity") and not item.get("unit") and ("raw_text" in item or "name" in item):
            parsed = parse(item.get("raw_text") or item.get("name", ""), lang=lang)
            parsed = {**parsed, **item}
        else:
            parsed = dict(item)
    else:
        return item

    raw_text = parsed.get("raw_text") or (item if isinstance(item, str) else item.get("raw_text", ""))
    unit = parsed.get("unit")
    q = parsed.get("quantity")
    q_max = parsed.get("quantity_max")

    if unit and q is not None:
        new_q, new_q_max, new_unit = to_system(q, q_max, unit, target_system)
        parsed["quantity"] = new_q
        parsed["quantity_max"] = new_q_max
        parsed["unit"] = new_unit

    parsed["raw_text"] = raw_text
    return parsed


async def setup(ctx: PluginContext) -> None:
    # 1. Register service
    ctx.services.register("core-units", UnitsService())

    # 2. Register recipe hooks
    async def process_recipe_ingredients(
        draft: dict[str, Any], current: Any = None, hook_ctx: Any = None
    ) -> dict[str, Any]:
        # If origin is plugin:core-units or plugin:core-customize-recipe, bypass to avoid overwriting custom units
        if draft.get("origin") in ("plugin:core-units", "plugin:core-customize-recipe"):
            return draft

        ingredients = draft.get("ingredients")
        if not ingredients or not isinstance(ingredients, list):
            return draft

        # The household's unit system wins; the plugin default covers its absence.
        household = await ctx.household.get_config()
        target_system = household.get("units") or ctx.config.get("default_system", "metric")

        lang = draft.get("language") or "en"
        new_ingredients = [
            _convert_single_ingredient(item, target_system, lang)
            for item in ingredients
        ]
        draft["ingredients"] = new_ingredients
        return draft

    ctx.hook("recipe:create", process_recipe_ingredients)
    ctx.hook("recipe:update", process_recipe_ingredients)

    # 3. Register job handler for reconvert-all
    async def reconvert_all_job(
        input_data: dict[str, Any], handle: Any = None
    ) -> dict[str, Any]:
        target_system = input_data.get("system") or ctx.config.get(
            "default_system", "metric"
        )
        # Every language row, not one resolved row per group.
        rows = await ctx.db.fetch_all("SELECT id FROM recipes ORDER BY group_id, language;")
        total = len(rows)
        for idx, r in enumerate(rows):
            recipe_id = r["id"]
            full_recipe = await ctx.recipes.get_recipe(recipe_id)
            ingredients = full_recipe.get("ingredients") or []
            new_ingredients = []
            for ing in ingredients:
                raw_text = ing.get("raw_text") if isinstance(ing, dict) else str(ing)
                text_to_parse = raw_text or ing.get("name", "")
                parsed = parse(text_to_parse, lang=full_recipe.get("language", "en"))
                q = parsed.get("quantity")
                q_max = parsed.get("quantity_max")
                unit = parsed.get("unit")
                if unit and q is not None:
                    new_q, new_q_max, new_unit = to_system(
                        q, q_max, unit, target_system
                    )
                    parsed["quantity"] = new_q
                    parsed["quantity_max"] = new_q_max
                    parsed["unit"] = new_unit
                parsed["raw_text"] = raw_text
                new_ingredients.append(parsed)

            await ctx.recipes.update_recipe(
                recipe_id=recipe_id,
                revision=full_recipe["revision"],
                data={
                    "ingredients": new_ingredients,
                    "origin": "plugin:core-units",
                },
            )
            if handle:
                await handle.set_progress(int(((idx + 1) / max(total, 1)) * 100))

        return {"updated": total, "system": target_system}

    ctx.jobs.register("reconvert-all", reconvert_all_job)

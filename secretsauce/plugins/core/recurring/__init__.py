import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Request
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "recurring",
    "name": "Recurring Meals",
    "version": "1.0.0",
    "description": "Weekly recurring meal planning and scheduling",
    "schema": 1,
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/recurring", tags=["recurring"])


@router.get("/rules")
async def list_rules(request: Request) -> list[dict[str, Any]]:
    kernel = request.app.state.kernel
    rows = await kernel.db.read_all(
        """SELECT r.id, r.weekday, r.meal_type, r.recipe_id, r.created_at, rec.title as recipe_title
           FROM plugin_recurring_rules r
           JOIN recipes rec ON r.recipe_id = rec.id
           ORDER BY r.weekday, r.meal_type"""
    )
    return [dict(row) for row in rows]


@router.post("/rules")
async def create_rule(data: dict[str, Any], request: Request) -> dict[str, Any]:
    kernel = request.app.state.kernel
    rule_id = str(uuid.uuid4())
    weekday = int(data["weekday"])
    meal_type = str(data["meal_type"])
    recipe_id = str(data["recipe_id"])
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        recipe = await kernel.recipes.get_recipe(recipe_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Recipe not found")

    await kernel.db.write(
        """INSERT INTO plugin_recurring_rules (id, weekday, meal_type, recipe_id, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (rule_id, weekday, meal_type, recipe_id, now),
    )
    return {
        "id": rule_id,
        "weekday": weekday,
        "meal_type": meal_type,
        "recipe_id": recipe_id,
        "recipe_title": recipe.get("title", ""),
        "created_at": now,
    }


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, request: Request) -> dict[str, bool]:
    kernel = request.app.state.kernel
    await kernel.db.write(
        "DELETE FROM plugin_recurring_rules WHERE id = ?", (rule_id,)
    )
    return {"ok": True}


async def materialize_rules(ctx: PluginContext) -> None:
    rules = await ctx.db.read_all("SELECT * FROM plugin_recurring_rules")
    if not rules:
        return

    today = date.today()
    for i in range(14):
        target_date = today + timedelta(days=i)
        target_iso = target_date.isoformat()
        current_schedule = await ctx.schedule.list_entries(
            from_date=target_iso, to_date=target_iso
        )
        planned_meals = {s["meal_type"] for s in current_schedule}

        for rule in rules:
            if rule["weekday"] == target_date.weekday():
                if rule["meal_type"] not in planned_meals:
                    await ctx.schedule.create_entry(
                        {
                            "date": target_iso,
                            "meal_type": rule["meal_type"],
                            "recipe_id": rule["recipe_id"],
                            "origin": "plugin:recurring",
                        }
                    )
                    planned_meals.add(rule["meal_type"])


async def background_loop(ctx: PluginContext) -> None:
    while True:
        try:
            await materialize_rules(ctx)
        except asyncio.CancelledError:
            break
        except Exception:
            pass
        await asyncio.sleep(3600)


async def setup(ctx: PluginContext) -> None:
    ctx.routes.mount(router)
    ctx.command("materialize", materialize_rules, title="Materialize recurring meals")
    ctx.background(background_loop(ctx))

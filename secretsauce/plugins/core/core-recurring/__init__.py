import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from secretsauce.plugins.context import PluginContext, current_ctx

PLUGIN = {
    "id": "core-recurring",
    "name": "core-recurring",
    "version": "1.0.0",
    "description": "Weekly recurring meal planning and scheduling",
    "schema": 1,
    "ui": "ui.js",
}

HORIZON_DAYS = 14
LOOP_INTERVAL_SECONDS = 3600

router = APIRouter(prefix="/api/x/core-recurring", tags=["core-recurring"])


class RuleCreate(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday")
    meal_type: str = Field(min_length=1, max_length=64)
    recipe_id: str = Field(min_length=1)


@router.get("/rules")
async def list_rules(ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    return await ctx.db.fetch_all(
        """SELECT r.id, r.weekday, r.meal_type, r.recipe_id, r.created_at, rec.title as recipe_title
           FROM plugin_core_recurring_rules r
           JOIN recipes rec ON r.recipe_id = rec.id
           ORDER BY r.weekday, r.meal_type"""
    )


@router.post("/rules")
async def create_rule(data: RuleCreate, ctx: PluginContext = Depends(current_ctx)) -> dict[str, Any]:
    recipe = await ctx.recipes.get_recipe(data.recipe_id)  # 404 when missing
    rule = {
        "id": str(uuid.uuid4()),
        "weekday": data.weekday,
        "meal_type": data.meal_type,
        "recipe_id": recipe["id"],
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    await ctx.db.execute(
        """INSERT INTO plugin_core_recurring_rules (id, weekday, meal_type, recipe_id, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (rule["id"], rule["weekday"], rule["meal_type"], rule["recipe_id"], rule["created_at"]),
    )
    return {**rule, "recipe_title": recipe.get("title", "")}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, ctx: PluginContext = Depends(current_ctx)) -> dict[str, bool]:
    await ctx.db.execute("DELETE FROM plugin_core_recurring_rules WHERE id = ?", (rule_id,))
    return {"ok": True}


@router.post("/materialize")
async def trigger_materialize(ctx: PluginContext = Depends(current_ctx)) -> dict[str, Any]:
    created = await materialize_rules(ctx)
    return {"ok": True, "created": created["created"]}


async def materialize_rules(ctx: PluginContext) -> dict[str, int]:
    """Schedules each rule's meal on matching days in the horizon unless that slot is taken."""
    rules = await ctx.db.fetch_all("SELECT * FROM plugin_core_recurring_rules ORDER BY created_at")
    if not rules:
        return {"created": 0}

    today = date.today()
    horizon = [today + timedelta(days=i) for i in range(HORIZON_DAYS)]
    existing = await ctx.schedule.list_entries(
        from_date=horizon[0].isoformat(), to_date=horizon[-1].isoformat()
    )
    planned = {(e["date"], e["meal_type"]) for e in existing}

    created = 0
    for day in horizon:
        for rule in rules:
            slot = (day.isoformat(), rule["meal_type"])
            if rule["weekday"] != day.weekday() or slot in planned:
                continue
            await ctx.schedule.create_entry(
                {
                    "date": slot[0],
                    "meal_type": rule["meal_type"],
                    "recipe_id": rule["recipe_id"],
                    "origin": ctx.origin,
                }
            )
            planned.add(slot)
            created += 1
    return {"created": created}


async def background_loop(ctx: PluginContext) -> None:
    while True:
        try:
            await materialize_rules(ctx)
        except asyncio.CancelledError:
            raise
        except Exception:
            ctx.log.exception("Materializing recurring meals failed; retrying next cycle")
        await asyncio.sleep(LOOP_INTERVAL_SECONDS)


async def setup(ctx: PluginContext) -> None:
    ctx.router(router)
    ctx.command("materialize", materialize_rules, title="Materialize recurring meals")
    ctx.background(background_loop(ctx))

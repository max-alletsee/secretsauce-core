import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from secretsauce.plugins.context import PluginContext, current_ctx
from secretsauce.errors import NotFoundError

PLUGIN = {
    "id": "core-recurring",
    "name": "core-recurring",
    "version": "1.0.0",
    "description": "Weekly recurring meal planning and scheduling",
    "schema": 2,
    "requires": ["core-timeline?"],
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
    async with ctx.db.transaction() as tx:
        await tx.execute(
            """INSERT INTO plugin_core_recurring_rules (id, weekday, meal_type, recipe_id, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (rule["id"], rule["weekday"], rule["meal_type"], rule["recipe_id"], rule["created_at"]),
        )
        created = await materialize_rules(ctx)
    return {**rule, "recipe_title": recipe.get("title", ""), "created": created["created"]}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, ctx: PluginContext = Depends(current_ctx)) -> dict[str, bool]:
    async with ctx.db.transaction() as tx:
        rule = await ctx.db.read_one('SELECT id FROM plugin_core_recurring_rules WHERE id=?', (rule_id,), conn=tx)
        if rule is None:
            raise NotFoundError('Recurring rule not found')
        entries = await ctx.db.read_all(
            '''SELECT DISTINCT e.id, e.revision FROM plugin_core_recurring_materialized m
               JOIN schedule_entries e ON e.id=m.entry_id
               WHERE m.rule_id=? AND e.date>? AND e.revision=1
                 AND NOT EXISTS (
                     SELECT 1 FROM plugin_core_recurring_materialized shared
                     JOIN plugin_core_recurring_rules owner ON owner.id=shared.rule_id
                     WHERE shared.entry_id=e.id AND shared.rule_id<>m.rule_id
                 )''',
            (rule_id, date.today().isoformat()), conn=tx,
        )
        for entry in entries:
            await ctx.schedule.delete_entry(entry['id'], revision=entry['revision'], conn=tx)
        await tx.execute('DELETE FROM plugin_core_recurring_materialized WHERE rule_id=?', (rule_id,))
        await tx.execute('DELETE FROM plugin_core_recurring_rules WHERE id=?', (rule_id,))
    return {"ok": True}


async def materialize_rules(ctx: PluginContext) -> dict[str, int]:
    """Create/backfill plans atomically; retained history prevents resurrection."""
    created = 0
    async with ctx.db.transaction() as tx:
        rules = await ctx.db.read_all('SELECT * FROM plugin_core_recurring_rules ORDER BY created_at, rowid', conn=tx)
        if not rules:
            return {'created': 0}
        today = date.today()
        horizon = [today + timedelta(days=i) for i in range(HORIZON_DAYS)]
        timeline = ctx.services.get('core-timeline')
        if timeline:
            resolved = await timeline.slots_for(horizon[0].isoformat(), horizon[-1].isoformat(), conn=tx)
        else:
            defaults = (await ctx.household.get_config())['meal_types']
            resolved = {day.isoformat(): [{**slot, 'skipped': False} for slot in defaults] for day in horizon}
        for day in horizon:
            day_string = day.isoformat()
            slots = resolved[day_string]
            entries = await ctx.schedule.get_for_date(day_string, conn=tx)
            for rule in rules:
                if rule['weekday'] != day.weekday():
                    continue
                tracked = await ctx.db.read_one(
                    'SELECT entry_id FROM plugin_core_recurring_materialized WHERE rule_id=? AND date=?',
                    (rule['id'], day_string), conn=tx,
                )
                if tracked:
                    continue
                alias = rule['meal_type'].lower()
                slot = next((s for s in slots if s['id'].lower() == alias), None)
                if slot is None:
                    slot = next((s for s in slots if s['label'].lower() == alias), None)
                if slot and slot['skipped']:
                    continue
                slot_id = slot['id'] if slot else rule['meal_type']
                occupied = []
                for entry in entries:
                    entry_alias = entry['meal_type'].lower()
                    match = next((s for s in slots if s['id'].lower() == entry_alias), None)
                    if match is None:
                        match = next((s for s in slots if s['label'].lower() == entry_alias), None)
                    if (match['id'] if match else entry['meal_type']).lower() == slot_id.lower():
                        occupied.append(entry)
                entry = next((e for e in occupied if e['origin'] == ctx.origin and e['recipe_id'] == rule['recipe_id']), None)
                if entry is None:
                    if occupied:
                        continue
                    entry = await ctx.schedule.create_entry({
                        'date': day_string, 'meal_type': slot_id,
                        'recipe_id': rule['recipe_id'], 'origin': ctx.origin,
                    }, conn=tx)
                    entries.append(entry)
                    created += 1
                await tx.execute('INSERT INTO plugin_core_recurring_materialized (rule_id,date,entry_id) VALUES (?,?,?)',
                                 (rule['id'],day_string,entry['id']))
    return {'created': created}


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
    ctx.background(background_loop(ctx))

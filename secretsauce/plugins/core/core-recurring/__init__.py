from datetime import date, datetime, timedelta, timezone
import re
from typing import Any, Literal
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from secretsauce.errors import ConflictError, NotFoundError, ValidationError
from secretsauce.plugins.context import PluginContext, current_ctx

PLUGIN = {
    "id": "core-recurring",
    "name": "core-recurring",
    "version": "1.0.0",
    "description": "Weekly recurring meal rules with explicit timeline approval",
    "schema": 3,
    "requires": ["core-timeline?"],
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/core-recurring", tags=["core-recurring"])

_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _parse_iso_date(value: str) -> date:
    try:
        if not _ISO_DATE_RE.fullmatch(value):
            raise ValueError()
        return date.fromisoformat(value)
    except ValueError:
        raise ValidationError("Expected an ISO calendar date (YYYY-MM-DD)") from None


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


async def _default_servings(ctx: PluginContext) -> float:
    members = await ctx.members.list_members()
    if not members:
        return 2.0
    total = sum(float(m.get("serving_ratio") or 1.0) for m in members)
    return round(total, 2) if total > 0 else 2.0


def _format_rule(row: dict[str, Any], default_servings: float) -> dict[str, Any]:
    entry_type = row.get("entry_type") or ("recipe" if row.get("recipe_id") else "note")
    recipe_title = row.get("recipe_title")
    raw_title = row.get("title")
    display_title = (recipe_title or raw_title or "") if entry_type == "recipe" else (raw_title or "")
    servings = float(row["servings"]) if row.get("servings") is not None else default_servings
    return {
        "id": row["id"],
        "weekday": int(row["weekday"]),
        "meal_type": row["meal_type"],
        "entry_type": entry_type,
        "recipe_id": row.get("recipe_id"),
        "recipe_title": recipe_title,
        "title": display_title,
        "servings": servings,
        "created_at": row["created_at"],
        "updated_at": row.get("updated_at") or row["created_at"],
    }


async def _validate_rule_payload(data: "RuleWrite", ctx: PluginContext) -> dict[str, Any]:
    raw_recipe_id = (data.recipe_id or "").strip() or None
    raw_title = (data.title or "").strip() or None

    if data.entry_type == "note" or (data.entry_type is None and raw_recipe_id is None and raw_title is not None):
        entry_type = "note"
    else:
        entry_type = "recipe"

    if entry_type == "recipe":
        if not raw_recipe_id:
            raise ValidationError("recipe_id is required for recipe rules")
        recipe = await ctx.recipes.get_recipe(raw_recipe_id)  # raises 404 NotFoundError when missing
        recipe_id = recipe["id"]
        recipe_title = recipe.get("title", "")
        title = None
    else:
        if not raw_title:
            raise ValidationError("title is required for note rules")
        recipe_id = None
        recipe_title = None
        title = raw_title

    servings = float(data.servings) if data.servings is not None else await _default_servings(ctx)
    return {
        "weekday": data.weekday,
        "meal_type": data.meal_type.strip(),
        "entry_type": entry_type,
        "recipe_id": recipe_id,
        "recipe_title": recipe_title,
        "title": title,
        "servings": servings,
    }


async def _resolve_slots(
    ctx: PluginContext, start_iso: str, end_iso: str, conn: Any = None
) -> dict[str, list[dict[str, Any]]]:
    timeline = ctx.services.get("core-timeline")
    if timeline:
        return await timeline.slots_for(start_iso, end_iso, conn=conn)
    defaults = (await ctx.household.get_config())["meal_types"]
    start_d = _parse_iso_date(start_iso)
    end_d = _parse_iso_date(end_iso)
    days: dict[str, list[dict[str, Any]]] = {}
    for offset in range((end_d - start_d).days + 1):
        day_str = (start_d + timedelta(days=offset)).isoformat()
        days[day_str] = [{**slot, "skipped": False} for slot in defaults]
    return days


def _match_slot(slots: list[dict[str, Any]], meal_type: str) -> tuple[dict[str, Any] | None, str]:
    alias = meal_type.lower()
    slot = next((s for s in slots if s["id"].lower() == alias), None)
    if slot is None:
        slot = next((s for s in slots if s["label"].lower() == alias), None)
    slot_id = slot["id"] if slot else meal_type
    return slot, slot_id


async def _fetch_rule(ctx: PluginContext, rule_id: str, conn: Any = None) -> dict[str, Any]:
    row = await ctx.db.read_one(
        """SELECT r.id, r.weekday, r.meal_type, r.entry_type, r.recipe_id, r.title,
                  r.servings, r.created_at, r.updated_at, rec.title AS recipe_title
           FROM plugin_core_recurring_rules r
           LEFT JOIN recipes rec ON r.recipe_id = rec.id
           WHERE r.id = ?""",
        (rule_id,),
        conn=conn,
    )
    if row is None:
        raise NotFoundError("Recurring rule not found")
    return row


class RuleWrite(BaseModel):
    weekday: int = Field(ge=0, le=6, description="0 = Monday")
    meal_type: str = Field(min_length=1, max_length=64)
    entry_type: Literal["recipe", "note"] | None = None
    recipe_id: str | None = None
    title: str | None = Field(default=None, max_length=500)
    servings: float | None = Field(default=None, gt=0)


class OccurrenceActionRequest(BaseModel):
    date: str


@router.get("/rules")
async def list_rules(ctx: PluginContext = Depends(current_ctx)) -> list[dict[str, Any]]:
    default_servings = await _default_servings(ctx)
    rows = await ctx.db.read_all(
        """SELECT r.id, r.weekday, r.meal_type, r.entry_type, r.recipe_id, r.title,
                  r.servings, r.created_at, r.updated_at, rec.title AS recipe_title
           FROM plugin_core_recurring_rules r
           LEFT JOIN recipes rec ON r.recipe_id = rec.id
           ORDER BY r.weekday, r.meal_type, r.created_at, r.rowid"""
    )
    return [_format_rule(row, default_servings) for row in rows]


@router.post("/rules")
async def create_rule(data: RuleWrite, ctx: PluginContext = Depends(current_ctx)) -> dict[str, Any]:
    validated = await _validate_rule_payload(data, ctx)
    now = _now_iso()
    rule_id = str(uuid.uuid4())
    async with ctx.db.transaction() as tx:
        await tx.execute(
            """INSERT INTO plugin_core_recurring_rules
               (id, weekday, meal_type, entry_type, recipe_id, title, servings, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rule_id,
                validated["weekday"],
                validated["meal_type"],
                validated["entry_type"],
                validated["recipe_id"],
                validated["title"],
                validated["servings"],
                now,
                now,
            ),
        )
        ctx.db.after_commit(lambda: ctx.push("core-recurring:changed", {"action": "created", "rule_id": rule_id}))
    return _format_rule(
        {
            "id": rule_id,
            **validated,
            "created_at": now,
            "updated_at": now,
        },
        validated["servings"],
    )


@router.put("/rules/{rule_id}")
@router.patch("/rules/{rule_id}")
async def update_rule(
    rule_id: str, data: RuleWrite, ctx: PluginContext = Depends(current_ctx)
) -> dict[str, Any]:
    validated = await _validate_rule_payload(data, ctx)
    now = _now_iso()
    today_iso = date.today().isoformat()
    async with ctx.db.transaction() as tx:
        existing = await _fetch_rule(ctx, rule_id, conn=tx)
        await tx.execute(
            """UPDATE plugin_core_recurring_rules
               SET weekday = ?, meal_type = ?, entry_type = ?, recipe_id = ?,
                   title = ?, servings = ?, updated_at = ?
               WHERE id = ?""",
            (
                validated["weekday"],
                validated["meal_type"],
                validated["entry_type"],
                validated["recipe_id"],
                validated["title"],
                validated["servings"],
                now,
                rule_id,
            ),
        )
        slot_changed = (
            int(existing["weekday"]) != validated["weekday"]
            or existing["meal_type"].lower() != validated["meal_type"].lower()
        )
        if slot_changed:
            await tx.execute(
                "DELETE FROM plugin_core_recurring_materialized WHERE rule_id = ? AND date >= ?",
                (rule_id, today_iso),
            )
        else:
            await tx.execute(
                "DELETE FROM plugin_core_recurring_materialized WHERE rule_id = ? AND date >= ? AND status = 'dismissed'",
                (rule_id, today_iso),
            )
        ctx.db.after_commit(lambda: ctx.push("core-recurring:changed", {"action": "updated", "rule_id": rule_id}))
    return _format_rule(
        {
            "id": rule_id,
            **validated,
            "created_at": existing["created_at"],
            "updated_at": now,
        },
        validated["servings"],
    )


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, ctx: PluginContext = Depends(current_ctx)) -> dict[str, bool]:
    async with ctx.db.transaction() as tx:
        await _fetch_rule(ctx, rule_id, conn=tx)
        await tx.execute("DELETE FROM plugin_core_recurring_materialized WHERE rule_id = ?", (rule_id,))
        await tx.execute("DELETE FROM plugin_core_recurring_rules WHERE id = ?", (rule_id,))
        ctx.db.after_commit(lambda: ctx.push("core-recurring:changed", {"action": "deleted", "rule_id": rule_id}))
    return {"ok": True}


@router.get("/suggestions")
async def list_suggestions(
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    ctx: PluginContext = Depends(current_ctx),
) -> list[dict[str, Any]]:
    start = _parse_iso_date(from_date)
    end = _parse_iso_date(to_date)
    if end < start or (end - start).days >= 92:
        raise ValidationError("Suggestion ranges must be ordered and at most 92 days")

    today = date.today()
    effective_start = max(start, today)
    if effective_start > end:
        return []

    default_servings = await _default_servings(ctx)
    raw_rules = await ctx.db.read_all(
        """SELECT r.id, r.weekday, r.meal_type, r.entry_type, r.recipe_id, r.title,
                  r.servings, r.created_at, r.updated_at, rec.title AS recipe_title
           FROM plugin_core_recurring_rules r
           LEFT JOIN recipes rec ON r.recipe_id = rec.id
           ORDER BY r.created_at, r.rowid"""
    )
    if not raw_rules:
        return []

    rules = [_format_rule(r, default_servings) for r in raw_rules]
    start_iso = effective_start.isoformat()
    end_iso = end.isoformat()
    handled_rows = await ctx.db.read_all(
        "SELECT rule_id, date FROM plugin_core_recurring_materialized WHERE date >= ? AND date <= ?",
        (start_iso, end_iso),
    )
    handled = {(row["rule_id"], row["date"]) for row in handled_rows}
    resolved_slots = await _resolve_slots(ctx, start_iso, end_iso)

    suggestions: list[dict[str, Any]] = []
    for offset in range((end - effective_start).days + 1):
        day = effective_start + timedelta(days=offset)
        day_iso = day.isoformat()
        day_weekday = day.weekday()
        slots = resolved_slots.get(day_iso, [])
        for rule in rules:
            if rule["weekday"] != day_weekday:
                continue
            if (rule["id"], day_iso) in handled:
                continue
            slot, slot_id = _match_slot(slots, rule["meal_type"])
            if slot and slot.get("skipped"):
                continue
            suggestions.append(
                {
                    "rule_id": rule["id"],
                    "date": day_iso,
                    "weekday": rule["weekday"],
                    "meal_type": slot_id,
                    "entry_type": rule["entry_type"],
                    "recipe_id": rule["recipe_id"],
                    "recipe_title": rule["recipe_title"],
                    "title": rule["title"],
                    "servings": rule["servings"],
                }
            )
    return suggestions


@router.post("/rules/{rule_id}/approve")
async def approve_rule_occurrence(
    rule_id: str, payload: OccurrenceActionRequest, ctx: PluginContext = Depends(current_ctx)
) -> dict[str, Any]:
    target_date = _parse_iso_date(payload.date)
    day_iso = target_date.isoformat()
    default_servings = await _default_servings(ctx)

    async with ctx.db.transaction() as tx:
        raw_rule = await _fetch_rule(ctx, rule_id, conn=tx)
        rule = _format_rule(raw_rule, default_servings)
        if target_date.weekday() != rule["weekday"]:
            raise ValidationError("Date weekday does not match recurring rule weekday")

        existing = await ctx.db.read_one(
            "SELECT * FROM plugin_core_recurring_materialized WHERE rule_id = ? AND date = ?",
            (rule_id, day_iso),
            conn=tx,
        )
        if existing is not None:
            raise ConflictError("Recurring rule occurrence is already handled for this date", current=dict(existing))

        day_slots = (await _resolve_slots(ctx, day_iso, day_iso, conn=tx))[day_iso]
        slot, slot_id = _match_slot(day_slots, rule["meal_type"])
        if slot and slot.get("skipped"):
            raise ConflictError("Cannot approve recurring meal on a skipped slot")

        entry_data: dict[str, Any] = {
            "date": day_iso,
            "meal_type": slot_id,
            "entry_type": rule["entry_type"],
            "servings_override": rule["servings"],
            "origin": ctx.origin,
        }
        if rule["entry_type"] == "recipe":
            entry_data["recipe_id"] = rule["recipe_id"]
        else:
            entry_data["title"] = rule["title"]

        entry = await ctx.timeline.create_entry(entry_data, conn=tx)
        await tx.execute(
            """INSERT INTO plugin_core_recurring_materialized (rule_id, date, status, entry_id)
               VALUES (?, ?, 'approved', ?)""",
            (rule_id, day_iso, entry["id"]),
        )
        ctx.db.after_commit(
            lambda: ctx.push(
                "core-recurring:changed",
                {"action": "approved", "rule_id": rule_id, "date": day_iso, "entry_id": entry["id"]},
            )
        )

    return {"ok": True, "rule_id": rule_id, "date": day_iso, "status": "approved", "entry": entry}


@router.post("/rules/{rule_id}/dismiss")
async def dismiss_rule_occurrence(
    rule_id: str, payload: OccurrenceActionRequest, ctx: PluginContext = Depends(current_ctx)
) -> dict[str, Any]:
    target_date = _parse_iso_date(payload.date)
    day_iso = target_date.isoformat()

    async with ctx.db.transaction() as tx:
        raw_rule = await _fetch_rule(ctx, rule_id, conn=tx)
        if target_date.weekday() != int(raw_rule["weekday"]):
            raise ValidationError("Date weekday does not match recurring rule weekday")

        existing = await ctx.db.read_one(
            "SELECT * FROM plugin_core_recurring_materialized WHERE rule_id = ? AND date = ?",
            (rule_id, day_iso),
            conn=tx,
        )
        if existing is not None and existing.get("status") == "approved":
            raise ConflictError("Recurring rule occurrence is already approved for this date", current=dict(existing))

        await tx.execute(
            """INSERT INTO plugin_core_recurring_materialized (rule_id, date, status, entry_id)
               VALUES (?, ?, 'dismissed', NULL)
               ON CONFLICT(rule_id, date) DO UPDATE SET status = 'dismissed', entry_id = NULL""",
            (rule_id, day_iso),
        )
        ctx.db.after_commit(
            lambda: ctx.push(
                "core-recurring:changed",
                {"action": "dismissed", "rule_id": rule_id, "date": day_iso},
            )
        )

    return {"ok": True, "rule_id": rule_id, "date": day_iso, "status": "dismissed"}


async def setup(ctx: PluginContext) -> None:
    ctx.router(router)

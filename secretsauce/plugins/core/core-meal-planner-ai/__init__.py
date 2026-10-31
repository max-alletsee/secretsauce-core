from datetime import date, datetime, timedelta, timezone
import json
from typing import Any
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from secretsauce.errors import ConflictError, NotFoundError, SecretSauceError
from secretsauce.plugins.context import PluginContext, current_ctx

PLUGIN = {
    "id": "core-meal-planner-ai",
    "name": "core-meal-planner-ai",
    "version": "1.0.0",
    "description": "Smart meal planning and candidate suggestion pool generation using AI and household preferences",
    "schema": 1,
    "requires": ["core-ai-provider", "core-timeline?"],
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "generate_model_key": {"type": "string", "default": "default"},
        },
    },
}

router = APIRouter(prefix="/api/x/core-meal-planner-ai", tags=["core-meal-planner-ai"])


class AIUnavailableError(SecretSauceError):
    code = "unavailable"
    status_code = 503


class SuggestionSchema(BaseModel):
    recipe_id: str
    recipe_title: str
    meal_type: str = "dinner"
    suggested_date: str | None = None
    reasoning: str | None = None
    confidence: float = 0.9


class MealPlanSchema(BaseModel):
    title: str
    suggestions: list[SuggestionSchema] = Field(default_factory=list)


class GeneratePlanRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=31)
    start_date: str | None = None
    prompt: str | None = None
    meal_types: list[str] = Field(default_factory=lambda: ["dinner"])

    @model_validator(mode='after')
    def validate_window(self):
        try:
            start = date.fromisoformat(self.start_date) if self.start_date is not None else date.today()
            if self.start_date is not None and start.isoformat() != self.start_date:
                raise ValueError()
            start + timedelta(days=self.days - 1)
        except (ValueError, OverflowError):
            raise ValueError('Expected an ISO calendar date and valid planning horizon') from None
        return self


class AcceptSuggestionRequest(BaseModel):
    date: str
    meal_type: str = "dinner"
    servings: float | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


async def _suggestion(ctx: PluginContext, suggestion_id: str, conn: Any = None) -> dict[str, Any]:
    row = await ctx.db.read_one(
        "SELECT * FROM plugin_core_meal_planner_suggestions WHERE id = ?", (suggestion_id,), conn=conn
    )
    if row is None:
        raise NotFoundError("Suggestion not found")
    return dict(row)


@router.post("/generate")
async def generate_plan_endpoint(req: GeneratePlanRequest, ctx: PluginContext = Depends(current_ctx)):
    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    if not ai_svc:
        raise AIUnavailableError("AI Provider service ('core-ai-provider') is not available")

    recipes = (await ctx.recipes.list_recipes(limit=100))["items"]
    library = {r["id"]: r for r in recipes}
    recipes_summary = [
        {"id": r["id"], "title": r["title"], "tags": r.get("tags", [])} for r in recipes
    ]
    members_info = [
        {"name": m.get("name"), "dietary": m.get("dietary_restrictions", [])}
        for m in await ctx.members.list_members()
    ]

    start = date.fromisoformat(req.start_date) if req.start_date else date.today()
    end = start + timedelta(days=req.days - 1)
    timeline = ctx.services.get('core-timeline')
    if timeline:
        resolved = await timeline.slots_for(start.isoformat(), end.isoformat())
        available_slots = {day: [slot['id'] for slot in slots if not slot['skipped']] for day, slots in resolved.items()}
    else:
        defaults = [slot['id'] for slot in (await ctx.household.get_config())['meal_types']]
        available_slots = {(start + timedelta(days=offset)).isoformat(): defaults for offset in range(req.days)}

    ai_prompt = (
        "You are an expert household meal planning assistant.\n"
        "Generate a candidate suggestion pool of meals. IMPORTANT: do not strictly lock meals to fixed dates; "
        "provide an unassigned candidate suggestion pool (suggested_date should be null/omitted) "
        "so the household can pick and schedule what fits best.\n\n"
        f"Planning parameters: {req.days} days, meal types: {req.meal_types}.\n"
        f"Available slots by date: {json.dumps(available_slots)}\n"
        f"User guidance: {req.prompt or 'None'}\n"
        f"Household members: {json.dumps(members_info)}\n"
        f"Available recipes in library: {json.dumps(recipes_summary)}\n\n"
        "Only suggest recipes from the library, by their id. "
        "Return structured meal plan candidates with reasoning and confidence score."
    )

    result = await ai_svc.complete(
        schema=MealPlanSchema,
        prompt=ai_prompt,
        call_type="meal_plan_generate",
        calling_plugin="core-meal-planner-ai",
        model_key=ctx.config.get("generate_model_key") or "default",
    )
    if not isinstance(result, dict):
        result = json.loads(result)

    now = _now_iso()
    plan_id = str(uuid.uuid4())
    title = result.get("title") or f"{req.days}-Day Meal Plan Candidates"
    saved_suggestions = []

    async with ctx.db.transaction() as tx:
        await tx.execute(
            """
            INSERT INTO plugin_core_meal_planner_plans (id, title, start_date, prompt, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (plan_id, title, req.start_date, req.prompt, now),
        )
        for s in result.get("suggestions", []):
            recipe = library.get(s.get("recipe_id"))
            if recipe is None:
                ctx.log.info("Dropping suggestion for unknown recipe %r", s.get("recipe_id"))
                continue
            suggestion = {
                "id": str(uuid.uuid4()),
                "plan_id": plan_id,
                "recipe_id": recipe["id"],
                "recipe_title": s.get("recipe_title") or recipe["title"],
                "meal_type": s.get("meal_type") or "dinner",
                "suggested_date": s.get("suggested_date"),
                "reasoning": s.get("reasoning"),
                "confidence": float(s.get("confidence", 0.9)),
                "status": "suggested",
                "created_at": now,
            }
            await tx.execute(
                """
                INSERT INTO plugin_core_meal_planner_suggestions
                (id, plan_id, recipe_id, recipe_title, meal_type, suggested_date, reasoning, confidence, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                tuple(suggestion[k] for k in (
                    "id", "plan_id", "recipe_id", "recipe_title", "meal_type",
                    "suggested_date", "reasoning", "confidence", "status", "created_at",
                )),
            )
            saved_suggestions.append(suggestion)

    return {
        "id": plan_id,
        "title": title,
        "start_date": req.start_date,
        "prompt": req.prompt,
        "suggestions": saved_suggestions,
        "created_at": now,
    }


@router.get("/plans")
async def list_plans_endpoint(ctx: PluginContext = Depends(current_ctx)):
    return await ctx.db.fetch_all(
        "SELECT * FROM plugin_core_meal_planner_plans ORDER BY created_at DESC LIMIT 20"
    )


@router.get("/plans/{plan_id}")
async def get_plan_endpoint(plan_id: str, ctx: PluginContext = Depends(current_ctx)):
    plan = await ctx.db.fetch_one("SELECT * FROM plugin_core_meal_planner_plans WHERE id = ?", (plan_id,))
    if not plan:
        raise NotFoundError("Plan not found")
    plan["suggestions"] = await ctx.db.fetch_all(
        "SELECT * FROM plugin_core_meal_planner_suggestions WHERE plan_id = ? ORDER BY created_at ASC",
        (plan_id,),
    )
    return plan


@router.post("/suggestions/{suggestion_id}/accept")
async def accept_suggestion_endpoint(
    suggestion_id: str, req: AcceptSuggestionRequest, ctx: PluginContext = Depends(current_ctx)
):
    # The schedule entry and the suggestion's status commit together or not at all.
    async with ctx.db.transaction() as tx:
        sug = await _suggestion(ctx, suggestion_id, conn=tx)
        if sug["status"] != "suggested":
            raise ConflictError(f"Suggestion is already {sug['status']}", current=sug)
        entry = await ctx.timeline.create_entry(
            {
                "date": req.date,
                "meal_type": req.meal_type,
                "recipe_id": sug["recipe_id"],
                "title": sug["recipe_title"],
                "servings_override": req.servings,
                "note": f"Accepted AI meal suggestion: {sug.get('reasoning') or ''}".strip(),
            },
            conn=tx,
        )
        await tx.execute(
            """
            UPDATE plugin_core_meal_planner_suggestions
            SET status = 'accepted', schedule_entry_id = ?
            WHERE id = ?
            """,
            (entry["id"], suggestion_id),
        )
    sug.update(status="accepted", schedule_entry_id=entry["id"])
    return sug


@router.post("/suggestions/{suggestion_id}/dismiss")
async def dismiss_suggestion_endpoint(suggestion_id: str, ctx: PluginContext = Depends(current_ctx)):
    async with ctx.db.transaction() as tx:
        sug = await _suggestion(ctx, suggestion_id, conn=tx)
        await tx.execute(
            "UPDATE plugin_core_meal_planner_suggestions SET status = 'dismissed' WHERE id = ?",
            (suggestion_id,),
        )
    sug["status"] = "dismissed"
    return sug


async def setup(ctx: PluginContext):
    ctx.router(router)

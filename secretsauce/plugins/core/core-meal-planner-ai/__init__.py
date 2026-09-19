from datetime import datetime, timezone
import json
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "core-meal-planner-ai",
    "name": "core-meal-planner-ai",
    "version": "1.0.0",
    "description": "Smart meal planning and candidate suggestion pool generation using AI and household preferences",
    "core": True,
    "schema": 1,
    "requires": ["core-ai-provider"],
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/core-meal-planner-ai", tags=["core-meal-planner-ai"])


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
    days: int = 7
    start_date: str | None = None
    prompt: str | None = None
    meal_types: list[str] = Field(default_factory=lambda: ["dinner"])


class AcceptSuggestionRequest(BaseModel):
    date: str
    meal_type: str = "dinner"
    servings: float | None = None


@router.post("/generate")
async def generate_plan_endpoint(req: GeneratePlanRequest, request: Request):
    kernel = request.app.state.kernel
    ctx = kernel.ctx_for("core-meal-planner-ai")
    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    if not ai_svc:
        raise HTTPException(status_code=503, detail="AI Provider service ('core-ai-provider') is not available")

    # Fetch available recipes
    recipes_res = await ctx.recipes.list_recipes(limit=100)
    recipes = recipes_res.get("items", []) if isinstance(recipes_res, dict) else recipes_res
    recipes_summary = [
        {"id": r["id"], "title": r["title"], "tags": r.get("tags", [])}
        for r in recipes
    ]

    # Fetch members info if available
    members_info = []
    if hasattr(ctx, "members") and ctx.members:
        try:
            m_list = await ctx.members.list_members()
            members_info = [
                {"name": m.get("display_name"), "dietary": m.get("dietary_restrictions", [])}
                for m in m_list
            ]
        except Exception:
            pass

    ai_prompt = (
        "You are an expert household meal planning assistant.\n"
        "Generate a candidate suggestion pool of meals. IMPORTANT: do not strictly lock meals to fixed dates; "
        "provide an unassigned candidate suggestion pool (suggested_date should be null/omitted) "
        "so the household can pick and schedule what fits best.\n\n"
        f"Planning parameters: {req.days} days, meal types: {req.meal_types}.\n"
        f"User guidance: {req.prompt or 'None'}\n"
        f"Household members: {json.dumps(members_info)}\n"
        f"Available recipes in library: {json.dumps(recipes_summary)}\n\n"
        "Return structured meal plan candidates with reasoning and confidence score."
    )

    result = await ai_svc.complete(
        schema=MealPlanSchema,
        prompt=ai_prompt,
        call_type="meal_plan_generate",
        calling_plugin="core-meal-planner-ai",
    )
    if not isinstance(result, dict):
        result = json.loads(result)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    plan_id = str(uuid.uuid4())
    title = result.get("title") or f"{req.days}-Day Meal Plan Candidates"

    await ctx.db.write(
        """
        INSERT INTO plugin_core_meal_planner_plans (id, title, start_date, prompt, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (plan_id, title, req.start_date, req.prompt, now),
    )

    saved_suggestions = []
    for s in result.get("suggestions", []):
        s_id = str(uuid.uuid4())
        r_id = s.get("recipe_id")
        r_title = s.get("recipe_title") or "Suggested Recipe"
        m_type = s.get("meal_type") or "dinner"
        s_date = s.get("suggested_date")
        reasoning = s.get("reasoning")
        confidence = float(s.get("confidence", 0.9))

        await ctx.db.write(
            """
            INSERT INTO plugin_core_meal_planner_suggestions
            (id, plan_id, recipe_id, recipe_title, meal_type, suggested_date, reasoning, confidence, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'suggested', ?)
            """,
            (s_id, plan_id, r_id, r_title, m_type, s_date, reasoning, confidence, now),
        )
        saved_suggestions.append({
            "id": s_id,
            "plan_id": plan_id,
            "recipe_id": r_id,
            "recipe_title": r_title,
            "meal_type": m_type,
            "suggested_date": s_date,
            "reasoning": reasoning,
            "confidence": confidence,
            "status": "suggested",
            "created_at": now,
        })

    return {
        "id": plan_id,
        "title": title,
        "start_date": req.start_date,
        "prompt": req.prompt,
        "suggestions": saved_suggestions,
        "created_at": now,
    }


@router.get("/plans")
async def list_plans_endpoint(request: Request):
    kernel = request.app.state.kernel
    rows = await kernel.db.read_all(
        "SELECT * FROM plugin_core_meal_planner_plans ORDER BY created_at DESC LIMIT 20"
    )
    return [dict(r) for r in rows]


@router.get("/plans/{plan_id}")
async def get_plan_endpoint(plan_id: str, request: Request):
    kernel = request.app.state.kernel
    plan_row = await kernel.db.read_one(
        "SELECT * FROM plugin_core_meal_planner_plans WHERE id = ?", (plan_id,)
    )
    if not plan_row:
        raise HTTPException(status_code=404, detail="Plan not found")

    sug_rows = await kernel.db.read_all(
        "SELECT * FROM plugin_core_meal_planner_suggestions WHERE plan_id = ? ORDER BY created_at ASC",
        (plan_id,),
    )
    res = dict(plan_row)
    res["suggestions"] = [dict(s) for s in sug_rows]
    return res


@router.post("/suggestions/{suggestion_id}/accept")
async def accept_suggestion_endpoint(suggestion_id: str, req: AcceptSuggestionRequest, request: Request):
    kernel = request.app.state.kernel
    ctx = kernel.ctx_for("core-meal-planner-ai")

    sug_row = await kernel.db.read_one(
        "SELECT * FROM plugin_core_meal_planner_suggestions WHERE id = ?", (suggestion_id,)
    )
    if not sug_row:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    sug = dict(sug_row)

    # Schedule meal
    sched_entry = await ctx.schedule.create_entry({
        "date": req.date,
        "meal_type": req.meal_type,
        "recipe_id": sug["recipe_id"],
        "title": sug["recipe_title"],
        "servings_override": req.servings,
        "note": f"Accepted AI meal suggestion: {sug.get('reasoning') or ''}".strip(),
    })

    await kernel.db.write(
        """
        UPDATE plugin_core_meal_planner_suggestions
        SET status = 'accepted', schedule_entry_id = ?
        WHERE id = ?
        """,
        (sched_entry["id"], suggestion_id),
    )

    sug["status"] = "accepted"
    sug["schedule_entry_id"] = sched_entry["id"]
    return sug


@router.post("/suggestions/{suggestion_id}/dismiss")
async def dismiss_suggestion_endpoint(suggestion_id: str, request: Request):
    kernel = request.app.state.kernel
    sug_row = await kernel.db.read_one(
        "SELECT * FROM plugin_core_meal_planner_suggestions WHERE id = ?", (suggestion_id,)
    )
    if not sug_row:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    await kernel.db.write(
        "UPDATE plugin_core_meal_planner_suggestions SET status = 'dismissed' WHERE id = ?",
        (suggestion_id,),
    )
    sug = dict(sug_row)
    sug["status"] = "dismissed"
    return sug


class MealPlannerAiService:
    def __init__(self, ctx: PluginContext):
        self.ctx = ctx


async def setup(ctx: PluginContext):
    service = MealPlannerAiService(ctx)
    ctx.services.register("core-meal-planner-ai", service)
    ctx.routes.mount(router)

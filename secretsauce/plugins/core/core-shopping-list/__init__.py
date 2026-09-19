from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from pydantic import BaseModel, Field
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "core-shopping-list",
    "name": "core-shopping-list",
    "version": "1.0.0",
    "description": "Dynamic shopping list aggregated from scheduled meal recipes with serving scaling and household pantry staples",
    "core": True,
    "schema": 1,
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/core-shopping-list", tags=["core-shopping-list"])


def _make_key(name: str, unit: str | None) -> str:
    n = name.strip().lower()
    u = (unit or "").strip().lower()
    return f"{n}_{u}"


def _categorize_ingredient(name: str) -> str:
    n = name.lower()
    if any(w in n for w in ["apple", "banana", "onion", "garlic", "lemon", "tomato", "potato", "carrot", "herb", "spinach", "lettuce", "cilantro", "parsley"]):
        return "Produce"
    if any(w in n for w in ["milk", "cheese", "butter", "yogurt", "cream", "egg"]):
        return "Dairy & Eggs"
    if any(w in n for w in ["chicken", "beef", "pork", "steak", "fish", "salmon", "shrimp"]):
        return "Meat & Seafood"
    if any(w in n for w in ["flour", "sugar", "oil", "pasta", "rice", "salt", "pepper", "spice", "vinegar", "can", "sauce"]):
        return "Pantry"
    if any(w in n for w in ["bread", "tortilla", "bun", "bagel"]):
        return "Bakery"
    return "Other"


class StapleCreateRequest(BaseModel):
    name: str
    default_quantity: float = 1.0
    unit: str | None = None
    category: str = "Pantry"
    always_include: bool = False


class ManualItemCreateRequest(BaseModel):
    name: str
    quantity: float | None = None
    unit: str | None = None
    category: str = "Other"


class ToggleCheckedRequest(BaseModel):
    key: str
    checked: bool


@router.get("")
async def get_aggregated_shopping_list(
    request: Request,
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
):
    kernel = request.app.state.kernel
    ctx = kernel.ctx_for("core-shopping-list")

    # Load checked state map
    checked_rows = await kernel.db.read_all("SELECT item_key, checked FROM plugin_core_shopping_list_checked_state")
    checked_map = {r["item_key"]: bool(r["checked"]) for r in checked_rows}

    items_map: dict[str, dict[str, Any]] = {}

    # 1. Scheduled meal entries
    if from_date and to_date and hasattr(ctx, "schedule") and ctx.schedule:
        entries = await ctx.schedule.list_entries(from_date=from_date, to_date=to_date)
        for entry in entries:
            recipe_id = entry.get("recipe_id")
            if not recipe_id:
                continue
            try:
                recipe = await ctx.recipes.get_recipe(recipe_id)
            except Exception:
                continue

            base_servings = float(recipe.get("servings") or 2.0)
            servings_override = entry.get("servings_override")
            scale_factor = (float(servings_override) / base_servings) if servings_override else 1.0

            for ing in recipe.get("ingredients", []):
                name = ing.get("name") or "Ingredient"
                raw_qty = ing.get("quantity")
                unit = ing.get("unit")
                scaled_qty = (float(raw_qty) * scale_factor) if raw_qty is not None else None

                key = _make_key(name, unit)
                if key in items_map:
                    if scaled_qty is not None and items_map[key]["quantity"] is not None:
                        items_map[key]["quantity"] += scaled_qty
                    items_map[key]["sources"].append({
                        "recipe_title": recipe.get("title"),
                        "scaled_qty": scaled_qty,
                        "date": entry.get("date"),
                    })
                else:
                    items_map[key] = {
                        "key": key,
                        "name": name,
                        "quantity": scaled_qty,
                        "unit": unit,
                        "category": _categorize_ingredient(name),
                        "source_type": "scheduled_recipe",
                        "checked": checked_map.get(key, False),
                        "sources": [{
                            "recipe_title": recipe.get("title"),
                            "scaled_qty": scaled_qty,
                            "date": entry.get("date"),
                        }],
                    }

    # 2. Staples with always_include = 1
    staples = await kernel.db.read_all("SELECT * FROM plugin_core_shopping_list_staples WHERE always_include = 1")
    for staple in staples:
        key = _make_key(staple["name"], staple["unit"])
        if key not in items_map:
            items_map[key] = {
                "key": key,
                "name": staple["name"],
                "quantity": float(staple["default_quantity"]) if staple["default_quantity"] is not None else None,
                "unit": staple["unit"],
                "category": staple["category"] or "Pantry",
                "source_type": "staple",
                "checked": checked_map.get(key, False),
                "sources": [{"recipe_title": "Pantry Staple"}],
            }

    # 3. Manual items
    manual_rows = await kernel.db.read_all("SELECT * FROM plugin_core_shopping_list_items")
    for m in manual_rows:
        key = _make_key(m["name"], m["unit"])
        if key not in items_map:
            items_map[key] = {
                "key": key,
                "id": m["id"],
                "name": m["name"],
                "quantity": m["quantity"],
                "unit": m["unit"],
                "category": m["category"] or "Other",
                "source_type": "manual",
                "checked": bool(m["checked"]),
                "sources": [{"recipe_title": "Manual Item"}],
            }

    return {
        "items": list(items_map.values()),
        "from_date": from_date,
        "to_date": to_date,
    }


@router.post("/toggle")
async def toggle_checked_endpoint(req: ToggleCheckedRequest, request: Request):
    kernel = request.app.state.kernel
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    await kernel.db.write(
        """
        INSERT INTO plugin_core_shopping_list_checked_state (item_key, checked, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(item_key) DO UPDATE SET checked = excluded.checked, updated_at = excluded.updated_at
        """,
        (req.key, 1 if req.checked else 0, now),
    )

    # If it's a manual item, also update plugin_core_shopping_list_items
    await kernel.db.write(
        "UPDATE plugin_core_shopping_list_items SET checked = ?, updated_at = ? WHERE id = ?",
        (1 if req.checked else 0, now, req.key),
    )

    return {"key": req.key, "checked": req.checked}


@router.get("/staples")
async def list_staples_endpoint(request: Request):
    kernel = request.app.state.kernel
    rows = await kernel.db.read_all("SELECT * FROM plugin_core_shopping_list_staples ORDER BY name ASC")
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "default_quantity": r["default_quantity"],
            "unit": r["unit"],
            "category": r["category"],
            "always_include": bool(r["always_include"]),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


@router.post("/staples", status_code=status.HTTP_201_CREATED)
async def create_staple_endpoint(req: StapleCreateRequest, request: Request):
    kernel = request.app.state.kernel
    staple_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    await kernel.db.write(
        """
        INSERT INTO plugin_core_shopping_list_staples
        (id, name, default_quantity, unit, category, always_include, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (staple_id, req.name, req.default_quantity, req.unit, req.category, 1 if req.always_include else 0, now),
    )

    return {
        "id": staple_id,
        "name": req.name,
        "default_quantity": req.default_quantity,
        "unit": req.unit,
        "category": req.category,
        "always_include": req.always_include,
        "created_at": now,
    }


@router.delete("/staples/{staple_id}")
async def delete_staple_endpoint(staple_id: str, request: Request):
    kernel = request.app.state.kernel
    await kernel.db.write("DELETE FROM plugin_core_shopping_list_staples WHERE id = ?", (staple_id,))
    return {"status": "deleted", "id": staple_id}


@router.post("/items", status_code=status.HTTP_201_CREATED)
async def create_manual_item_endpoint(req: ManualItemCreateRequest, request: Request):
    kernel = request.app.state.kernel
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    await kernel.db.write(
        """
        INSERT INTO plugin_core_shopping_list_items
        (id, name, quantity, unit, category, checked, source_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 'manual', ?, ?)
        """,
        (item_id, req.name, req.quantity, req.unit, req.category, now, now),
    )

    return {
        "id": item_id,
        "name": req.name,
        "quantity": req.quantity,
        "unit": req.unit,
        "category": req.category,
        "checked": False,
        "source_type": "manual",
        "created_at": now,
    }


@router.delete("/items/{item_id}")
async def delete_manual_item_endpoint(item_id: str, request: Request):
    kernel = request.app.state.kernel
    await kernel.db.write("DELETE FROM plugin_core_shopping_list_items WHERE id = ?", (item_id,))
    return {"status": "deleted", "id": item_id}


class ShoppingListService:
    def __init__(self, ctx: PluginContext):
        self.ctx = ctx


async def setup(ctx: PluginContext):
    service = ShoppingListService(ctx)
    ctx.services.register("core-shopping-list", service)
    ctx.routes.mount(router)

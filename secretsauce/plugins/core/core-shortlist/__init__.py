from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Query, Request, Response
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "core-shortlist",
    "name": "core-shortlist",
    "version": "1.0.0",
    "description": "Quick favorites and shortlisted meals per household member",
    "core": True,
    "schema": 1,
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/core-shortlist", tags=["core-shortlist"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.get("")
async def list_shortlist(
    request: Request,
    member_id: str | None = Query(None),
) -> list[dict[str, Any]]:
    kernel = request.app.state.kernel
    target_member = member_id or request.headers.get("x-actor-member")

    if target_member:
        rows = await kernel.db.read_all(
            """SELECT s.id, s.member_id, s.recipe_id, s.note, s.created_at, r.title as recipe_title
               FROM plugin_core_shortlist_entries s
               JOIN recipes r ON s.recipe_id = r.id
               WHERE s.member_id = ?
               ORDER BY s.created_at DESC;""",
            (target_member,),
        )
    else:
        rows = await kernel.db.read_all(
            """SELECT s.id, s.member_id, s.recipe_id, s.note, s.created_at, r.title as recipe_title
               FROM plugin_core_shortlist_entries s
               JOIN recipes r ON s.recipe_id = r.id
               ORDER BY s.created_at DESC;"""
        )
    return [dict(row) for row in rows]


@router.post("", status_code=201)
async def add_to_shortlist(data: dict[str, Any], request: Request) -> dict[str, Any]:
    kernel = request.app.state.kernel
    member_id = data.get("member_id") or request.headers.get("x-actor-member")
    if not member_id:
        raise HTTPException(status_code=400, detail="Missing member_id")

    recipe_id = data["recipe_id"]
    try:
        await kernel.recipes.get_recipe(recipe_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Recipe not found")

    entry_id = str(uuid.uuid4()).lower()
    now = _now_iso()
    note = data.get("note")

    await kernel.db.write(
        """INSERT INTO plugin_core_shortlist_entries (id, member_id, recipe_id, note, created_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(member_id, recipe_id) DO UPDATE SET note = excluded.note;""",
        (entry_id, member_id, recipe_id, note, now),
    )
    return {
        "id": entry_id,
        "member_id": member_id,
        "recipe_id": recipe_id,
        "note": note,
        "created_at": now,
    }


@router.delete("/{recipe_id}", status_code=204)
async def remove_from_shortlist(recipe_id: str, request: Request):
    kernel = request.app.state.kernel
    member_id = request.headers.get("x-actor-member")
    if not member_id:
        await kernel.db.write("DELETE FROM plugin_core_shortlist_entries WHERE recipe_id = ?;", (recipe_id,))
    else:
        await kernel.db.write(
            "DELETE FROM plugin_core_shortlist_entries WHERE recipe_id = ? AND member_id = ?;",
            (recipe_id, member_id),
        )
    return Response(status_code=204)


async def setup(ctx: PluginContext):
    ctx.routes.mount(router)

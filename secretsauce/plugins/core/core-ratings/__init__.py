"""Ratings plugin: household member upvotes/downvotes and recipe score mirroring."""

from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

PLUGIN = {
    "id": "core-ratings",
    "name": "core-ratings",
    "version": "1.0.0",
    "description": "Household member meal votes (upvote/downvote) and recipe rating indexing",
    "schema": 1,
    "core": True,
    "ui": "ui.js",
}


class VoteDraft(BaseModel):
    journal_id: str
    member_id: str
    score: int = Field(..., description="+1 for upvote, -1 for downvote")


async def update_recipe_score_mirror(ctx, journal_id: str) -> None:
    try:
        journal_row = await ctx.journal.get_entry(journal_id)
    except Exception:
        return
    if not journal_row or not journal_row.get("recipe_id"):
        return
    recipe_id = journal_row["recipe_id"]
    try:
        recipe_row = await ctx.recipes.get_recipe(recipe_id)
    except Exception:
        return
    if not recipe_row:
        return
    group_id = recipe_row["group_id"]

    row = await ctx.db.read_one(
        """
        SELECT SUM(r.score) as net_score, COUNT(r.score) as total_votes
        FROM plugin_core_ratings_scores r
        JOIN cook_journal j ON r.journal_id = j.id
        JOIN recipes rec ON j.recipe_id = rec.id
        WHERE rec.group_id = ?
        """,
        (group_id,),
    )
    if row and row.get("total_votes") and row["total_votes"] > 0:
        await ctx.attributes.set("recipe", group_id, "score", int(row["net_score"]))
    else:
        await ctx.attributes.delete("recipe", group_id, "score")


async def rebuild(ctx) -> dict[str, Any]:
    rows = await ctx.db.read_all(
        """
        SELECT rec.group_id, SUM(r.score) as net_score
        FROM plugin_core_ratings_scores r
        JOIN cook_journal j ON r.journal_id = j.id
        JOIN recipes rec ON j.recipe_id = rec.id
        GROUP BY rec.group_id
        """
    )
    for r in rows:
        await ctx.attributes.set("recipe", r["group_id"], "score", int(r["net_score"]))
    return {"status": "ok", "recomputed": len(rows)}


async def setup(ctx):
    router = APIRouter(prefix="/api/x/core-ratings", tags=["core-ratings"])

    @router.get("")
    async def get_ratings(journal_id: str = Query(...)):
        rows = await ctx.db.read_all(
            "SELECT member_id, score FROM plugin_core_ratings_scores WHERE journal_id = ?",
            (journal_id,),
        )
        scores = [dict(r) for r in rows]
        net = sum(r["score"] for r in scores) if scores else 0
        return {"scores": scores, "net_score": net}

    @router.put("")
    async def set_vote(draft: VoteDraft):
        if draft.score not in (-1, 1):
            raise HTTPException(status_code=400, detail="Score must be 1 or -1")
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        await ctx.db.write(
            """
            INSERT INTO plugin_core_ratings_scores (journal_id, member_id, score, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(journal_id, member_id) DO UPDATE SET score = excluded.score, created_at = excluded.created_at
            """,
            (draft.journal_id, draft.member_id, draft.score, now),
        )
        await update_recipe_score_mirror(ctx, draft.journal_id)
        rows = await ctx.db.read_all(
            "SELECT score FROM plugin_core_ratings_scores WHERE journal_id = ?",
            (draft.journal_id,),
        )
        return {"status": "ok", "net_score": sum(r["score"] for r in rows)}

    @router.delete("")
    async def delete_vote(journal_id: str = Query(...), member_id: str = Query(...)):
        await ctx.db.write(
            "DELETE FROM plugin_core_ratings_scores WHERE journal_id = ? AND member_id = ?",
            (journal_id, member_id),
        )
        await update_recipe_score_mirror(ctx, journal_id)
        return {"status": "ok"}

    ctx.router(router)
    ctx.command("rebuild", rebuild, title="Recompute all recipe rating scores in entity_attributes")

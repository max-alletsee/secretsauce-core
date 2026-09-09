from datetime import datetime, timezone
from typing import Any
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.recipes import RecipesRepo


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _deserialize_journal(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    if res.get("servings_cooked") is not None:
        res["servings_cooked"] = float(res["servings_cooked"])
    if res.get("servings_left") is not None:
        res["servings_left"] = float(res["servings_left"])
    return res


class JournalRepo:
    def __init__(self, db: Database, recipes_repo: RecipesRepo | None = None):
        self.db = db
        self.recipes_repo = recipes_repo or RecipesRepo(db)

    async def get_entry(
        self,
        entry_id: str,
        lang: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM cook_journal WHERE id = ?;", (entry_id,), conn=conn
        )
        if row is None:
            raise NotFoundError(f"Journal entry '{entry_id}' not found")

        res = _deserialize_journal(row)
        res["recipe"] = None
        if res.get("recipe_id"):
            try:
                res["recipe"] = await self.recipes_repo.get_recipe(
                    res["recipe_id"], lang=lang, conn=conn
                )
            except NotFoundError:
                res["recipe"] = None

        return res

    async def create_entry(
        self, data: dict[str, Any], conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        entry_id = data.get("id") or str(uuid.uuid4()).lower()

        existing = await self.db.read_one(
            "SELECT * FROM cook_journal WHERE id = ?;", (entry_id,), conn=conn
        )
        if existing is not None:
            raise ConflictError(
                f"Journal entry '{entry_id}' already exists",
                current=_deserialize_journal(existing),
            )

        schedule_entry_id = data.get("schedule_entry_id")
        if schedule_entry_id is not None:
            existing_sched = await self.db.read_one(
                "SELECT * FROM cook_journal WHERE schedule_entry_id = ?;",
                (schedule_entry_id,),
                conn=conn,
            )
            if existing_sched is not None:
                raise ConflictError(
                    f"Journal entry already exists for schedule entry '{schedule_entry_id}'",
                    current=_deserialize_journal(existing_sched),
                )

        now = _now_iso()
        revision = 1
        date = data["date"]
        meal_type = data["meal_type"]
        recipe_id = data.get("recipe_id")
        title = data.get("title")
        status = data["status"]
        servings_cooked = (
            float(data["servings_cooked"])
            if data.get("servings_cooked") is not None
            else None
        )
        servings_left = (
            float(data["servings_left"])
            if data.get("servings_left") is not None
            else None
        )
        cooked_by_member_id = data.get("cooked_by_member_id")
        notes = data.get("notes")
        actor_member_id = data.get("actor_member_id")
        origin = data.get("origin", "member")

        sql = """
        INSERT INTO cook_journal (
            id, revision, date, meal_type, recipe_id, schedule_entry_id,
            title, status, servings_cooked, servings_left,
            cooked_by_member_id, notes, created_at, updated_at,
            actor_member_id, origin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        params = (
            entry_id,
            revision,
            date,
            meal_type,
            recipe_id,
            schedule_entry_id,
            title,
            status,
            servings_cooked,
            servings_left,
            cooked_by_member_id,
            notes,
            now,
            now,
            actor_member_id,
            origin,
        )

        if conn is not None:
            await conn.execute(sql, params)
        else:
            async with self.db.transaction() as writer_conn:
                await writer_conn.execute(sql, params)

        return await self.get_entry(entry_id, conn=conn)

    async def update_entry(
        self,
        entry_id: str,
        revision: int,
        data: dict[str, Any],
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        async def _do_update(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            current = await self.get_entry(entry_id, conn=writer_conn)
            if current["revision"] != revision:
                raise ConflictError("Revision mismatch", current=current)

            new_revision = current["revision"] + 1
            now = _now_iso()

            date = data.get("date", current["date"])
            meal_type = data.get("meal_type", current["meal_type"])
            recipe_id = (
                data["recipe_id"]
                if "recipe_id" in data
                else current.get("recipe_id")
            )
            title = data["title"] if "title" in data else current.get("title")
            status = data.get("status", current["status"])
            servings_cooked = (
                float(data["servings_cooked"])
                if "servings_cooked" in data
                and data["servings_cooked"] is not None
                else (
                    None
                    if "servings_cooked" in data
                    else current.get("servings_cooked")
                )
            )
            servings_left = (
                float(data["servings_left"])
                if "servings_left" in data and data["servings_left"] is not None
                else (
                    None
                    if "servings_left" in data
                    else current.get("servings_left")
                )
            )
            cooked_by_member_id = (
                data["cooked_by_member_id"]
                if "cooked_by_member_id" in data
                else current.get("cooked_by_member_id")
            )
            notes = data["notes"] if "notes" in data else current.get("notes")
            actor_member_id = (
                data["actor_member_id"]
                if "actor_member_id" in data
                else current.get("actor_member_id")
            )
            origin = data.get("origin", current.get("origin", "member"))

            await writer_conn.execute(
                """
                UPDATE cook_journal SET
                    revision = ?,
                    date = ?,
                    meal_type = ?,
                    recipe_id = ?,
                    title = ?,
                    status = ?,
                    servings_cooked = ?,
                    servings_left = ?,
                    cooked_by_member_id = ?,
                    notes = ?,
                    updated_at = ?,
                    actor_member_id = ?,
                    origin = ?
                WHERE id = ?;
                """,
                (
                    new_revision,
                    date,
                    meal_type,
                    recipe_id,
                    title,
                    status,
                    servings_cooked,
                    servings_left,
                    cooked_by_member_id,
                    notes,
                    now,
                    actor_member_id,
                    origin,
                    entry_id,
                ),
            )
            return await self.get_entry(entry_id, conn=writer_conn)

        if conn is not None:
            return await _do_update(conn)
        else:
            async with self.db.transaction() as writer_conn:
                return await _do_update(writer_conn)

    async def delete_entry(
        self,
        entry_id: str,
        revision: int | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> None:
        async def _do_delete(writer_conn: aiosqlite.Connection) -> None:
            current = await self.get_entry(entry_id, conn=writer_conn)
            if revision is not None and current["revision"] != revision:
                raise ConflictError("Revision mismatch", current=current)

            # Section 4.4: Delete assets and attributes for journal entry
            await writer_conn.execute(
                "DELETE FROM assets WHERE entity_type = 'journal' AND entity_id = ?;",
                (entry_id,),
            )
            await writer_conn.execute(
                "DELETE FROM entity_attributes WHERE entity_type = 'journal' AND entity_id = ?;",
                (entry_id,),
            )
            await writer_conn.execute(
                "DELETE FROM cook_journal WHERE id = ?;", (entry_id,)
            )

        if conn is not None:
            await _do_delete(conn)
        else:
            async with self.db.transaction() as writer_conn:
                await _do_delete(writer_conn)

    async def list_entries(
        self,
        from_date: str,
        to_date: str,
        lang: str | None = None,
        sort: str = "date",
        conn: aiosqlite.Connection | None = None,
    ) -> list[dict[str, Any]]:
        rows = await self.db.read_all(
            """
            SELECT * FROM cook_journal
            WHERE date >= ? AND date <= ?
            ORDER BY date ASC;
            """,
            (from_date, to_date),
            conn=conn,
        )
        results: list[dict[str, Any]] = []
        for r in rows:
            entry = _deserialize_journal(r)
            entry["recipe"] = None
            if entry.get("recipe_id"):
                try:
                    entry["recipe"] = await self.recipes_repo.get_recipe(
                        entry["recipe_id"], lang=lang, conn=conn
                    )
                except NotFoundError:
                    entry["recipe"] = None
            results.append(entry)
        return results

from datetime import datetime, timezone
import json
from typing import Any
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.nouns.recipes import RecipesRepo


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _deserialize_schedule(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    participants = res.get("participant_member_ids")
    if isinstance(participants, str):
        try:
            res["participant_member_ids"] = json.loads(participants)
        except (json.JSONDecodeError, TypeError):
            res["participant_member_ids"] = []
    elif participants is None:
        res["participant_member_ids"] = []

    if res.get("servings_override") is not None:
        res["servings_override"] = float(res["servings_override"])
    return res


class ScheduleRepo:
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
            "SELECT * FROM schedule_entries WHERE id = ?;", (entry_id,), conn=conn
        )
        if row is None:
            raise NotFoundError(f"Schedule entry '{entry_id}' not found")

        res = _deserialize_schedule(row)
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
            "SELECT * FROM schedule_entries WHERE id = ?;", (entry_id,), conn=conn
        )
        if existing is not None:
            raise ConflictError(
                f"Schedule entry '{entry_id}' already exists",
                current=_deserialize_schedule(existing),
            )

        now = _now_iso()
        revision = 1
        date = data["date"]
        meal_type = data["meal_type"]
        entry_type = data.get("entry_type", "recipe")
        recipe_id = data.get("recipe_id")
        title = data.get("title")
        note = data.get("note")
        servings_override = (
            float(data["servings_override"])
            if data.get("servings_override") is not None
            else None
        )
        position = int(data.get("position", 0))
        assigned_cook_id = data.get("assigned_cook_id")
        participants = json.dumps(data.get("participant_member_ids") or [])
        actor_member_id = data.get("actor_member_id")
        origin = data.get("origin", "member")

        sql = """
        INSERT INTO schedule_entries (
            id, revision, date, meal_type, entry_type, recipe_id,
            title, note, servings_override, position, assigned_cook_id,
            participant_member_ids, created_at, updated_at, actor_member_id, origin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        params = (
            entry_id,
            revision,
            date,
            meal_type,
            entry_type,
            recipe_id,
            title,
            note,
            servings_override,
            position,
            assigned_cook_id,
            participants,
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
            entry_type = data.get("entry_type", current["entry_type"])
            recipe_id = (
                data["recipe_id"]
                if "recipe_id" in data
                else current.get("recipe_id")
            )
            title = data["title"] if "title" in data else current.get("title")
            note = data["note"] if "note" in data else current.get("note")
            servings_override = (
                float(data["servings_override"])
                if "servings_override" in data
                and data["servings_override"] is not None
                else (
                    None
                    if "servings_override" in data
                    else current.get("servings_override")
                )
            )
            position = int(data.get("position", current.get("position", 0)))
            assigned_cook_id = (
                data["assigned_cook_id"]
                if "assigned_cook_id" in data
                else current.get("assigned_cook_id")
            )
            participants = json.dumps(
                data.get(
                    "participant_member_ids",
                    current.get("participant_member_ids", []),
                )
            )
            actor_member_id = (
                data["actor_member_id"]
                if "actor_member_id" in data
                else current.get("actor_member_id")
            )
            origin = data.get("origin", current.get("origin", "member"))

            await writer_conn.execute(
                """
                UPDATE schedule_entries SET
                    revision = ?,
                    date = ?,
                    meal_type = ?,
                    entry_type = ?,
                    recipe_id = ?,
                    title = ?,
                    note = ?,
                    servings_override = ?,
                    position = ?,
                    assigned_cook_id = ?,
                    participant_member_ids = ?,
                    updated_at = ?,
                    actor_member_id = ?,
                    origin = ?
                WHERE id = ?;
                """,
                (
                    new_revision,
                    date,
                    meal_type,
                    entry_type,
                    recipe_id,
                    title,
                    note,
                    servings_override,
                    position,
                    assigned_cook_id,
                    participants,
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

            # Section 4.4: Delete assets and attributes for schedule entry
            await writer_conn.execute(
                "DELETE FROM assets WHERE entity_type = 'schedule_entry' AND entity_id = ?;",
                (entry_id,),
            )
            await writer_conn.execute(
                "DELETE FROM entity_attributes WHERE entity_type = 'schedule_entry' AND entity_id = ?;",
                (entry_id,),
            )
            await writer_conn.execute(
                "DELETE FROM schedule_entries WHERE id = ?;", (entry_id,)
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
        sort: str = "date,position",
        conn: aiosqlite.Connection | None = None,
    ) -> list[dict[str, Any]]:
        rows = await self.db.read_all(
            """
            SELECT * FROM schedule_entries
            WHERE date >= ? AND date <= ?
            ORDER BY date ASC, position ASC;
            """,
            (from_date, to_date),
            conn=conn,
        )
        results: list[dict[str, Any]] = []
        for r in rows:
            entry = _deserialize_schedule(r)
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

    create = create_entry

    async def get_for_date(
        self,
        date_str: str,
        lang: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> list[dict[str, Any]]:
        return await self.list_entries(
            from_date=date_str, to_date=date_str, lang=lang, conn=conn
        )

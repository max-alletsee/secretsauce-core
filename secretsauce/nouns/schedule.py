import json
from typing import Any
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.events import EventLog, resolve_origin
from secretsauce.nouns._common import (
    emit_noun_event,
    in_transaction,
    merged_value,
    optional_float,
    require_fields,
    to_int,
)
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.util import now_iso


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
    def __init__(
        self,
        db: Database,
        recipes_repo: RecipesRepo | None = None,
        events: EventLog | None = None,
    ):
        self.db = db
        self.recipes_repo = recipes_repo or RecipesRepo(db)
        self.events = events

    async def _row(self, entry_id: str, conn: aiosqlite.Connection | None) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM schedule_entries WHERE id = ?;", (entry_id,), conn=conn
        )
        if row is None:
            raise NotFoundError(f"Schedule entry '{entry_id}' not found")
        return _deserialize_schedule(row)

    async def _embed_recipes(
        self, entries: list[dict[str, Any]], conn: aiosqlite.Connection | None
    ) -> list[dict[str, Any]]:
        recipes = await self.recipes_repo.get_recipes_by_ids(
            [e.get("recipe_id") for e in entries], conn=conn
        )
        for entry in entries:
            entry["recipe"] = recipes.get(entry.get("recipe_id") or "")
        return entries

    async def get_entry(
        self,
        entry_id: str,
        lang: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        [entry] = await self._embed_recipes([await self._row(entry_id, conn)], conn)
        return entry

    async def create_entry(
        self, data: dict[str, Any], conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        require_fields(data, "date", "meal_type")

        async def _do_create(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            entry_id = data.get("id") or str(uuid.uuid4()).lower()
            existing = await self.db.read_one(
                "SELECT * FROM schedule_entries WHERE id = ?;", (entry_id,), conn=writer_conn
            )
            if existing is not None:
                raise ConflictError(
                    f"Schedule entry '{entry_id}' already exists",
                    current=_deserialize_schedule(existing),
                )

            now = now_iso()
            actor_member_id = data.get("actor_member_id")
            origin = resolve_origin(data.get("origin"))
            await writer_conn.execute(
                """
                INSERT INTO schedule_entries (
                    id, revision, date, meal_type, entry_type, recipe_id,
                    title, note, servings_override, position, assigned_cook_id,
                    participant_member_ids, created_at, updated_at, actor_member_id, origin
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    entry_id,
                    data["date"],
                    data["meal_type"],
                    data.get("entry_type") or "recipe",
                    data.get("recipe_id"),
                    data.get("title"),
                    data.get("note"),
                    optional_float(data.get("servings_override"), "servings_override"),
                    to_int(data.get("position", 0), "position"),
                    data.get("assigned_cook_id"),
                    json.dumps(data.get("participant_member_ids") or []),
                    now,
                    now,
                    actor_member_id,
                    origin,
                ),
            )
            created = await self.get_entry(entry_id, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "schedule:created",
                "schedule_entry",
                entry_id,
                revision=1,
                after=created,
                actor_member_id=actor_member_id,
                origin=origin,
            )
            return created

        return await in_transaction(self.db, conn, _do_create)

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
            actor_member_id = data.get("actor_member_id")
            origin = resolve_origin(data.get("origin"))
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
                    data.get("date") or current["date"],
                    data.get("meal_type") or current["meal_type"],
                    data.get("entry_type") or current["entry_type"],
                    merged_value(data, current, "recipe_id"),
                    merged_value(data, current, "title"),
                    merged_value(data, current, "note"),
                    optional_float(
                        merged_value(data, current, "servings_override"), "servings_override"
                    ),
                    to_int(merged_value(data, current, "position", 0) or 0, "position"),
                    merged_value(data, current, "assigned_cook_id"),
                    json.dumps(merged_value(data, current, "participant_member_ids") or []),
                    now_iso(),
                    actor_member_id,
                    origin,
                    entry_id,
                ),
            )
            updated = await self.get_entry(entry_id, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "schedule:updated",
                "schedule_entry",
                entry_id,
                revision=new_revision,
                before=current,
                after=updated,
                actor_member_id=actor_member_id,
                origin=origin,
            )
            return updated

        return await in_transaction(self.db, conn, _do_update)

    async def delete_entry(
        self,
        entry_id: str,
        revision: int | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> None:
        async def _do_delete(writer_conn: aiosqlite.Connection) -> None:
            current = await self._row(entry_id, writer_conn)
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
            await emit_noun_event(
                self.events,
                writer_conn,
                "schedule:deleted",
                "schedule_entry",
                entry_id,
                revision=current["revision"],
                before=current,
            )

        await in_transaction(self.db, conn, _do_delete)

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
        return await self._embed_recipes([_deserialize_schedule(r) for r in rows], conn)

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

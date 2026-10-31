import json
from typing import Any
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError
from secretsauce.events import EventLog
from secretsauce.nouns._common import emit_noun_event, in_transaction, require_fields, to_float
from secretsauce.util import now_iso

_LIST_COLUMNS = (
    "dietary_restrictions",
    "allergies",
    "disliked_ingredients",
    "favorite_cuisines",
)


def _deserialize_member(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    for col in _LIST_COLUMNS:
        val = res.get(col)
        if isinstance(val, str):
            try:
                res[col] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                res[col] = []
        elif val is None:
            res[col] = []
    return res




class MembersRepo:
    def __init__(self, db: Database, events: EventLog | None = None):
        self.db = db
        self.events = events

    async def list_members(self, sort: str = "name") -> list[dict[str, Any]]:
        order = "ASC"
        sort_col = sort
        if sort.startswith("-"):
            order = "DESC"
            sort_col = sort[1:]

        if sort_col not in ("name", "created_at"):
            sort_col = "name"

        sql = f"SELECT * FROM household_members ORDER BY {sort_col} {order};"
        rows = await self.db.read_all(sql)
        return [_deserialize_member(r) for r in rows]

    async def get_member(
        self, member_id: str, conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM household_members WHERE id = ?;", (member_id,), conn=conn
        )
        if row is None:
            raise NotFoundError(f"Member '{member_id}' not found")
        return _deserialize_member(row)

    async def member_exists(self, member_id: str) -> bool:
        return (
            await self.db.read_val("SELECT 1 FROM household_members WHERE id = ?;", (member_id,))
        ) is not None

    async def create_member(
        self, data: dict[str, Any], conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        require_fields(data, "name")

        async def _do_create(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            member_id = data.get("id") or str(uuid.uuid4()).lower()
            existing = await self.db.read_one(
                "SELECT * FROM household_members WHERE id = ?;",
                (member_id,),
                conn=writer_conn,
            )
            if existing is not None:
                raise ConflictError(
                    f"Member with id '{member_id}' already exists",
                    current=_deserialize_member(existing),
                )

            now = now_iso()
            await writer_conn.execute(
                """
                INSERT INTO household_members (
                    id, revision, name, avatar_color, serving_ratio,
                    dietary_restrictions, allergies, disliked_ingredients,
                    favorite_cuisines, preferred_language, created_at, updated_at
                ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    member_id,
                    data["name"],
                    data.get("avatar_color"),
                    to_float(data.get("serving_ratio", 1.0), "serving_ratio"),
                    json.dumps(data.get("dietary_restrictions") or []),
                    json.dumps(data.get("allergies") or []),
                    json.dumps(data.get("disliked_ingredients") or []),
                    json.dumps(data.get("favorite_cuisines") or []),
                    data.get("preferred_language") or "en",
                    now,
                    now,
                ),
            )
            created = await self.get_member(member_id, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "member:created",
                "member",
                member_id,
                revision=1,
                after=created,
                actor_member_id=data.get("actor_member_id"),
                origin=data.get("origin"),
            )
            return created

        return await in_transaction(self.db, conn, _do_create)

    async def update_member(
        self,
        member_id: str,
        revision: int,
        data: dict[str, Any],
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        async def _do_update(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            current = await self.get_member(member_id, conn=writer_conn)
            if current["revision"] != revision:
                raise ConflictError("Revision mismatch", current=current)

            new_revision = current["revision"] + 1
            merged = {**current, **data}

            await writer_conn.execute(
                """
                UPDATE household_members SET
                    revision = ?,
                    name = ?,
                    avatar_color = ?,
                    serving_ratio = ?,
                    dietary_restrictions = ?,
                    allergies = ?,
                    disliked_ingredients = ?,
                    favorite_cuisines = ?,
                    preferred_language = ?,
                    updated_at = ?
                WHERE id = ?;
                """,
                (
                    new_revision,
                    merged.get("name") or current["name"],
                    merged.get("avatar_color"),
                    to_float(merged.get("serving_ratio", 1.0), "serving_ratio"),
                    json.dumps(merged.get("dietary_restrictions") or []),
                    json.dumps(merged.get("allergies") or []),
                    json.dumps(merged.get("disliked_ingredients") or []),
                    json.dumps(merged.get("favorite_cuisines") or []),
                    merged.get("preferred_language") or "en",
                    now_iso(),
                    member_id,
                ),
            )
            updated = await self.get_member(member_id, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "member:updated",
                "member",
                member_id,
                revision=new_revision,
                before=current,
                after=updated,
                actor_member_id=data.get("actor_member_id"),
                origin=data.get("origin"),
            )
            return updated

        return await in_transaction(self.db, conn, _do_update)

    async def delete_member(
        self,
        member_id: str,
        revision: int | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> None:
        async def _do_delete(writer_conn: aiosqlite.Connection) -> None:
            current = await self.get_member(member_id, conn=writer_conn)
            if revision is not None and current["revision"] != revision:
                raise ConflictError("Revision mismatch", current=current)

            count = await self.db.read_val(
                "SELECT COUNT(*) FROM household_members;", conn=writer_conn
            )
            if count <= 1:
                raise ConflictError("The household must retain at least one member", current=current)

            # Section 4.4: Remove assets and attributes
            await writer_conn.execute(
                "DELETE FROM assets WHERE entity_type = 'member' AND entity_id = ?;",
                (member_id,),
            )
            await writer_conn.execute(
                "DELETE FROM entity_attributes WHERE entity_type = 'member' AND entity_id = ?;",
                (member_id,),
            )

            # Section 4.4: Deleting a member also removes its id from every participant_member_ids array
            tl_rows = await self.db.read_all(
                "SELECT id, participant_member_ids FROM timeline_entries WHERE participant_member_ids LIKE ?;",
                (f"%{member_id}%",),
                conn=writer_conn,
            )
            for row in tl_rows:
                try:
                    participants = json.loads(row["participant_member_ids"])
                except (json.JSONDecodeError, TypeError):
                    continue
                if isinstance(participants, list) and member_id in participants:
                    updated_participants = [p for p in participants if p != member_id]
                    await writer_conn.execute(
                        "UPDATE timeline_entries SET participant_member_ids = ? WHERE id = ?;",
                        (json.dumps(updated_participants), row["id"]),
                    )

            await writer_conn.execute(
                "DELETE FROM household_members WHERE id = ?;", (member_id,)
            )
            await emit_noun_event(
                self.events,
                writer_conn,
                "member:deleted",
                "member",
                member_id,
                revision=current["revision"],
                before=current,
            )

        await in_transaction(self.db, conn, _do_delete)

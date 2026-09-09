from datetime import datetime, timezone
import json
from typing import Any
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _deserialize_member(row: dict[str, Any]) -> dict[str, Any]:
    res = dict(row)
    for col in (
        "dietary_restrictions",
        "allergies",
        "disliked_ingredients",
        "favorite_cuisines",
    ):
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
    def __init__(self, db: Database):
        self.db = db

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

    async def create_member(
        self, data: dict[str, Any], conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        member_id = data.get("id") or str(uuid.uuid4()).lower()

        existing = await self.db.read_one(
            "SELECT * FROM household_members WHERE id = ?;", (member_id,), conn=conn
        )
        if existing is not None:
            raise ConflictError(
                f"Member with id '{member_id}' already exists",
                current=_deserialize_member(existing),
            )

        now = _now_iso()
        name = data["name"]
        avatar_color = data.get("avatar_color")
        serving_ratio = float(data.get("serving_ratio", 1.0))
        dietary_restrictions = json.dumps(data.get("dietary_restrictions") or [])
        allergies = json.dumps(data.get("allergies") or [])
        disliked_ingredients = json.dumps(data.get("disliked_ingredients") or [])
        favorite_cuisines = json.dumps(data.get("favorite_cuisines") or [])
        preferred_language = data.get("preferred_language", "en")
        revision = 1

        sql = """
        INSERT INTO household_members (
            id, revision, name, avatar_color, serving_ratio,
            dietary_restrictions, allergies, disliked_ingredients,
            favorite_cuisines, preferred_language, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        params = (
            member_id,
            revision,
            name,
            avatar_color,
            serving_ratio,
            dietary_restrictions,
            allergies,
            disliked_ingredients,
            favorite_cuisines,
            preferred_language,
            now,
            now,
        )

        if conn is not None:
            await conn.execute(sql, params)
        else:
            async with self.db.transaction() as writer_conn:
                await writer_conn.execute(sql, params)

        return await self.get_member(member_id, conn=conn)

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
            now = _now_iso()

            name = data.get("name", current["name"])
            avatar_color = (
                data["avatar_color"]
                if "avatar_color" in data
                else current.get("avatar_color")
            )
            serving_ratio = float(
                data.get("serving_ratio", current.get("serving_ratio", 1.0))
            )

            dietary = json.dumps(
                data.get(
                    "dietary_restrictions", current.get("dietary_restrictions", [])
                )
            )
            allergies = json.dumps(
                data.get("allergies", current.get("allergies", []))
            )
            disliked = json.dumps(
                data.get(
                    "disliked_ingredients", current.get("disliked_ingredients", [])
                )
            )
            cuisines = json.dumps(
                data.get("favorite_cuisines", current.get("favorite_cuisines", []))
            )
            preferred_language = data.get(
                "preferred_language", current.get("preferred_language", "en")
            )

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
                    name,
                    avatar_color,
                    serving_ratio,
                    dietary,
                    allergies,
                    disliked,
                    cuisines,
                    preferred_language,
                    now,
                    member_id,
                ),
            )
            return await self.get_member(member_id, conn=writer_conn)

        if conn is not None:
            return await _do_update(conn)
        else:
            async with self.db.transaction() as writer_conn:
                return await _do_update(writer_conn)

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
            sched_rows = await self.db.read_all(
                "SELECT id, participant_member_ids FROM schedule_entries WHERE participant_member_ids LIKE ?;",
                (f"%{member_id}%",),
                conn=writer_conn,
            )
            for row in sched_rows:
                try:
                    participants = json.loads(row["participant_member_ids"])
                    if isinstance(participants, list) and member_id in participants:
                        updated_participants = [
                            p for p in participants if p != member_id
                        ]
                        await writer_conn.execute(
                            "UPDATE schedule_entries SET participant_member_ids = ? WHERE id = ?;",
                            (json.dumps(updated_participants), row["id"]),
                        )
                except (json.JSONDecodeError, TypeError):
                    pass

            await writer_conn.execute(
                "DELETE FROM household_members WHERE id = ?;", (member_id,)
            )

        if conn is not None:
            await _do_delete(conn)
        else:
            async with self.db.transaction() as writer_conn:
                await _do_delete(writer_conn)

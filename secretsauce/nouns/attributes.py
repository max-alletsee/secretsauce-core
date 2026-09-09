from datetime import datetime, timezone
import json
import re
from typing import Any, Sequence

import aiosqlite

from secretsauce.db import Database


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AttributesRepo:
    def __init__(self, db: Database):
        self.db = db

    async def set_attribute(
        self,
        plugin_id: str,
        entity_type: str,
        entity_id: str,
        key: str,
        value: Any,
        conn: aiosqlite.Connection | None = None,
    ) -> None:
        async def _do_set(writer_conn: aiosqlite.Connection) -> None:
            if value is None:
                await writer_conn.execute(
                    """
                    DELETE FROM entity_attributes
                    WHERE plugin_id = ? AND entity_type = ? AND entity_id = ? AND key = ?;
                    """,
                    (plugin_id, entity_type, entity_id, key),
                )
                return

            value_numeric: float | None = None
            value_text: str | None = None
            value_json: str | None = None

            if isinstance(value, bool):
                value_numeric = 1.0 if value else 0.0
            elif isinstance(value, (int, float)):
                value_numeric = float(value)
            elif isinstance(value, str):
                value_text = value
            elif isinstance(value, (dict, list)):
                value_json = json.dumps(value)
            else:
                value_text = str(value)

            now = _now_iso()
            await writer_conn.execute(
                """
                INSERT INTO entity_attributes (
                    plugin_id, entity_type, entity_id, key,
                    value_numeric, value_text, value_json, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(plugin_id, entity_type, entity_id, key) DO UPDATE SET
                    value_numeric = excluded.value_numeric,
                    value_text = excluded.value_text,
                    value_json = excluded.value_json,
                    updated_at = excluded.updated_at;
                """,
                (
                    plugin_id,
                    entity_type,
                    entity_id,
                    key,
                    value_numeric,
                    value_text,
                    value_json,
                    now,
                ),
            )

        if conn is not None:
            await _do_set(conn)
        else:
            async with self.db.transaction() as writer_conn:
                await _do_set(writer_conn)

    async def get_attributes(
        self,
        entity_type: str,
        entity_id: str,
        plugin_id: str | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        if plugin_id is not None:
            sql = """
            SELECT plugin_id, key, value_numeric, value_text, value_json
            FROM entity_attributes
            WHERE entity_type = ? AND entity_id = ? AND plugin_id = ?;
            """
            params = (entity_type, entity_id, plugin_id)
        else:
            sql = """
            SELECT plugin_id, key, value_numeric, value_text, value_json
            FROM entity_attributes
            WHERE entity_type = ? AND entity_id = ?;
            """
            params = (entity_type, entity_id)

        rows = await self.db.read_all(sql, params, conn=conn)
        res: dict[str, Any] = {}
        for r in rows:
            dict_key = r["key"] if plugin_id is not None else f"{r['plugin_id']}.{r['key']}"
            if r["value_numeric"] is not None:
                res[dict_key] = r["value_numeric"]
            elif r["value_text"] is not None:
                res[dict_key] = r["value_text"]
            elif r["value_json"] is not None:
                try:
                    res[dict_key] = json.loads(r["value_json"])
                except Exception:
                    res[dict_key] = r["value_json"]
            else:
                res[dict_key] = None
        return res

    async def get_all_attributes(
        self,
        entity_type: str,
        entity_id: str,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any]:
        return await self.get_attributes(entity_type, entity_id, plugin_id=None, conn=conn)

    async def drop_plugin_attributes(
        self, plugin_id: str, conn: aiosqlite.Connection | None = None
    ) -> None:
        sql = "DELETE FROM entity_attributes WHERE plugin_id = ?;"
        if conn is not None:
            await conn.execute(sql, (plugin_id,))
        else:
            async with self.db.transaction() as writer_conn:
                await writer_conn.execute(sql, (plugin_id,))

    async def query_entity_ids(
        self,
        entity_type: str,
        filters: Sequence[str | tuple[str, str, Any]],
        conn: aiosqlite.Connection | None = None,
    ) -> list[str]:
        if not filters:
            rows = await self.db.read_all(
                "SELECT DISTINCT entity_id FROM entity_attributes WHERE entity_type = ?;",
                (entity_type,),
                conn=conn,
            )
            return [r["entity_id"] for r in rows]

        # Process each filter expression
        subqueries: list[str] = []
        all_params: list[Any] = []

        pattern = re.compile(
            r"^([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_\-]+)(<=|>=|!=|=|<|>)(.*)$"
        )

        for f in filters:
            if isinstance(f, str):
                m = pattern.match(f.strip())
                if not m:
                    continue
                plugin_id, key, op, raw_val = m.groups()
                # Determine value type
                try:
                    val = float(raw_val)
                    is_numeric = True
                except ValueError:
                    val = raw_val
                    is_numeric = False
            elif isinstance(f, (tuple, list)) and len(f) == 3:
                qual_key, op, val = f
                parts = qual_key.split(".", 1)
                if len(parts) != 2:
                    continue
                plugin_id, key = parts
                is_numeric = isinstance(val, (int, float)) and not isinstance(
                    val, bool
                )
            else:
                continue

            if op not in ("=", "!=", "<", "<=", ">", ">="):
                continue

            val_col = "value_numeric" if is_numeric else "value_text"
            subquery = f"""
                SELECT entity_id FROM entity_attributes
                WHERE entity_type = ? AND plugin_id = ? AND key = ? AND {val_col} {op} ?
            """
            subqueries.append(subquery)
            all_params.extend([entity_type, plugin_id, key, val])

        if not subqueries:
            return []

        full_query = " INTERSECT ".join(subqueries) + ";"
        rows = await self.db.read_all(full_query, all_params, conn=conn)
        return [r["entity_id"] for r in rows]

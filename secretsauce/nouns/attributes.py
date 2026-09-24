from datetime import datetime, timezone
import json
import re
from typing import Any, Sequence

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ValidationError


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

    async def delete_attribute(
        self,
        plugin_id: str,
        entity_type: str,
        entity_id: str,
        key: str,
        conn: aiosqlite.Connection | None = None,
    ) -> None:
        await self.set_attribute(
            plugin_id=plugin_id,
            entity_type=entity_type,
            entity_id=entity_id,
            key=key,
            value=None,
            conn=conn,
        )

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
        sql, params = filter_sql(entity_type, filters)
        rows = await self.db.read_all(sql + ";", params, conn=conn)
        return [r["entity_id"] for r in rows]


_FILTER_PATTERN = re.compile(r"^([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_\-]+)(<=|>=|!=|=|<|>)(.*)$")
_OPERATORS = ("=", "!=", "<", "<=", ">", ">=")


def parse_filter(f: str | tuple[str, str, Any] | list) -> tuple[str, str, str, Any, bool]:
    """(plugin_id, key, op, value, numeric) for '<plugin>.<key><op><value>' or a triple."""
    if isinstance(f, str):
        m = _FILTER_PATTERN.match(f.strip())
        if not m:
            raise ValidationError(
                f"Invalid attribute filter '{f}'",
                fields={"attr": "Expected <plugin_id>.<key><op><value>"},
            )
        plugin_id, key, op, raw = m.groups()
        try:
            return plugin_id, key, op, float(raw), True
        except ValueError:
            return plugin_id, key, op, raw, False
    if isinstance(f, (tuple, list)) and len(f) == 3:
        qualified, op, value = f
        plugin_id, _, key = str(qualified).partition(".")
        if key and op in _OPERATORS:
            numeric = isinstance(value, (int, float)) and not isinstance(value, bool)
            return plugin_id, key, op, value, numeric
    raise ValidationError(f"Invalid attribute filter {f!r}", fields={"attr": "Invalid filter"})


def filter_sql(entity_type: str, filters: Sequence[Any]) -> tuple[str, list[Any]]:
    """A SELECT of entity ids matching every filter (AND), with its parameters."""
    parts: list[str] = []
    params: list[Any] = []
    for f in filters:
        plugin_id, key, op, value, numeric = parse_filter(f)
        column = "value_numeric" if numeric else "value_text"
        parts.append(
            "SELECT entity_id FROM entity_attributes "
            f"WHERE entity_type = ? AND plugin_id = ? AND key = ? AND {column} {op} ?"
        )
        params.extend([entity_type, plugin_id, key, value])
    return " INTERSECT ".join(parts), params

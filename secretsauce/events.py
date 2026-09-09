from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import json
import traceback
from typing import Any, Awaitable, Callable

import aiosqlite

from secretsauce.db import Database

EventHandler = Callable[["Event"], Awaitable[None]]


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass
class Event:
    seq: int
    name: str
    entity_type: str | None = None
    entity_id: str | None = None
    revision: int | None = None
    actor_member_id: str | None = None
    origin: str = "member"
    cause_seq: int | None = None
    depth: int = 0
    data: dict[str, Any] = field(default_factory=dict)
    created_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def envelope(self) -> dict[str, Any]:
        res = asdict(self)
        res.pop("data", None)
        return res


def _row_to_event(row: dict[str, Any]) -> Event:
    raw_data = row.get("data")
    data_dict: dict[str, Any] = {}
    if isinstance(raw_data, str):
        try:
            data_dict = json.loads(raw_data)
        except Exception:
            data_dict = {}
    elif isinstance(raw_data, dict):
        data_dict = raw_data

    return Event(
        seq=row["seq"],
        name=row["name"],
        entity_type=row.get("entity_type"),
        entity_id=row.get("entity_id"),
        revision=row.get("revision"),
        actor_member_id=row.get("actor_member_id"),
        origin=row.get("origin", "member"),
        cause_seq=row.get("cause_seq"),
        depth=row.get("depth", 0),
        data=data_dict,
        created_at=row.get("created_at", ""),
    )


class EventLog:
    def __init__(self, db: Database):
        self.db = db

    async def append(
        self,
        conn: aiosqlite.Connection,
        name: str,
        data: dict[str, Any] | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        revision: int | None = None,
        actor_member_id: str | None = None,
        origin: str = "member",
        cause_seq: int | None = None,
        depth: int = 0,
    ) -> int:
        if depth > 8:
            raise ValueError(
                f"Event depth {depth} exceeds maximum allowed limit of 8"
            )

        now = _now_iso()
        data_json = json.dumps(data or {})

        sql = """
        INSERT INTO events (
            name, entity_type, entity_id, revision, actor_member_id,
            origin, cause_seq, depth, data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        cursor = await conn.execute(
            sql,
            (
                name,
                entity_type,
                entity_id,
                revision,
                actor_member_id,
                origin,
                cause_seq,
                depth,
                data_json,
                now,
            ),
        )
        return cursor.lastrowid

    async def get_events_after(
        self,
        last_seq: int,
        limit: int = 100,
        conn: aiosqlite.Connection | None = None,
    ) -> list[Event]:
        rows = await self.db.read_all(
            """
            SELECT * FROM events
            WHERE seq > ?
            ORDER BY seq ASC
            LIMIT ?;
            """,
            (last_seq, limit),
            conn=conn,
        )
        return [_row_to_event(r) for r in rows]

    async def prune_events(
        self,
        min_seq: int,
        older_than_iso: str,
        conn: aiosqlite.Connection | None = None,
    ) -> int:
        sql = "DELETE FROM events WHERE seq <= ? AND created_at < ?;"
        if conn is not None:
            cursor = await conn.execute(sql, (min_seq, older_than_iso))
            return cursor.rowcount
        else:
            async with self.db.transaction() as tx:
                cursor = await tx.execute(sql, (min_seq, older_than_iso))
                return cursor.rowcount


class EventDispatcher:
    def __init__(self, db: Database, plugin_id: str):
        self.db = db
        self.plugin_id = plugin_id
        self._subscriptions: list[tuple[str, EventHandler]] = []

    def subscribe(self, pattern: str, handler: EventHandler) -> None:
        self._subscriptions.append((pattern, handler))

    def unsubscribe_all(self) -> None:
        self._subscriptions.clear()

    def _matches(self, pattern: str, event_name: str) -> bool:
        if pattern == "*" or pattern == event_name:
            return True
        if pattern.endswith(":*"):
            prefix = pattern[:-1]
            return event_name.startswith(prefix)
        return False

    async def get_cursor(
        self, conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM event_cursors WHERE plugin_id = ?;",
            (self.plugin_id,),
            conn=conn,
        )
        if row is None:
            # Initialize cursor row
            sql = """
            INSERT INTO event_cursors (plugin_id, last_seq, attempts)
            VALUES (?, 0, 0)
            ON CONFLICT(plugin_id) DO NOTHING;
            """
            if conn is not None:
                await conn.execute(sql, (self.plugin_id,))
            else:
                async with self.db.transaction() as tx:
                    await tx.execute(sql, (self.plugin_id,))

            row = await self.db.read_one(
                "SELECT * FROM event_cursors WHERE plugin_id = ?;",
                (self.plugin_id,),
                conn=conn,
            )
        return dict(row)

    async def drain_to_head(self) -> int:
        total_processed = 0

        while True:
            cursor_info = await self.get_cursor()
            last_seq = cursor_info["last_seq"]

            rows = await self.db.read_all(
                """
                SELECT * FROM events
                WHERE seq > ?
                ORDER BY seq ASC
                LIMIT 100;
                """,
                (last_seq,),
            )
            if not rows:
                break

            events = [_row_to_event(r) for r in rows]

            for event in events:
                # Find matching handlers
                matching_handlers = [
                    handler
                    for pattern, handler in self._subscriptions
                    if self._matches(pattern, event.name)
                ]

                try:
                    for h in matching_handlers:
                        await h(event)

                    # Success: advance cursor
                    async with self.db.transaction() as tx:
                        await tx.execute(
                            """
                            UPDATE event_cursors
                            SET last_seq = ?, failing_seq = NULL, attempts = 0, last_error = NULL
                            WHERE plugin_id = ?;
                            """,
                            (event.seq, self.plugin_id),
                        )
                    total_processed += 1
                except Exception as e:
                    tb_str = traceback.format_exc()
                    cursor_row = await self.get_cursor()
                    attempts = cursor_row.get("attempts", 0) + 1

                    if attempts >= 20:
                        # 20 attempts reached: skip event per delivery rule 3
                        async with self.db.transaction() as tx:
                            await tx.execute(
                                """
                                UPDATE event_cursors
                                SET last_seq = ?, failing_seq = NULL, attempts = 0, last_error = ?
                                WHERE plugin_id = ?;
                                """,
                                (event.seq, tb_str, self.plugin_id),
                            )
                        total_processed += 1
                    else:
                        async with self.db.transaction() as tx:
                            await tx.execute(
                                """
                                UPDATE event_cursors
                                SET failing_seq = ?, attempts = ?, last_error = ?
                                WHERE plugin_id = ?;
                                """,
                                (event.seq, attempts, tb_str, self.plugin_id),
                            )
                        raise

        return total_processed

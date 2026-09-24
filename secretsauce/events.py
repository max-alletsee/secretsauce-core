import asyncio
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import json
import logging
import traceback
from typing import Any, Awaitable, Callable, Iterator

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import PluginRuntimeError

logger = logging.getLogger(__name__)

EventHandler = Callable[["Event"], Awaitable[None]]

MAX_EVENT_DEPTH = 8
MAX_DELIVERY_ATTEMPTS = 20
_BATCH_SIZE = 100


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


# The event currently being delivered and the origin writes should carry.
# Set by the dispatcher (and job runner / background tasks) so that writes made
# while reacting to an event record their cause and depth automatically.
current_cause: ContextVar[Event | None] = ContextVar("secretsauce_current_cause", default=None)
current_origin: ContextVar[str | None] = ContextVar("secretsauce_current_origin", default=None)


@contextmanager
def acting_as(origin: str | None, cause: Event | None = None) -> Iterator[None]:
    origin_token = current_origin.set(origin)
    cause_token = current_cause.set(cause)
    try:
        yield
    finally:
        current_cause.reset(cause_token)
        current_origin.reset(origin_token)


def resolve_origin(explicit: str | None = None) -> str:
    """Origin for a write: explicit value, else the acting plugin, else member."""
    return explicit or current_origin.get() or "member"


class EventDepthError(PluginRuntimeError, ValueError):
    """Raised when a causal chain of events exceeds MAX_EVENT_DEPTH."""


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
        self.broadcaster: Any | None = None
        self._commit_listeners: list[Callable[[], None]] = []

    def set_broadcaster(self, broadcaster: Any) -> None:
        self.broadcaster = broadcaster

    def add_commit_listener(self, listener: Callable[[], None]) -> None:
        """Called once after every commit that appended at least one event."""
        self._commit_listeners.append(listener)

    def _notify_commit_listeners(self) -> None:
        for listener in list(self._commit_listeners):
            try:
                listener()
            except Exception:
                logger.exception("Event commit listener failed")

    async def append(
        self,
        conn: aiosqlite.Connection,
        name: str,
        data: dict[str, Any] | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        revision: int | None = None,
        actor_member_id: str | None = None,
        origin: str | None = None,
        cause_seq: int | None = None,
        depth: int | None = None,
    ) -> int:
        cause = current_cause.get()
        if cause_seq is None and cause is not None:
            cause_seq = cause.seq
        if depth is None:
            depth = cause.depth + 1 if cause is not None else 0
        origin = resolve_origin(origin)

        if depth > MAX_EVENT_DEPTH:
            logger.error(
                "Refusing event %s at depth %s (cause_seq=%s, origin=%s)",
                name, depth, cause_seq, origin,
            )
            raise EventDepthError(
                f"Event depth {depth} exceeds maximum allowed limit of {MAX_EVENT_DEPTH}",
                details={"event": name, "cause_seq": cause_seq},
            )

        now = _now_iso()
        payload = data or {}
        cursor = await conn.execute(
            """
            INSERT INTO events (
                name, entity_type, entity_id, revision, actor_member_id,
                origin, cause_seq, depth, data, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                name,
                entity_type,
                entity_id,
                revision,
                actor_member_id,
                origin,
                cause_seq,
                depth,
                json.dumps(payload),
                now,
            ),
        )
        seq = cursor.lastrowid
        evt = Event(
            seq=seq,
            name=name,
            entity_type=entity_type,
            entity_id=entity_id,
            revision=revision,
            actor_member_id=actor_member_id,
            origin=origin,
            cause_seq=cause_seq,
            depth=depth,
            data=payload,
            created_at=now,
        )
        self._after_commit(evt)
        return seq

    def _after_commit(self, evt: Event) -> None:
        def broadcast() -> None:
            if self.broadcaster is not None:
                self.broadcaster.broadcast_event(evt)

        try:
            self.db.after_commit(broadcast)
            self.db.after_commit(self._notify_commit_listeners, key="event-log-commit")
        except RuntimeError:
            # conn did not come from Database.transaction(); nothing to defer to.
            broadcast()
            self._notify_commit_listeners()

    async def get_head_seq(
        self, conn: aiosqlite.Connection | None = None
    ) -> int:
        row = await self.db.read_one(
            "SELECT COALESCE(MAX(seq), 0) AS head_seq FROM events;",
            conn=conn,
        )
        return row["head_seq"] if row else 0

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
        self._drain_lock = asyncio.Lock()

    def subscribe(self, pattern: str, handler: EventHandler) -> None:
        self._subscriptions.append((pattern, handler))

    def unsubscribe_all(self) -> None:
        self._subscriptions.clear()

    @property
    def has_subscriptions(self) -> bool:
        return bool(self._subscriptions)

    def _matches(self, pattern: str, event_name: str) -> bool:
        if pattern == "*" or pattern == event_name:
            return True
        if pattern.endswith(":*"):
            prefix = pattern[:-1]
            return event_name.startswith(prefix)
        return False

    async def ensure_cursor(self, start_at_head: bool = False) -> dict[str, Any]:
        """Creates the cursor row if missing; a new cursor may start at the log head.

        Spec rule: a plugin activated for the first time never replays history.
        """
        row = await self.db.read_one(
            "SELECT * FROM event_cursors WHERE plugin_id = ?;", (self.plugin_id,)
        )
        if row is not None:
            return dict(row)
        async with self.db.transaction() as tx:
            start = 0
            if start_at_head:
                start = await self.db.read_val(
                    "SELECT COALESCE(MAX(seq), 0) FROM events;", conn=tx
                )
            await tx.execute(
                """
                INSERT INTO event_cursors (plugin_id, last_seq, attempts)
                VALUES (?, ?, 0)
                ON CONFLICT(plugin_id) DO NOTHING;
                """,
                (self.plugin_id, start),
            )
        return await self.get_cursor()

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

    async def _advance(self, last_seq: int) -> None:
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE event_cursors
                SET last_seq = ?, failing_seq = NULL, attempts = 0, last_error = NULL
                WHERE plugin_id = ?;
                """,
                (last_seq, self.plugin_id),
            )

    async def drain_to_head(self) -> int:
        """Delivers every event after the cursor to matching handlers, in order.

        Serialized per dispatcher so concurrent callers (the kernel's dispatcher
        task and test helpers) never deliver the same event twice. On handler
        failure the attempt is recorded and the exception re-raised; after
        MAX_DELIVERY_ATTEMPTS the event is skipped.
        """
        async with self._drain_lock:
            return await self._drain_locked()

    async def _drain_locked(self) -> int:
        total_processed = 0

        while True:
            cursor_info = await self.get_cursor()
            last_seq = cursor_info["last_seq"]

            rows = await self.db.read_all(
                """
                SELECT * FROM events
                WHERE seq > ?
                ORDER BY seq ASC
                LIMIT ?;
                """,
                (last_seq, _BATCH_SIZE),
            )
            if not rows:
                break

            # Events nobody here listens to only move the cursor, once per batch.
            unhandled_up_to: int | None = None

            for event in (_row_to_event(r) for r in rows):
                matching_handlers = [
                    handler
                    for pattern, handler in self._subscriptions
                    if self._matches(pattern, event.name)
                ]
                if not matching_handlers:
                    unhandled_up_to = event.seq
                    continue

                try:
                    with acting_as(f"plugin:{self.plugin_id}", cause=event):
                        for h in matching_handlers:
                            await h(event)
                except Exception:
                    await self._record_failure(event, unhandled_up_to)
                    if await self._skipped(event):
                        total_processed += 1
                        unhandled_up_to = None
                        continue
                    raise

                await self._advance(event.seq)
                unhandled_up_to = None
                total_processed += 1

            if unhandled_up_to is not None:
                await self._advance(unhandled_up_to)

        return total_processed

    async def _record_failure(self, event: Event, unhandled_up_to: int | None) -> None:
        tb_str = traceback.format_exc()
        cursor_row = await self.get_cursor()
        attempts = cursor_row.get("attempts", 0) + 1
        async with self.db.transaction() as tx:
            if attempts >= MAX_DELIVERY_ATTEMPTS:
                logger.error(
                    "Plugin %s skipped event %s after %s attempts",
                    self.plugin_id, event.seq, attempts,
                )
                await tx.execute(
                    """
                    UPDATE event_cursors
                    SET last_seq = ?, failing_seq = NULL, attempts = 0, last_error = ?
                    WHERE plugin_id = ?;
                    """,
                    (event.seq, tb_str, self.plugin_id),
                )
            else:
                await tx.execute(
                    """
                    UPDATE event_cursors
                    SET last_seq = COALESCE(?, last_seq), failing_seq = ?,
                        attempts = ?, last_error = ?
                    WHERE plugin_id = ?;
                    """,
                    (unhandled_up_to, event.seq, attempts, tb_str, self.plugin_id),
                )

    async def _skipped(self, event: Event) -> bool:
        cursor_row = await self.get_cursor()
        return cursor_row["last_seq"] >= event.seq


# Spec 6.7 rule 3: retry a failing event after 1 s, 10 s, 1 min, then every 10 min.
_RETRY_BACKOFF_SECONDS = (1.0, 10.0, 60.0, 600.0)
FALLBACK_WAKE_SECONDS = 5.0


def retry_delay(attempts: int) -> float:
    index = min(max(attempts, 1), len(_RETRY_BACKOFF_SECONDS)) - 1
    return _RETRY_BACKOFF_SECONDS[index]


class EventPump:
    """Runs one dispatcher task per active plugin (spec 6.7 rules 1, 3 and 4).

    Tasks wake when a commit appended events (wake()) and every
    fallback_seconds otherwise. A failing plugin backs off without holding up
    any other plugin's delivery.
    """

    def __init__(self, fallback_seconds: float = FALLBACK_WAKE_SECONDS):
        self.fallback_seconds = fallback_seconds
        self.running = False
        self._tasks: dict[str, asyncio.Task] = {}
        self._wakes: dict[str, asyncio.Event] = {}
        self._dispatchers: dict[str, EventDispatcher] = {}

    def wake(self) -> None:
        for wake in self._wakes.values():
            wake.set()

    def add(self, dispatcher: EventDispatcher) -> None:
        """Registers a plugin's dispatcher; its task runs while the pump runs."""
        self._dispatchers[dispatcher.plugin_id] = dispatcher
        if self.running:
            self._spawn(dispatcher)

    async def remove(self, plugin_id: str) -> None:
        self._dispatchers.pop(plugin_id, None)
        self._wakes.pop(plugin_id, None)
        task = self._tasks.pop(plugin_id, None)
        if task is not None:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)

    def start(self) -> None:
        self.running = True
        for dispatcher in self._dispatchers.values():
            self._spawn(dispatcher)

    async def stop(self) -> None:
        self.running = False
        tasks = list(self._tasks.values())
        self._tasks.clear()
        self._wakes.clear()
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

    def _spawn(self, dispatcher: EventDispatcher) -> None:
        if dispatcher.plugin_id in self._tasks:
            return
        wake = asyncio.Event()
        self._wakes[dispatcher.plugin_id] = wake
        self._tasks[dispatcher.plugin_id] = asyncio.create_task(
            self._run(dispatcher, wake), name=f"dispatcher:{dispatcher.plugin_id}"
        )

    async def _run(self, dispatcher: EventDispatcher, wake: asyncio.Event) -> None:
        while True:
            wake.clear()
            try:
                await dispatcher.drain_to_head()
            except asyncio.CancelledError:
                raise
            except Exception:
                attempts = 1
                try:
                    attempts = (await dispatcher.get_cursor())["attempts"]
                except Exception:
                    pass
                delay = retry_delay(attempts)
                logger.warning(
                    "Plugin %s failed to handle an event (attempt %s); retrying in %ss",
                    dispatcher.plugin_id, attempts, delay, exc_info=True,
                )
                # Commits do not cut a backoff short; that is the point of it.
                await asyncio.sleep(delay)
                continue
            try:
                await asyncio.wait_for(wake.wait(), timeout=self.fallback_seconds)
            except asyncio.TimeoutError:
                pass

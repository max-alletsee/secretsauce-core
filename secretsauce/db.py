import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import inspect
import logging
from pathlib import Path
import re
import sqlite3
from typing import Any, AsyncGenerator, Callable, Sequence

import aiosqlite

logger = logging.getLogger(__name__)

_SQL_COMMENTS = re.compile(r"--[^\n]*|/\*.*?\*/", re.DOTALL)


def split_sql_script(script: str) -> list[str]:
    """Splits a SQL script into complete statements.

    Uses sqlite3.complete_statement so semicolons inside string literals,
    comments and trigger bodies do not end a statement. Migrations run
    statement by statement inside one transaction because executescript()
    commits any pending transaction first, which makes them non-atomic.
    """
    statements: list[str] = []
    buf: list[str] = []
    for ch in script:
        buf.append(ch)
        if ch == ";":
            candidate = "".join(buf)
            if sqlite3.complete_statement(candidate):
                stmt = candidate.strip()
                if stmt:
                    statements.append(stmt)
                buf = []
    tail = "".join(buf).strip()
    if _SQL_COMMENTS.sub("", tail).strip():
        statements.append(tail)
    return statements


class Database:
    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self._writer_lock = asyncio.Lock()
        self._writer: aiosqlite.Connection | None = None
        self._reader: aiosqlite.Connection | None = None
        self._pending_after_commit: list[Callable[[], Any]] | None = None
        self._after_commit_keys: set[str] = set()
        self._pending_on_rollback: list[Callable[[], Any]] = []
        self._tx_owner: asyncio.Task | None = None
        self._savepoint_counter = 0

    async def connect(self) -> None:
        # Ensure parent directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        path_str = str(self.db_path)

        # Open writer connection
        self._writer = await aiosqlite.connect(path_str)
        self._writer.row_factory = aiosqlite.Row
        await self._configure_connection(self._writer)

        # Open reader connection
        self._reader = await aiosqlite.connect(path_str)
        self._reader.row_factory = aiosqlite.Row
        await self._configure_connection(self._reader)

    async def _configure_connection(self, conn: aiosqlite.Connection) -> None:
        async with conn.execute("PRAGMA journal_mode=WAL;"):
            pass
        async with conn.execute("PRAGMA foreign_keys=ON;"):
            pass
        async with conn.execute("PRAGMA synchronous=NORMAL;"):
            pass
        async with conn.execute("PRAGMA busy_timeout=5000;"):
            pass

    async def __aenter__(self) -> "Database":
        await self.connect()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()

    async def close(self) -> None:
        if self._reader is not None:
            await self._reader.close()
            self._reader = None
        if self._writer is not None:
            await self._writer.close()
            self._writer = None

    @asynccontextmanager
    async def transaction(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        if self._writer is None:
            raise RuntimeError("Database is not connected")

        current = asyncio.current_task()
        if current is not None and self._tx_owner is current:
            # The task already owns the writer (e.g. a pre-commit hook writing
            # through ctx.db): join its transaction through a savepoint instead
            # of waiting on a lock this task itself holds.
            async with self._savepoint() as conn:
                yield conn
            return

        async with self._writer_lock:
            self._tx_owner = current
            try:
                await self._writer.execute("BEGIN IMMEDIATE;")
                self._pending_after_commit = []
                self._after_commit_keys = set()
                self._pending_on_rollback = []
                try:
                    yield self._writer
                    await self._writer.commit()
                except BaseException:
                    # BaseException, not Exception: a cancelled task must still roll
                    # back, otherwise the writer stays inside an open transaction and
                    # every later BEGIN fails until restart.
                    self._pending_after_commit = None
                    await self._rollback_quietly()
                    self._run_rollback_callbacks(0)
                    raise
                callbacks, self._pending_after_commit = self._pending_after_commit, None
                self._pending_on_rollback = []
            finally:
                self._tx_owner = None

        for callback in callbacks:
            try:
                result = callback()
                if inspect.isawaitable(result):
                    await result
            except Exception:
                logger.exception("after_commit callback failed")

    @asynccontextmanager
    async def _savepoint(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        assert self._writer is not None and self._pending_after_commit is not None
        self._savepoint_counter += 1
        name = f"ss_sp_{self._savepoint_counter}"
        callbacks_mark = len(self._pending_after_commit)
        rollback_mark = len(self._pending_on_rollback)
        keys_snapshot = set(self._after_commit_keys)
        await self._writer.execute(f"SAVEPOINT {name};")
        try:
            yield self._writer
            await self._writer.execute(f"RELEASE SAVEPOINT {name};")
        except BaseException:
            try:
                await asyncio.shield(self._writer.execute(f"ROLLBACK TO SAVEPOINT {name};"))
                await asyncio.shield(self._writer.execute(f"RELEASE SAVEPOINT {name};"))
            except Exception:
                logger.exception("Savepoint rollback failed")
            del self._pending_after_commit[callbacks_mark:]
            self._after_commit_keys = keys_snapshot
            self._run_rollback_callbacks(rollback_mark)
            raise

    def _run_rollback_callbacks(self, mark: int) -> None:
        callbacks = self._pending_on_rollback[mark:]
        del self._pending_on_rollback[mark:]
        for callback in reversed(callbacks):
            try:
                callback()
            except Exception:
                logger.exception("on_rollback callback failed")

    async def _rollback_quietly(self) -> None:
        if self._writer is None:
            return
        try:
            # Shielded so a second cancellation cannot abandon the rollback.
            await asyncio.shield(self._writer.rollback())
        except Exception:
            logger.exception("Rollback failed")

    def after_commit(self, callback: Callable[[], Any], key: str | None = None) -> None:
        """Runs callback once the current writer transaction commits.

        Callbacks are dropped if the transaction rolls back, so side effects
        such as SSE broadcasts never announce data that was not persisted.
        A callback registered with a key runs at most once per transaction.
        """
        if self._pending_after_commit is None:
            raise RuntimeError("after_commit() requires an active transaction")
        if key is not None:
            if key in self._after_commit_keys:
                return
            self._after_commit_keys.add(key)
        self._pending_after_commit.append(callback)

    def on_rollback(self, callback: Callable[[], Any]) -> None:
        """Runs callback if the current transaction (or its savepoint) rolls back.

        Used to undo side effects outside the database, such as removing an
        uploaded file whose row never committed.
        """
        if self._pending_after_commit is None:
            raise RuntimeError("on_rollback() requires an active transaction")
        self._pending_on_rollback.append(callback)

    async def vacuum_into(self, target_path: Path | str) -> None:
        """Executes VACUUM INTO target_path on the writer connection outside a transaction."""
        if self._writer is None:
            raise RuntimeError("Database is not connected")

        target_posix = Path(target_path).as_posix()
        async with self._writer_lock:
            async with self._writer.execute("VACUUM INTO ?;", (target_posix,)):
                pass

    async def write(
        self,
        sql: str,
        params: Sequence[Any] | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> aiosqlite.Cursor:
        if conn is not None:
            return await conn.execute(sql, params or ())

        async with self.transaction() as writer_conn:
            return await writer_conn.execute(sql, params or ())

    async def read_val(
        self,
        sql: str,
        params: Sequence[Any] | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> Any:
        rows = await self._fetch(sql, params, conn)
        return rows[0][0] if rows else None

    async def read_one(
        self,
        sql: str,
        params: Sequence[Any] | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any] | None:
        rows = await self._fetch(sql, params, conn)
        return dict(rows[0]) if rows else None

    async def read_all(
        self,
        sql: str,
        params: Sequence[Any] | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> list[dict[str, Any]]:
        return [dict(row) for row in await self._fetch(sql, params, conn)]

    async def _fetch(
        self,
        sql: str,
        params: Sequence[Any] | None,
        conn: aiosqlite.Connection | None,
    ) -> list[Any]:
        """Executes and drains a query in one step on the connection's thread.

        Tasks share the reader connection. A statement left open across an
        await (execute, then fetch later) holds its read snapshot, and every
        other task's query on that connection would see that stale snapshot
        instead of rows committed since.
        """
        active_conn = conn if conn is not None else self._reader
        if active_conn is None:
            raise RuntimeError("Database is not connected")
        return list(await active_conn.execute_fetchall(sql, params or ()))

    fetch_all = read_all
    fetch_one = read_one
    execute = write

    @staticmethod
    async def execute_script(conn: aiosqlite.Connection, script: str) -> None:
        """Executes every statement of script on conn inside the caller's transaction."""
        for statement in split_sql_script(script):
            await conn.execute(statement)

    async def run_migrations(
        self, migrations_dir: Path | str | None = None
    ) -> list[int]:
        if migrations_dir is None:
            target_dir = Path(__file__).parent / "migrations"
        else:
            target_dir = Path(migrations_dir)

        if not target_dir.is_dir():
            return []

        # Find migration files matching NNNN_<slug>.sql
        migration_files: list[tuple[int, Path]] = []
        for file in target_dir.glob("*.sql"):
            match = re.match(r"^(\d{4})_.*\.sql$", file.name)
            if match:
                migration_num = int(match.group(1))
                migration_files.append((migration_num, file))

        migration_files.sort(key=lambda x: x[0])

        # Ensure kernel_migrations table exists
        async with self.transaction() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS kernel_migrations (
                    number INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at TEXT NOT NULL
                );
                """
            )

        applied_rows = await self.read_all("SELECT number FROM kernel_migrations;")
        applied_set = {row["number"] for row in applied_rows}

        newly_applied: list[int] = []
        for num, file_path in migration_files:
            if num in applied_set:
                continue

            sql_script = file_path.read_text(encoding="utf-8")
            now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            # The schema change and its bookkeeping row commit or roll back together.
            async with self.transaction() as conn:
                await self.execute_script(conn, sql_script)
                await conn.execute(
                    "INSERT INTO kernel_migrations (number, name, applied_at) VALUES (?, ?, ?);",
                    (num, file_path.name, now_iso),
                )
            newly_applied.append(num)

        return newly_applied

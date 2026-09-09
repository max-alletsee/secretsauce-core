import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
import re
from typing import Any, AsyncGenerator, Sequence

import aiosqlite


class Database:
    def __init__(self, db_path: str | Path):
        self.db_path = Path(db_path)
        self._writer_lock = asyncio.Lock()
        self._writer: aiosqlite.Connection | None = None
        self._reader: aiosqlite.Connection | None = None

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

        async with self._writer_lock:
            await self._writer.execute("BEGIN IMMEDIATE;")
            try:
                yield self._writer
                await self._writer.commit()
            except Exception:
                await self._writer.rollback()
                raise

    async def vacuum_into(self, target_path: Path | str) -> None:
        """Executes VACUUM INTO target_path on the writer connection outside a transaction."""
        if self._writer is None:
            raise RuntimeError("Database is not connected")

        target_posix = Path(target_path).as_posix()
        async with self._writer_lock:
            async with self._writer.execute(f"VACUUM INTO '{target_posix}';"):
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
        active_conn = conn if conn is not None else self._reader
        if active_conn is None:
            raise RuntimeError("Database is not connected")

        async with active_conn.execute(sql, params or ()) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            return row[0]

    async def read_one(
        self,
        sql: str,
        params: Sequence[Any] | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> dict[str, Any] | None:
        active_conn = conn if conn is not None else self._reader
        if active_conn is None:
            raise RuntimeError("Database is not connected")

        async with active_conn.execute(sql, params or ()) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            return dict(row)

    async def read_all(
        self,
        sql: str,
        params: Sequence[Any] | None = None,
        conn: aiosqlite.Connection | None = None,
    ) -> list[dict[str, Any]]:
        active_conn = conn if conn is not None else self._reader
        if active_conn is None:
            raise RuntimeError("Database is not connected")

        async with active_conn.execute(sql, params or ()) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

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

            async with self.transaction() as conn:
                await conn.executescript(sql_script)
                await conn.execute(
                    "INSERT INTO kernel_migrations (number, name, applied_at) VALUES (?, ?, ?);",
                    (num, file_path.name, now_iso),
                )
            newly_applied.append(num)

        return newly_applied

import asyncio
from datetime import datetime, timezone
import mimetypes
from pathlib import Path, PurePosixPath
from typing import Any, Callable
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ConflictError, NotFoundError, PayloadTooLargeError, ValidationError
from secretsauce.events import EventLog
from secretsauce.nouns._common import emit_noun_event, in_transaction

DEFAULT_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

MAX_ASSET_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

# Types browsers may render in place; everything else is served as a download.
INLINE_CONTENT_TYPES = frozenset(DEFAULT_ALLOWED_CONTENT_TYPES)

_SIGNATURES: dict[str, Callable[[bytes], bool]] = {
    "image/jpeg": lambda b: b.startswith(b"\xff\xd8\xff"),
    "image/png": lambda b: b.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda b: len(b) >= 12 and b[:4] == b"RIFF" and b[8:12] == b"WEBP",
    "application/pdf": lambda b: b.startswith(b"%PDF-"),
}

_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


def _normalize_content_type(content_type: str) -> str:
    return content_type.split(";", 1)[0].strip().lower()


def _extension_for(content_type: str) -> str:
    """The stored file's extension follows its verified type, never the client's filename."""
    return _EXTENSIONS.get(content_type) or mimetypes.guess_extension(content_type) or ".bin"


def _display_filename(filename: str) -> str:
    name = PurePosixPath(filename.replace("\\", "/")).name
    name = "".join(ch for ch in name if ch.isprintable()).strip()
    return name[:255] or "file"


def _write_new_file(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "xb") as fh:
        fh.write(data)


class AssetsRepo:
    def __init__(
        self,
        db: Database,
        uploads_dir: Path | str = "/data/uploads",
        events: EventLog | None = None,
    ):
        self.db = db
        self.uploads_dir = Path(uploads_dir)
        self.events = events
        self.allowed_content_types = set(DEFAULT_ALLOWED_CONTENT_TYPES)

    def allow_content_type(self, content_type: str) -> None:
        self.allowed_content_types.add(_normalize_content_type(content_type))

    def _validate(self, content_type: str, data: bytes) -> None:
        if len(data) > MAX_ASSET_SIZE_BYTES:
            raise PayloadTooLargeError(
                f"Asset size {len(data)} exceeds maximum of {MAX_ASSET_SIZE_BYTES} bytes"
            )
        if content_type not in self.allowed_content_types:
            raise ValidationError(
                f"Content type '{content_type}' is not allowed",
                fields={"content_type": f"Disallowed type {content_type}"},
            )
        matches = _SIGNATURES.get(content_type)
        if matches is not None and not matches(data):
            raise ValidationError(
                f"File content does not match content type '{content_type}'",
                fields={"file": f"Not a valid {content_type} file"},
            )

    def _on_rollback(self, fn: Callable[[], Any]) -> None:
        try:
            self.db.on_rollback(fn)
        except RuntimeError:
            pass  # caller's connection is not a Database.transaction()

    def _after_commit(self, fn: Callable[[], Any]) -> None:
        try:
            self.db.after_commit(fn)
        except RuntimeError:
            fn()  # caller's connection is not a Database.transaction()

    async def save_asset(
        self,
        entity_type: str,
        entity_id: str,
        filename: str,
        content_type: str,
        data: bytes,
        slot: str = "primary",
        sub_id: str | None = None,
        asset_id: str | None = None,
        conn: aiosqlite.Connection | None = None,
        actor_member_id: str | None = None,
    ) -> dict[str, Any]:
        content_type = _normalize_content_type(content_type)
        self._validate(content_type, data)

        aid = asset_id or str(uuid.uuid4()).lower()
        now = datetime.now(timezone.utc)
        year_str = now.strftime("%Y")
        month_str = now.strftime("%m")
        stored_name = f"{aid}{_extension_for(content_type)}"
        rel_path = f"uploads/{year_str}/{month_str}/{stored_name}"
        dest_path = self.uploads_dir / year_str / month_str / stored_name

        async def _do_save(writer_conn: aiosqlite.Connection) -> dict[str, Any]:
            existing = await self.db.read_one(
                "SELECT * FROM assets WHERE id = ?;", (aid,), conn=writer_conn
            )
            if existing is not None:
                raise ConflictError(f"Asset '{aid}' already exists", current=dict(existing))

            try:
                await asyncio.to_thread(_write_new_file, dest_path, data)
            except FileExistsError:
                raise ConflictError(f"Asset file for '{aid}' already exists")
            self._on_rollback(lambda: dest_path.unlink(missing_ok=True))

            await writer_conn.execute(
                """
                INSERT INTO assets (
                    id, entity_type, entity_id, sub_id, slot,
                    filename, content_type, size_bytes, storage_path, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    aid,
                    entity_type,
                    entity_id,
                    sub_id,
                    slot,
                    _display_filename(filename),
                    content_type,
                    len(data),
                    rel_path,
                    now.strftime("%Y-%m-%dT%H:%M:%SZ"),
                ),
            )
            created = await self.get_asset(aid, conn=writer_conn)
            await emit_noun_event(
                self.events,
                writer_conn,
                "asset:created",
                "asset",
                aid,
                after=created,
                actor_member_id=actor_member_id,
            )
            return created

        return await in_transaction(self.db, conn, _do_save)

    async def get_asset(
        self, asset_id: str, conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM assets WHERE id = ?;", (asset_id,), conn=conn
        )
        if row is None:
            raise NotFoundError(f"Asset '{asset_id}' not found")
        return dict(row)

    def path_for(self, asset: dict[str, Any]) -> Path:
        rel_path = asset["storage_path"]
        # Stored paths are 'uploads/<yyyy>/<mm>/<file>', relative to the data dir.
        if rel_path.startswith("uploads/"):
            rel_path = rel_path[len("uploads/") :]
        path = (self.uploads_dir / rel_path).resolve()
        if not path.is_relative_to(self.uploads_dir.resolve()):
            raise NotFoundError(f"Asset '{asset['id']}' has an invalid storage path")
        return path

    async def get_asset_file_path(
        self, asset_id: str, conn: aiosqlite.Connection | None = None
    ) -> Path:
        return self.path_for(await self.get_asset(asset_id, conn=conn))

    async def list_assets(
        self,
        entity_type: str,
        entity_id: str,
        conn: aiosqlite.Connection | None = None,
    ) -> list[dict[str, Any]]:
        rows = await self.db.read_all(
            "SELECT * FROM assets WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC;",
            (entity_type, entity_id),
            conn=conn,
        )
        return [dict(r) for r in rows]

    async def delete_asset(
        self,
        asset_id: str,
        conn: aiosqlite.Connection | None = None,
        actor_member_id: str | None = None,
    ) -> None:
        async def _do_delete(writer_conn: aiosqlite.Connection) -> None:
            asset = await self.get_asset(asset_id, conn=writer_conn)
            file_path = self.path_for(asset)
            await writer_conn.execute("DELETE FROM assets WHERE id = ?;", (asset_id,))
            await emit_noun_event(
                self.events,
                writer_conn,
                "asset:deleted",
                "asset",
                asset_id,
                before=asset,
                actor_member_id=actor_member_id,
            )
            # The file goes only once the row is gone for good.
            self._after_commit(lambda: file_path.unlink(missing_ok=True))

        await in_transaction(self.db, conn, _do_delete)

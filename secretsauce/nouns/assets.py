from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import uuid

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import NotFoundError, PayloadTooLargeError, ValidationError

DEFAULT_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

MAX_ASSET_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AssetsRepo:
    def __init__(
        self, db: Database, uploads_dir: Path | str = "/data/uploads"
    ):
        self.db = db
        self.uploads_dir = Path(uploads_dir)
        self.allowed_content_types = set(DEFAULT_ALLOWED_CONTENT_TYPES)

    def allow_content_type(self, content_type: str) -> None:
        self.allowed_content_types.add(content_type)

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
    ) -> dict[str, Any]:
        size_bytes = len(data)
        if size_bytes > MAX_ASSET_SIZE_BYTES:
            raise PayloadTooLargeError(
                f"Asset size {size_bytes} exceeds maximum of {MAX_ASSET_SIZE_BYTES} bytes"
            )

        if content_type not in self.allowed_content_types:
            raise ValidationError(
                f"Content type '{content_type}' is not allowed",
                fields={"content_type": f"Disallowed type {content_type}"},
            )

        aid = asset_id or str(uuid.uuid4()).lower()
        now = datetime.now(timezone.utc)
        year_str = now.strftime("%Y")
        month_str = now.strftime("%m")

        # Determine file extension
        ext = ""
        if "." in filename:
            ext = "." + filename.rsplit(".", 1)[1].lower()
        elif content_type == "image/jpeg":
            ext = ".jpg"
        elif content_type == "image/png":
            ext = ".png"
        elif content_type == "image/webp":
            ext = ".webp"
        elif content_type == "application/pdf":
            ext = ".pdf"

        rel_path = f"uploads/{year_str}/{month_str}/{aid}{ext}"
        dest_path = self.uploads_dir / year_str / month_str / f"{aid}{ext}"
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(data)

        now_iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        sql = """
        INSERT INTO assets (
            id, entity_type, entity_id, sub_id, slot,
            filename, content_type, size_bytes, storage_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        params = (
            aid,
            entity_type,
            entity_id,
            sub_id,
            slot,
            filename,
            content_type,
            size_bytes,
            rel_path,
            now_iso,
        )

        if conn is not None:
            await conn.execute(sql, params)
        else:
            async with self.db.transaction() as writer_conn:
                await writer_conn.execute(sql, params)

        return await self.get_asset(aid, conn=conn)

    async def get_asset(
        self, asset_id: str, conn: aiosqlite.Connection | None = None
    ) -> dict[str, Any]:
        row = await self.db.read_one(
            "SELECT * FROM assets WHERE id = ?;", (asset_id,), conn=conn
        )
        if row is None:
            raise NotFoundError(f"Asset '{asset_id}' not found")
        return dict(row)

    async def get_asset_file_path(
        self, asset_id: str, conn: aiosqlite.Connection | None = None
    ) -> Path:
        asset = await self.get_asset(asset_id, conn=conn)
        rel_path = asset["storage_path"]
        # If relative storage path starts with 'uploads/', strip it relative to self.uploads_dir
        if rel_path.startswith("uploads/"):
            sub_path = rel_path[len("uploads/") :]
            return self.uploads_dir / sub_path
        return self.uploads_dir / rel_path

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
        self, asset_id: str, conn: aiosqlite.Connection | None = None
    ) -> None:
        async def _do_delete(writer_conn: aiosqlite.Connection) -> None:
            asset = await self.get_asset(asset_id, conn=writer_conn)
            file_path = await self.get_asset_file_path(asset_id, conn=writer_conn)
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError:
                    pass
            await writer_conn.execute(
                "DELETE FROM assets WHERE id = ?;", (asset_id,)
            )

        if conn is not None:
            await _do_delete(conn)
        else:
            async with self.db.transaction() as writer_conn:
                await _do_delete(writer_conn)

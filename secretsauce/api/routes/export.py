import asyncio
import io
import os
from pathlib import Path
import shutil
import tempfile
from typing import IO
import zipfile

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from secretsauce import __version__
from secretsauce.db import Database
from secretsauce.nouns.journal import _deserialize_journal
from secretsauce.nouns.members import _deserialize_member
from secretsauce.nouns.recipes import _deserialize_recipe
from secretsauce.nouns.schedule import _deserialize_schedule

router = APIRouter(tags=["export"])

DB_NAME = "secretsauce.db"
_EXPORT_DIRS = ("uploads", "plugins", "site")


def _write_zip(target: str | Path | IO[bytes], db_copy: Path, data_path: Path) -> None:
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(db_copy, arcname=DB_NAME)
        for dirname in _EXPORT_DIRS:
            root_dir = data_path / dirname
            if not root_dir.is_dir():
                continue
            for path in sorted(root_dir.rglob("*")):
                if path.is_file() and "__pycache__" not in path.parts:
                    zf.write(path, arcname=path.relative_to(data_path).as_posix())
        config_file = data_path / "config.json"
        if config_file.is_file():
            zf.write(config_file, arcname="config.json")


async def create_export_zip(
    db: Database, data_dir: Path | str, target_path: Path | str | None = None
) -> bytes | None:
    """Zip of a VACUUM INTO copy of the database, uploads/, plugins/, site/ and config.json.

    Writes to target_path when given (returns None), otherwise returns the bytes.
    Zipping runs in a thread so large upload folders never block the event loop.
    """
    data_path = Path(data_dir)
    with tempfile.TemporaryDirectory() as td:
        db_copy = Path(td) / DB_NAME
        await db.vacuum_into(db_copy)
        if target_path is not None:
            await asyncio.to_thread(_write_zip, target_path, db_copy, data_path)
            return None
        buffer = io.BytesIO()
        await asyncio.to_thread(_write_zip, buffer, db_copy, data_path)
        return buffer.getvalue()


def restore_from_zip(backup_path: Path | str, target_data_dir: Path | str) -> None:
    """Restores an export zip into target_data_dir, refusing paths that escape it."""
    backup = Path(backup_path)
    if not backup.is_file():
        raise FileNotFoundError(f"Backup file not found: {backup}")

    target_dir = Path(target_data_dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(backup, "r") as zf:
        if DB_NAME not in zf.namelist():
            raise ValueError(f"Invalid backup archive: missing '{DB_NAME}'")

        members = []
        for member in zf.infolist():
            dest_path = (target_dir / member.filename).resolve()
            if not dest_path.is_relative_to(target_dir):
                raise ValueError(f"Malicious path in zip archive: {member.filename}")
            members.append((member, dest_path))

        # A WAL left from the old database would be replayed onto the restored one.
        for suffix in ("-wal", "-shm"):
            (target_dir / f"{DB_NAME}{suffix}").unlink(missing_ok=True)

        for member, dest_path in members:
            if member.is_dir():
                dest_path.mkdir(parents=True, exist_ok=True)
                continue
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as source, open(dest_path, "wb") as target:
                shutil.copyfileobj(source, target, length=1024 * 1024)


@router.get("/api/health")
async def health(request: Request):
    kernel = getattr(request.app.state, "kernel", None)
    return {
        "ok": True,
        "status": "ok",
        "boot_id": getattr(kernel, "boot_id", None),
        "version": __version__,
    }


@router.get("/api/export")
async def export_zip(request: Request):
    kernel = request.app.state.kernel
    fd, tmp_name = tempfile.mkstemp(prefix="secretsauce-export-", suffix=".zip")
    os.close(fd)
    try:
        await create_export_zip(kernel.db, kernel.data_dir, target_path=tmp_name)
    except BaseException:
        os.unlink(tmp_name)
        raise
    return FileResponse(
        tmp_name,
        media_type="application/zip",
        filename="secretsauce-backup.zip",
        background=BackgroundTask(os.unlink, tmp_name),
    )


@router.get("/api/export/json")
async def export_json(request: Request):
    kernel = request.app.state.kernel
    db: Database = kernel.db
    recipes = await db.read_all("SELECT * FROM recipes ORDER BY group_id, language;")
    schedule = await db.read_all("SELECT * FROM schedule_entries ORDER BY date, position;")
    journal = await db.read_all("SELECT * FROM cook_journal ORDER BY date DESC, created_at DESC;")
    members = await db.read_all("SELECT * FROM household_members ORDER BY name;")
    assets = await db.read_all("SELECT * FROM assets ORDER BY created_at;")
    config = await kernel.household.get_config()
    config.pop("passphrase_version", None)
    return {
        "recipes": [_deserialize_recipe(r) for r in recipes],
        "schedule_entries": [_deserialize_schedule(r) for r in schedule],
        "cook_journal": [_deserialize_journal(r) for r in journal],
        "household_members": [_deserialize_member(r) for r in members],
        "assets": assets,
        "household_config": config,
    }

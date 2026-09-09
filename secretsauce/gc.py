import asyncio
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from secretsauce.db import Database

logger = logging.getLogger(__name__)


async def run_garbage_collection(db: Database, data_dir: Path | str) -> list[str]:
    """
    Garbage collector runs lazy cleanups:
    1. Unlinked files under uploads/ that have no corresponding assets row.
    2. Assets rows whose sub_id no longer exists in any language row of the recipe.
    3. Events below every cursor and older than 30 days.
    """
    data_path = Path(data_dir)
    uploads_dir = data_path / "uploads"
    deleted_files: list[str] = []

    # 1. Clean unlinked upload files
    if uploads_dir.exists() and uploads_dir.is_dir():
        asset_rows = await db.read_all("SELECT id, storage_path, filename FROM assets")
        known_files = {Path(r["storage_path"]).name for r in asset_rows if r.get("storage_path")}
        known_ids = {r["id"] for r in asset_rows if r.get("id")}

        for file_path in uploads_dir.iterdir():
            if file_path.is_file():
                stem = file_path.stem
                name = file_path.name
                if stem not in known_ids and name not in known_files and name not in known_ids:
                    try:
                        file_path.unlink()
                        deleted_files.append(file_path.name)
                        logger.info("GC unlinked orphan file: %s", file_path.name)
                    except OSError as e:
                        logger.warning("Failed to unlink %s: %s", file_path, e)

    # 2. Clean recipe assets rows where sub_id is no longer referenced
    recipe_assets = await db.read_all(
        "SELECT id, entity_id, sub_id FROM assets WHERE entity_type = 'recipe' AND sub_id IS NOT NULL"
    )
    for asset in recipe_assets:
        group_id = asset["entity_id"]
        sub_id = asset["sub_id"]
        recipe_rows = await db.read_all(
            "SELECT ingredients, instructions, assets FROM recipes WHERE group_id = ?",
            (group_id,),
        )
        if not recipe_rows:
            # Recipe deleted, clean up asset
            await _delete_asset(db, uploads_dir, asset["id"])
            continue

        referenced = False
        for row in recipe_rows:
            content = f"{row.get('ingredients', '')} {row.get('instructions', '')} {row.get('assets', '')}"
            if sub_id in content:
                referenced = True
                break

        if not referenced:
            await _delete_asset(db, uploads_dir, asset["id"])

    # 3. Prune events below every cursor older than 30 days
    cursor_res = await db.read_one("SELECT MIN(last_seq) AS min_seq FROM event_cursors")
    if cursor_res and cursor_res["min_seq"] is not None:
        min_seq = cursor_res["min_seq"]
        cutoff_dt = datetime.now(timezone.utc) - timedelta(days=30)
        cutoff_str = cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        async with db.transaction() as tx:
            await tx.execute(
                "DELETE FROM events WHERE seq < ? AND created_at < ?",
                (min_seq, cutoff_str),
            )

    return deleted_files


async def _delete_asset(db: Database, uploads_dir: Path, asset_id: str) -> None:
    async with db.transaction() as tx:
        await tx.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
    if uploads_dir.exists():
        for f in uploads_dir.glob(f"{asset_id}*"):
            try:
                f.unlink()
            except OSError:
                pass


async def periodic_gc_worker(db: Database, data_dir: Path | str, interval: float = 3600.0) -> None:
    """Hourly background garbage collector loop."""
    while True:
        try:
            await asyncio.sleep(interval)
            await run_garbage_collection(db, data_dir)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Error in GC periodic worker: %s", e)

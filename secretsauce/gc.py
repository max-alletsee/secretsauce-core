import asyncio
from datetime import datetime, timedelta, timezone
import json
import logging
from pathlib import Path
import time

from secretsauce.db import Database
from secretsauce.nouns.household import DEFAULT_EVENT_RETENTION_DAYS

logger = logging.getLogger(__name__)

EVENT_RETENTION = timedelta(days=DEFAULT_EVENT_RETENTION_DAYS)
# A file younger than this may belong to an upload whose row has not committed yet.
ORPHAN_GRACE_SECONDS = 3600.0


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def _unlink_orphan_files(db: Database, uploads_dir: Path, grace_seconds: float) -> list[str]:
    if not uploads_dir.is_dir():
        return []
    rows = await db.read_all("SELECT storage_path FROM assets;")
    known = {r["storage_path"] for r in rows if r.get("storage_path")}
    cutoff = time.time() - grace_seconds

    def sweep() -> list[str]:
        deleted: list[str] = []
        for path in uploads_dir.rglob("*"):
            if not path.is_file():
                continue
            rel = "uploads/" + path.relative_to(uploads_dir).as_posix()
            if rel in known or path.stat().st_mtime > cutoff:
                continue
            try:
                path.unlink()
                deleted.append(path.relative_to(uploads_dir).as_posix())
            except OSError as e:
                logger.warning("Failed to unlink %s: %s", path, e)
        return deleted

    deleted = await asyncio.to_thread(sweep)
    for name in deleted:
        logger.info("GC unlinked orphan file: %s", name)
    return deleted


async def _delete_unreferenced_recipe_assets(db: Database, uploads_dir: Path) -> int:
    """Recipe assets whose sub_id no longer appears in any language row of the recipe."""
    assets = await db.read_all(
        "SELECT id, entity_id, sub_id, storage_path FROM assets "
        "WHERE entity_type = 'recipe' AND sub_id IS NOT NULL;"
    )
    if not assets:
        return 0
    group_ids = sorted({a["entity_id"] for a in assets})
    placeholders = ",".join("?" * len(group_ids))
    rows = await db.read_all(
        f"SELECT group_id, ingredients, steps FROM recipes WHERE group_id IN ({placeholders});",
        group_ids,
    )
    content: dict[str, str] = {}
    for r in rows:
        content[r["group_id"]] = content.get(r["group_id"], "") + f" {r['ingredients']} {r['steps']}"

    doomed = [a for a in assets if a["sub_id"] not in content.get(a["entity_id"], "")]
    if not doomed:
        return 0
    async with db.transaction() as tx:
        await tx.executemany("DELETE FROM assets WHERE id = ?;", [(a["id"],) for a in doomed])
    for a in doomed:
        rel = a["storage_path"].removeprefix("uploads/")
        (uploads_dir / rel).unlink(missing_ok=True)
    return len(doomed)


async def _event_retention_days(db: Database) -> int:
    raw = await db.read_val(
        "SELECT value FROM household_config WHERE key = 'event_retention_days';"
    )
    if raw is None:
        return DEFAULT_EVENT_RETENTION_DAYS
    try:
        parsed = json.loads(raw) if isinstance(raw, str) else raw
        if isinstance(parsed, int) and not isinstance(parsed, bool) and parsed >= 1:
            return parsed
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return DEFAULT_EVENT_RETENTION_DAYS


async def _prune_events(db: Database) -> int:
    """Events below every active plugin's cursor and older than the retention window.

    Disabled plugins keep their cursors but do not hold the log hostage; when
    one is re-activated past the retained window it skips to head and rebuilds.
    """
    min_seq = await db.read_val(
        """
        SELECT MIN(c.last_seq) FROM event_cursors c
        JOIN plugins p ON p.id = c.plugin_id
        WHERE p.state = 'active';
        """
    )
    if min_seq is None:
        min_seq = await db.read_val("SELECT COALESCE(MAX(seq), 0) FROM events;")
    retention_days = await _event_retention_days(db)
    cutoff = _iso(datetime.now(timezone.utc) - timedelta(days=retention_days))
    cursor = await db.write(
        "DELETE FROM events WHERE seq <= ? AND created_at < ?;", (min_seq, cutoff)
    )
    return cursor.rowcount


async def run_garbage_collection(
    db: Database,
    data_dir: Path | str,
    grace_seconds: float = ORPHAN_GRACE_SECONDS,
) -> list[str]:
    """Lazy cleanups; returns the upload files it removed (relative to uploads/)."""
    uploads_dir = Path(data_dir) / "uploads"
    deleted_files = await _unlink_orphan_files(db, uploads_dir, grace_seconds)
    await _delete_unreferenced_recipe_assets(db, uploads_dir)
    await _prune_events(db)
    return deleted_files


async def periodic_gc_worker(db: Database, data_dir: Path | str, interval: float = 3600.0) -> None:
    """Hourly background garbage collector loop."""
    while True:
        await asyncio.sleep(interval)
        try:
            await run_garbage_collection(db, data_dir)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Garbage collection failed")

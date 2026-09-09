import io
import json
import os
import sqlite3
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, Response

from secretsauce import __version__
from secretsauce.db import Database

router = APIRouter(tags=["export"])


async def create_export_zip(
    db: Database, data_dir: Path | str, target_path: Path | str | None = None
) -> bytes | None:
    """
    Creates a zip containing:
    - VACUUM INTO copy of secretsauce.db
    - uploads/
    - plugins/
    - site/ (if present)
    - config.json (if present)
    """
    data_path = Path(data_dir)

    with tempfile.TemporaryDirectory() as td:
        temp_db = Path(td) / "secretsauce.db"

        # Execute VACUUM INTO via database vacuum_into method
        await db.vacuum_into(temp_db)

        # Prepare target zip
        if target_path is not None:
            zip_target = str(target_path)
            zf = zipfile.ZipFile(zip_target, "w", zipfile.ZIP_DEFLATED)
        else:
            buffer = io.BytesIO()
            zf = zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED)

        with zf:
            # 1. Add database
            zf.write(temp_db, arcname="secretsauce.db")

            # 2. Add uploads/
            uploads_dir = data_path / "uploads"
            if uploads_dir.exists() and uploads_dir.is_dir():
                for root, _, files in os.walk(uploads_dir):
                    for file in files:
                        full_path = Path(root) / file
                        rel_path = full_path.relative_to(data_path)
                        zf.write(full_path, arcname=str(rel_path).replace("\\", "/"))

            # 3. Add plugins/
            plugins_dir = data_path / "plugins"
            if plugins_dir.exists() and plugins_dir.is_dir():
                for root, _, files in os.walk(plugins_dir):
                    for file in files:
                        full_path = Path(root) / file
                        rel_path = full_path.relative_to(data_path)
                        zf.write(full_path, arcname=str(rel_path).replace("\\", "/"))

            # 4. Add site/
            site_dir = data_path / "site"
            if site_dir.exists() and site_dir.is_dir():
                for root, _, files in os.walk(site_dir):
                    for file in files:
                        full_path = Path(root) / file
                        rel_path = full_path.relative_to(data_path)
                        zf.write(full_path, arcname=str(rel_path).replace("\\", "/"))

            # 5. Add config.json
            config_file = data_path / "config.json"
            if config_file.exists() and config_file.is_file():
                zf.write(config_file, arcname="config.json")

        if target_path is None:
            return buffer.getvalue()
        return None


@router.get("/api/health")
async def health(request: Request):
    kernel = getattr(request.app.state, "kernel", None)
    boot_id = getattr(kernel, "boot_id", None) if kernel else None
    return {"ok": True, "status": "ok", "boot_id": boot_id, "version": __version__}


@router.get("/api/export")
async def export_zip(request: Request):
    kernel = request.app.state.kernel
    zip_bytes = await create_export_zip(kernel.db, kernel.data_dir)
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="secretsauce-backup.zip"'
        },
    )


@router.get("/api/export/json")
async def export_json(request: Request):
    kernel = request.app.state.kernel
    db: Database = kernel.db

    recipes = await db.read_all("SELECT * FROM recipes ORDER BY group_id, language")
    schedule_entries = await db.read_all("SELECT * FROM schedule_entries ORDER BY date")
    cook_journal = await db.read_all(
        "SELECT * FROM cook_journal ORDER BY date DESC, created_at DESC"
    )
    household_members = await db.read_all(
        "SELECT * FROM household_members ORDER BY name"
    )
    assets = await db.read_all("SELECT * FROM assets ORDER BY created_at")
    household_config = await kernel.household.get_config()

    # Parse JSON text columns where applicable for clean json
    for r in recipes:
        if "tags" in r and isinstance(r["tags"], str):
            try:
                r["tags"] = json.loads(r["tags"])
            except Exception:
                pass
        if "custom_fields" in r and isinstance(r["custom_fields"], str):
            try:
                r["custom_fields"] = json.loads(r["custom_fields"])
            except Exception:
                pass
        if "assets" in r and isinstance(r["assets"], str):
            try:
                r["assets"] = json.loads(r["assets"])
            except Exception:
                pass

    for s in schedule_entries:
        if "custom_fields" in s and isinstance(s["custom_fields"], str):
            try:
                s["custom_fields"] = json.loads(s["custom_fields"])
            except Exception:
                pass

    for c in cook_journal:
        if (
            "participant_member_ids" in c
            and isinstance(c["participant_member_ids"], str)
        ):
            try:
                c["participant_member_ids"] = json.loads(c["participant_member_ids"])
            except Exception:
                pass
        if "custom_fields" in c and isinstance(c["custom_fields"], str):
            try:
                c["custom_fields"] = json.loads(c["custom_fields"])
            except Exception:
                pass

    for m in household_members:
        for f in [
            "dietary_restrictions",
            "allergies",
            "disliked_ingredients",
            "favorite_cuisines",
        ]:
            if f in m and isinstance(m[f], str):
                try:
                    m[f] = json.loads(m[f])
                except Exception:
                    pass

    if household_config:
        if "meal_types" in household_config and isinstance(
            household_config["meal_types"], str
        ):
            try:
                household_config["meal_types"] = json.loads(
                    household_config["meal_types"]
                )
            except Exception:
                pass
        if "languages" in household_config and isinstance(
            household_config["languages"], str
        ):
            try:
                household_config["languages"] = json.loads(
                    household_config["languages"]
                )
            except Exception:
                pass

    return {
        "recipes": recipes,
        "schedule_entries": schedule_entries,
        "cook_journal": cook_journal,
        "household_members": household_members,
        "assets": assets,
        "household_config": household_config,
    }

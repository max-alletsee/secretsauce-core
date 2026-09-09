from datetime import datetime, timezone
import json
from typing import Any

from secretsauce.db import Database
from secretsauce.plugins.manifest import PluginManifest


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class PluginRegistry:
    def __init__(self, db: Database):
        self.db = db
        self._manifests: dict[str, PluginManifest] = {}

    def register_manifest(self, manifest: PluginManifest) -> None:
        self._manifests[manifest.id] = manifest

    def get_manifest(self, plugin_id: str) -> PluginManifest | None:
        return self._manifests.get(plugin_id)

    async def get_plugin(self, plugin_id: str) -> dict[str, Any] | None:
        row = await self.db.read_one(
            "SELECT * FROM plugins WHERE id = ?;", (plugin_id,)
        )
        if not row:
            return None
        res = dict(row)
        res["applied_schema"] = res.get("schema_applied", 0)
        res["error"] = res.get("last_error")
        if isinstance(res.get("config"), str):
            try:
                res["config"] = json.loads(res["config"])
            except Exception:
                pass

        manifest = self._manifests.get(plugin_id)
        if manifest:
            res["name"] = manifest.name
            res["description"] = manifest.description
            res["requires"] = manifest.requires
            res["ui"] = manifest.ui
            res["ui_css"] = manifest.ui_css
            res["ui_api"] = manifest.ui_api
            res["config_schema"] = manifest.config_schema
            res["schema"] = manifest.schema

        return res

    async def list_plugins(self) -> list[dict[str, Any]]:
        rows = await self.db.read_all("SELECT * FROM plugins ORDER BY id ASC;")
        res = []
        for r in rows:
            item = dict(r)
            item["applied_schema"] = item.get("schema_applied", 0)
            item["error"] = item.get("last_error")
            if isinstance(item.get("config"), str):
                try:
                    item["config"] = json.loads(item["config"])
                except Exception:
                    pass
            manifest = self._manifests.get(item["id"])
            if manifest:
                item["name"] = manifest.name
                item["description"] = manifest.description
                item["requires"] = manifest.requires
                item["ui"] = manifest.ui
                item["ui_css"] = manifest.ui_css
                item["ui_api"] = manifest.ui_api
                item["config_schema"] = manifest.config_schema
                item["schema"] = manifest.schema
            res.append(item)
        return res

    async def upsert_plugin_record(
        self,
        plugin_id: str,
        version: str,
        state: str,
        error: str | None = None,
    ) -> None:
        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                INSERT INTO plugins (
                    id, version, enabled, state, last_error, schema_applied, config, installed_at, updated_at
                ) VALUES (?, ?, 1, ?, ?, 0, '{}', ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    version = excluded.version,
                    state = excluded.state,
                    last_error = excluded.last_error,
                    updated_at = excluded.updated_at;
                """,
                (plugin_id, version, state, error, now, now),
            )

    async def set_state(
        self, plugin_id: str, state: str, error: str | None = None
    ) -> None:
        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE plugins
                SET state = ?, last_error = ?, updated_at = ?
                WHERE id = ?;
                """,
                (state, error, now, plugin_id),
            )

    async def set_applied_schema(
        self, plugin_id: str, schema_version: int
    ) -> None:
        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE plugins
                SET schema_applied = ?, updated_at = ?
                WHERE id = ?;
                """,
                (schema_version, now, plugin_id),
            )

    async def set_enabled(self, plugin_id: str, enabled: bool) -> None:
        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE plugins
                SET enabled = ?, updated_at = ?
                WHERE id = ?;
                """,
                (1 if enabled else 0, now, plugin_id),
            )

    async def set_config(
        self, plugin_id: str, config: dict[str, Any]
    ) -> None:
        now = _now_iso()
        config_json = json.dumps(config)
        async with self.db.transaction() as tx:
            await tx.execute(
                """
                UPDATE plugins
                SET config = ?, updated_at = ?
                WHERE id = ?;
                """,
                (config_json, now, plugin_id),
            )

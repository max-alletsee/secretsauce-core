import json
import logging
from typing import Any

from cryptography.fernet import InvalidToken

from secretsauce.db import Database
from secretsauce.plugins.manifest import PluginManifest
from secretsauce.secrets import MASK_STRING, KeyManager, schema_properties
from secretsauce.util import now_iso

logger = logging.getLogger(__name__)


def _decode_config(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str):
        try:
            value = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return {}
        return value if isinstance(value, dict) else {}
    return {}


class PluginRegistry:
    """Plugin rows, manifests and configuration.

    Config fields whose schema carries "secret": true are stored encrypted
    (spec 5.4), returned to clients as a mask, and handed to plugins in clear
    through runtime_config().
    """

    def __init__(self, db: Database, key_manager: KeyManager | None = None):
        self.db = db
        self.key_manager = key_manager
        self._manifests: dict[str, PluginManifest] = {}
        self._configs: dict[str, dict[str, Any]] = {}

    def register_manifest(self, manifest: PluginManifest) -> None:
        self._manifests[manifest.id] = manifest

    def get_manifest(self, plugin_id: str) -> PluginManifest | None:
        return self._manifests.get(plugin_id)

    def _schema(self, plugin_id: str) -> dict[str, Any] | None:
        manifest = self._manifests.get(plugin_id)
        return manifest.config_schema if manifest else None

    # -- configuration --------------------------------------------------------

    def _with_defaults(self, plugin_id: str, config: dict[str, Any]) -> dict[str, Any]:
        res = dict(config)
        for key, prop in schema_properties(self._schema(plugin_id)).items():
            if isinstance(prop, dict) and "default" in prop:
                res.setdefault(key, prop["default"])
        return res

    def _masked(self, plugin_id: str, stored: dict[str, Any]) -> dict[str, Any]:
        res = dict(stored)
        for key, prop in schema_properties(self._schema(plugin_id)).items():
            if isinstance(prop, dict) and prop.get("secret") is True and key in res:
                res[key] = MASK_STRING if res[key] else ""
        return res

    def runtime_config(self, plugin_id: str) -> dict[str, Any]:
        """Clear configuration with defaults; refreshed by load_config and update_config."""
        return dict(self._configs.get(plugin_id) or self._with_defaults(plugin_id, {}))

    async def load_config(self, plugin_id: str) -> dict[str, Any]:
        row = await self.db.read_one("SELECT config FROM plugins WHERE id = ?;", (plugin_id,))
        stored = _decode_config(row["config"]) if row else {}
        stored = await self._encrypt_legacy_plaintext(plugin_id, stored)
        clear = stored
        if self.key_manager is not None:
            clear = self.key_manager.decrypt_config(self._schema(plugin_id), stored)
        self._configs[plugin_id] = self._with_defaults(plugin_id, clear)
        return self.runtime_config(plugin_id)

    async def _encrypt_legacy_plaintext(
        self, plugin_id: str, stored: dict[str, Any]
    ) -> dict[str, Any]:
        """Secrets written before encryption existed are encrypted on first load."""
        if self.key_manager is None:
            return stored
        changed = False
        res = dict(stored)
        for key, prop in schema_properties(self._schema(plugin_id)).items():
            value = res.get(key)
            if not (isinstance(prop, dict) and prop.get("secret") is True and value):
                continue
            try:
                self.key_manager.decrypt_secret(str(value))
            except (InvalidToken, ValueError):
                res[key] = self.key_manager.encrypt_secret(str(value))
                changed = True
        if changed:
            await self._write_config(plugin_id, res)
        return res

    async def update_config(self, plugin_id: str, new_config: dict[str, Any]) -> dict[str, Any]:
        """Replaces the stored config; a masked secret keeps its stored value. Returns it masked."""
        row = await self.db.read_one("SELECT config FROM plugins WHERE id = ?;", (plugin_id,))
        old = _decode_config(row["config"]) if row else {}
        schema = self._schema(plugin_id)
        if self.key_manager is not None:
            stored = self.key_manager.unmask_and_encrypt_config(schema, old, new_config)
        else:
            stored = {
                k: (old.get(k) if v == MASK_STRING else v) for k, v in new_config.items()
            }
        await self._write_config(plugin_id, stored)
        await self.load_config(plugin_id)
        return self._masked(plugin_id, self._with_defaults(plugin_id, stored))

    async def masked_config(self, plugin_id: str) -> dict[str, Any]:
        row = await self.db.read_one("SELECT config FROM plugins WHERE id = ?;", (plugin_id,))
        stored = _decode_config(row["config"]) if row else {}
        return self._masked(plugin_id, self._with_defaults(plugin_id, stored))

    async def _write_config(self, plugin_id: str, stored: dict[str, Any]) -> None:
        await self.db.write(
            "UPDATE plugins SET config = ?, updated_at = ? WHERE id = ?;",
            (json.dumps(stored), now_iso(), plugin_id),
        )

    async def set_config(self, plugin_id: str, config: dict[str, Any]) -> None:
        await self.update_config(plugin_id, config)

    # -- rows -----------------------------------------------------------------

    def _present(self, row: dict[str, Any]) -> dict[str, Any]:
        res = dict(row)
        res["enabled"] = bool(res.get("enabled", 1))
        res["applied_schema"] = res.get("schema_applied", 0)
        res["error"] = res.get("last_error")
        res["config"] = self._masked(res["id"], _decode_config(res.get("config")))
        manifest = self._manifests.get(res["id"])
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

    async def get_plugin(self, plugin_id: str) -> dict[str, Any] | None:
        row = await self.db.read_one("SELECT * FROM plugins WHERE id = ?;", (plugin_id,))
        return self._present(row) if row else None

    async def list_plugins(self) -> list[dict[str, Any]]:
        rows = await self.db.read_all("SELECT * FROM plugins ORDER BY id ASC;")
        return [self._present(r) for r in rows]

    async def upsert_plugin_record(
        self,
        plugin_id: str,
        version: str,
        state: str,
        error: str | None = None,
    ) -> None:
        now = now_iso()
        await self.db.write(
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

    async def set_state(self, plugin_id: str, state: str, error: str | None = None) -> None:
        await self.db.write(
            "UPDATE plugins SET state = ?, last_error = ?, updated_at = ? WHERE id = ?;",
            (state, error, now_iso(), plugin_id),
        )

    async def set_applied_schema(self, plugin_id: str, schema_version: int, conn: Any = None) -> None:
        await self.db.write(
            "UPDATE plugins SET schema_applied = ?, updated_at = ? WHERE id = ?;",
            (schema_version, now_iso(), plugin_id),
            conn=conn,
        )

    async def set_enabled(self, plugin_id: str, enabled: bool) -> None:
        await self.db.write(
            "UPDATE plugins SET enabled = ?, updated_at = ? WHERE id = ?;",
            (1 if enabled else 0, now_iso(), plugin_id),
        )

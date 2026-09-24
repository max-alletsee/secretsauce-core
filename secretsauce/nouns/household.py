import json
from typing import Any

from secretsauce.db import Database
from secretsauce.util import now_iso

DEFAULT_MEAL_TYPES = [
    {"id": "breakfast", "label": "Breakfast"},
    {"id": "lunch", "label": "Lunch"},
    {"id": "dinner", "label": "Dinner"},
]

DEFAULT_LANGUAGES = {"primary": "en"}
DEFAULT_UNITS = "metric"
DEFAULT_HOUSEHOLD_NAME = "Our Household"

CONFIG_KEYS = frozenset({"household_name", "meal_types", "languages", "units"})

_UPSERT = """
INSERT INTO household_config (key, value, updated_at)
VALUES (?, ?, ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
"""


class HouseholdRepo:
    """household_config rows, cached in memory.

    Every request consults the passphrase version, so reads come from a
    cache that is dropped whenever a write through this repository commits.
    """

    def __init__(self, db: Database):
        self.db = db
        self._cache: dict[str, Any] | None = None

    def invalidate(self) -> None:
        self._cache = None

    async def _get_all_raw(self) -> dict[str, Any]:
        if self._cache is not None:
            return dict(self._cache)
        rows = await self.db.read_all("SELECT key, value FROM household_config;")
        result: dict[str, Any] = {}
        for row in rows:
            try:
                result[row["key"]] = json.loads(row["value"])
            except (json.JSONDecodeError, TypeError):
                result[row["key"]] = row["value"]
        self._cache = result
        return dict(result)

    async def _write(self, items: dict[str, Any]) -> None:
        now = now_iso()
        async with self.db.transaction() as conn:
            for key, value in items.items():
                await conn.execute(_UPSERT, (key, json.dumps(value), now))
            self.db.after_commit(self.invalidate, key="household-cache")
        self.invalidate()

    async def get_config(self) -> dict[str, Any]:
        raw = await self._get_all_raw()
        return {
            "household_name": raw.get("household_name", DEFAULT_HOUSEHOLD_NAME),
            "meal_types": raw.get("meal_types", DEFAULT_MEAL_TYPES),
            "languages": raw.get("languages", DEFAULT_LANGUAGES),
            "units": raw.get("units", DEFAULT_UNITS),
            "passphrase_version": raw.get("passphrase_version", 1),
        }

    async def update_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        await self._write({k: v for k, v in updates.items() if k in CONFIG_KEYS})
        return await self.get_config()

    async def get_passphrase_info(self) -> dict[str, Any] | None:
        raw = await self._get_all_raw()
        if "passphrase_hash" not in raw:
            return None
        return {
            "passphrase_hash": raw["passphrase_hash"],
            "passphrase_version": raw.get("passphrase_version", 1),
        }

    async def set_passphrase(self, passphrase_hash: str) -> int:
        async with self.db.transaction() as conn:
            row = await self.db.read_one(
                "SELECT value FROM household_config WHERE key = 'passphrase_version';",
                conn=conn,
            )
            current_version = 0
            if row is not None:
                try:
                    current_version = int(json.loads(row["value"]))
                except (ValueError, TypeError, json.JSONDecodeError):
                    current_version = 1
            new_version = current_version + 1
            await self._write({"passphrase_hash": passphrase_hash, "passphrase_version": new_version})
            return new_version

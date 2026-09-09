from datetime import datetime, timezone
import json
from typing import Any

from secretsauce.db import Database


DEFAULT_MEAL_TYPES = [
    {"id": "breakfast", "label": "Breakfast"},
    {"id": "lunch", "label": "Lunch"},
    {"id": "dinner", "label": "Dinner"},
]

DEFAULT_LANGUAGES = {"primary": "en"}
DEFAULT_UNITS = "metric"
DEFAULT_HOUSEHOLD_NAME = "Our Household"


class HouseholdRepo:
    def __init__(self, db: Database):
        self.db = db

    async def _get_all_raw(self) -> dict[str, Any]:
        rows = await self.db.read_all("SELECT key, value FROM household_config;")
        result: dict[str, Any] = {}
        for row in rows:
            try:
                result[row["key"]] = json.loads(row["value"])
            except (json.JSONDecodeError, TypeError):
                result[row["key"]] = row["value"]
        return result

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
        allowed_keys = {"household_name", "meal_types", "languages", "units"}
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        async with self.db.transaction() as conn:
            for key, val in updates.items():
                if key in allowed_keys:
                    val_json = json.dumps(val)
                    await conn.execute(
                        """
                        INSERT INTO household_config (key, value, updated_at)
                        VALUES (?, ?, ?)
                        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
                        """,
                        (key, val_json, now_iso),
                    )

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
        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
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

            await conn.execute(
                """
                INSERT INTO household_config (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
                """,
                ("passphrase_hash", json.dumps(passphrase_hash), now_iso),
            )
            await conn.execute(
                """
                INSERT INTO household_config (key, value, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;
                """,
                ("passphrase_version", json.dumps(new_version), now_iso),
            )

            return new_version

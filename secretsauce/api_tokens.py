from datetime import datetime, timezone
import hashlib
import secrets
from typing import Any
import uuid

from secretsauce.db import Database


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class TokenManager:
    def __init__(self, db: Database):
        self.db = db

    async def issue(self, plugin_id: str, scope: str, label: str) -> str:
        token_id = f"tok_{uuid.uuid4().hex[:12]}"
        secret = secrets.token_urlsafe(32)
        raw_token = f"ss_tok_{secret}"
        token_hash = _hash_token(raw_token)
        now = _now_iso()

        async with self.db.transaction() as tx:
            await tx.execute(
                """
                INSERT INTO api_tokens (
                    id, plugin_id, token_hash, scope, label, created_at
                ) VALUES (?, ?, ?, ?, ?, ?);
                """,
                (token_id, plugin_id, token_hash, scope, label, now),
            )
        return raw_token

    async def verify(
        self, token: str, required_scope: str | None = None
    ) -> dict[str, Any] | None:
        token_hash = _hash_token(token)
        row = await self.db.read_one(
            "SELECT * FROM api_tokens WHERE token_hash = ?;",
            (token_hash,),
        )
        if not row:
            return None

        if required_scope is not None and row["scope"] != required_scope:
            return None

        now = _now_iso()
        async with self.db.transaction() as tx:
            await tx.execute(
                "UPDATE api_tokens SET last_used_at = ? WHERE id = ?;",
                (now, row["id"]),
            )
        return dict(row)

    async def revoke(
        self, token_id: str, plugin_id: str | None = None
    ) -> bool:
        if plugin_id is not None:
            sql = "DELETE FROM api_tokens WHERE id = ? AND plugin_id = ?;"
            params = (token_id, plugin_id)
        else:
            sql = "DELETE FROM api_tokens WHERE id = ?;"
            params = (token_id,)

        async with self.db.transaction() as tx:
            cursor = await tx.execute(sql, params)
            return cursor.rowcount > 0

    async def list_tokens(self, plugin_id: str) -> list[dict[str, Any]]:
        rows = await self.db.read_all(
            """
            SELECT id, plugin_id, scope, label, created_at, last_used_at
            FROM api_tokens
            WHERE plugin_id = ?
            ORDER BY created_at DESC;
            """,
            (plugin_id,),
        )
        return [dict(r) for r in rows]

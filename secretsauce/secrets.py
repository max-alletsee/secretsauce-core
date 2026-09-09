import base64
import os
from pathlib import Path
import secrets
from typing import Any

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from itsdangerous import URLSafeTimedSerializer

MASK_STRING = "••••••••"


class KeyManager:
    def __init__(self, key_path: Path | str = "/data/secret.key"):
        self.key_path = Path(key_path)
        self.master_key = self._load_or_create_master_key()
        self._session_subkey = self._derive_subkey(b"secretsauce/session")
        self._config_subkey = self._derive_subkey(b"secretsauce/config")
        self._fernet = Fernet(base64.urlsafe_b64encode(self._config_subkey))

    def _load_or_create_master_key(self) -> bytes:
        if self.key_path.exists():
            content = self.key_path.read_text(encoding="utf-8").strip()
            return base64.b64decode(content)

        self.key_path.parent.mkdir(parents=True, exist_ok=True)
        raw_key = secrets.token_bytes(32)
        b64_key = base64.b64encode(raw_key).decode("utf-8")
        self.key_path.write_text(b64_key, encoding="utf-8")
        try:
            os.chmod(self.key_path, 0o600)
        except OSError:
            pass
        return raw_key

    def _derive_subkey(self, info: bytes) -> bytes:
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=info,
        )
        return hkdf.derive(self.master_key)

    def get_session_serializer(self) -> URLSafeTimedSerializer:
        return URLSafeTimedSerializer(self._session_subkey, salt="session")

    def encrypt_secret(self, clear: str) -> str:
        return self._fernet.encrypt(clear.encode("utf-8")).decode("utf-8")

    def decrypt_secret(self, cipher: str) -> str:
        return self._fernet.decrypt(cipher.encode("utf-8")).decode("utf-8")

    def mask_config(
        self, schema: dict[str, Any] | None, config: dict[str, Any]
    ) -> dict[str, Any]:
        if not schema or "properties" not in schema:
            return dict(config)
        res = dict(config)
        for key, prop in schema["properties"].items():
            if isinstance(prop, dict) and prop.get("secret") is True:
                if key in res and res[key]:
                    res[key] = MASK_STRING
        return res

    def unmask_and_encrypt_config(
        self,
        schema: dict[str, Any] | None,
        old_config: dict[str, Any] | None,
        new_config: dict[str, Any],
    ) -> dict[str, Any]:
        res = dict(new_config)
        if not schema or "properties" not in schema:
            return res

        old_cfg = old_config or {}
        for key, prop in schema["properties"].items():
            if isinstance(prop, dict) and prop.get("secret") is True:
                new_val = new_config.get(key)
                if new_val == MASK_STRING:
                    # Retain previous encrypted secret
                    if key in old_cfg:
                        res[key] = old_cfg[key]
                    else:
                        res[key] = None
                elif new_val:
                    res[key] = self.encrypt_secret(str(new_val))
        return res

    def decrypt_config(
        self, schema: dict[str, Any] | None, config: dict[str, Any]
    ) -> dict[str, Any]:
        res = dict(config)
        if not schema or "properties" not in schema:
            return res

        for key, prop in schema["properties"].items():
            if isinstance(prop, dict) and prop.get("secret") is True:
                val = res.get(key)
                if val and isinstance(val, str):
                    try:
                        res[key] = self.decrypt_secret(val)
                    except Exception:
                        pass
        return res

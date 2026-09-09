import os
import pytest
from secretsauce.secrets import KeyManager


def test_key_derivation_and_secret_masking(tmp_path):
    key_path = tmp_path / "secret.key"
    km = KeyManager(key_path)
    assert key_path.exists()
    # On Windows, chmod 0600 may not show as 0o600 in POSIX bits, but let's ensure file was written
    if os.name != "nt":
        assert oct(os.stat(key_path).st_mode & 0o777) == "0o600"

    schema = {
        "type": "object",
        "properties": {
            "api_key": {"type": "string", "secret": True},
            "model": {"type": "string"},
        },
    }

    stored = km.unmask_and_encrypt_config(
        schema,
        old_config={},
        new_config={"api_key": "sk-12345", "model": "gemini"},
    )
    assert stored["api_key"] != "sk-12345"
    assert stored["model"] == "gemini"

    # Masking for client
    client_view = km.mask_config(schema, stored)
    assert client_view["api_key"] == "••••••••"
    assert client_view["model"] == "gemini"

    # Decrypting for plugin runtime
    decrypted = km.decrypt_config(schema, stored)
    assert decrypted["api_key"] == "sk-12345"
    assert decrypted["model"] == "gemini"

    # Preserving secret when client re-submits mask
    re_stored = km.unmask_and_encrypt_config(
        schema,
        old_config=stored,
        new_config={"api_key": "••••••••", "model": "gemini-flash"},
    )
    assert re_stored["api_key"] == stored["api_key"]
    assert re_stored["model"] == "gemini-flash"


def test_session_serializer(tmp_path):
    key_path = tmp_path / "secret.key"
    km = KeyManager(key_path)
    serializer = km.get_session_serializer()

    token = serializer.dumps({"session_id": "sess-1", "passphrase_version": 1})
    data = serializer.loads(token, max_age=3600)
    assert data["session_id"] == "sess-1"
    assert data["passphrase_version"] == 1

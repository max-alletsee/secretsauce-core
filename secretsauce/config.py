import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping


@dataclass(frozen=True)
class Config:
    port: int = 8080
    base_path: str = "/"
    data_dir: str = "/data"
    cookie_secure: str = "auto"
    forwarded_allow_ips: str = ""
    log_level: str = "info"


def load_config(
    env: Mapping[str, str] | None = None,
    config_path: str | Path | None = None,
) -> Config:
    source_env = os.environ if env is None else env

    # Normalize env keys to uppercase
    env_lookup: dict[str, str] = {k.upper(): v for k, v in source_env.items()}

    # Check for custom data directory in env first
    data_dir = env_lookup.get("DATA_DIR", "/data")

    resolved_config_path: Path | None = None
    if config_path is not None:
        resolved_config_path = Path(config_path)
    else:
        candidate = Path(data_dir) / "config.json"
        if candidate.is_file():
            resolved_config_path = candidate

    file_data: dict[str, Any] = {}
    if resolved_config_path is not None and resolved_config_path.is_file():
        with open(resolved_config_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
            if isinstance(raw, dict):
                file_data = {str(k).upper(): v for k, v in raw.items()}

    def get_val(key: str, default: Any) -> Any:
        if key in env_lookup:
            return env_lookup[key]
        if key in file_data:
            return file_data[key]
        return default

    raw_port = get_val("PORT", 8080)
    port = int(raw_port)

    base_path = str(get_val("BASE_PATH", "/"))
    if not base_path.startswith("/"):
        base_path = "/" + base_path
    if len(base_path) > 1 and base_path.endswith("/"):
        base_path = base_path.rstrip("/")

    data_dir = str(get_val("DATA_DIR", "/data"))
    cookie_secure = str(get_val("COOKIE_SECURE", "auto")).lower()
    forwarded_allow_ips = str(get_val("FORWARDED_ALLOW_IPS", ""))
    log_level = str(get_val("LOG_LEVEL", "info")).lower()

    return Config(
        port=port,
        base_path=base_path,
        data_dir=data_dir,
        cookie_secure=cookie_secure,
        forwarded_allow_ips=forwarded_allow_ips,
        log_level=log_level,
    )

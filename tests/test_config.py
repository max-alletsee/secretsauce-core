from secretsauce.config import load_config
import json

def test_config_defaults():
    cfg = load_config(env={})
    assert cfg.port == 8080
    assert cfg.base_path == "/"
    assert cfg.data_dir == "/data"
    assert cfg.cookie_secure == "auto"
    assert cfg.forwarded_allow_ips == ""
    assert cfg.log_level == "info"

def test_config_env_overrides_json(tmp_path):
    json_path = tmp_path / "config.json"
    json_path.write_text(json.dumps({"PORT": 9000, "LOG_LEVEL": "debug"}))
    cfg = load_config(env={"PORT": "9090"}, config_path=json_path)
    assert cfg.port == 9090
    assert cfg.log_level == "debug"

def test_config_json_overrides_defaults(tmp_path):
    json_path = tmp_path / "config.json"
    json_path.write_text(json.dumps({"PORT": 7070, "COOKIE_SECURE": "true"}))
    cfg = load_config(env={}, config_path=json_path)
    assert cfg.port == 7070
    assert cfg.cookie_secure == "true"
    assert cfg.base_path == "/"

def test_config_env_case_insensitivity():
    cfg = load_config(env={"port": "8888", "log_level": "warning"})
    assert cfg.port == 8888
    assert cfg.log_level == "warning"

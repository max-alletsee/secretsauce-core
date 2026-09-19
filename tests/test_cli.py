import json
import sqlite3
import zipfile
import pytest
from secretsauce.cli import cli_main


def test_cli_migrate_and_export(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # 1. Run migrate
    ret = cli_main(["migrate", "--data-dir", str(data_dir)])
    assert ret == 0
    assert (data_dir / "secretsauce.db").exists()

    # 2. Run export
    out_zip = tmp_path / "backup.zip"
    ret = cli_main(["export", "--data-dir", str(data_dir), "--output", str(out_zip)])
    assert ret == 0
    assert out_zip.exists()

    with zipfile.ZipFile(out_zip) as z:
        names = z.namelist()
        assert "secretsauce.db" in names


def test_cli_export_nonexistent_db(tmp_path):
    data_dir = tmp_path / "empty_dir"
    data_dir.mkdir(parents=True, exist_ok=True)
    ret = cli_main(["export", "--data-dir", str(data_dir)])
    assert ret == 1


def test_cli_help(capsys):
    with pytest.raises(SystemExit) as exc:
        cli_main(["--help"])
    assert exc.value.code == 0


def test_cli_export_and_restore_roundtrip(tmp_path):
    source_dir = tmp_path / "source"
    source_dir.mkdir(parents=True, exist_ok=True)

    # Run migrate to create schema
    ret = cli_main(["migrate", "--data-dir", str(source_dir)])
    assert ret == 0

    # Add dummy upload and config.json
    uploads_dir = source_dir / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    (uploads_dir / "photo.jpg").write_text("fake-image-bytes", encoding="utf-8")
    (source_dir / "config.json").write_text(json.dumps({"PORT": 8080}), encoding="utf-8")

    # Insert test data into sqlite
    conn = sqlite3.connect(source_dir / "secretsauce.db")
    conn.execute(
        "INSERT INTO household_members (id, name, preferred_language, created_at, updated_at) "
        "VALUES ('m-1', 'Alice', 'en', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z')"
    )
    conn.commit()
    conn.close()

    # Export
    backup_zip = tmp_path / "backup.zip"
    ret = cli_main(["export", "--data-dir", str(source_dir), "--output", str(backup_zip)])
    assert ret == 0
    assert backup_zip.exists()

    # Restore into fresh target directory
    restore_dir = tmp_path / "restored"
    ret = cli_main(["restore", str(backup_zip), "--data-dir", str(restore_dir)])
    assert ret == 0

    # Verify restored files
    assert (restore_dir / "secretsauce.db").exists()
    assert (restore_dir / "uploads" / "photo.jpg").read_text(encoding="utf-8") == "fake-image-bytes"
    assert (restore_dir / "config.json").exists()

    # Verify restored database contents
    conn2 = sqlite3.connect(restore_dir / "secretsauce.db")
    cursor = conn2.execute("SELECT name FROM household_members WHERE id='m-1'")
    row = cursor.fetchone()
    assert row is not None
    assert row[0] == "Alice"
    conn2.close()


def test_cli_restore_invalid_archive(tmp_path):
    restore_dir = tmp_path / "restored"

    # Non-existent zip
    ret = cli_main(["restore", str(tmp_path / "nonexistent.zip"), "--data-dir", str(restore_dir)])
    assert ret == 1

    # Zip missing secretsauce.db
    invalid_zip = tmp_path / "bad.zip"
    with zipfile.ZipFile(invalid_zip, "w") as z:
        z.writestr("something_else.txt", "hello")

    ret = cli_main(["restore", str(invalid_zip), "--data-dir", str(restore_dir)])
    assert ret == 1


def test_cli_serve_defaults_and_spec_options(monkeypatch, tmp_path):
    calls = []

    def mock_run(app, **kwargs):
        calls.append({"app": app, "kwargs": kwargs})

    import uvicorn
    monkeypatch.setattr(uvicorn, "run", mock_run)

    # 1. Default serve without flags should use port 8080 per Spec §5.1
    monkeypatch.delenv("PORT", raising=False)
    monkeypatch.delenv("FORWARDED_ALLOW_IPS", raising=False)
    cli_main(["serve", "--data-dir", str(tmp_path)])
    assert len(calls) == 1
    assert calls[0]["kwargs"]["port"] == 8080
    assert calls[0]["kwargs"]["proxy_headers"] is True
    assert calls[0]["kwargs"]["forwarded_allow_ips"] is None
    assert calls[0]["kwargs"]["log_level"] == "info"

    # 2. Explicit --port flag overrides default
    calls.clear()
    cli_main(["serve", "--data-dir", str(tmp_path), "--port", "9000"])
    assert len(calls) == 1
    assert calls[0]["kwargs"]["port"] == 9000

    # 3. PORT and FORWARDED_ALLOW_IPS from environment
    calls.clear()
    monkeypatch.setenv("PORT", "8888")
    monkeypatch.setenv("FORWARDED_ALLOW_IPS", "127.0.0.1,10.0.0.1")
    monkeypatch.setenv("LOG_LEVEL", "warning")
    cli_main(["serve", "--data-dir", str(tmp_path)])
    assert len(calls) == 1
    assert calls[0]["kwargs"]["port"] == 8888
    assert calls[0]["kwargs"]["forwarded_allow_ips"] == "127.0.0.1,10.0.0.1"
    assert calls[0]["kwargs"]["log_level"] == "warning"


def test_cli_data_dir_env_resolution(monkeypatch, tmp_path):
    target = tmp_path / "custom_data"
    monkeypatch.setenv("DATA_DIR", str(target))
    monkeypatch.delenv("SECRETSAUCE_DATA_DIR", raising=False)

    calls = []
    import uvicorn
    monkeypatch.setattr(uvicorn, "run", lambda app, **kwargs: calls.append(kwargs))

    cli_main(["serve"])
    # Both DATA_DIR and SECRETSAUCE_DATA_DIR should be set
    import os
    assert os.environ.get("DATA_DIR") == str(target)
    assert os.environ.get("SECRETSAUCE_DATA_DIR") == str(target)


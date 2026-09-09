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


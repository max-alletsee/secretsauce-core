import io

import pytest

from secretsauce.db import Database
from secretsauce.errors import ValidationError
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.testing import make_kernel

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


@pytest.fixture
async def repo(tmp_path):
    db = Database(tmp_path / "assets.db")
    await db.connect()
    await db.run_migrations()
    yield AssetsRepo(db, uploads_dir=tmp_path / "uploads")
    await db.close()


async def test_declared_type_must_match_file_signature(repo):
    with pytest.raises(ValidationError):
        await repo.save_asset(
            "recipe", "g1", "cat.png", "image/png", b"<html><script>alert(1)</script>"
        )


async def test_extension_comes_from_content_type_not_filename(repo):
    asset = await repo.save_asset("recipe", "g1", "evil.html", "image/png", PNG)
    assert asset["storage_path"].endswith(".png")
    path = await repo.get_asset_file_path(asset["id"])
    assert path.suffix == ".png"


async def test_filename_is_reduced_to_its_basename(repo):
    asset = await repo.save_asset("recipe", "g1", "..\\..//etc/cat.png", "image/png", PNG)
    assert asset["filename"] == "cat.png"


async def test_rolled_back_delete_keeps_the_file(repo):
    asset = await repo.save_asset("recipe", "g1", "cat.png", "image/png", PNG)
    path = await repo.get_asset_file_path(asset["id"])

    with pytest.raises(RuntimeError):
        async with repo.db.transaction() as conn:
            await repo.delete_asset(asset["id"], conn=conn)
            raise RuntimeError("abort")

    assert path.exists()
    assert (await repo.get_asset(asset["id"]))["id"] == asset["id"]


async def test_duplicate_id_neither_overwrites_nor_leaves_files(repo, tmp_path):
    first = await repo.save_asset("recipe", "g1", "a.png", "image/png", PNG, asset_id="dup")
    with pytest.raises(Exception):
        await repo.save_asset(
            "recipe", "g1", "b.png", "image/png", PNG + b"other", asset_id="dup"
        )
    files = [p for p in (tmp_path / "uploads").rglob("*") if p.is_file()]
    assert len(files) == 1
    assert (await repo.get_asset_file_path(first["id"])).read_bytes() == PNG


async def test_rolled_back_save_removes_the_written_file(repo, tmp_path):
    with pytest.raises(RuntimeError):
        async with repo.db.transaction() as conn:
            await repo.save_asset("recipe", "g1", "a.png", "image/png", PNG, conn=conn)
            raise RuntimeError("abort")
    assert [p for p in (tmp_path / "uploads").rglob("*") if p.is_file()] == []


async def test_asset_file_response_is_hardened(tmp_path):
    async with make_kernel(tmp_path) as k:
        k.assets.allow_content_type("text/plain")
        res = await k.client.post(
            "/api/assets",
            files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
            data={"entity_type": "recipe", "entity_id": "g1"},
        )
        assert res.status_code == 201
        file_res = await k.client.get(f"/api/assets/{res.json()['id']}/file")
        assert file_res.headers["x-content-type-options"] == "nosniff"
        assert file_res.headers["content-disposition"].startswith("attachment")

        img = await k.client.post(
            "/api/assets",
            files={"file": ("cat.png", io.BytesIO(PNG), "image/png")},
            data={"entity_type": "recipe", "entity_id": "g1"},
        )
        img_res = await k.client.get(f"/api/assets/{img.json()['id']}/file")
        assert img_res.headers["x-content-type-options"] == "nosniff"
        assert img_res.headers["content-disposition"].startswith("inline")


async def test_oversized_upload_is_rejected_with_413(tmp_path, monkeypatch):
    import secretsauce.nouns.assets as assets_mod

    monkeypatch.setattr(assets_mod, "MAX_ASSET_SIZE_BYTES", 1024)
    async with make_kernel(tmp_path) as k:
        res = await k.client.post(
            "/api/assets",
            files={"file": ("big.png", io.BytesIO(PNG + b"\x00" * 4096), "image/png")},
            data={"entity_type": "recipe", "entity_id": "g1"},
        )
        assert res.status_code == 413

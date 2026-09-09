import pytest
from secretsauce.db import Database
from secretsauce.errors import NotFoundError, PayloadTooLargeError, ValidationError
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.nouns.attributes import AttributesRepo


@pytest.mark.asyncio
async def test_entity_attributes_types_and_filtering(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = AttributesRepo(db)

    # Set numeric, text, bool, json attributes
    await repo.set_attribute("nutrition", "recipe", "group1", "calories", 450)
    await repo.set_attribute("nutrition", "recipe", "group2", "calories", 650)
    await repo.set_attribute("tagger", "recipe", "group1", "cuisine", "italian")
    await repo.set_attribute("flags", "recipe", "group1", "is_quick", True)
    await repo.set_attribute(
        "meta", "recipe", "group1", "breakdown", {"fat": 10, "carbs": 50}
    )

    # Read back all attributes for group1
    attrs = await repo.get_attributes("recipe", "group1")
    assert attrs["nutrition.calories"] == 450
    assert attrs["tagger.cuisine"] == "italian"
    assert attrs["flags.is_quick"] == 1.0
    assert attrs["meta.breakdown"] == {"fat": 10, "carbs": 50}

    # Query with operators
    matched = await repo.query_entity_ids("recipe", ["nutrition.calories<600"])
    assert matched == ["group1"]

    matched_eq = await repo.query_entity_ids(
        "recipe", ["tagger.cuisine=italian"]
    )
    assert matched_eq == ["group1"]

    # Delete attribute with None
    await repo.set_attribute("nutrition", "recipe", "group1", "calories", None)
    attrs_after = await repo.get_attributes("recipe", "group1")
    assert "nutrition.calories" not in attrs_after

    # Drop plugin attributes
    await repo.drop_plugin_attributes("tagger")
    attrs_dropped = await repo.get_attributes("recipe", "group1")
    assert "tagger.cuisine" not in attrs_dropped

    await db.close()


@pytest.mark.asyncio
async def test_assets_management_and_validation(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    uploads_dir = tmp_path / "uploads"
    repo = AssetsRepo(db, uploads_dir=uploads_dir)

    # 1. Save valid image asset
    image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF"  # minimal jpeg header bytes
    asset = await repo.save_asset(
        entity_type="recipe",
        entity_id="grp-1",
        filename="pie.jpg",
        content_type="image/jpeg",
        data=image_bytes,
        slot="primary",
    )
    assert asset["entity_type"] == "recipe"
    assert asset["entity_id"] == "grp-1"
    assert asset["filename"] == "pie.jpg"
    assert asset["size_bytes"] == len(image_bytes)

    # Check file exists on disk
    file_path = await repo.get_asset_file_path(asset["id"])
    assert file_path.exists()
    assert file_path.read_bytes() == image_bytes

    # 2. List assets for entity
    assets_list = await repo.list_assets("recipe", "grp-1")
    assert len(assets_list) == 1
    assert assets_list[0]["id"] == asset["id"]

    # 3. Reject disallowed MIME type
    with pytest.raises(ValidationError):
        await repo.save_asset(
            entity_type="recipe",
            entity_id="grp-1",
            filename="bad.exe",
            content_type="application/x-msdownload",
            data=b"dangerous",
        )

    # Allow custom content type
    repo.allow_content_type("text/plain")
    txt_asset = await repo.save_asset(
        entity_type="recipe",
        entity_id="grp-1",
        filename="notes.txt",
        content_type="text/plain",
        data=b"hello",
    )
    assert txt_asset["content_type"] == "text/plain"

    # 4. Reject payload larger than 20 MB
    oversized = b"x" * (20 * 1024 * 1024 + 1)
    with pytest.raises(PayloadTooLargeError):
        await repo.save_asset(
            entity_type="recipe",
            entity_id="grp-1",
            filename="huge.jpg",
            content_type="image/jpeg",
            data=oversized,
        )

    # 5. Delete asset unlinks file and removes DB record
    await repo.delete_asset(asset["id"])
    assert not file_path.exists()
    with pytest.raises(NotFoundError):
        await repo.get_asset(asset["id"])

    await db.close()

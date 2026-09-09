import io
import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_assets_and_attributes_api(tmp_path):
    async with make_kernel(tmp_path) as k:
        # 1. Upload asset
        image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00"
        files = {
            "file": ("test.jpg", io.BytesIO(image_bytes), "image/jpeg"),
        }
        data = {
            "entity_type": "recipe",
            "entity_id": "rec-123",
            "slot": "primary",
        }
        res = await k.client.post("/api/assets", files=files, data=data)
        assert res.status_code == 201
        asset = res.json()
        asset_id = asset["id"]
        assert asset["filename"] == "test.jpg"
        assert asset["content_type"] == "image/jpeg"
        assert asset["slot"] == "primary"

        # 2. Upload disallowed MIME type -> 422
        bad_file = {
            "file": ("script.sh", io.BytesIO(b"#!/bin/bash\necho bad"), "text/x-shellscript"),
        }
        bad_res = await k.client.post("/api/assets", files=bad_file, data=data)
        assert bad_res.status_code == 422

        # 3. GET assets list
        list_res = await k.client.get("/api/assets?entity_type=recipe&entity_id=rec-123")
        assert list_res.status_code == 200
        assert len(list_res.json()) == 1
        assert list_res.json()[0]["id"] == asset_id

        # 4. GET asset metadata
        meta_res = await k.client.get(f"/api/assets/{asset_id}")
        assert meta_res.status_code == 200
        assert meta_res.json()["id"] == asset_id

        # 5. GET asset file bytes and caching header
        file_res = await k.client.get(f"/api/assets/{asset_id}/file")
        assert file_res.status_code == 200
        assert file_res.content == image_bytes
        assert file_res.headers["cache-control"] == "private, max-age=31536000, immutable"

        # 6. Attributes query
        # Set attributes through repo
        await k.attributes.set_attribute(
            plugin_id="core-ratings",
            entity_type="recipe",
            entity_id="rec-123",
            key="rating",
            value=4.8,
        )
        await k.attributes.set_attribute(
            plugin_id="core-nutrition",
            entity_type="recipe",
            entity_id="rec-123",
            key="calories",
            value=450,
        )

        attr_res = await k.client.get("/api/attributes?entity_type=recipe&entity_id=rec-123")
        assert attr_res.status_code == 200
        attrs = attr_res.json()
        assert attrs["core-ratings.rating"] == 4.8
        assert attrs["core-nutrition.calories"] == 450.0

        # 7. DELETE asset
        del_res = await k.client.delete(f"/api/assets/{asset_id}")
        assert del_res.status_code == 204

        not_found_file = await k.client.get(f"/api/assets/{asset_id}/file")
        assert not_found_file.status_code == 404

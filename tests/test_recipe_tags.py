"""Unit/transaction tests for RecipesRepo tag operations."""

import pytest

from secretsauce.errors import ValidationError
from secretsauce.testing import make_kernel


async def test_rename_and_delete_tag_roll_back_atomically_on_failure(tmp_path):
    async with make_kernel(tmp_path) as k:
        r1 = await k.recipes.create_recipe({"title": "A", "language": "en", "tags": ["old", "keep"]})
        r2 = await k.recipes.create_recipe({"title": "B", "language": "en", "tags": ["old"]})

        with pytest.raises(ValidationError):
            await k.recipes.rename_tag("", "new")
        with pytest.raises(ValidationError):
            await k.recipes.delete_tag("   ")

        # Simulate mid-batch failure on second FTS rebuild: neither row should commit
        original_rebuild = k.recipes._rebuild_fts_row
        calls = 0

        async def flaky_rebuild(conn, rec):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise RuntimeError("boom mid-transaction")
            return await original_rebuild(conn, rec)

        k.recipes._rebuild_fts_row = flaky_rebuild
        with pytest.raises(RuntimeError, match="boom mid-transaction"):
            await k.recipes.rename_tag("old", "new")

        assert (await k.recipes.get_recipe(r1["id"]))["tags"] == ["old", "keep"]
        assert (await k.recipes.get_recipe(r2["id"]))["tags"] == ["old"]

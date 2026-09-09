import pytest
from secretsauce.db import Database
from secretsauce.plugins.context import create_plugin_context


@pytest.mark.asyncio
async def test_plugin_context_capabilities(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    try:
        await db.run_migrations()
        ctx = await create_plugin_context(db, plugin_id="my-plugin")

        # Token issue and verification
        token = await ctx.tokens.issue(
            scope="read:calendar", label="Kitchen Tablet"
        )
        assert token.startswith("ss_tok_")

        verified = await ctx.tokens.verify(token, required_scope="read:calendar")
        assert verified is not None
        assert verified["label"] == "Kitchen Tablet"
        assert verified["plugin_id"] == "my-plugin"

        # Wrong scope fails verification
        assert (
            await ctx.tokens.verify(token, required_scope="write:calendar")
            is None
        )

        tokens_list = await ctx.tokens.list()
        assert len(tokens_list) == 1

        # Service registration & discovery
        ctx.services.register("calculator", {"add": lambda a, b: a + b})
        calc = ctx.services.get("calculator")
        assert calc["add"](2, 3) == 5

        # Scoped entity attributes
        await ctx.attributes.set("recipe", "rec_1", "rating", 4.8)
        attrs = await ctx.attributes.get("recipe", "rec_1")
        assert attrs.get("rating") == 4.8

        # Emit event
        seq = await ctx.emit(
            "my_plugin:notified",
            {"message": "hello"},
            entity=("recipe", "rec_1"),
        )
        assert seq >= 1

        # Token revoke
        tok_id = verified["id"]
        assert await ctx.tokens.revoke(tok_id) is True
        assert await ctx.tokens.verify(token) is None
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_plugin_context_hooks_and_background(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    try:
        await db.run_migrations()
        ctx = await create_plugin_context(db, plugin_id="my-plugin")

        hook_called = False

        async def sample_hook(data):
            nonlocal hook_called
            hook_called = True
            return data

        ctx.hook("before:recipe:create", sample_hook)
        await ctx._hook_registry.run_before("before:recipe:create", {"title": "Cake"})
        assert hook_called is True

        # Background task
        bg_ran = False

        async def sample_task():
            nonlocal bg_ran
            bg_ran = True

        task = ctx.background(sample_task())
        await task
        assert bg_ran is True
    finally:
        await db.close()


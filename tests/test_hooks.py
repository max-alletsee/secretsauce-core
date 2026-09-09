import pytest
from secretsauce.errors import VetoError
from secretsauce.hooks import HookRegistry


@pytest.mark.asyncio
async def test_hook_mutate_and_veto():
    registry = HookRegistry()

    # Mutating hook
    async def add_tag(data):
        data["tags"] = data.get("tags", []) + ["auto-tagged"]
        return data

    registry.register("before:recipe:create", "tagger-plugin", add_tag)

    res = await registry.run_before("before:recipe:create", {"title": "Soup"})
    assert res["tags"] == ["auto-tagged"]

    # Veto hook
    async def allergen_veto(data):
        if "peanut" in data.get("title", "").lower():
            raise VetoError("Peanuts not allowed", plugin_id="allergen-plugin")
        return data

    registry.register("before:recipe:create", "allergen-plugin", allergen_veto)

    with pytest.raises(VetoError) as exc:
        await registry.run_before(
            "before:recipe:create", {"title": "Peanut Butter Toast"}
        )
    assert exc.value.plugin_id == "allergen-plugin"


@pytest.mark.asyncio
async def test_hook_order_and_unregister():
    registry = HookRegistry()
    order = []

    async def hook_a(data, current, ctx):
        order.append("a")
        return data

    async def hook_b(data, current, ctx):
        order.append("b")
        return data

    registry.register("recipe:update", "plugin_a", hook_a)
    registry.register("recipe:update", "plugin_b", hook_b)

    await registry.run_before("recipe:update", {"id": "1"})
    assert order == ["a", "b"]

    # Unregister plugin_a
    registry.unregister_plugin("plugin_a")
    order.clear()

    await registry.run_before("recipe:update", {"id": "1"})
    assert order == ["b"]

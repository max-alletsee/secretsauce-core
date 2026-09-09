import pytest
from secretsauce.testing import drain_events, make_kernel


@pytest.mark.asyncio
async def test_make_kernel_fixture(tmp_path):
    async with make_kernel(tmp_path) as k:
        assert k.client is not None
        res = await k.client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
        assert k.db is not None
        assert k.household is not None
        assert k.recipes is not None


@pytest.mark.asyncio
async def test_drain_events(tmp_path):
    async with make_kernel(tmp_path) as k:
        # Emit an event
        async with k.db.transaction() as tx:
            await k.events.append(
                tx,
                name="test:event",
                data={"foo": "bar"},
                origin="test",
            )

        received = []

        async def handler(evt):
            received.append(evt)

        ctx = k.ctx_for("test_plugin")
        ctx.on("test:event", handler, include_self=True)

        delivered = await drain_events(k)
        assert len(delivered) >= 1
        assert any(e.name == "test:event" for e in delivered)


@pytest.mark.asyncio
async def test_make_kernel_no_auto_setup(tmp_path):
    async with make_kernel(tmp_path, auto_setup=False) as k:
        passphrase_info = await k.household.get_passphrase_info()
        assert passphrase_info is None


@pytest.mark.asyncio
async def test_make_kernel_await_style(tmp_path):
    k = await make_kernel(tmp_path)
    try:
        assert k.client is not None
        res = await k.client.get("/api/health")
        assert res.status_code == 200
    finally:
        await k.stop()


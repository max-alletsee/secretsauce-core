"""Shopping writes through the production HTTP composition, not an invented array."""
import httpx

from secretsauce.app import build_app
from secretsauce.config import Config


async def test_manual_item_checked_state_persists_after_reload(tmp_path):
    app = build_app(data_dir=tmp_path, config=Config(cookie_secure="false"))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            setup = await client.post("/api/setup", json={
                "household_name": "Shopping tests", "passphrase": "long enough", "first_member": {"name": "Ann"},
            })
            assert setup.status_code == 201
            item = await client.post("/api/x/core-shopping-list/items", json={
                "name": " Coffee beans ", "quantity": 2, "unit": "BAGS",
            })
            assert item.status_code == 201, item.text
            for checked in (True, False):
                response = await client.post("/api/x/core-shopping-list/toggle", json={
                    "key": "coffee beans_bags", "checked": checked,
                })
                assert response.status_code == 200
                rows = (await client.get("/api/x/core-shopping-list")).json()["items"]
                assert len(rows) == 1
                assert rows[0]["checked"] is checked
                stored = await app.state.kernel.db.read_one(
                    "SELECT checked FROM plugin_core_shopping_list_items WHERE id = ?", (item.json()["id"],),
                )
                assert bool(stored["checked"]) is checked

import pytest
from secretsauce.db import Database
from secretsauce.nouns.household import HouseholdRepo


@pytest.mark.asyncio
async def test_household_config_crud(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = HouseholdRepo(db)

    cfg = await repo.get_config()
    assert cfg["household_name"] == "Our Household"
    assert cfg["passphrase_version"] == 1
    assert "passphrase_hash" not in cfg

    await repo.update_config({"household_name": "The Smiths", "units": "metric"})
    updated = await repo.get_config()
    assert updated["household_name"] == "The Smiths"
    assert updated["units"] == "metric"
    await db.close()


@pytest.mark.asyncio
async def test_household_passphrase(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    await db.run_migrations()
    repo = HouseholdRepo(db)

    info = await repo.get_passphrase_info()
    assert info is None

    version = await repo.set_passphrase("scrypt$hash1")
    assert version == 1

    info = await repo.get_passphrase_info()
    assert info is not None
    assert info["passphrase_hash"] == "scrypt$hash1"
    assert info["passphrase_version"] == 1

    version2 = await repo.set_passphrase("scrypt$hash2")
    assert version2 == 2

    info2 = await repo.get_passphrase_info()
    assert info2 is not None
    assert info2["passphrase_hash"] == "scrypt$hash2"
    assert info2["passphrase_version"] == 2

    # Verify get_config still has new version and no hash
    cfg = await repo.get_config()
    assert cfg["passphrase_version"] == 2
    assert "passphrase_hash" not in cfg

    await db.close()

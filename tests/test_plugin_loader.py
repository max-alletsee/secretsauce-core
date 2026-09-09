import pytest
from secretsauce.db import Database
from secretsauce.plugins.loader import PluginLoader
from secretsauce.plugins.registry import PluginRegistry


@pytest.mark.asyncio
async def test_plugin_discovery_and_registration(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    try:
        await db.run_migrations()

        plugin_dir = tmp_path / "plugins" / "sample"
        plugin_dir.mkdir(parents=True)
        (plugin_dir / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "sample",
    "version": "1.0.0",
    "name": "Sample Plugin"
}
async def setup(ctx):
    pass
""",
            encoding="utf-8",
        )

        registry = PluginRegistry(db)
        loader = PluginLoader(registry, search_paths=[tmp_path / "plugins"])
        await loader.discover_and_sync()

        plugins = await registry.list_plugins()
        assert len(plugins) == 1
        assert plugins[0]["id"] == "sample"
        assert plugins[0]["state"] == "active"
        assert plugins[0]["name"] == "Sample Plugin"
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_plugin_dependency_blocking(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    try:
        await db.run_migrations()

        plugins_dir = tmp_path / "plugins"
        # Plugin A requires missing plugin B
        dir_a = plugins_dir / "plugin-a"
        dir_a.mkdir(parents=True)
        (dir_a / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "plugin-a",
    "version": "1.0.0",
    "requires": ["missing-dep"]
}
async def setup(ctx):
    pass
""",
            encoding="utf-8",
        )

        # Plugin C has optional dependency
        dir_c = plugins_dir / "plugin-c"
        dir_c.mkdir(parents=True)
        (dir_c / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "plugin-c",
    "version": "1.0.0",
    "requires": ["missing-dep?"]
}
async def setup(ctx):
    pass
""",
            encoding="utf-8",
        )

        registry = PluginRegistry(db)
        loader = PluginLoader(registry, search_paths=[plugins_dir])
        await loader.discover_and_sync()

        plugin_a = await registry.get_plugin("plugin-a")
        assert plugin_a is not None
        assert plugin_a["state"] == "blocked"
        assert "missing-dep" in plugin_a["error"]

        plugin_c = await registry.get_plugin("plugin-c")
        assert plugin_c is not None
        assert plugin_c["state"] == "active"
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_plugin_migrations(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    try:
        await db.run_migrations()

        plugin_dir = tmp_path / "plugins" / "with-mig"
        plugin_dir.mkdir(parents=True)
        migrations_dir = plugin_dir / "migrations"
        migrations_dir.mkdir()
        (migrations_dir / "0001_initial.sql").write_text(
            """
            CREATE TABLE with_mig_items (
                id TEXT PRIMARY KEY,
                val TEXT NOT NULL
            );
            """,
            encoding="utf-8",
        )
        (plugin_dir / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "with-mig",
    "version": "1.0.0",
    "schema": 1
}
async def setup(ctx):
    pass
""",
            encoding="utf-8",
        )

        registry = PluginRegistry(db)
        loader = PluginLoader(registry, search_paths=[tmp_path / "plugins"])
        await loader.discover_and_sync()

        plugin = await registry.get_plugin("with-mig")
        assert plugin is not None
        assert plugin["state"] == "active"
        assert plugin["applied_schema"] == 1

        # Verify table was created
        async with db.transaction() as tx:
            await tx.execute(
                "INSERT INTO with_mig_items (id, val) VALUES ('1', 'hello');"
            )
        rows = await db.read_all("SELECT * FROM with_mig_items;")
        assert len(rows) == 1
    finally:
        await db.close()


@pytest.mark.asyncio
async def test_plugin_errored_state_on_setup_exception(tmp_path):
    db = Database(tmp_path / "test.db")
    await db.connect()
    try:
        await db.run_migrations()

        plugin_dir = tmp_path / "plugins" / "broken"
        plugin_dir.mkdir(parents=True)
        (plugin_dir / "__init__.py").write_text(
            """
PLUGIN = {
    "id": "broken",
    "version": "1.0.0"
}
async def setup(ctx):
    raise ValueError("Crash on setup")
""",
            encoding="utf-8",
        )

        registry = PluginRegistry(db)
        loader = PluginLoader(
            registry,
            search_paths=[tmp_path / "plugins"],
            context_factory=lambda pid: {},
        )
        await loader.discover_and_sync()

        plugin = await registry.get_plugin("broken")
        assert plugin is not None
        assert plugin["state"] == "errored"
        assert "Crash on setup" in plugin["error"]
    finally:
        await db.close()


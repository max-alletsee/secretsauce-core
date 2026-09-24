import asyncio
import logging
import os
from pathlib import Path
from typing import Any
import uuid

from secretsauce.api.routes.pwa import compute_precache_info
from secretsauce.api_tokens import TokenManager
from secretsauce.auth import RateLimiter, SessionStore
from secretsauce.config import Config, load_config
from secretsauce.db import Database
from secretsauce.events import EventLog, EventPump
from secretsauce.gc import periodic_gc_worker
from secretsauce.hooks import HookRegistry
from secretsauce.jobs import JobManager
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.nouns.attributes import AttributesRepo
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.journal import JournalRepo
from secretsauce.nouns.members import MembersRepo
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.schedule import ScheduleRepo
from secretsauce.plugins.context import PluginContext, RouterRegistry, ServiceRegistry
from secretsauce.plugins.loader import PluginLoader
from secretsauce.plugins.registry import PluginRegistry
from secretsauce.secrets import KeyManager
from secretsauce.stream import EventBroadcaster

logger = logging.getLogger(__name__)

CORE_PLUGINS_DIR = Path(__file__).resolve().parent / "plugins" / "core"


def resolve_data_dir(explicit: Path | str | None = None) -> Path:
    """The data directory: explicit argument, DATA_DIR, SECRETSAUCE_DATA_DIR, /data, ./data."""
    if explicit:
        return Path(explicit)
    for var in ("DATA_DIR", "SECRETSAUCE_DATA_DIR"):
        if os.environ.get(var):
            return Path(os.environ[var])
    if Path("/data").exists():
        return Path("/data")
    return Path("data")


class BootedKernel:
    """Every kernel service, wired once. Both the app and the test harness use it."""

    def __init__(
        self,
        *,
        db: Database,
        data_dir: Path,
        config: Config,
        key_manager: KeyManager | None,
        search_paths: list[Path] | None = None,
    ):
        self.boot_id = uuid.uuid4().hex
        self.db = db
        self.config = config
        self.key_manager = key_manager
        self.data_dir = data_dir
        self.uploads_dir = data_dir / "uploads"
        self.plugins_dir = data_dir / "plugins"

        self.broadcaster = EventBroadcaster()
        self.events = EventLog(db)
        self.events.set_broadcaster(self.broadcaster)
        self.pump = EventPump()
        self.events.add_commit_listener(self.pump.wake)

        self.hooks = HookRegistry()
        self.household = HouseholdRepo(db)
        self.recipes = RecipesRepo(db, household_repo=self.household, hooks=self.hooks, events=self.events)
        self.schedule = ScheduleRepo(db, recipes_repo=self.recipes, events=self.events)
        self.journal = JournalRepo(db, recipes_repo=self.recipes, events=self.events)
        self.members = MembersRepo(db, events=self.events)
        self.assets = AssetsRepo(db, uploads_dir=self.uploads_dir, events=self.events)
        self.attributes = AttributesRepo(db)

        self.jobs = JobManager(db, events=self.events, broadcaster=self.broadcaster)
        self.tokens = TokenManager(db)
        self.sessions = SessionStore(db)
        self.rate_limiter = RateLimiter()
        self.services = ServiceRegistry()
        self.router_registry = RouterRegistry()
        self.registry = PluginRegistry(db, key_manager=key_manager)
        if search_paths is None:
            search_paths = [CORE_PLUGINS_DIR, self.plugins_dir]
        self.loader = PluginLoader(self.registry, search_paths=search_paths, host=self)

        self.precache_info: dict[str, Any] = {}
        self._contexts: dict[str, PluginContext] = {}
        self._gc_task: asyncio.Task | None = None

    @property
    def plugins(self) -> PluginRegistry:
        return self.registry

    # -- plugin host ------------------------------------------------------------

    def ctx_for(self, plugin_id: str) -> PluginContext:
        ctx = self._contexts.get(plugin_id)
        if ctx is None:
            ctx = PluginContext(plugin_id, self)
            self._contexts[plugin_id] = ctx
        return ctx

    def active_ctx(self, plugin_id: str) -> PluginContext | None:
        return self._contexts.get(plugin_id) if plugin_id in self.loader.active else None

    async def prepare_plugin_cursor(self, plugin_id: str) -> bool:
        """Creates or repositions the plugin's cursor; True when it must rebuild (spec 6.7 rule 5)."""
        dispatcher = self.ctx_for(plugin_id)._dispatcher
        row = await self.db.read_one(
            "SELECT last_seq FROM event_cursors WHERE plugin_id = ?;", (plugin_id,)
        )
        if row is None:
            await dispatcher.ensure_cursor(start_at_head=True)
            return False
        oldest = await self.db.read_val("SELECT MIN(seq) FROM events;")
        if oldest is not None and row["last_seq"] < oldest - 1:
            # Events it never saw were pruned: skip to head and rebuild instead.
            head = await self.events.get_head_seq()
            await self.db.write(
                "UPDATE event_cursors SET last_seq = ?, failing_seq = NULL, attempts = 0 WHERE plugin_id = ?;",
                (head, plugin_id),
            )
            return True
        return False

    async def plugin_activated(self, plugin_id: str, needs_rebuild: bool = False) -> None:
        ctx = self.ctx_for(plugin_id)
        self.pump.add(ctx._dispatcher)
        await self._log_plugin_event("plugin:activated", plugin_id)
        if needs_rebuild and self.services.get_command(plugin_id, "rebuild"):
            await self.jobs.create_job(plugin_id, "command:rebuild")

    async def plugin_deactivated(self, plugin_id: str) -> None:
        await self._log_plugin_event("plugin:deactivated", plugin_id)

    async def release_plugin(self, plugin_id: str) -> None:
        """Removes everything the plugin registered through its context."""
        ctx = self._contexts.pop(plugin_id, None)
        await self.pump.remove(plugin_id)
        await self.jobs.cancel_plugin_jobs(plugin_id)
        self.jobs.unregister_plugin(plugin_id)
        self.hooks.unregister_plugin(plugin_id)
        self.services.unregister_plugin(plugin_id)
        self.router_registry.unmount_plugin(plugin_id)
        if ctx is not None:
            await ctx.shutdown()

    async def _log_plugin_event(self, name: str, plugin_id: str) -> None:
        manifest = self.registry.get_manifest(plugin_id)
        async with self.db.transaction() as tx:
            await self.events.append(
                tx,
                name=name,
                data={"plugin_id": plugin_id, "version": manifest.version if manifest else None},
                entity_type="plugin",
                entity_id=plugin_id,
                origin="system",
            )

    async def drain_events(self) -> None:
        """Delivers pending events to every plugin now (tests; the pump does this live)."""
        for ctx in list(self._contexts.values()):
            await ctx._dispatcher.drain_to_head()

    # -- services -----------------------------------------------------------------

    def start_services(self, gc_interval: float = 3600.0) -> None:
        """Starts event delivery, the job runner and the garbage collector."""
        self.pump.start()
        self.jobs.start()
        if self._gc_task is None:
            self._gc_task = asyncio.create_task(
                periodic_gc_worker(self.db, self.data_dir, interval=gc_interval), name="gc"
            )

    async def shutdown(self) -> None:
        if self._gc_task is not None:
            self._gc_task.cancel()
            await asyncio.gather(self._gc_task, return_exceptions=True)
            self._gc_task = None
        await self.pump.stop()
        await self.jobs.stop()
        await self.loader.shutdown()
        for plugin_id in list(self._contexts):
            await self.release_plugin(plugin_id)
        await self.db.close()


def assemble_kernel(
    db: Database,
    data_dir: Path | str,
    *,
    config: Config | None = None,
    key_manager: KeyManager | None = None,
    search_paths: list[Path] | None = None,
) -> BootedKernel:
    """Wires the kernel over an already connected database without loading plugins."""
    return BootedKernel(
        db=db,
        data_dir=Path(data_dir),
        config=config or Config(),
        key_manager=key_manager,
        search_paths=search_paths,
    )


async def boot(
    data_dir: Path | str | None = None,
    *,
    config: Config | None = None,
    search_paths: list[Path] | None = None,
) -> BootedKernel:
    """Orchestrates the full kernel startup sequence."""
    data_path = resolve_data_dir(data_dir)
    for directory in (data_path, data_path / "uploads", data_path / "plugins"):
        directory.mkdir(parents=True, exist_ok=True)

    if config is None:
        config = load_config(config_path=data_path / "config.json")
    key_manager = KeyManager(data_path / "secret.key")

    db = Database(data_path / "secretsauce.db")
    await db.connect()
    try:
        await db.run_migrations()
        kernel = assemble_kernel(
            db, data_path, config=config, key_manager=key_manager, search_paths=search_paths
        )
        await kernel.jobs.recover_stale_jobs_on_boot()
        await kernel.sessions.load()
        await kernel.loader.discover_and_sync()
        kernel.precache_info = compute_precache_info()
    except BaseException:
        await db.close()
        raise
    return kernel

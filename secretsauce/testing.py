from pathlib import Path
from typing import Any
import httpx
from fastapi import FastAPI
from itsdangerous import URLSafeTimedSerializer

from secretsauce.api.routes.auth import router as auth_router
from secretsauce.api.routes.setup import router as setup_router
from secretsauce.api_tokens import TokenManager
from secretsauce.auth import AuthMiddleware, hash_passphrase
from secretsauce.db import Database
from secretsauce.events import Event, EventDispatcher, EventLog
from secretsauce.hooks import HookRegistry
from secretsauce.jobs import JobManager
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.nouns.attributes import AttributesRepo
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.journal import JournalRepo
from secretsauce.nouns.members import MembersRepo
from secretsauce.nouns.recipes import RecipesRepo
from secretsauce.nouns.schedule import ScheduleRepo
from secretsauce.plugins.context import PluginContext, ServiceRegistry
from secretsauce.plugins.loader import PluginLoader
from secretsauce.plugins.registry import PluginRegistry
from secretsauce.secrets import KeyManager


class Kernel:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.db_path = data_dir / "secretsauce.db"
        self.key_path = data_dir / "secret.key"
        self.plugins_dir = data_dir / "plugins"
        self.assets_dir = data_dir / "assets"

        self.db = Database(self.db_path)
        self.key_manager = KeyManager(self.key_path)

        self.household = HouseholdRepo(self.db)
        self.members = MembersRepo(self.db)
        self.recipes = RecipesRepo(self.db)
        self.schedule = ScheduleRepo(self.db)
        self.journal = JournalRepo(self.db)
        self.assets = AssetsRepo(self.db, uploads_dir=self.assets_dir)
        self.attributes = AttributesRepo(self.db)
        self.hooks = HookRegistry()
        self.events = EventLog(self.db)
        self.jobs = JobManager(self.db)
        self.tokens = TokenManager(self.db)
        self.registry = PluginRegistry(self.db)
        self.loader = PluginLoader(self.registry, search_paths=[self.plugins_dir])
        self.services = ServiceRegistry()

        self._dispatchers: dict[str, EventDispatcher] = {}
        self._last_drained_seq = 0

        self.app = FastAPI(title="SecretSauce Kernel Test")
        self.app.state.kernel = self

        self.app.add_middleware(AuthMiddleware)

        @self.app.get("/api/health")
        async def health():
            return {"status": "ok"}

        self.app.include_router(setup_router)
        self.app.include_router(auth_router)

        self.client: httpx.AsyncClient | None = None

    def ctx_for(self, plugin_id: str) -> PluginContext:
        if plugin_id not in self._dispatchers:
            self._dispatchers[plugin_id] = EventDispatcher(
                self.db, plugin_id=plugin_id
            )
        dispatcher = self._dispatchers[plugin_id]

        return PluginContext(
            plugin_id=plugin_id,
            db=self.db,
            hook_registry=self.hooks,
            event_log=self.events,
            dispatcher=dispatcher,
            job_manager=self.jobs,
            token_manager=self.tokens,
            service_registry=self.services,
        )

    async def start(
        self, plugins: list[Any] | None = None, auto_setup: bool = True
    ) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.plugins_dir.mkdir(parents=True, exist_ok=True)
        self.assets_dir.mkdir(parents=True, exist_ok=True)

        await self.db.connect()
        await self.db.run_migrations()

        if auto_setup:
            await self.household.update_config(
                {
                    "household_name": "Test Household",
                    "meal_types": [{"id": "dinner", "label": "Dinner"}],
                    "languages": {"primary": "en"},
                    "units": "metric",
                }
            )
            version = await self.household.set_passphrase(
                hash_passphrase("test_passphrase")
            )
            await self.members.create_member(
                {"name": "Admin", "color": "#0088cc"}
            )

        transport = httpx.ASGITransport(app=self.app)
        self.client = httpx.AsyncClient(
            transport=transport, base_url="http://testserver"
        )

        if auto_setup:
            serializer = URLSafeTimedSerializer(
                self.key_manager.derive_session_key(), salt="session"
            )
            token = serializer.dumps(
                {"session_id": "test_session", "passphrase_version": version}
            )
            self.client.cookies.set("ss_session", token)

        if plugins:
            for p in plugins:
                # If path or module provided, load
                pass

    async def stop(self) -> None:
        if self.client:
            await self.client.aclose()
        await self.db.close()


class KernelContextManager:
    def __init__(
        self,
        kernel: Kernel,
        plugins: list[Any] | None = None,
        auto_setup: bool = True,
    ):
        self._kernel = kernel
        self._plugins = plugins
        self._auto_setup = auto_setup

    def __await__(self):
        async def _start():
            try:
                await self._kernel.start(
                    plugins=self._plugins, auto_setup=self._auto_setup
                )
                return self._kernel
            except Exception:
                await self._kernel.stop()
                raise

        return _start().__await__()

    async def __aenter__(self) -> Kernel:
        try:
            await self._kernel.start(
                plugins=self._plugins, auto_setup=self._auto_setup
            )
            return self._kernel
        except Exception:
            await self._kernel.stop()
            raise

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self._kernel.stop()


def make_kernel(
    tmp_path: Path | str,
    plugins: list[Any] | None = None,
    auto_setup: bool = True,
) -> KernelContextManager:
    kernel = Kernel(Path(tmp_path))
    return KernelContextManager(
        kernel, plugins=plugins, auto_setup=auto_setup
    )


async def drain_events(kernel: Kernel) -> list[Event]:
    for disp in kernel._dispatchers.values():
        await disp.drain_to_head()

    events = await kernel.events.get_events_after(kernel._last_drained_seq)
    if events:
        kernel._last_drained_seq = max(e.seq for e in events)
    return events

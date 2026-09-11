import asyncio
import logging
from typing import Any, Callable, Coroutine

from secretsauce.api_tokens import TokenManager
from secretsauce.db import Database
from secretsauce.events import EventDispatcher, EventLog
from secretsauce.hooks import HookRegistry
from secretsauce.jobs import JobManager
from secretsauce.nouns.assets import AssetsRepo
from secretsauce.nouns.attributes import AttributesRepo
from secretsauce.nouns.household import HouseholdRepo
from secretsauce.nouns.journal import JournalRepo
from secretsauce.nouns.members import MembersRepo
from secretsauce.nouns.recipes import RecipeRepo
from secretsauce.nouns.schedule import ScheduleRepo


class ScopedAttributes:
    def __init__(self, attributes_repo: AttributesRepo, plugin_id: str):
        self._repo = attributes_repo
        self._plugin_id = plugin_id

    async def set(
        self,
        entity_type: str,
        entity_id: str,
        key: str,
        value: Any,
    ) -> None:
        await self._repo.set_attribute(
            plugin_id=self._plugin_id,
            entity_type=entity_type,
            entity_id=entity_id,
            key=key,
            value=value,
        )

    async def delete(
        self,
        entity_type: str,
        entity_id: str,
        key: str,
    ) -> bool:
        return await self._repo.delete_attribute(
            plugin_id=self._plugin_id,
            entity_type=entity_type,
            entity_id=entity_id,
            key=key,
        )

    async def get(
        self,
        entity_type: str,
        entity_id: str,
    ) -> dict[str, Any]:
        return await self._repo.get_attributes(
            entity_type=entity_type,
            entity_id=entity_id,
            plugin_id=self._plugin_id,
        )

    async def get_all(
        self,
        entity_type: str,
        entity_id: str,
    ) -> dict[str, Any]:
        return await self._repo.get_all_attributes(
            entity_type=entity_type,
            entity_id=entity_id,
        )

    async def query(
        self,
        entity_type: str,
        filter_expr: str,
        limit: int = 100,
        offset: int = 0,
    ) -> list[str]:
        return await self._repo.query_entities(
            entity_type=entity_type,
            filter_expr=filter_expr,
            limit=limit,
            offset=offset,
        )


class ScopedTokens:
    def __init__(self, token_manager: TokenManager, plugin_id: str):
        self._manager = token_manager
        self._plugin_id = plugin_id

    async def issue(self, scope: str, label: str) -> str:
        return await self._manager.issue(
            self._plugin_id, scope=scope, label=label
        )

    async def verify(
        self, token: str, required_scope: str | None = None
    ) -> dict[str, Any] | None:
        return await self._manager.verify(
            token, required_scope=required_scope
        )

    async def revoke(self, token_id: str) -> bool:
        return await self._manager.revoke(token_id, plugin_id=self._plugin_id)

    async def list(self) -> list[dict[str, Any]]:
        return await self._manager.list_tokens(self._plugin_id)


class ScopedJobs:
    def __init__(self, job_manager: JobManager, plugin_id: str):
        self._manager = job_manager
        self._plugin_id = plugin_id

    async def create(
        self, job_type: str, input_data: dict[str, Any] | None = None
    ) -> str:
        return await self._manager.create_job(
            self._plugin_id, job_type=job_type, input_data=input_data
        )

    def run(self, job_id: str):
        return self._manager.run(job_id)

    async def get(self, job_id: str) -> dict[str, Any]:
        return await self._manager.get_job(job_id)

    def register(self, job_type: str, handler: Callable[..., Any]) -> None:
        self._manager.register_handler(self._plugin_id, job_type, handler)

    async def cancel(self, job_id: str) -> None:
        await self._manager.cancel_job(job_id)


class ServiceRegistry:
    def __init__(self):
        self._services: dict[str, Any] = {}
        self._commands: dict[tuple[str, str], dict[str, Any]] = {}

    def register(self, name: str, service: Any) -> None:
        self._services[name] = service

    def get(self, name: str) -> Any | None:
        return self._services.get(name)

    def register_command(
        self, plugin_id: str, command_id: str, fn: Callable[..., Any], title: str = ""
    ) -> None:
        self._commands[(plugin_id, command_id)] = {"fn": fn, "title": title}

    def get_command(
        self, plugin_id: str, command_id: str
    ) -> Callable[..., Any] | None:
        entry = self._commands.get((plugin_id, command_id))
        return entry["fn"] if entry else None


class RouterRegistry:
    def __init__(self, app: Any = None):
        self._app = app
        self._routers: list[Any] = []

    def set_app(self, app: Any) -> None:
        self._app = app
        for r in self._routers:
            self._include_router_before_fallback(r)

    def _include_router_before_fallback(self, router: Any) -> None:
        if self._app is None:
            return
        fallback_idx = None
        for idx, route in enumerate(self._app.router.routes):
            if getattr(route, "path", None) == "/{full_path:path}":
                fallback_idx = idx
                break

        if fallback_idx is not None:
            prev_count = len(self._app.router.routes)
            self._app.include_router(router)
            new_routes = self._app.router.routes[prev_count:]
            base_routes = self._app.router.routes[:fallback_idx]
            fallback_routes = self._app.router.routes[fallback_idx:prev_count]
            self._app.router.routes = base_routes + new_routes + fallback_routes
        else:
            self._app.include_router(router)

    def mount(self, router: Any) -> None:
        self._routers.append(router)
        self._include_router_before_fallback(router)


class ScopedRoutes:
    def __init__(self, router_registry: RouterRegistry, plugin_id: str):
        self._registry = router_registry
        self._plugin_id = plugin_id

    def mount(self, router: Any) -> None:
        self._registry.mount(router)


class PluginContext:
    def __init__(
        self,
        plugin_id: str,
        db: Database,
        config: dict[str, Any] | None = None,
        hook_registry: HookRegistry | None = None,
        event_log: EventLog | None = None,
        dispatcher: EventDispatcher | None = None,
        job_manager: JobManager | None = None,
        token_manager: TokenManager | None = None,
        service_registry: ServiceRegistry | None = None,
        router_registry: RouterRegistry | None = None,
    ):
        self.plugin_id = plugin_id
        self.db = db
        self.config = config or {}
        self.log = logging.getLogger(f"secretsauce.plugin.{plugin_id}")

        self.recipes = RecipeRepo(db)
        self.schedule = ScheduleRepo(db)
        self.journal = JournalRepo(db)
        self.members = MembersRepo(db)
        self.household = HouseholdRepo(db)
        self.assets = AssetsRepo(db)

        self._attr_repo = AttributesRepo(db)
        self.attributes = ScopedAttributes(self._attr_repo, plugin_id)

        self._token_manager = token_manager or TokenManager(db)
        self.tokens = ScopedTokens(self._token_manager, plugin_id)

        self._job_manager = job_manager or JobManager(db)
        self.jobs = ScopedJobs(self._job_manager, plugin_id)

        self._hook_registry = hook_registry or HookRegistry()
        self._event_log = event_log or EventLog(db)
        self._dispatcher = dispatcher or EventDispatcher(db, plugin_id=plugin_id)
        self.services = service_registry or ServiceRegistry()
        self._router_registry = router_registry or RouterRegistry()
        self.routes = ScopedRoutes(self._router_registry, plugin_id)

    def router(
        self,
        router: Any,
        auth: str = "cookie",
        scope: str | None = None,
    ) -> None:
        self.routes.mount(router)

    def command(
        self, command_id: str, fn: Callable[..., Any], title: str = ""
    ) -> None:
        self.services.register_command(self.plugin_id, command_id, fn, title=title)

    def hook(
        self, name: str, handler: Callable[..., Any] | None = None
    ) -> Any:
        if handler is None:
            def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
                self._hook_registry.register(name, self.plugin_id, fn)
                return fn
            return decorator
        self._hook_registry.register(name, self.plugin_id, handler)

    def on(
        self,
        name: str,
        handler: Callable[..., Any] | None = None,
        include_self: bool = False,
    ) -> Any:
        def register_fn(fn: Callable[..., Any]) -> Callable[..., Any]:
            async def wrapped_handler(event):
                if (
                    not include_self
                    and event.origin == f"plugin:{self.plugin_id}"
                ):
                    return
                await fn(event)

            self._dispatcher.subscribe(name, wrapped_handler)
            return fn

        if handler is None:
            return register_fn
        return register_fn(handler)

    async def emit(
        self,
        name: str,
        data: dict[str, Any] | None = None,
        entity: tuple[str, str] | None = None,
    ) -> int:
        entity_type = entity[0] if entity else None
        entity_id = entity[1] if entity else None

        async with self.db.transaction() as tx:
            return await self._event_log.append(
                tx,
                name=name,
                data=data,
                entity_type=entity_type,
                entity_id=entity_id,
                origin=f"plugin:{self.plugin_id}",
            )

    def background(self, coro: Coroutine) -> asyncio.Task:
        return asyncio.create_task(coro)


async def create_plugin_context(
    db: Database,
    plugin_id: str,
    config: dict[str, Any] | None = None,
    hook_registry: HookRegistry | None = None,
    event_log: EventLog | None = None,
    dispatcher: EventDispatcher | None = None,
    job_manager: JobManager | None = None,
    token_manager: TokenManager | None = None,
    service_registry: ServiceRegistry | None = None,
) -> PluginContext:
    return PluginContext(
        plugin_id=plugin_id,
        db=db,
        config=config,
        hook_registry=hook_registry,
        event_log=event_log,
        dispatcher=dispatcher,
        job_manager=job_manager,
        token_manager=token_manager,
        service_registry=service_registry,
    )

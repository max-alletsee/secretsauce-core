import asyncio
from dataclasses import dataclass
import inspect
import logging
import re
from typing import Any, Callable, Coroutine

from fastapi import Request
from starlette.routing import Match

from secretsauce.api_tokens import TokenManager
from secretsauce.db import Database
from secretsauce.errors import NotFoundError, PluginRuntimeError
from secretsauce.events import EventDispatcher, EventLog, acting_as
from secretsauce.hooks import HookRegistry
from secretsauce.jobs import JobManager
from secretsauce.nouns.attributes import AttributesRepo

logger = logging.getLogger(__name__)

PLUGIN_PATH_PATTERN = re.compile(r"/api/x/([a-z][a-z0-9-]{1,40})(?:/|$)")


def plugin_id_for_path(path: str) -> str | None:
    """The plugin owning a request path under /api/x/<plugin_id>/, if any."""
    m = PLUGIN_PATH_PATTERN.search(path)
    return m.group(1) if m else None


class ScopedAttributes:
    def __init__(self, attributes_repo: AttributesRepo, plugin_id: str):
        self._repo = attributes_repo
        self._plugin_id = plugin_id

    async def set(self, entity_type: str, entity_id: str, key: str, value: Any) -> None:
        await self._repo.set_attribute(
            plugin_id=self._plugin_id,
            entity_type=entity_type,
            entity_id=entity_id,
            key=key,
            value=value,
        )

    async def delete(self, entity_type: str, entity_id: str, key: str) -> None:
        await self._repo.delete_attribute(
            plugin_id=self._plugin_id,
            entity_type=entity_type,
            entity_id=entity_id,
            key=key,
        )

    async def get(self, entity_type: str, entity_id: str) -> dict[str, Any]:
        return await self._repo.get_attributes(
            entity_type=entity_type, entity_id=entity_id, plugin_id=self._plugin_id
        )

    async def get_all(self, entity_type: str, entity_id: str) -> dict[str, Any]:
        return await self._repo.get_all_attributes(entity_type=entity_type, entity_id=entity_id)

    async def query(self, entity_type: str, filters: list[str]) -> list[str]:
        return await self._repo.query_entity_ids(entity_type=entity_type, filters=filters)


class ScopedTokens:
    def __init__(self, token_manager: TokenManager, plugin_id: str):
        self._manager = token_manager
        self._plugin_id = plugin_id

    async def issue(self, scope: str, label: str) -> str:
        return await self._manager.issue(self._plugin_id, scope=scope, label=label)

    async def verify(self, token: str, required_scope: str | None = None) -> dict[str, Any] | None:
        return await self._manager.verify(token, required_scope=required_scope)

    async def revoke(self, token_id: str) -> bool:
        return await self._manager.revoke(token_id, plugin_id=self._plugin_id)

    async def list(self) -> list[dict[str, Any]]:
        return await self._manager.list_tokens(self._plugin_id)


class ScopedJobs:
    def __init__(self, job_manager: JobManager, plugin_id: str):
        self._manager = job_manager
        self._plugin_id = plugin_id

    async def create(self, job_type: str, input_data: dict[str, Any] | None = None) -> str:
        """Queues a job; the kernel's job runner starts it once a handler is registered."""
        return await self._manager.create_job(self._plugin_id, job_type=job_type, input_data=input_data)

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
        self._owners: dict[str, str | None] = {}
        self._commands: dict[tuple[str, str], dict[str, Any]] = {}

    def register(self, name: str, service: Any, plugin_id: str | None = None) -> None:
        self._services[name] = service
        self._owners[name] = plugin_id

    def get(self, name: str) -> Any | None:
        return self._services.get(name)

    def register_command(
        self, plugin_id: str, command_id: str, fn: Callable[..., Any], title: str = ""
    ) -> None:
        self._commands[(plugin_id, command_id)] = {"fn": fn, "title": title}

    def get_command(self, plugin_id: str, command_id: str) -> Callable[..., Any] | None:
        entry = self._commands.get((plugin_id, command_id))
        return entry["fn"] if entry else None

    def list_commands(self, plugin_id: str) -> list[dict[str, str]]:
        return [
            {"id": command_id, "title": entry["title"] or command_id}
            for (owner, command_id), entry in sorted(self._commands.items())
            if owner == plugin_id
        ]

    def unregister_plugin(self, plugin_id: str) -> None:
        for name in [n for n, owner in self._owners.items() if owner == plugin_id]:
            self._services.pop(name, None)
            self._owners.pop(name, None)
        for key in [k for k in self._commands if k[0] == plugin_id]:
            del self._commands[key]


class ScopedServices:
    """A plugin's view of the service registry; what it registers is removed on deactivation."""

    def __init__(self, registry: ServiceRegistry, plugin_id: str):
        self._registry = registry
        self._plugin_id = plugin_id

    def register(self, name: str, service: Any) -> None:
        self._registry.register(name, service, plugin_id=self._plugin_id)

    def get(self, name: str) -> Any | None:
        return self._registry.get(name)

    def get_command(self, plugin_id: str, command_id: str) -> Callable[..., Any] | None:
        return self._registry.get_command(plugin_id, command_id)


def _route_paths(routes: list[Any], prefix: str = ""):
    """Every path a router serves, descending into routers it includes."""
    for route in routes:
        original = getattr(route, "original_router", None)
        if original is not None:
            include_prefix = getattr(getattr(route, "include_context", None), "prefix", "")
            yield from _route_paths(original.routes, prefix + include_prefix)
        elif hasattr(route, "path"):
            yield prefix + route.path


@dataclass
class MountedRoute:
    plugin_id: str | None
    route: Any
    auth: str
    scope: str | None


class RouterRegistry:
    """Mounts plugin routers ahead of the SPA fallback and remembers who owns what."""

    def __init__(self, app: Any = None):
        self._app = app
        self._pending: list[tuple[Any, str | None, str, str | None]] = []
        self._mounted: list[MountedRoute] = []

    def set_app(self, app: Any) -> None:
        self._app = app
        pending, self._pending = self._pending, []
        for router, plugin_id, auth, scope in pending:
            self._include(router, plugin_id, auth, scope)

    def mount(
        self,
        router: Any,
        plugin_id: str | None = None,
        auth: str = "cookie",
        scope: str | None = None,
    ) -> None:
        if auth not in ("cookie", "token"):
            raise PluginRuntimeError(f"Unknown route auth '{auth}'", plugin_id=plugin_id)
        if auth == "token" and not scope:
            raise PluginRuntimeError("Token routes must declare a scope", plugin_id=plugin_id)
        if plugin_id is not None:
            prefix = f"/api/x/{plugin_id}"
            outside = [
                path for path in _route_paths(router.routes)
                if not (path == prefix or path.startswith(prefix + "/"))
            ]
            if outside:
                raise PluginRuntimeError(
                    f"Plugin routes must live under {prefix}/: {', '.join(outside)}",
                    plugin_id=plugin_id,
                )
        if self._app is None:
            self._pending.append((router, plugin_id, auth, scope))
        else:
            self._include(router, plugin_id, auth, scope)

    def _include(self, router: Any, plugin_id: str | None, auth: str, scope: str | None) -> None:
        routes = self._app.router.routes
        prev_count = len(routes)
        self._app.include_router(router)
        # Depending on the FastAPI version these are copied routes or one wrapper.
        new_routes = routes[prev_count:]
        del routes[prev_count:]

        fallback_idx = next(
            (i for i, r in enumerate(routes) if getattr(r, "path", None) == "/{full_path:path}"),
            len(routes),
        )
        routes[fallback_idx:fallback_idx] = new_routes
        self._mounted.extend(MountedRoute(plugin_id, r, auth, scope) for r in new_routes)

    def unmount_plugin(self, plugin_id: str) -> None:
        self._pending = [p for p in self._pending if p[1] != plugin_id]
        owned = {id(m.route) for m in self._mounted if m.plugin_id == plugin_id}
        self._mounted = [m for m in self._mounted if m.plugin_id != plugin_id]
        if self._app is not None and owned:
            self._app.router.routes[:] = [
                r for r in self._app.router.routes if id(r) not in owned
            ]

    def token_route_for(self, scope: dict[str, Any]) -> MountedRoute | None:
        """The mounted auth="token" route this request would hit, if any."""
        for mounted in self._mounted:
            if mounted.auth == "token":
                match, _ = mounted.route.matches(scope)
                if match == Match.FULL:
                    return mounted
        return None


class ScopedRoutes:
    def __init__(self, router_registry: RouterRegistry, plugin_id: str):
        self._registry = router_registry
        self._plugin_id = plugin_id

    def mount(self, router: Any, auth: str = "cookie", scope: str | None = None) -> None:
        self._registry.mount(router, plugin_id=self._plugin_id, auth=auth, scope=scope)


class PluginContext:
    """The entire backend API a plugin sees (spec 6.4).

    Repositories are the kernel's own instances, so plugin writes run the
    same hooks and append the same events as REST writes.
    """

    def __init__(self, plugin_id: str, kernel: Any, config: dict[str, Any] | None = None):
        self.plugin_id = plugin_id
        self.origin = f"plugin:{plugin_id}"
        self.db: Database = kernel.db
        self.log = logging.getLogger(f"secretsauce.plugin.{plugin_id}")

        self.recipes = kernel.recipes
        self.timeline = kernel.timeline
        self.members = kernel.members
        self.household = kernel.household
        self.assets = kernel.assets

        self.attributes = ScopedAttributes(kernel.attributes, plugin_id)
        self.tokens = ScopedTokens(kernel.tokens, plugin_id)
        self.jobs = ScopedJobs(kernel.jobs, plugin_id)
        self.services = ScopedServices(kernel.services, plugin_id)
        self.routes = ScopedRoutes(kernel.router_registry, plugin_id)

        self._hook_registry: HookRegistry = kernel.hooks
        self._event_log: EventLog = kernel.events
        self._broadcaster = kernel.broadcaster
        self._registry = getattr(kernel, "registry", None)
        self._dispatcher = EventDispatcher(kernel.db, plugin_id=plugin_id)
        self._tasks: set[asyncio.Task] = set()
        self._static_config = config

    @property
    def config(self) -> dict[str, Any]:
        """This plugin's configuration: schema defaults applied, secrets decrypted."""
        if self._static_config is not None:
            return dict(self._static_config)
        if self._registry is not None:
            return self._registry.runtime_config(self.plugin_id)
        return {}

    async def save_config(self, updates: dict[str, Any]) -> dict[str, Any]:
        """Merges updates into the stored configuration; returns the clear result."""
        if self._registry is None:
            if self._static_config is None:
                self._static_config = {}
            self._static_config.update(updates)
            return dict(self._static_config)
        await self._registry.update_config(self.plugin_id, {**self.config, **updates})
        return self.config

    def router(self, router: Any, auth: str = "cookie", scope: str | None = None) -> None:
        self.routes.mount(router, auth=auth, scope=scope)

    def command(self, command_id: str, fn: Callable[..., Any], title: str = "") -> None:
        """Registers a command; it runs as a job of type command:<id> (spec 6.8)."""
        self.services._registry.register_command(self.plugin_id, command_id, fn, title=title)

        async def run_command(input_data: dict[str, Any], handle: Any) -> Any:
            if len(inspect.signature(fn).parameters) >= 2:
                return await fn(self, handle)
            return await fn(self)

        self.jobs.register(f"command:{command_id}", run_command)

    def hook(self, name: str, handler: Callable[..., Any] | None = None) -> Any:
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
                if not include_self and event.origin == self.origin:
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
                origin=self.origin,
            )

    async def push(self, name: str, data: dict[str, Any] | None = None) -> None:
        """Sends a transient message to open browsers; it never enters the event log."""
        if self._broadcaster is not None:
            self._broadcaster.broadcast_push(name, data, plugin_id=self.plugin_id)

    def background(self, coro: Coroutine) -> asyncio.Task:
        """Runs coro as a tracked task, cancelled when the plugin deactivates."""

        async def run() -> Any:
            with acting_as(self.origin):
                return await coro

        task = asyncio.create_task(run(), name=f"{self.origin}:background")
        self._tasks.add(task)
        task.add_done_callback(lambda t: self._background_done(t, coro))
        return task

    def _background_done(self, task: asyncio.Task, coro: Coroutine) -> None:
        self._tasks.discard(task)
        if task.cancelled():
            coro.close()  # it may never have started
        elif task.exception() is not None:
            self.log.error("Background task failed", exc_info=task.exception())

    async def shutdown(self) -> None:
        """Cancels this plugin's background tasks and stops its event handlers."""
        self._dispatcher.unsubscribe_all()
        tasks = list(self._tasks)
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


def current_ctx(request: Request) -> PluginContext:
    """FastAPI dependency giving a plugin route its plugin's context (spec 6.9)."""
    plugin_id = plugin_id_for_path(request.url.path)
    kernel = getattr(request.app.state, "kernel", None)
    if plugin_id is None or kernel is None:
        raise NotFoundError("Not a plugin route")
    ctx = kernel.active_ctx(plugin_id)
    if ctx is None:
        raise NotFoundError(f"Plugin '{plugin_id}' is not active")
    return ctx


get_plugin_ctx = current_ctx


async def create_plugin_context(
    db: Database,
    plugin_id: str,
    config: dict[str, Any] | None = None,
) -> PluginContext:
    """A context over a bare database, for tests and scripts outside a booted kernel."""
    from secretsauce.boot import assemble_kernel

    kernel = assemble_kernel(db, db.db_path.parent)
    return kernel.ctx_for(plugin_id) if config is None else PluginContext(plugin_id, kernel, config)

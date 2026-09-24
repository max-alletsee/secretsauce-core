from dataclasses import dataclass
import heapq
import importlib.util
import inspect
import logging
from pathlib import Path
import sys
import traceback
from types import ModuleType
from typing import Any, Callable

from secretsauce.db import Database
from secretsauce.errors import ValidationError
from secretsauce.plugins.manifest import PluginManifest, validate_manifest
from secretsauce.plugins.registry import PluginRegistry

logger = logging.getLogger(__name__)


@dataclass
class PluginCandidate:
    plugin_id: str
    dir: Path
    module: ModuleType | None = None
    manifest: PluginManifest | None = None
    error: str | None = None

    def required(self) -> list[str]:
        return [d for d in (self.manifest.requires if self.manifest else []) if not d.endswith("?")]

    def all_dependencies(self) -> list[str]:
        return [d.rstrip("?") for d in (self.manifest.requires if self.manifest else [])]


def module_name_for(plugin_id: str) -> str:
    return f"ss_plugin_{plugin_id.replace('-', '_')}"


def dependency_order(candidates: dict[str, PluginCandidate]) -> tuple[list[str], set[str]]:
    """Topological order of requires (ties by id) and the ids caught in cycles."""
    deps = {
        pid: {d for d in c.all_dependencies() if d in candidates and d != pid}
        for pid, c in candidates.items()
    }
    dependents: dict[str, set[str]] = {pid: set() for pid in candidates}
    for pid, ds in deps.items():
        for d in ds:
            dependents[d].add(pid)

    remaining = {pid: len(ds) for pid, ds in deps.items()}
    ready = [pid for pid, n in remaining.items() if n == 0]
    heapq.heapify(ready)
    order: list[str] = []
    while ready:
        pid = heapq.heappop(ready)
        order.append(pid)
        for dependent in sorted(dependents[pid]):
            remaining[dependent] -= 1
            if remaining[dependent] == 0:
                heapq.heappush(ready, dependent)
    cyclic = set(candidates) - set(order)
    return order + sorted(cyclic), cyclic


class PluginLoader:
    """Discovers plugin modules and drives their lifecycle (spec 6.1, 6.3).

    The host (the booted kernel) supplies contexts and removes everything a
    plugin registered when it deactivates. Without a host, a bare
    context_factory can be given for tests; setup is skipped when neither is.
    """

    CORE_PLUGINS_DIR = Path(__file__).resolve().parent / "core"

    def __init__(
        self,
        registry: PluginRegistry,
        search_paths: list[Path | str] | None = None,
        context_factory: Callable[[str], Any] | None = None,
        host: Any = None,
    ):
        self.registry = registry
        if search_paths is None:
            self.search_paths = [self.CORE_PLUGINS_DIR, Path("/app/plugins"), Path("/data/plugins")]
        else:
            self.search_paths = [Path(p) for p in search_paths]
        self.context_factory = context_factory
        self.host = host
        self.candidates: dict[str, PluginCandidate] = {}
        self.loaded_modules: dict[str, ModuleType] = {}
        self.plugin_dirs: dict[str, Path] = {}
        self.active: set[str] = set()

    @property
    def db(self) -> Database:
        return self.registry.db

    # -- discovery ------------------------------------------------------------

    def _discover(self) -> dict[str, tuple[Path, Path, bool]]:
        found: dict[str, tuple[Path, Path, bool]] = {}
        for search_path in self.search_paths:
            if not search_path.is_dir():
                continue
            for entry in sorted(search_path.iterdir(), key=lambda p: p.name):
                if entry.name.startswith((".", "_")):
                    continue
                if entry.is_dir() and (entry / "__init__.py").is_file():
                    found.setdefault(entry.name, (entry / "__init__.py", entry, True))
                elif entry.is_file() and entry.suffix == ".py":
                    found.setdefault(entry.stem, (entry, entry.parent, False))
        return found

    def _import(self, plugin_id: str, module_path: Path, plugin_dir: Path, is_package: bool) -> PluginCandidate:
        candidate = PluginCandidate(plugin_id=plugin_id, dir=plugin_dir)
        name = module_name_for(plugin_id)
        try:
            spec = importlib.util.spec_from_file_location(
                name,
                module_path,
                submodule_search_locations=[str(plugin_dir)] if is_package else None,
            )
            if spec is None or spec.loader is None:
                raise ImportError(f"Could not load spec for {module_path}")
            module = importlib.util.module_from_spec(spec)
            # Registered before executing so the package's own submodules can import it.
            sys.modules[name] = module
            try:
                spec.loader.exec_module(module)
            except BaseException:
                sys.modules.pop(name, None)
                raise

            raw_manifest = getattr(module, "PLUGIN", None)
            if raw_manifest is None:
                raise ValidationError(f"Plugin '{plugin_id}' has no PLUGIN dict")
            candidate.manifest = validate_manifest(raw_manifest, expected_id=plugin_id)
            candidate.module = module
            self.registry.register_manifest(candidate.manifest)
            self.loaded_modules[plugin_id] = module
        except Exception:
            candidate.error = traceback.format_exc()
            logger.error("Plugin %s failed to load:\n%s", plugin_id, candidate.error)
        return candidate

    async def discover_and_sync(self) -> None:
        """Imports newly found plugins and activates every enabled one not yet active.

        Modules already imported are never re-imported: Python cannot safely
        reload them in-process (spec 6.2).
        """
        for plugin_id, (module_path, plugin_dir, is_package) in self._discover().items():
            if plugin_id in self.candidates:
                continue
            self.plugin_dirs[plugin_id] = plugin_dir
            candidate = self._import(plugin_id, module_path, plugin_dir, is_package)
            self.candidates[plugin_id] = candidate
            existing = await self.registry.get_plugin(plugin_id)
            if candidate.error:
                await self.registry.upsert_plugin_record(plugin_id, "0.0.0", "errored", candidate.error)
            else:
                state = "disabled" if existing and not existing["enabled"] else "inactive"
                await self.registry.upsert_plugin_record(plugin_id, candidate.manifest.version, state)

        await self._activate_all()

    async def _activate_all(self) -> None:
        order, cyclic = dependency_order(self.candidates)
        for plugin_id in order:
            if plugin_id in self.active:
                continue
            if plugin_id in cyclic:
                await self.registry.set_state(
                    plugin_id, "blocked", f"Dependency cycle involving: {', '.join(sorted(cyclic))}"
                )
                continue
            await self.activate(plugin_id)

    # -- lifecycle --------------------------------------------------------------

    def _blocked_reason(self, candidate: PluginCandidate, rows: dict[str, dict[str, Any]]) -> str | None:
        for dep_id in candidate.required():
            dep = self.candidates.get(dep_id)
            row = rows.get(dep_id)
            if dep is None or dep.error:
                return f"Missing required plugin: {dep_id}"
            if row is not None and not row["enabled"]:
                return f"Required plugin is disabled: {dep_id}"
            if dep_id not in self.active:
                state = row["state"] if row else "unknown"
                return f"Required plugin is not active: {dep_id} ({state})"
        return None

    async def activate(self, plugin_id: str) -> str:
        """Migrates, sets up and starts one plugin; returns its resulting state."""
        candidate = self.candidates.get(plugin_id)
        if candidate is None:
            return "missing"
        if plugin_id in self.active:
            return "active"
        if candidate.error:
            await self.registry.set_state(plugin_id, "errored", candidate.error)
            return "errored"

        rows = {r["id"]: r for r in await self.registry.list_plugins()}
        row = rows.get(plugin_id)
        if row is not None and not row["enabled"]:
            await self.registry.set_state(plugin_id, "disabled")
            return "disabled"

        reason = self._blocked_reason(candidate, rows)
        if reason:
            await self.registry.set_state(plugin_id, "blocked", reason)
            return "blocked"

        try:
            await self._migrate(candidate, (row or {}).get("applied_schema", 0))
        except Exception:
            error = traceback.format_exc()
            logger.error("Plugin %s migration failed:\n%s", plugin_id, error)
            await self.registry.set_state(plugin_id, "errored", error)
            return "errored"

        await self.registry.load_config(plugin_id)
        needs_rebuild = False
        if self.host is not None:
            needs_rebuild = await self.host.prepare_plugin_cursor(plugin_id)

        setup_fn = getattr(candidate.module, "setup", None)
        ctx = None
        if self.host is not None:
            ctx = self.host.ctx_for(plugin_id)
        elif self.context_factory is not None:
            ctx = self.context_factory(plugin_id)

        if callable(setup_fn) and ctx is not None:
            try:
                result = setup_fn(ctx)
                if inspect.isawaitable(result):
                    await result
            except Exception:
                error = traceback.format_exc()
                logger.error("Plugin %s setup failed:\n%s", plugin_id, error)
                if self.host is not None:
                    await self.host.release_plugin(plugin_id)
                await self.registry.set_state(plugin_id, "errored", error)
                return "errored"

        self.active.add(plugin_id)
        await self.registry.set_state(plugin_id, "active")
        if self.host is not None:
            await self.host.plugin_activated(plugin_id, needs_rebuild=needs_rebuild)
        return "active"

    async def deactivate(self, plugin_id: str, state: str = "disabled", reason: str | None = None) -> None:
        """Tears a plugin down while every other plugin keeps running (spec 6.3)."""
        for dependent in self._active_dependents(plugin_id):
            await self.deactivate(
                dependent, state="blocked", reason=f"Required plugin is not active: {plugin_id} ({state})"
            )

        if plugin_id in self.active:
            candidate = self.candidates[plugin_id]
            teardown = getattr(candidate.module, "teardown", None)
            if callable(teardown):
                try:
                    result = teardown()
                    if inspect.isawaitable(result):
                        await result
                except Exception:
                    logger.exception("Plugin %s teardown failed", plugin_id)
            if self.host is not None:
                await self.host.release_plugin(plugin_id)
            self.active.discard(plugin_id)
            if self.host is not None:
                await self.host.plugin_deactivated(plugin_id)
        await self.registry.set_state(plugin_id, state, reason)

    def _active_dependents(self, plugin_id: str) -> list[str]:
        return sorted(
            pid for pid in self.active
            if plugin_id in self.candidates[pid].required()
        )

    async def enable(self, plugin_id: str) -> None:
        await self.registry.set_enabled(plugin_id, True)
        # Re-evaluates dependents that were blocked on this plugin as well.
        await self._activate_all()

    async def disable(self, plugin_id: str) -> None:
        await self.registry.set_enabled(plugin_id, False)
        await self.deactivate(plugin_id, state="disabled")

    async def shutdown(self) -> None:
        order, _ = dependency_order({pid: self.candidates[pid] for pid in self.active})
        for plugin_id in reversed(order):
            candidate = self.candidates[plugin_id]
            teardown = getattr(candidate.module, "teardown", None)
            if callable(teardown):
                try:
                    result = teardown()
                    if inspect.isawaitable(result):
                        await result
                except Exception:
                    logger.exception("Plugin %s teardown failed", plugin_id)
            if self.host is not None:
                await self.host.release_plugin(plugin_id)
            self.active.discard(plugin_id)

    async def _migrate(self, candidate: PluginCandidate, applied_schema: int) -> None:
        manifest = candidate.manifest
        mig_dir = candidate.dir / "migrations"
        if manifest.schema <= applied_schema or not mig_dir.is_dir():
            return
        for mig_file in sorted(mig_dir.glob("*.sql")):
            prefix = mig_file.stem.split("_", 1)[0]
            if not prefix.isdigit():
                continue
            number = int(prefix)
            if not applied_schema < number <= manifest.schema:
                continue
            script = mig_file.read_text(encoding="utf-8")
            # Script and bookkeeping commit together, or not at all.
            async with self.db.transaction() as tx:
                await Database.execute_script(tx, script)
                await self.registry.set_applied_schema(candidate.plugin_id, number, conn=tx)
            applied_schema = number

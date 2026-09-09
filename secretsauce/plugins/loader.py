import asyncio
import importlib.util
from pathlib import Path
import traceback
from typing import Any, Callable

from secretsauce.errors import ValidationError
from secretsauce.plugins.manifest import PluginManifest, validate_manifest
from secretsauce.plugins.registry import PluginRegistry


class PluginLoader:
    def __init__(
        self,
        registry: PluginRegistry,
        search_paths: list[Path | str] | None = None,
        context_factory: Callable[[str], Any] | None = None,
    ):
        self.registry = registry
        if search_paths is None:
            self.search_paths = [Path("/app/plugins"), Path("/data/plugins")]
        else:
            self.search_paths = [Path(p) for p in search_paths]
        self.context_factory = context_factory
        self.loaded_modules: dict[str, Any] = {}

    async def discover_and_sync(self) -> None:
        discovered: dict[str, tuple[Path, Path]] = {}

        for search_path in self.search_paths:
            if not search_path.is_dir():
                continue
            for entry in search_path.iterdir():
                if entry.name.startswith((".", "_")):
                    continue
                if entry.is_dir():
                    init_py = entry / "__init__.py"
                    if init_py.is_file() and entry.name not in discovered:
                        discovered[entry.name] = (init_py, entry)
                elif entry.is_file() and entry.suffix == ".py":
                    if entry.stem not in discovered:
                        discovered[entry.stem] = (entry, entry.parent)

        loaded_candidates: dict[str, dict[str, Any]] = {}

        for plugin_id, (module_path, plugin_dir) in discovered.items():
            try:
                module_name = f"secretsauce_plugins_{plugin_id.replace('-', '_')}"
                spec = importlib.util.spec_from_file_location(
                    module_name, module_path
                )
                if spec is None or spec.loader is None:
                    raise ImportError(f"Could not load spec for {module_path}")
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                raw_manifest = getattr(module, "PLUGIN", None)
                if raw_manifest is None:
                    raise ValidationError(
                        f"Plugin '{plugin_id}' has no PLUGIN dict"
                    )

                manifest = validate_manifest(
                    raw_manifest, expected_id=plugin_id
                )
                self.registry.register_manifest(manifest)
                self.loaded_modules[plugin_id] = module

                loaded_candidates[plugin_id] = {
                    "module": module,
                    "manifest": manifest,
                    "dir": plugin_dir,
                    "error": None,
                }
            except Exception:
                loaded_candidates[plugin_id] = {
                    "module": None,
                    "manifest": None,
                    "dir": plugin_dir,
                    "error": traceback.format_exc(),
                }

        # First record all discovered records in DB
        for plugin_id, data in loaded_candidates.items():
            if data["error"]:
                await self.registry.upsert_plugin_record(
                    plugin_id, "0.0.0", "errored", data["error"]
                )
            else:
                existing = await self.registry.get_plugin(plugin_id)
                if existing and not existing.get("enabled", 1):
                    await self.registry.upsert_plugin_record(
                        plugin_id, data["manifest"].version, "disabled"
                    )
                else:
                    await self.registry.upsert_plugin_record(
                        plugin_id, data["manifest"].version, "active"
                    )

        # Check dependencies & resolve states
        for plugin_id, data in loaded_candidates.items():
            if data["error"]:
                continue

            manifest = data["manifest"]
            existing = await self.registry.get_plugin(plugin_id)
            if existing and not existing.get("enabled", 1):
                continue

            blocked_reason = None
            for dep in manifest.requires:
                dep_id = dep.rstrip("?")
                is_optional = dep.endswith("?")
                if not is_optional:
                    dep_cand = loaded_candidates.get(dep_id)
                    dep_row = (
                        await self.registry.get_plugin(dep_id)
                        if dep_cand
                        else None
                    )
                    if not dep_cand or dep_cand["error"]:
                        blocked_reason = f"Missing required plugin: {dep_id}"
                        break
                    if dep_row and not dep_row.get("enabled", 1):
                        blocked_reason = f"Required plugin is disabled: {dep_id}"
                        break
                    if dep_row and dep_row.get("state") in (
                        "errored",
                        "blocked",
                    ):
                        blocked_reason = f"Required plugin is not active: {dep_id} ({dep_row.get('state')})"
                        break

            if blocked_reason:
                await self.registry.set_state(
                    plugin_id, "blocked", blocked_reason
                )
                continue

            # Run migrations if schema > applied_schema
            row = await self.registry.get_plugin(plugin_id)
            applied_schema = row.get("applied_schema", 0) if row else 0

            if manifest.schema > applied_schema:
                mig_dir = data["dir"] / "migrations"
                if mig_dir.is_dir():
                    mig_files = sorted(mig_dir.glob("*.sql"))
                    for mig_file in mig_files:
                        parts = mig_file.stem.split("_")
                        if parts[0].isdigit():
                            mig_num = int(parts[0])
                            if applied_schema < mig_num <= manifest.schema:
                                sql_script = mig_file.read_text(
                                    encoding="utf-8"
                                )
                                async with (
                                    self.registry.db.transaction()
                                ) as tx:
                                    await tx.executescript(sql_script)
                                await self.registry.set_applied_schema(
                                    plugin_id, mig_num
                                )
                                applied_schema = mig_num

            # Call setup(ctx) if available
            setup_fn = getattr(data["module"], "setup", None)
            if setup_fn and callable(setup_fn) and self.context_factory:
                ctx = self.context_factory(plugin_id)
                try:
                    if asyncio.iscoroutinefunction(setup_fn):
                        await setup_fn(ctx)
                    else:
                        setup_fn(ctx)
                except Exception:
                    await self.registry.set_state(
                        plugin_id, "errored", traceback.format_exc()
                    )
                    continue

            await self.registry.set_state(plugin_id, "active")

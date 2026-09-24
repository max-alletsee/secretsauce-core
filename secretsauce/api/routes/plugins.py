from dataclasses import dataclass
import hashlib
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request, Response

from secretsauce.errors import NotFoundError

router = APIRouter(prefix="/api/plugins", tags=["plugins"])

_BUNDLES = {"ui.js": "text/javascript", "ui.css": "text/css"}


@dataclass(frozen=True)
class _Bundle:
    mtime_ns: int
    content: bytes
    etag: str


_bundle_cache: dict[Path, _Bundle] = {}


def _read_bundle(path: Path) -> _Bundle | None:
    """Bundle bytes and ETag, re-read only when the file changes."""
    try:
        mtime_ns = path.stat().st_mtime_ns
    except FileNotFoundError:
        _bundle_cache.pop(path, None)
        return None
    cached = _bundle_cache.get(path)
    if cached is None or cached.mtime_ns != mtime_ns:
        content = path.read_bytes()
        cached = _Bundle(mtime_ns, content, f'"{hashlib.sha256(content).hexdigest()}"')
        _bundle_cache[path] = cached
    return cached


def _bundle_url(kernel: Any, plugin_id: str, name: str) -> str | None:
    plugin_dir = kernel.loader.plugin_dirs.get(plugin_id)
    bundle = _read_bundle(plugin_dir / name) if plugin_dir else None
    if bundle is None:
        return None
    base = kernel.config.base_path.rstrip("/")
    # The version changes with the content, so the URL can be cached immutably.
    return f"{base}/api/plugins/{plugin_id}/{name}?v={bundle.etag.strip(chr(34))[:16]}"


async def _require_plugin(kernel: Any, plugin_id: str) -> dict[str, Any]:
    plugin = await kernel.plugins.get_plugin(plugin_id)
    if plugin is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    return plugin


@router.get("")
async def list_plugins(request: Request):
    kernel = request.app.state.kernel
    plugins = await kernel.plugins.list_plugins()
    for p in plugins:
        p["commands"] = kernel.services.list_commands(p["id"])
    return plugins


@router.get("/active")
async def list_active_plugins(request: Request):
    kernel = request.app.state.kernel
    return [
        {
            **p,
            "ui_entry": _bundle_url(kernel, p["id"], "ui.js"),
            "ui_css": _bundle_url(kernel, p["id"], "ui.css"),
        }
        for p in await kernel.plugins.list_plugins()
        if p.get("state") == "active"
    ]


async def _serve_bundle(plugin_id: str, name: str, request: Request) -> Response:
    kernel = request.app.state.kernel
    if plugin_id not in kernel.loader.active:
        raise NotFoundError(f"Plugin '{plugin_id}' not active or not found")
    plugin_dir = kernel.loader.plugin_dirs.get(plugin_id)
    bundle = _read_bundle(plugin_dir / name) if plugin_dir else None
    if bundle is None:
        raise NotFoundError(f"Plugin '{plugin_id}' has no {name}")

    cache_control = (
        "public, max-age=31536000, immutable" if request.query_params.get("v") else "no-cache"
    )
    headers = {"ETag": bundle.etag, "Cache-Control": cache_control}
    if request.headers.get("if-none-match") == bundle.etag:
        return Response(status_code=304, headers=headers)
    return Response(content=bundle.content, media_type=_BUNDLES[name], headers=headers)


@router.get("/{plugin_id}/ui.js")
async def get_plugin_ui_js(plugin_id: str, request: Request):
    return await _serve_bundle(plugin_id, "ui.js", request)


@router.get("/{plugin_id}/ui.css")
async def get_plugin_ui_css(plugin_id: str, request: Request):
    return await _serve_bundle(plugin_id, "ui.css", request)


@router.get("/{plugin_id}")
async def get_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    plugin = await _require_plugin(kernel, plugin_id)
    plugin["commands"] = kernel.services.list_commands(plugin_id)
    return plugin


@router.post("/{plugin_id}/enable")
async def enable_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    await _require_plugin(kernel, plugin_id)
    await kernel.loader.enable(plugin_id)
    return await kernel.plugins.get_plugin(plugin_id)


@router.post("/{plugin_id}/disable")
async def disable_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    await _require_plugin(kernel, plugin_id)
    await kernel.loader.disable(plugin_id)
    return await kernel.plugins.get_plugin(plugin_id)


@router.get("/{plugin_id}/config")
async def get_plugin_config(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    await _require_plugin(kernel, plugin_id)
    return await kernel.plugins.masked_config(plugin_id)


@router.put("/{plugin_id}/config")
async def set_plugin_config(plugin_id: str, payload: dict[str, Any], request: Request):
    """Replaces the config; secrets are stored encrypted and echoed back masked."""
    kernel = request.app.state.kernel
    await _require_plugin(kernel, plugin_id)
    return await kernel.plugins.update_config(plugin_id, payload)


@router.post("/{plugin_id}/commands/{command_id}", status_code=202)
async def run_plugin_command(plugin_id: str, command_id: str, request: Request):
    """Runs a registered command as a job of type command:<id> (spec 6.8)."""
    kernel = request.app.state.kernel
    if kernel.active_ctx(plugin_id) is None or not kernel.services.get_command(plugin_id, command_id):
        raise NotFoundError(f"Command '{command_id}' of plugin '{plugin_id}' not found")
    job_id = await kernel.jobs.create_job(plugin_id, f"command:{command_id}")
    return {"job_id": job_id}

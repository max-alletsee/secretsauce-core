import hashlib
from typing import Any
from fastapi import APIRouter, Request, Response

from secretsauce.errors import NotFoundError

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


@router.get("")
async def list_plugins(request: Request):
    kernel = request.app.state.kernel
    return await kernel.plugins.list_plugins()


@router.get("/active")
async def list_active_plugins(request: Request):
    kernel = request.app.state.kernel
    plugins = await kernel.plugins.list_plugins()
    active = []
    plugin_dirs = getattr(kernel.loader, "plugin_dirs", {})
    for p in plugins:
        if p.get("state") == "active":
            plugin_id = p["id"]
            p_dir = plugin_dirs.get(plugin_id)
            has_ui = False
            has_css = False
            if p_dir and p_dir.is_dir():
                has_ui = (p_dir / "ui.js").is_file()
                has_css = (p_dir / "ui.css").is_file()
            manifest = kernel.plugins.get_manifest(plugin_id)
            active.append({
                **p,
                "name": manifest.name if manifest else p.get("name", plugin_id),
                "description": manifest.description if manifest else p.get("description", ""),
                "ui_entry": f"/api/plugins/{plugin_id}/ui.js" if has_ui else None,
                "ui_css": f"/api/plugins/{plugin_id}/ui.css" if has_css else None,
            })
    return active


@router.get("/{plugin_id}/ui.js")
async def get_plugin_ui_js(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None or p.get("state") != "active":
        raise NotFoundError(f"Plugin '{plugin_id}' not active or not found")

    p_dir = getattr(kernel.loader, "plugin_dirs", {}).get(plugin_id)
    if not p_dir:
        raise NotFoundError(f"Plugin '{plugin_id}' directory not found")

    ui_file = p_dir / "ui.js"
    if not ui_file.is_file():
        raise NotFoundError(f"Plugin '{plugin_id}' has no UI bundle")

    content = ui_file.read_bytes()
    etag = f'"{hashlib.sha256(content).hexdigest()}"'
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == etag:
        return Response(status_code=304, headers={"ETag": etag})

    is_versioned = bool(request.query_params.get("v"))
    cache_control = (
        "public, max-age=31536000, immutable"
        if is_versioned
        else "no-cache"
    )
    return Response(
        content=content,
        media_type="text/javascript",
        headers={"ETag": etag, "Cache-Control": cache_control},
    )


@router.get("/{plugin_id}/ui.css")
async def get_plugin_ui_css(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None or p.get("state") != "active":
        raise NotFoundError(f"Plugin '{plugin_id}' not active or not found")

    p_dir = getattr(kernel.loader, "plugin_dirs", {}).get(plugin_id)
    if not p_dir:
        raise NotFoundError(f"Plugin '{plugin_id}' directory not found")

    css_file = p_dir / "ui.css"
    if not css_file.is_file():
        raise NotFoundError(f"Plugin '{plugin_id}' has no UI stylesheet")

    content = css_file.read_bytes()
    etag = f'"{hashlib.sha256(content).hexdigest()}"'
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == etag:
        return Response(status_code=304, headers={"ETag": etag})

    is_versioned = bool(request.query_params.get("v"))
    cache_control = (
        "public, max-age=31536000, immutable"
        if is_versioned
        else "no-cache"
    )
    return Response(
        content=content,
        media_type="text/css",
        headers={"ETag": etag, "Cache-Control": cache_control},
    )


@router.get("/{plugin_id}")
async def get_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    return p


@router.post("/{plugin_id}/enable")
async def enable_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    await kernel.plugins.set_enabled(plugin_id, True)
    await kernel.plugins.set_state(plugin_id, "active")
    return await kernel.plugins.get_plugin(plugin_id)


@router.post("/{plugin_id}/disable")
async def disable_plugin(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    await kernel.plugins.set_enabled(plugin_id, False)
    await kernel.plugins.set_state(plugin_id, "disabled")
    return await kernel.plugins.get_plugin(plugin_id)


@router.get("/{plugin_id}/config")
async def get_plugin_config(plugin_id: str, request: Request):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    return p.get("config") or {}


@router.put("/{plugin_id}/config")
async def set_plugin_config(
    plugin_id: str, payload: dict[str, Any], request: Request
):
    kernel = request.app.state.kernel
    p = await kernel.plugins.get_plugin(plugin_id)
    if p is None:
        raise NotFoundError(f"Plugin '{plugin_id}' not found")
    await kernel.plugins.set_config(plugin_id, payload)
    return payload

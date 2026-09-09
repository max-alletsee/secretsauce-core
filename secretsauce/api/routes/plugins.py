from typing import Any
from fastapi import APIRouter, Request

from secretsauce.errors import NotFoundError

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


@router.get("")
async def list_plugins(request: Request):
    kernel = request.app.state.kernel
    return await kernel.plugins.list_plugins()


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

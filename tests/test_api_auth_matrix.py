"""Discover protected kernel AND mounted plugin routes after real activation.

Break caught: any new route bypassing auth or validating its body before auth.
"""
import re

from fastapi.routing import APIRoute
import pytest

from secretsauce.auth import _PUBLIC, SESSION_COOKIE
from test_ui_household_runtime import runtime


def route_cases(routes, prefix=""):
    for route in routes:
        original = getattr(route, "original_router", None)
        if original is not None:
            context = getattr(route, "include_context", None)
            yield from route_cases(original.routes, prefix + getattr(context, "prefix", ""))
        elif isinstance(route, APIRoute):
            path = prefix + route.path
            if path.startswith("/api/"):
                for method in sorted(route.methods):
                    yield method, path
        elif getattr(route, "routes", None) is not None:
            yield from route_cases(route.routes, prefix + getattr(route, "path", ""))


def concrete(path):
    return re.sub(r"\{[^}]+\}", "safe-id", path)


@pytest.mark.parametrize("credential", ["missing", "wrong-type", "revoked"])
async def test_every_discovered_api_route_requires_its_credential(tmp_path, credential):
    async with runtime(tmp_path) as (app, client):
        cases = sorted(set(route_cases(app.routes)))
        assert any(path.startswith("/api/x/") for _, path in cases), "Plugin routes escaped discovery"
        assert ("PATCH", "/api/household") in cases
        cookie = client.cookies.get(SESSION_COOKIE)
        assert (await client.post("/api/auth/logout")).status_code == 200
        client.cookies.clear()
        headers = {}
        if credential == "wrong-type":
            headers["Authorization"] = "Basic not-a-session"
        elif credential == "revoked":
            headers["Cookie"] = f"{SESSION_COOKIE}={cookie}"
        for method, path in cases:
            if (method, path) in _PUBLIC or path == "/api/health":
                continue
            response = await client.request(method, concrete(path), headers=headers, json={})
            case = f"{credential}: {method} {path}: {response.text}"
            if (method, path) == ("POST", "/api/setup"):
                assert response.status_code == 409, case
                assert response.json()["error"]["code"] == "conflict", case
            else:
                assert response.status_code == 401, case
                assert response.json()["error"]["code"] == "unauthorized", case
        assert (await client.get("/api/health")).status_code == 200
        assert (await client.get("/api/setup")).json()["needs_setup"] is False
        # Public login processes invalid bodies instead of returning an auth denial.
        assert (await client.post("/api/auth/login", json={})).status_code == 422

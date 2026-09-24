from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import Any, AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from secretsauce.api.routes.assets import router as assets_router
from secretsauce.api.routes.attributes import router as attributes_router
from secretsauce.api.routes.auth import router as auth_router
from secretsauce.api.routes.export import router as export_router
from secretsauce.api.routes.household import router as household_router
from secretsauce.api.routes.jobs import router as jobs_router
from secretsauce.api.routes.journal import router as journal_router
from secretsauce.api.routes.members import router as members_router
from secretsauce.api.routes.plugins import router as plugins_router
from secretsauce.api.routes.pwa import render_index_html, router as pwa_router
from secretsauce.api.routes.recipes import router as recipes_router
from secretsauce.api.routes.schedule import router as schedule_router
from secretsauce.api.routes.setup import router as setup_router
from secretsauce.auth import AuthMiddleware
from secretsauce.boot import BootedKernel, boot
from secretsauce.config import Config
from secretsauce.errors import (
    SecretSauceError,
    TooManyRequestsError,
    code_for_status,
    error_body,
)
from secretsauce.plugins.context import plugin_id_for_path
from secretsauce.stream import router as stream_router

logger = logging.getLogger(__name__)

_NOT_SPA = ("api/", "static/", "assets/")


def _field_errors(exc: RequestValidationError) -> dict[str, str]:
    fields: dict[str, str] = {}
    for err in exc.errors():
        loc = [str(part) for part in err.get("loc", ()) if part not in ("body", "query", "path")]
        fields[".".join(loc) or "body"] = err.get("msg", "Invalid value")
    return fields


def unhandled_error_response(path: str, exc: Exception) -> JSONResponse:
    """500 in the standard envelope; plugin route failures name the plugin (spec 6.9)."""
    plugin_id = plugin_id_for_path(path)
    if plugin_id is not None:
        logging.getLogger(f"secretsauce.plugin.{plugin_id}").error(
            "Unhandled error in %s", path, exc_info=exc
        )
        return JSONResponse(
            status_code=500,
            content=error_body("plugin_error", str(exc) or type(exc).__name__, {"plugin_id": plugin_id}),
        )
    logger.error("Unhandled error in %s", path, exc_info=exc)
    return JSONResponse(status_code=500, content=error_body("internal_error", "Internal server error"))


class UnhandledErrorMiddleware:
    """Turns uncaught exceptions into an enveloped 500 instead of a bare text error."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            if started:
                raise
            await unhandled_error_response(scope.get("path", ""), exc)(scope, receive, send)


def configure_app(app: FastAPI) -> None:
    """Middleware, routers, SPA fallback and error handlers shared by every app instance."""
    # Innermost first: errors are enveloped before the auth middleware sees them.
    app.add_middleware(UnhandledErrorMiddleware)
    app.add_middleware(AuthMiddleware)

    for router in (
        setup_router,
        auth_router,
        household_router,
        members_router,
        recipes_router,
        schedule_router,
        journal_router,
        assets_router,
        attributes_router,
        plugins_router,
        jobs_router,
        stream_router,
        export_router,
        pwa_router,
    ):
        app.include_router(router)

    @app.get("/", response_class=HTMLResponse)
    @app.get("/{full_path:path}", response_class=HTMLResponse)
    async def spa_fallback(request: Request, full_path: str = ""):
        if full_path == "api" or full_path.startswith(_NOT_SPA):
            raise StarletteHTTPException(status_code=404, detail="Route not found")
        kernel = getattr(request.app.state, "kernel", None)
        base_path = kernel.config.base_path if kernel else "/"
        html = render_index_html(kernel, base_path)
        return HTMLResponse(content=html, headers={"Cache-Control": "no-cache"})

    @app.exception_handler(SecretSauceError)
    async def handle_secretsauce_error(request: Request, exc: SecretSauceError):
        headers = None
        if isinstance(exc, TooManyRequestsError) and exc.retry_after is not None:
            headers = {"Retry-After": str(exc.retry_after)}
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict(), headers=headers)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        detail: Any = exc.detail
        if isinstance(detail, dict) and "error" in detail:
            content = detail
        else:
            content = error_body(code_for_status(exc.status_code), str(detail))
        return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=error_body("validation", "Invalid request", {"fields": _field_errors(exc)}),
        )


def attach_kernel(app: FastAPI, kernel: BootedKernel) -> None:
    app.state.kernel = kernel
    kernel.router_registry.set_app(app)


def build_app(
    data_dir: Path | str | None = None,
    *,
    config: Config | None = None,
    start_services: bool = True,
) -> FastAPI:
    """Builds the FastAPI application; the kernel boots in the lifespan."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        kernel = await boot(data_dir, config=config)
        attach_kernel(app, kernel)
        if start_services:
            kernel.start_services()
        try:
            yield
        finally:
            await kernel.shutdown()

    app = FastAPI(title="SecretSauce Kernel", lifespan=lifespan)
    configure_app(app)
    return app

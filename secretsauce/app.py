import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from secretsauce.api.routes.assets import router as assets_router
from secretsauce.api.routes.attributes import router as attributes_router
from secretsauce.api.routes.auth import router as auth_router
from secretsauce.api.routes.export import router as export_router
from secretsauce.api.routes.household import router as household_router
from secretsauce.api.routes.jobs import router as jobs_router
from secretsauce.api.routes.journal import router as journal_router
from secretsauce.api.routes.members import router as members_router
from secretsauce.api.routes.plugins import router as plugins_router
from secretsauce.api.routes.recipes import router as recipes_router
from secretsauce.api.routes.schedule import router as schedule_router
from secretsauce.api.routes.setup import router as setup_router
from secretsauce.auth import AuthMiddleware
from secretsauce.boot import BootedKernel, boot
from secretsauce.errors import SecretSauceError
from secretsauce.gc import periodic_gc_worker
from secretsauce.stream import router as stream_router


def build_app(data_dir: Path | str | None = None) -> FastAPI:
    """Builds and configures the FastAPI application instance."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        kernel: BootedKernel = await boot(data_dir)
        app.state.kernel = kernel

        gc_task = asyncio.create_task(
            periodic_gc_worker(kernel.db, kernel.data_dir, interval=3600.0)
        )

        yield

        gc_task.cancel()
        try:
            await gc_task
        except asyncio.CancelledError:
            pass

        await kernel.db.close()

    app = FastAPI(title="SecretSauce Kernel", lifespan=lifespan)

    # Mount middleware
    app.add_middleware(AuthMiddleware)

    # Mount routers
    app.include_router(setup_router)
    app.include_router(auth_router)
    app.include_router(household_router)
    app.include_router(members_router)
    app.include_router(recipes_router)
    app.include_router(schedule_router)
    app.include_router(journal_router)
    app.include_router(assets_router)
    app.include_router(attributes_router)
    app.include_router(plugins_router)
    app.include_router(jobs_router)
    app.include_router(stream_router)
    app.include_router(export_router)

    # Exception handler
    @app.exception_handler(SecretSauceError)
    async def handle_secretsauce_error(request, exc: SecretSauceError):
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    return app

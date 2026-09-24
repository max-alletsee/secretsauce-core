"""Test harness: boots the real kernel (same wiring as production) against a temp directory."""

from functools import cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI
import httpx

from secretsauce.app import attach_kernel, configure_app
from secretsauce.auth import hash_passphrase, make_session_token
from secretsauce.boot import BootedKernel, boot
from secretsauce.config import Config
from secretsauce.events import Event

TEST_PASSPHRASE = "test_passphrase"


@cache
def _test_passphrase_hash() -> str:
    # scrypt at production cost takes ~0.5 s; hash once per test process.
    return hash_passphrase(TEST_PASSPHRASE)


class Kernel:
    """A booted kernel plus an HTTP client; attribute access falls through to the kernel.

    Background services (event pump, job runner, GC) stay off unless
    services=True, so tests decide when delivery happens via drain_events().
    """

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.plugins_dir = data_dir / "plugins"
        self.app = FastAPI(title="SecretSauce Kernel Test")
        configure_app(self.app)
        self.client: httpx.AsyncClient | None = None
        self._kernel: BootedKernel | None = None
        self._last_drained_seq = 0

    def __getattr__(self, name: str) -> Any:
        kernel = self.__dict__.get("_kernel")
        if kernel is None:
            raise AttributeError(name)
        return getattr(kernel, name)

    @property
    def kernel(self) -> BootedKernel:
        assert self._kernel is not None, "kernel not started"
        return self._kernel

    async def start(
        self,
        plugins: list[Any] | None = None,
        auto_setup: bool = True,
        services: bool = False,
        config: Config | None = None,
    ) -> None:
        self._kernel = await boot(
            self.data_dir, config=config or Config(base_path="/", cookie_secure="false")
        )
        attach_kernel(self.app, self._kernel)
        if services:
            self._kernel.start_services()

        version = None
        if auto_setup:
            async with self._kernel.db.transaction():
                await self._kernel.household.update_config(
                    {
                        "household_name": "Test Household",
                        "meal_types": [{"id": "dinner", "label": "Dinner"}],
                        "languages": {"primary": "en"},
                        "units": "metric",
                    }
                )
                version = await self._kernel.household.set_passphrase(_test_passphrase_hash())
                await self._kernel.members.create_member(
                    {"name": "Admin", "avatar_color": "#0088cc"}
                )

        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=self.app), base_url="http://testserver"
        )
        if version is not None:
            self.client.cookies.set(
                "ss_session", make_session_token(self._kernel.key_manager, version)
            )

    async def stop(self) -> None:
        if self.client:
            await self.client.aclose()
            self.client = None
        if self._kernel is not None:
            await self._kernel.shutdown()
            self._kernel = None


class KernelContextManager:
    def __init__(self, kernel: Kernel, **start_kwargs: Any):
        self._kernel = kernel
        self._start_kwargs = start_kwargs

    async def _start(self) -> Kernel:
        try:
            await self._kernel.start(**self._start_kwargs)
            return self._kernel
        except BaseException:
            await self._kernel.stop()
            raise

    def __await__(self):
        return self._start().__await__()

    async def __aenter__(self) -> Kernel:
        return await self._start()

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self._kernel.stop()


def make_kernel(
    tmp_path: Path | str,
    plugins: list[Any] | None = None,
    auto_setup: bool = True,
    services: bool = False,
    config: Config | None = None,
) -> KernelContextManager:
    return KernelContextManager(
        Kernel(Path(tmp_path)),
        plugins=plugins,
        auto_setup=auto_setup,
        services=services,
        config=config,
    )


async def drain_events(kernel: Kernel) -> list[Event]:
    """Delivers pending events to every plugin, then returns events logged since the last call."""
    await kernel.kernel.drain_events()
    events = await kernel.events.get_events_after(kernel._last_drained_seq, limit=1000)
    if events:
        kernel._last_drained_seq = max(e.seq for e in events)
    return events

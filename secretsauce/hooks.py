from dataclasses import dataclass
import inspect
from typing import Any, Awaitable, Callable

from secretsauce.errors import VetoError

HookCallback = Callable[..., Awaitable[Any]]


@dataclass(frozen=True)
class HookEntry:
    hook_name: str
    plugin_id: str
    callback: HookCallback


def _normalize_hook_name(name: str) -> str:
    # Normalize "before:recipe:create" -> "recipe:create"
    if name.startswith("before:"):
        return name[len("before:") :]
    return name


class HookRegistry:
    def __init__(self) -> None:
        self._hooks: list[HookEntry] = []

    def register(
        self, hook_name: str, plugin_id: str, callback: HookCallback
    ) -> None:
        norm = _normalize_hook_name(hook_name)
        self._hooks.append(
            HookEntry(hook_name=norm, plugin_id=plugin_id, callback=callback)
        )

    def unregister_plugin(self, plugin_id: str) -> None:
        self._hooks = [h for h in self._hooks if h.plugin_id != plugin_id]

    async def run_before(
        self,
        hook_name: str,
        draft: Any,
        current: Any = None,
        ctx: Any = None,
    ) -> Any:
        norm = _normalize_hook_name(hook_name)
        active_draft = draft

        for entry in self._hooks:
            if entry.hook_name != norm:
                continue

            try:
                sig = inspect.signature(entry.callback)
                num_params = len(sig.parameters)
                if num_params == 1:
                    res = await entry.callback(active_draft)
                else:
                    res = await entry.callback(active_draft, current, ctx)

                if res is not None:
                    active_draft = res
            except VetoError:
                raise
            except Exception as e:
                raise VetoError(
                    f"Hook '{entry.hook_name}' failed in plugin '{entry.plugin_id}': {e}",
                    plugin_id=entry.plugin_id,
                ) from e

        return active_draft

from typing import Any, Awaitable, Callable, TypeVar

import aiosqlite

from secretsauce.db import Database
from secretsauce.errors import ValidationError
from secretsauce.events import EventLog

T = TypeVar("T")


def require_fields(data: dict[str, Any], *names: str) -> None:
    """Raises ValidationError naming every required field that is missing or blank."""
    missing = {
        name: "This field is required"
        for name in names
        if data.get(name) is None or (isinstance(data.get(name), str) and not data[name].strip())
    }
    if missing:
        raise ValidationError("Missing required fields", fields=missing)


def to_float(value: Any, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValidationError(
            f"'{field_name}' must be a number", fields={field_name: "Must be a number"}
        )


def to_int(value: Any, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError(
            f"'{field_name}' must be an integer", fields={field_name: "Must be an integer"}
        )


def optional_float(value: Any, field_name: str) -> float | None:
    return None if value is None else to_float(value, field_name)


def merged_value(data: dict[str, Any], current: dict[str, Any], key: str, default: Any = None) -> Any:
    """Patch semantics: a key present in data (even as None) wins over the stored value."""
    return data[key] if key in data else current.get(key, default)


async def in_transaction(
    db: Database,
    conn: aiosqlite.Connection | None,
    fn: Callable[[aiosqlite.Connection], Awaitable[T]],
) -> T:
    """Runs fn on the caller's connection, or in a fresh writer transaction."""
    if conn is not None:
        return await fn(conn)
    async with db.transaction() as writer_conn:
        return await fn(writer_conn)


def snapshot(row: dict[str, Any] | None) -> dict[str, Any] | None:
    """Event snapshot of a noun row without embedded joins such as 'recipe'."""
    if row is None:
        return None
    return {k: v for k, v in row.items() if k not in ("recipe", "languages")}


async def emit_noun_event(
    events: EventLog | None,
    conn: aiosqlite.Connection,
    name: str,
    entity_type: str,
    entity_id: str,
    *,
    revision: int | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    actor_member_id: str | None = None,
    origin: str | None = None,
) -> None:
    """Appends a kernel noun event inside the mutation's own transaction."""
    if events is None:
        return
    data: dict[str, Any] = {}
    if before is not None:
        data["before"] = snapshot(before)
    if after is not None:
        data["after"] = snapshot(after)
    await events.append(
        conn,
        name=name,
        data=data,
        entity_type=entity_type,
        entity_id=entity_id,
        revision=revision,
        actor_member_id=actor_member_id,
        origin=origin,
    )

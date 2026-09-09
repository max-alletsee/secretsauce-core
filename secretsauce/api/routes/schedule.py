from datetime import date
from typing import Any
from fastapi import APIRouter, Query, Request, Response

from secretsauce.errors import ValidationError

router = APIRouter(prefix="/api/schedule", tags=["schedule"])


@router.get("")
async def list_schedule(
    request: Request,
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    lang: str | None = None,
    attr: list[str] | None = Query(default=None),
    sort: str = "date,position",
):
    try:
        d_from = date.fromisoformat(from_date)
        d_to = date.fromisoformat(to_date)
    except ValueError:
        raise ValidationError("Invalid date format, expected YYYY-MM-DD")

    delta = (d_to - d_from).days
    if delta < 0:
        raise ValidationError("'from' date must be before or equal to 'to' date")
    if delta > 62:
        raise ValidationError("Date range cannot exceed 62 days")

    kernel = request.app.state.kernel
    return await kernel.schedule.list_entries(
        from_date=from_date,
        to_date=to_date,
        lang=lang,
        sort=sort,
    )


@router.post("", status_code=201)
async def create_schedule_entry(payload: dict[str, Any], request: Request):
    kernel = request.app.state.kernel
    data = dict(payload)
    actor_id = getattr(request.state, "actor_member_id", None)
    if actor_id and "actor_member_id" not in data:
        data["actor_member_id"] = actor_id
    return await kernel.schedule.create_entry(data)


@router.get("/{entry_id}")
async def get_schedule_entry(
    entry_id: str,
    request: Request,
    lang: str | None = None,
):
    kernel = request.app.state.kernel
    return await kernel.schedule.get_entry(entry_id, lang=lang)


@router.patch("/{entry_id}")
async def patch_schedule_entry(
    entry_id: str,
    payload: dict[str, Any],
    request: Request,
):
    kernel = request.app.state.kernel
    if "revision" not in payload:
        raise ValidationError("Field 'revision' is required for patch")

    data = dict(payload)
    revision = int(data.pop("revision"))
    return await kernel.schedule.update_entry(
        entry_id=entry_id,
        revision=revision,
        data=data,
    )


@router.delete("/{entry_id}", status_code=204)
async def delete_schedule_entry(
    entry_id: str,
    request: Request,
    revision: int = Query(...),
):
    kernel = request.app.state.kernel
    await kernel.schedule.delete_entry(entry_id=entry_id, revision=revision)
    return Response(status_code=204)

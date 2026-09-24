from datetime import date

from fastapi import APIRouter, Query, Request, Response

from secretsauce.api.models import ScheduleCreate, SchedulePatch
from secretsauce.errors import ValidationError

router = APIRouter(prefix="/api/schedule", tags=["schedule"])

MAX_RANGE_DAYS = 62


def parse_range(from_date: str, to_date: str, max_days: int | None = None) -> None:
    try:
        d_from = date.fromisoformat(from_date)
        d_to = date.fromisoformat(to_date)
    except ValueError:
        raise ValidationError("Invalid date format, expected YYYY-MM-DD")
    delta = (d_to - d_from).days
    if delta < 0:
        raise ValidationError("'from' date must be before or equal to 'to' date")
    if max_days is not None and delta > max_days:
        raise ValidationError(f"Date range cannot exceed {max_days} days")


@router.get("")
async def list_schedule(
    request: Request,
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    lang: str | None = None,
    sort: str = "date,position",
):
    parse_range(from_date, to_date, MAX_RANGE_DAYS)
    return await request.app.state.kernel.schedule.list_entries(
        from_date=from_date, to_date=to_date, lang=lang, sort=sort
    )


@router.post("", status_code=201)
async def create_schedule_entry(payload: ScheduleCreate, request: Request):
    return await request.app.state.kernel.schedule.create_entry(payload.data(request))


@router.get("/{entry_id}")
async def get_schedule_entry(entry_id: str, request: Request, lang: str | None = None):
    return await request.app.state.kernel.schedule.get_entry(entry_id, lang=lang)


@router.patch("/{entry_id}")
async def patch_schedule_entry(entry_id: str, payload: SchedulePatch, request: Request):
    return await request.app.state.kernel.schedule.update_entry(
        entry_id=entry_id, revision=payload.revision, data=payload.data(request)
    )


@router.delete("/{entry_id}", status_code=204)
async def delete_schedule_entry(entry_id: str, request: Request, revision: int = Query(...)):
    await request.app.state.kernel.schedule.delete_entry(entry_id=entry_id, revision=revision)
    return Response(status_code=204)

from datetime import date, timedelta

from fastapi import APIRouter, Query, Request, Response

from secretsauce.api.models import JournalCreate, JournalPatch
from secretsauce.api.routes.schedule import parse_range

router = APIRouter(prefix="/api/journal", tags=["journal"])


@router.get("")
async def list_journal(
    request: Request,
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    lang: str | None = None,
    sort: str = "date",
):
    to_date = to_date or date.today().isoformat()
    from_date = from_date or (date.today() - timedelta(days=30)).isoformat()
    parse_range(from_date, to_date)
    return await request.app.state.kernel.journal.list_entries(
        from_date=from_date, to_date=to_date, lang=lang, sort=sort
    )


@router.post("", status_code=201)
async def create_journal_entry(payload: JournalCreate, request: Request):
    return await request.app.state.kernel.journal.create_entry(payload.data(request))


@router.get("/{entry_id}")
async def get_journal_entry(entry_id: str, request: Request, lang: str | None = None):
    return await request.app.state.kernel.journal.get_entry(entry_id, lang=lang)


@router.patch("/{entry_id}")
async def patch_journal_entry(entry_id: str, payload: JournalPatch, request: Request):
    return await request.app.state.kernel.journal.update_entry(
        entry_id=entry_id, revision=payload.revision, data=payload.data(request)
    )


@router.delete("/{entry_id}", status_code=204)
async def delete_journal_entry(entry_id: str, request: Request, revision: int = Query(...)):
    await request.app.state.kernel.journal.delete_entry(entry_id=entry_id, revision=revision)
    return Response(status_code=204)

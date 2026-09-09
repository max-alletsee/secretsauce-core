from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(
    request: Request,
    status: str | None = None,
    plugin_id: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    kernel = request.app.state.kernel
    return await kernel.jobs.list_jobs(
        status=status, plugin_id=plugin_id, limit=limit, offset=offset
    )


@router.get("/{job_id}")
async def get_job(job_id: str, request: Request):
    kernel = request.app.state.kernel
    return await kernel.jobs.get_job(job_id)


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: str, request: Request):
    kernel = request.app.state.kernel
    await kernel.jobs.cancel_job(job_id)
    return await kernel.jobs.get_job(job_id)

from fastapi import APIRouter, File, Form, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.post("", status_code=201)
async def upload_asset(
    request: Request,
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    slot: str = Form(default="primary"),
    sub_id: str | None = Form(default=None),
):
    kernel = request.app.state.kernel
    data = await file.read()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "file"

    return await kernel.assets.save_asset(
        entity_type=entity_type,
        entity_id=entity_id,
        filename=filename,
        content_type=content_type,
        data=data,
        slot=slot,
        sub_id=sub_id,
    )


@router.get("")
async def list_assets(
    request: Request,
    entity_type: str = Query(...),
    entity_id: str = Query(...),
):
    kernel = request.app.state.kernel
    return await kernel.assets.list_assets(
        entity_type=entity_type, entity_id=entity_id
    )


@router.get("/{asset_id}")
async def get_asset_metadata(asset_id: str, request: Request):
    kernel = request.app.state.kernel
    return await kernel.assets.get_asset(asset_id)


@router.get("/{asset_id}/file")
async def get_asset_file(asset_id: str, request: Request):
    kernel = request.app.state.kernel
    asset = await kernel.assets.get_asset(asset_id)
    file_path = await kernel.assets.get_asset_file_path(asset_id)
    return FileResponse(
        path=str(file_path),
        media_type=asset["content_type"],
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, request: Request):
    kernel = request.app.state.kernel
    await kernel.assets.delete_asset(asset_id)
    return Response(status_code=204)

from urllib.parse import quote

from fastapi import APIRouter, File, Form, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse

from secretsauce.errors import PayloadTooLargeError
from secretsauce.nouns import assets as assets_module

router = APIRouter(prefix="/api/assets", tags=["assets"])

_CHUNK_SIZE = 64 * 1024


async def _read_limited(file: UploadFile) -> bytes:
    """Reads the upload in chunks, refusing it as soon as it passes the size limit."""
    limit = assets_module.MAX_ASSET_SIZE_BYTES
    chunks: list[bytes] = []
    size = 0
    while chunk := await file.read(_CHUNK_SIZE):
        size += len(chunk)
        if size > limit:
            raise PayloadTooLargeError(f"Asset exceeds maximum of {limit} bytes")
        chunks.append(chunk)
    return b"".join(chunks)


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
    data = await _read_limited(file)
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
        actor_member_id=getattr(request.state, "actor_member_id", None),
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
    file_path = kernel.assets.path_for(asset)
    disposition = (
        "inline" if asset["content_type"] in assets_module.INLINE_CONTENT_TYPES else "attachment"
    )
    return FileResponse(
        path=str(file_path),
        media_type=asset["content_type"],
        headers={
            "Cache-Control": "private, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": f"{disposition}; filename*=UTF-8''{quote(asset['filename'])}",
        },
    )


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: str, request: Request):
    kernel = request.app.state.kernel
    await kernel.assets.delete_asset(
        asset_id, actor_member_id=getattr(request.state, "actor_member_id", None)
    )
    return Response(status_code=204)

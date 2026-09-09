from typing import Any
from fastapi import APIRouter, Query, Request, Response

from secretsauce.errors import ValidationError

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("")
async def list_members(
    request: Request,
    sort: str = Query(default="name"),
):
    kernel = request.app.state.kernel
    return await kernel.members.list_members(sort=sort)


@router.post("", status_code=201)
async def create_member(
    payload: dict[str, Any],
    request: Request,
):
    kernel = request.app.state.kernel
    return await kernel.members.create_member(payload)


@router.get("/{member_id}")
async def get_member(
    member_id: str,
    request: Request,
):
    kernel = request.app.state.kernel
    return await kernel.members.get_member(member_id)


@router.patch("/{member_id}")
async def patch_member(
    member_id: str,
    payload: dict[str, Any],
    request: Request,
):
    kernel = request.app.state.kernel
    if "revision" not in payload:
        raise ValidationError("Field 'revision' is required for patch")

    patch_data = dict(payload)
    revision = int(patch_data.pop("revision"))

    return await kernel.members.update_member(
        member_id=member_id,
        revision=revision,
        data=patch_data,
    )


@router.delete("/{member_id}", status_code=204)
async def delete_member(
    member_id: str,
    revision: int = Query(...),
    request: Request = None,
):
    kernel = request.app.state.kernel
    await kernel.members.delete_member(
        member_id=member_id,
        revision=revision,
    )
    return Response(status_code=204)

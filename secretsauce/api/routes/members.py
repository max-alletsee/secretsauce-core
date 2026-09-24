from fastapi import APIRouter, Query, Request, Response

from secretsauce.api.models import MemberCreate, MemberPatch

router = APIRouter(prefix="/api/members", tags=["members"])


@router.get("")
async def list_members(request: Request, sort: str = Query(default="name")):
    return await request.app.state.kernel.members.list_members(sort=sort)


@router.post("", status_code=201)
async def create_member(payload: MemberCreate, request: Request):
    return await request.app.state.kernel.members.create_member(payload.data(request))


@router.get("/{member_id}")
async def get_member(member_id: str, request: Request):
    return await request.app.state.kernel.members.get_member(member_id)


@router.patch("/{member_id}")
async def patch_member(member_id: str, payload: MemberPatch, request: Request):
    return await request.app.state.kernel.members.update_member(
        member_id=member_id, revision=payload.revision, data=payload.data(request)
    )


@router.delete("/{member_id}", status_code=204)
async def delete_member(member_id: str, request: Request, revision: int = Query(...)):
    await request.app.state.kernel.members.delete_member(member_id=member_id, revision=revision)
    return Response(status_code=204)

from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/attributes", tags=["attributes"])


@router.get("")
async def get_attributes(
    request: Request,
    entity_type: str = Query(...),
    entity_id: str = Query(...),
):
    kernel = request.app.state.kernel
    return await kernel.attributes.get_attributes(
        entity_type=entity_type,
        entity_id=entity_id,
    )

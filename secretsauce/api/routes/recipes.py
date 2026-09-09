from typing import Any
from fastapi import APIRouter, Query, Request, Response

from secretsauce.errors import ValidationError

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("")
async def list_recipes(
    request: Request,
    lang: str | None = None,
    q: str | None = None,
    tag: list[str] | None = Query(default=None),
    attr: list[str] | None = Query(default=None),
    sort: str = "title",
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    kernel = request.app.state.kernel
    return await kernel.recipes.list_recipes(
        lang=lang,
        q=q,
        tags=tag,
        attrs=attr,
        sort=sort,
        limit=limit,
        offset=offset,
    )


@router.post("", status_code=201)
async def create_recipe(payload: dict[str, Any], request: Request):
    kernel = request.app.state.kernel
    data = dict(payload)
    actor_id = getattr(request.state, "actor_member_id", None)
    if actor_id and "actor_member_id" not in data:
        data["actor_member_id"] = actor_id
    return await kernel.recipes.create_recipe(data)


@router.get("/{identifier}")
async def get_recipe(
    identifier: str,
    request: Request,
    lang: str | None = None,
):
    kernel = request.app.state.kernel
    return await kernel.recipes.get_recipe(identifier, lang=lang)


@router.patch("/{recipe_id}")
async def patch_recipe(
    recipe_id: str,
    payload: dict[str, Any],
    request: Request,
):
    kernel = request.app.state.kernel
    if "revision" not in payload:
        raise ValidationError("Field 'revision' is required for patch")

    data = dict(payload)
    revision = int(data.pop("revision"))
    actor_id = getattr(request.state, "actor_member_id", None)
    if actor_id and "actor_member_id" not in data:
        data["actor_member_id"] = actor_id

    return await kernel.recipes.update_recipe(
        recipe_id=recipe_id,
        revision=revision,
        data=data,
    )


@router.delete("/{identifier}", status_code=204)
async def delete_recipe(
    identifier: str,
    request: Request,
    revision: int | None = Query(default=None),
):
    kernel = request.app.state.kernel
    if "_" in identifier:
        if revision is None:
            raise ValidationError("Query parameter 'revision' is required for row deletion")
        await kernel.recipes.delete_recipe_row(recipe_id=identifier, revision=revision)
    else:
        await kernel.recipes.delete_recipe_group(group_id=identifier)

    return Response(status_code=204)

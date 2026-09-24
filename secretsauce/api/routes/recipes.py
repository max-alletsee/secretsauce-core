from fastapi import APIRouter, Query, Request, Response

from secretsauce.api.models import RecipeCreate, RecipePatch
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
    return await request.app.state.kernel.recipes.list_recipes(
        lang=lang, q=q, tags=tag, attrs=attr, sort=sort, limit=limit, offset=offset
    )


@router.post("", status_code=201)
async def create_recipe(payload: RecipeCreate, request: Request):
    return await request.app.state.kernel.recipes.create_recipe(payload.data(request))


@router.get("/{identifier}")
async def get_recipe(identifier: str, request: Request, lang: str | None = None):
    return await request.app.state.kernel.recipes.get_recipe(identifier, lang=lang)


@router.patch("/{recipe_id}")
async def patch_recipe(recipe_id: str, payload: RecipePatch, request: Request):
    return await request.app.state.kernel.recipes.update_recipe(
        recipe_id=recipe_id, revision=payload.revision, data=payload.data(request)
    )


@router.delete("/{identifier}", status_code=204)
async def delete_recipe(
    identifier: str,
    request: Request,
    revision: int | None = Query(default=None),
):
    recipes = request.app.state.kernel.recipes
    if "_" in identifier:
        if revision is None:
            raise ValidationError(
                "Query parameter 'revision' is required for row deletion",
                fields={"revision": "This field is required"},
            )
        await recipes.delete_recipe_row(recipe_id=identifier, revision=revision)
    else:
        await recipes.delete_recipe_group(group_id=identifier)
    return Response(status_code=204)

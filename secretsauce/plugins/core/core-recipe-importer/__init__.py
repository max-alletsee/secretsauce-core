from datetime import datetime, timezone
import json
import re
from typing import Any
import uuid

from fastapi import APIRouter, HTTPException, Request
import httpx
from pydantic import BaseModel, Field
from secretsauce.plugins.context import PluginContext

PLUGIN = {
    "id": "core-recipe-importer",
    "name": "core-recipe-importer",
    "version": "1.0.0",
    "description": "Multi-source recipe importer (URL scraping, image OCR, free-text extraction)",
    "core": True,
    "schema": 1,
    "requires": ["core-ai-provider"],
    "ui": "ui.js",
}

router = APIRouter(prefix="/api/x/core-recipe-importer", tags=["core-recipe-importer"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class ImportedIngredient(BaseModel):
    name: str
    quantity: float | None = None
    quantity_max: float | None = None
    unit: str | None = None
    raw_text: str | None = None


class ImportedStep(BaseModel):
    instruction: str


class RecipeDraftSchema(BaseModel):
    title: str
    description: str | None = None
    servings: int = 4
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    language: str = "en"
    ingredients: list[ImportedIngredient] = Field(default_factory=list)
    steps: list[ImportedStep] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ParseUrlRequest(BaseModel):
    url: str
    auto_save: bool = False


class ParseTextRequest(BaseModel):
    text: str
    auto_save: bool = False


class ParseImageRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    auto_save: bool = False


async def _log_history(
    ctx: PluginContext,
    source_type: str,
    status: str,
    source_url: str | None = None,
    title: str | None = None,
    recipe_id: str | None = None,
    error_message: str | None = None,
) -> None:
    history_id = str(uuid.uuid4())
    await ctx.db.write(
        """
        INSERT INTO plugin_core_recipe_importer_history
        (id, source_type, source_url, title, status, recipe_id, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (history_id, source_type, source_url, title, status, recipe_id, error_message, _now_iso()),
    )


async def _extract_recipe_with_ai(
    ctx: PluginContext,
    content_prompt: str,
    images: list[dict[str, Any]] | None = None,
    call_type: str = "recipe_import",
) -> dict[str, Any]:
    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    if not ai_svc:
        raise HTTPException(
            status_code=503,
            detail="AI Provider service ('core-ai-provider') is not available",
        )

    system_prompt = (
        "You are an expert culinary assistant. Extract the recipe from the provided input into the structured schema. "
        "Include title, description, servings, prep_time_minutes, cook_time_minutes, language (2-letter ISO), "
        "ingredients (with name, quantity, unit, and raw_text), steps (with instruction string), and tags.\n\n"
        f"Input:\n{content_prompt}"
    )

    result = await ai_svc.complete(
        schema=RecipeDraftSchema,
        prompt=system_prompt,
        images=images,
        call_type=call_type,
        calling_plugin="core-recipe-importer",
    )
    if isinstance(result, dict):
        return dict(result)
    return json.loads(result)


async def _save_recipe_draft(ctx: PluginContext, draft: dict[str, Any]) -> str:
    saved = await ctx.recipes.create_recipe({
        "title": draft["title"],
        "description": draft.get("description"),
        "servings": draft.get("servings", 4),
        "prep_time_minutes": draft.get("prep_time_minutes"),
        "cook_time_minutes": draft.get("cook_time_minutes"),
        "language": draft.get("language", "en"),
        "ingredients": draft.get("ingredients", []),
        "steps": draft.get("steps", []),
        "tags": draft.get("tags", []),
        "origin": "plugin:core-recipe-importer",
    })
    draft["id"] = saved["id"]
    draft["group_id"] = saved["group_id"]
    draft["recipe_id"] = saved["id"]
    return saved["id"]


def _strip_html(html: str) -> str:
    text = re.sub(r"<script.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style.*?</style>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:15000]


@router.post("/parse-url")
async def parse_url_endpoint(req: ParseUrlRequest, request: Request):
    kernel = request.app.state.kernel
    ctx = kernel.ctx_for("core-recipe-importer")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(req.url, headers={"User-Agent": "Mozilla/5.0 (compatible; SecretSauce/1.0)"})
            if resp.status_code >= 400:
                raise HTTPException(status_code=400, detail=f"Failed to fetch URL: HTTP {resp.status_code}")
            html = resp.text

        clean_text = _strip_html(html)
        draft = await _extract_recipe_with_ai(
            ctx,
            content_prompt=f"Recipe URL: {req.url}\nWebpage text:\n{clean_text}",
            call_type="recipe_import_url",
        )

        recipe_id = None
        if req.auto_save:
            recipe_id = await _save_recipe_draft(ctx, draft)
            draft["recipe_id"] = recipe_id

        await _log_history(
            ctx,
            source_type="url",
            source_url=req.url,
            title=draft.get("title"),
            status="success",
            recipe_id=recipe_id,
        )
        return draft
    except Exception as e:
        await _log_history(
            ctx,
            source_type="url",
            source_url=req.url,
            status="failed",
            error_message=str(e),
        )
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Recipe extraction failed: {e}")


@router.post("/parse-text")
async def parse_text_endpoint(req: ParseTextRequest, request: Request):
    kernel = request.app.state.kernel
    ctx = kernel.ctx_for("core-recipe-importer")

    try:
        draft = await _extract_recipe_with_ai(
            ctx,
            content_prompt=f"Text to parse:\n{req.text}",
            call_type="recipe_import_text",
        )

        recipe_id = None
        if req.auto_save:
            recipe_id = await _save_recipe_draft(ctx, draft)
            draft["recipe_id"] = recipe_id

        await _log_history(
            ctx,
            source_type="text",
            title=draft.get("title"),
            status="success",
            recipe_id=recipe_id,
        )
        return draft
    except Exception as e:
        await _log_history(
            ctx,
            source_type="text",
            status="failed",
            error_message=str(e),
        )
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Recipe text extraction failed: {e}")


@router.post("/parse-image")
async def parse_image_endpoint(req: ParseImageRequest, request: Request):
    kernel = request.app.state.kernel
    ctx = kernel.ctx_for("core-recipe-importer")

    try:
        draft = await _extract_recipe_with_ai(
            ctx,
            content_prompt="Extract recipe details from this image.",
            images=[{"base64": req.image_base64, "mime_type": req.mime_type}],
            call_type="recipe_import_image",
        )

        recipe_id = None
        if req.auto_save:
            recipe_id = await _save_recipe_draft(ctx, draft)
            draft["recipe_id"] = recipe_id

        await _log_history(
            ctx,
            source_type="image",
            title=draft.get("title"),
            status="success",
            recipe_id=recipe_id,
        )
        return draft
    except Exception as e:
        await _log_history(
            ctx,
            source_type="image",
            status="failed",
            error_message=str(e),
        )
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Recipe image extraction failed: {e}")


@router.get("/history")
async def list_history_endpoint(request: Request):
    kernel = request.app.state.kernel
    rows = await kernel.db.read_all(
        "SELECT * FROM plugin_core_recipe_importer_history ORDER BY created_at DESC LIMIT 50"
    )
    return [dict(r) for r in rows]


class RecipeImporterService:
    def __init__(self, ctx: PluginContext):
        self.ctx = ctx

    async def parse_url(self, url: str, auto_save: bool = False) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; SecretSauce/1.0)"})
            html = resp.text
        clean_text = _strip_html(html)
        draft = await _extract_recipe_with_ai(
            self.ctx,
            content_prompt=f"Recipe URL: {url}\nWebpage text:\n{clean_text}",
            call_type="recipe_import_url",
        )
        if auto_save:
            draft["recipe_id"] = await _save_recipe_draft(self.ctx, draft)
        return draft

    async def parse_text(self, text: str, auto_save: bool = False) -> dict[str, Any]:
        draft = await _extract_recipe_with_ai(
            self.ctx,
            content_prompt=f"Text to parse:\n{text}",
            call_type="recipe_import_text",
        )
        if auto_save:
            draft["recipe_id"] = await _save_recipe_draft(self.ctx, draft)
        return draft

    async def parse_image(self, image_base64: str, mime_type: str = "image/jpeg", auto_save: bool = False) -> dict[str, Any]:
        draft = await _extract_recipe_with_ai(
            self.ctx,
            content_prompt="Extract recipe details from this image.",
            images=[{"base64": image_base64, "mime_type": mime_type}],
            call_type="recipe_import_image",
        )
        if auto_save:
            draft["recipe_id"] = await _save_recipe_draft(self.ctx, draft)
        return draft


async def setup(ctx: PluginContext):
    service = RecipeImporterService(ctx)
    ctx.services.register("core-recipe-importer", service)
    ctx.routes.mount(router)

    async def import_url_job(input_data: dict[str, Any], handle: Any = None) -> dict[str, Any]:
        url = input_data["url"]
        auto_save = input_data.get("auto_save", True)
        if handle:
            await handle.set_progress(10)
        draft = await service.parse_url(url=url, auto_save=auto_save)
        if handle:
            await handle.set_progress(100)
        return draft

    ctx.jobs.register("import-url", import_url_job)

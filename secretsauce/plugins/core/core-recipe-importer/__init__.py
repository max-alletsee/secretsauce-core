from datetime import datetime, timezone
import json
import re
from typing import Any
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from secretsauce import net
from secretsauce.errors import SecretSauceError
from secretsauce.plugins.context import PluginContext, current_ctx

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


class AIUnavailableError(SecretSauceError):
    code = "unavailable"
    status_code = 503


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
        raise AIUnavailableError("AI Provider service ('core-ai-provider') is not available")

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


class RecipeImporterService:
    """Parses recipes from URLs, text and images; every attempt is logged in history."""

    def __init__(self, ctx: PluginContext):
        self.ctx = ctx

    async def _import(
        self,
        source_type: str,
        prompt: str,
        call_type: str,
        auto_save: bool,
        source_url: str | None = None,
        images: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        try:
            draft = await _extract_recipe_with_ai(
                self.ctx, content_prompt=prompt, images=images, call_type=call_type
            )
            recipe_id = await _save_recipe_draft(self.ctx, draft) if auto_save else None
            if recipe_id:
                draft["recipe_id"] = recipe_id
        except Exception as e:
            await _log_history(
                self.ctx, source_type=source_type, source_url=source_url,
                status="failed", error_message=str(e),
            )
            raise
        await _log_history(
            self.ctx, source_type=source_type, source_url=source_url,
            title=draft.get("title"), status="success", recipe_id=recipe_id,
        )
        return draft

    async def parse_url(self, url: str, auto_save: bool = False) -> dict[str, Any]:
        try:
            html = await net.fetch_public_text(url)
        except Exception as e:
            await _log_history(
                self.ctx, source_type="url", source_url=url, status="failed", error_message=str(e)
            )
            raise
        return await self._import(
            "url",
            f"Recipe URL: {url}\nWebpage text:\n{_strip_html(html)}",
            "recipe_import_url",
            auto_save,
            source_url=url,
        )

    async def parse_text(self, text: str, auto_save: bool = False) -> dict[str, Any]:
        return await self._import("text", f"Text to parse:\n{text}", "recipe_import_text", auto_save)

    async def parse_image(
        self, image_base64: str, mime_type: str = "image/jpeg", auto_save: bool = False
    ) -> dict[str, Any]:
        return await self._import(
            "image",
            "Extract recipe details from this image.",
            "recipe_import_image",
            auto_save,
            images=[{"base64": image_base64, "mime_type": mime_type}],
        )


def _service(ctx: PluginContext) -> RecipeImporterService:
    return ctx.services.get("core-recipe-importer")


@router.post("/parse-url")
async def parse_url_endpoint(req: ParseUrlRequest, ctx: PluginContext = Depends(current_ctx)):
    return await _service(ctx).parse_url(req.url, auto_save=req.auto_save)


@router.post("/parse-text")
async def parse_text_endpoint(req: ParseTextRequest, ctx: PluginContext = Depends(current_ctx)):
    return await _service(ctx).parse_text(req.text, auto_save=req.auto_save)


@router.post("/parse-image")
async def parse_image_endpoint(req: ParseImageRequest, ctx: PluginContext = Depends(current_ctx)):
    return await _service(ctx).parse_image(
        req.image_base64, mime_type=req.mime_type, auto_save=req.auto_save
    )


@router.get("/history")
async def list_history_endpoint(ctx: PluginContext = Depends(current_ctx)):
    return await ctx.db.fetch_all(
        "SELECT * FROM plugin_core_recipe_importer_history ORDER BY created_at DESC LIMIT 50"
    )


async def setup(ctx: PluginContext):
    service = RecipeImporterService(ctx)
    ctx.services.register("core-recipe-importer", service)
    ctx.router(router)

    async def import_url_job(input_data: dict[str, Any], handle: Any = None) -> dict[str, Any]:
        if handle:
            await handle.set_progress(10)
        draft = await service.parse_url(url=input_data["url"], auto_save=input_data.get("auto_save", True))
        if handle:
            await handle.set_progress(100)
        return draft

    ctx.jobs.register("import-url", import_url_job)

from datetime import datetime, timezone
import html as html_lib
import json
import re
from typing import Any, Literal
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from secretsauce import net
from secretsauce.errors import SecretSauceError
from secretsauce.nouns.recipes import normalize_source
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
    "config_schema": {
        "type": "object",
        "properties": {
            "url_model_key": {"type": "string", "default": "default"},
            "text_model_key": {"type": "string", "default": "default"},
            "image_model_key": {"type": "string", "default": "default"},
        },
    },
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


class ImportedSource(BaseModel):
    type: Literal["website", "cookbook", "person", "other"] = "other"
    name: str | None = None
    author: str | None = None
    page: str | None = None
    url: str | None = None
    notes: str | None = None


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
    source: ImportedSource | None = None


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
    model_key: str = "default",
) -> dict[str, Any]:
    ai_svc = ctx.services.get("core-ai-provider") or ctx.services.get("ai")
    if not ai_svc:
        raise AIUnavailableError("AI Provider service ('core-ai-provider') is not available")

    system_prompt = (
        "You are an expert culinary assistant. Extract the recipe from the provided input into the structured schema. "
        "Include title, description, servings, prep_time_minutes, cook_time_minutes, language (2-letter ISO), "
        "ingredients (with name, quantity, unit, and raw_text), steps (with instruction string), tags, "
        "and source (if a cookbook title, author, page number, website name, or contributor person is mentioned or visible, "
        "populate source with type 'cookbook'|'website'|'person'|'other', name, author, page, url, notes).\n\n"
        f"Input:\n{content_prompt}"
    )

    result = await ai_svc.complete(
        schema=RecipeDraftSchema,
        prompt=system_prompt,
        images=images,
        call_type=call_type,
        calling_plugin="core-recipe-importer",
        model_key=model_key,
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
        "source": normalize_source(draft.get("source")),
        "origin": "plugin:core-recipe-importer",
    })
    draft["id"] = saved["id"]
    draft["group_id"] = saved["group_id"]
    draft["recipe_id"] = saved["id"]
    return saved["id"]


_TRACKING_QUERY_PARAMS = {
    "fbclid",
    "gclid",
    "dclid",
    "msclkid",
    "igshid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
    "_hsenc",
    "_hsmi",
    "si",
    "s",
}


def _clean_source_url(url: str) -> str:
    parts = urlsplit(url.strip())
    kept = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not k.lower().startswith("utm_") and k.lower() not in _TRACKING_QUERY_PARAMS
    ]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), ""))


def _extract_meta_content(html: str, attr_name: str, attr_value: str) -> str | None:
    pattern = re.compile(
        rf"<meta\b[^>]*\b{attr_name}\s*=\s*['\"]{re.escape(attr_value)}['\"][^>]*>",
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(html):
        tag = match.group(0)
        c_match = re.search(r"\bcontent\s*=\s*['\"]([^'\"]*)['\"]", tag, re.IGNORECASE)
        if c_match:
            val = html_lib.unescape(c_match.group(1)).strip()
            if val:
                return val
    return None


def _extract_site_name(html: str, url: str) -> tuple[str, bool]:
    """Returns (site_name, from_metadata)."""
    for attr_name, attr_val in (
        ("property", "og:site_name"),
        ("name", "og:site_name"),
        ("name", "application-name"),
    ):
        found = _extract_meta_content(html, attr_name, attr_val)
        if found:
            return found, True

    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title_match:
        title_text = re.sub(r"\s+", " ", html_lib.unescape(title_match.group(1))).strip()
        for sep in (" | ", " — ", " - "):
            if sep in title_text:
                suffix = title_text.rsplit(sep, 1)[-1].strip()
                if 2 <= len(suffix) <= 40:
                    return suffix, True

    host = (urlsplit(url).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    return host or url, False


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
        site_name: str | None = None,
        site_from_metadata: bool = False,
        images: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        source_Model_key = {
            "url": "url_model_key",
            "text": "text_model_key",
            "image": "image_model_key",
        }.get(source_type, "url_model_key")
        model_key = self.ctx.config.get(source_Model_key) or "default"
        try:
            draft = await _extract_recipe_with_ai(
                self.ctx,
                content_prompt=prompt,
                images=images,
                call_type=call_type,
                model_key=model_key,
            )
            ai_source = normalize_source(draft.get("source"))
            if source_url:
                resolved_name = site_name
                if not site_from_metadata and ai_source and ai_source.get("name"):
                    resolved_name = ai_source["name"]
                merged: dict[str, Any] = {
                    "type": "website",
                    "name": resolved_name or source_url,
                    "url": source_url,
                }
                if ai_source and ai_source.get("author"):
                    merged["author"] = ai_source["author"]
                draft["source"] = normalize_source(merged)
            else:
                draft["source"] = ai_source

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
        clean_url = _clean_source_url(url)
        try:
            html = await net.fetch_public_text(url)
        except Exception as e:
            await _log_history(
                self.ctx, source_type="url", source_url=clean_url, status="failed", error_message=str(e)
            )
            raise
        site_name, from_meta = _extract_site_name(html, clean_url)
        return await self._import(
            "url",
            f"Recipe URL: {clean_url}\nWebpage text:\n{_strip_html(html)}",
            "recipe_import_url",
            auto_save,
            source_url=clean_url,
            site_name=site_name,
            site_from_metadata=from_meta,
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

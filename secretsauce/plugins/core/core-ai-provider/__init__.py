import base64
from datetime import datetime, timezone
import json
import os
from typing import Any
import uuid

from fastapi import APIRouter, Depends
import httpx
from pydantic import BaseModel
from secretsauce.plugins.context import PluginContext, current_ctx
from secretsauce.errors import SecretSauceError, ValidationError
from secretsauce.secrets import MASK_STRING

DEFAULT_MODEL = "gemini-3.8-flash"

PLUGIN = {
    "id": "core-ai-provider",
    "name": "core-ai-provider",
    "version": "1.0.0",
    "description": "Multi-provider AI service abstraction (Google GenAI, OpenAI, OpenRouter) with budget control",
    "core": True,
    "schema": 1,
    "ui": "ui.js",
    "config_schema": {
        "type": "object",
        "properties": {
            "provider": {
                "type": "string",
                "enum": ["gemini", "openai", "openrouter"],
                "default": "gemini",
            },
            "models": {
                "type": "object",
                "additionalProperties": {"type": "string"},
                "default": {"default": DEFAULT_MODEL},
            },
            "model": {
                "type": "string",
                "default": DEFAULT_MODEL,
            },
            "gemini_api_key": {"type": "string", "secret": True},
            "openai_api_key": {"type": "string", "secret": True},
            "openrouter_api_key": {"type": "string", "secret": True},
            "enforce_budget": {"type": "boolean", "default": False},
            "monthly_budget": {"type": "number", "default": 10.0},
        }
    },
}

router = APIRouter(prefix="/api/x/core-ai-provider", tags=["core-ai-provider"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class AIUnavailableError(SecretSauceError):
    code = "unavailable"
    status_code = 503


class BudgetExceededError(RuntimeError):
    """The household's monthly AI budget would be exceeded."""


def estimate_cost(provider: str, model: str, in_tokens: int, out_tokens: int) -> float:
    m_lower = model.lower()
    if "flash" in m_lower:
        in_rate = 0.15 / 1_000_000
        out_rate = 0.60 / 1_000_000
    elif "pro" in m_lower:
        in_rate = 1.25 / 1_000_000
        out_rate = 5.00 / 1_000_000
    elif "gpt-4o-mini" in m_lower:
        in_rate = 0.15 / 1_000_000
        out_rate = 0.60 / 1_000_000
    elif "gpt-4o" in m_lower:
        in_rate = 2.50 / 1_000_000
        out_rate = 10.00 / 1_000_000
    else:
        in_rate = 0.20 / 1_000_000
        out_rate = 0.80 / 1_000_000
    return round((in_tokens * in_rate) + (out_tokens * out_rate), 6)


SECRET_KEYS = ("gemini_api_key", "openai_api_key", "openrouter_api_key")
ENV_FALLBACKS = {
    "gemini_api_key": "GEMINI_API_KEY",
    "openai_api_key": "OPENAI_API_KEY",
    "openrouter_api_key": "OPENROUTER_API_KEY",
}


def mask_settings(settings: dict[str, Any]) -> dict[str, Any]:
    masked = dict(settings)
    for key in SECRET_KEYS:
        masked[key] = MASK_STRING if masked.get(key) else ""
    return masked


def _validate_models(raw_models: Any) -> dict[str, str]:
    if not isinstance(raw_models, dict):
        raise ValidationError("models must be a key/value object")
    cleaned: dict[str, str] = {}
    for k, v in raw_models.items():
        if not isinstance(k, str) or not isinstance(v, str):
            raise ValidationError("Model keys and model names must be strings")
        key = k.strip()
        val = v.strip()
        if not key or not val:
            raise ValidationError("Model keys and model names must not be empty")
        if key in cleaned:
            raise ValidationError(f"Duplicate model key: '{key}'")
        cleaned[key] = val
    if "default" not in cleaned:
        raise ValidationError("The 'default' fallback model key is required")
    return cleaned


class AIService:
    def __init__(self, ctx: PluginContext):
        self.ctx = ctx

    async def get_settings(self) -> dict[str, Any]:
        """Stored settings (secrets decrypted by the kernel), schema defaults applied."""
        settings = dict(self.ctx.config)
        raw_models = settings.get("models")
        models: dict[str, str] = {}
        if isinstance(raw_models, dict):
            models = {
                str(k).strip(): str(v).strip()
                for k, v in raw_models.items()
                if str(k).strip() and str(v).strip()
            }
        legacy_model = settings.get("model")
        if isinstance(legacy_model, str) and legacy_model.strip():
            trimmed_legacy = legacy_model.strip()
            if "default" not in models or (
                models == {"default": DEFAULT_MODEL} and trimmed_legacy != DEFAULT_MODEL
            ):
                models["default"] = trimmed_legacy
        models.setdefault("default", DEFAULT_MODEL)
        settings["models"] = models
        settings["model"] = models["default"]
        settings["monthly_budget"] = float(settings.get("monthly_budget", 10.0))
        return settings

    async def update_settings(self, updates: dict[str, Any]) -> dict[str, Any]:
        """Persists updates; secret fields are encrypted at rest by the kernel."""
        cleaned = {
            k: v for k, v in updates.items()
            if not (k in SECRET_KEYS and v == MASK_STRING)
        }
        if "models" in cleaned:
            models = _validate_models(cleaned["models"])
            cleaned["models"] = models
            cleaned["model"] = models["default"]
        elif "model" in cleaned:
            raw_model = cleaned["model"]
            if not isinstance(raw_model, str) or not raw_model.strip():
                raise ValidationError("Model name must not be empty")
            current = await self.get_settings()
            models = dict(current.get("models") or {"default": DEFAULT_MODEL})
            models["default"] = raw_model.strip()
            cleaned["models"] = models
            cleaned["model"] = models["default"]
        await self.ctx.save_config(cleaned)
        return await self.get_settings()

    def _api_key(self, settings: dict[str, Any], key: str) -> str:
        # The environment is a fallback read at call time; it is never copied into the database.
        return settings.get(key) or os.environ.get(ENV_FALLBACKS[key], "")

    async def check_budget(self, prospective_cost: float = 0.0) -> None:
        settings = await self.get_settings()
        if not settings.get("enforce_budget"):
            return
        limit = float(settings.get("monthly_budget", 10.0))
        now = datetime.now(timezone.utc)
        month_prefix = now.strftime("%Y-%m")
        row = await self.ctx.db.read_one(
            "SELECT SUM(estimated_cost_usd) as month_spend FROM plugin_core_ai_provider_usage WHERE timestamp LIKE ?",
            (f"{month_prefix}%",),
        )
        current_spend = float(row["month_spend"] or 0.0) if row else 0.0
        if current_spend + prospective_cost >= limit:
            raise BudgetExceededError(
                f"AI budget exceeded: monthly limit of ${limit:.2f} reached (current month spend: ${current_spend:.2f})"
            )

    async def complete(
        self,
        schema: type[BaseModel] | dict[str, Any] | None,
        prompt: str,
        images: list[dict[str, Any]] | None = None,
        call_type: str = "generic",
        calling_plugin: str = "core-ai-provider",
        model_key: str = "default",
    ) -> dict[str, Any] | str:
        settings = await self.get_settings()
        provider = settings.get("provider", "gemini")
        models = settings.get("models") or {}
        default_model = models.get("default") or settings.get("model") or DEFAULT_MODEL
        model = models.get(model_key) or default_model
        key_name = {"gemini": "gemini_api_key", "openai": "openai_api_key", "openrouter": "openrouter_api_key"}.get(provider)
        if key_name and not self._api_key(settings, key_name):
            raise AIUnavailableError(f"AI isn’t set up yet: configure a key for {provider}")
        await self.check_budget()

        if provider == "gemini":
            api_key = self._api_key(settings, "gemini_api_key")
            result, in_tokens, out_tokens = await self._complete_gemini(
                api_key=api_key,
                model=model,
                schema=schema,
                prompt=prompt,
                images=images,
            )
        elif provider in ("openai", "openrouter"):
            base_url = "https://openrouter.ai/api/v1" if provider == "openrouter" else "https://api.openai.com/v1"
            api_key = self._api_key(
                settings, "openrouter_api_key" if provider == "openrouter" else "openai_api_key"
            )
            result, in_tokens, out_tokens = await self._complete_openai_compatible(
                base_url=base_url,
                api_key=api_key,
                model=model,
                schema=schema,
                prompt=prompt,
                images=images,
            )
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")

        cost = estimate_cost(provider, model, in_tokens, out_tokens)
        call_id = str(uuid.uuid4())
        await self.ctx.db.write(
            """
            INSERT INTO plugin_core_ai_provider_usage
            (id, timestamp, calling_plugin, provider, model, call_type, input_tokens, output_tokens, estimated_cost_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (call_id, _now_iso(), calling_plugin, provider, model, call_type, in_tokens, out_tokens, cost),
        )
        return result

    async def _complete_gemini(
        self,
        api_key: str,
        model: str,
        schema: type[BaseModel] | dict[str, Any] | None,
        prompt: str,
        images: list[dict[str, Any]] | None = None,
    ) -> tuple[dict[str, Any] | str, int, int]:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        contents = []
        if images:
            for img in images:
                if "bytes" in img:
                    contents.append(
                        types.Part.from_bytes(data=img["bytes"], mime_type=img.get("mime_type", "image/jpeg"))
                    )
                elif "base64" in img:
                    raw_bytes = base64.b64decode(img["base64"])
                    contents.append(
                        types.Part.from_bytes(data=raw_bytes, mime_type=img.get("mime_type", "image/jpeg"))
                    )
        contents.append(prompt)

        config_kwargs: dict[str, Any] = {}
        if schema is not None:
            config_kwargs["response_mime_type"] = "application/json"
            config_kwargs["response_schema"] = schema

        config = types.GenerateContentConfig(**config_kwargs) if config_kwargs else None

        response = await client.aio.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )

        text = response.text or ""
        in_tokens = 0
        out_tokens = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            in_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
            out_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
        if not in_tokens:
            in_tokens = max(len(prompt) // 4, 1)
        if not out_tokens:
            out_tokens = max(len(text) // 4, 1)

        if schema is not None:
            if isinstance(schema, type) and issubclass(schema, BaseModel):
                parsed = schema.model_validate_json(text)
                return parsed.model_dump(), in_tokens, out_tokens
            else:
                return json.loads(text), in_tokens, out_tokens
        return text, in_tokens, out_tokens

    async def _complete_openai_compatible(
        self,
        base_url: str,
        api_key: str,
        model: str,
        schema: type[BaseModel] | dict[str, Any] | None,
        prompt: str,
        images: list[dict[str, Any]] | None = None,
    ) -> tuple[dict[str, Any] | str, int, int]:
        messages: list[dict[str, Any]] = []

        if not images:
            messages.append({"role": "user", "content": prompt})
        else:
            content_parts: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
            for img in images:
                mime_type = img.get("mime_type", "image/jpeg")
                if "base64" in img:
                    b64_str = img["base64"]
                elif "bytes" in img:
                    b64_str = base64.b64encode(img["bytes"]).decode("utf-8")
                else:
                    continue
                content_parts.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{b64_str}"},
                })
            messages.append({"role": "user", "content": content_parts})

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
        }

        if schema is not None:
            if isinstance(schema, type) and issubclass(schema, BaseModel):
                json_schema = schema.model_json_schema()
            elif isinstance(schema, dict):
                json_schema = schema
            else:
                json_schema = None

            if json_schema:
                payload["response_format"] = {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "structured_output",
                        "schema": json_schema,
                    },
                }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=60.0) as http_client:
            resp = await http_client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                json=payload,
                headers=headers,
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"AI provider error ({resp.status_code}): {resp.text}")
            data = resp.json()

        choice = data.get("choices", [{}])[0]
        text = choice.get("message", {}).get("content", "")
        usage = data.get("usage", {})
        in_tokens = usage.get("prompt_tokens") or max(len(prompt) // 4, 1)
        out_tokens = usage.get("completion_tokens") or max(len(text) // 4, 1)

        if schema is not None:
            if isinstance(schema, type) and issubclass(schema, BaseModel):
                parsed = schema.model_validate_json(text)
                return parsed.model_dump(), in_tokens, out_tokens
            else:
                return json.loads(text), in_tokens, out_tokens
        return text, in_tokens, out_tokens


def _service(ctx: PluginContext) -> AIService:
    return ctx.services.get("core-ai-provider")


@router.get("/settings")
async def get_settings_endpoint(ctx: PluginContext = Depends(current_ctx)):
    return mask_settings(await _service(ctx).get_settings())


@router.put("/settings")
async def update_settings_endpoint(data: dict[str, Any], ctx: PluginContext = Depends(current_ctx)):
    return mask_settings(await _service(ctx).update_settings(data))


@router.get("/usage")
async def get_usage_endpoint(ctx: PluginContext = Depends(current_ctx)):
    db = ctx.db
    now = datetime.now(timezone.utc)
    month_prefix = now.strftime("%Y-%m")

    tot_row = await db.read_one(
        "SELECT SUM(estimated_cost_usd) as total, SUM(input_tokens) as total_in, SUM(output_tokens) as total_out FROM plugin_core_ai_provider_usage"
    )
    month_row = await db.read_one(
        "SELECT SUM(estimated_cost_usd) as total FROM plugin_core_ai_provider_usage WHERE timestamp LIKE ?",
        (f"{month_prefix}%",),
    )
    breakdown_rows = await db.read_all(
        """
        SELECT calling_plugin, SUM(estimated_cost_usd) as cost, COUNT(*) as call_count
        FROM plugin_core_ai_provider_usage
        GROUP BY calling_plugin
        ORDER BY cost DESC
        """
    )
    recent_rows = await db.read_all(
        "SELECT * FROM plugin_core_ai_provider_usage ORDER BY timestamp DESC LIMIT 20"
    )

    return {
        "total_cost_usd": round(float(tot_row["total"] or 0.0), 4) if tot_row else 0.0,
        "month_cost_usd": round(float(month_row["total"] or 0.0), 4) if month_row else 0.0,
        "total_input_tokens": int(tot_row["total_in"] or 0) if tot_row else 0,
        "total_output_tokens": int(tot_row["total_out"] or 0) if tot_row else 0,
        "breakdown_by_plugin": [dict(r) for r in breakdown_rows],
        "recent_calls": [dict(r) for r in recent_rows],
    }


async def setup(ctx: PluginContext):
    service = AIService(ctx)
    ctx.services.register("core-ai-provider", service)
    ctx.services.register("ai", service)
    ctx.router(router)

from typing import Any

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field, field_validator

from secretsauce.auth import (
    MIN_PASSPHRASE_LENGTH,
    client_ip,
    cookie_secure,
    hash_passphrase_async,
    issue_session_cookie,
    verify_passphrase_async,
)
from secretsauce.errors import SetupRequiredError, UnauthorizedError
from secretsauce.api.models import MealTypesPayload

router = APIRouter(prefix="/api/household", tags=["household"])


class HouseholdPatchPayload(MealTypesPayload):
    household_name: str | None = Field(default=None, min_length=1, max_length=200)
    languages: dict[str, Any] | None = None
    units: str | None = Field(default=None, pattern="^(metric|us_customary)$")
    predefined_notes: list[str] | None = None
    event_retention_days: int | None = Field(default=None, strict=True, ge=1, le=3650)

    @field_validator("event_retention_days")
    @classmethod
    def check_event_retention_days(cls, value: int | None) -> int:
        if value is None:
            raise ValueError("event_retention_days cannot be null")
        return value

    @field_validator("predefined_notes")
    @classmethod
    def check_predefined_notes(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = []
        for note in value:
            if not isinstance(note, str):
                raise ValueError("Note must be a string")
            s = note.strip()
            if not s:
                raise ValueError("Note cannot be blank")
            if len(s) > 64:
                raise ValueError("Note cannot exceed 64 characters")
            if s not in cleaned:
                cleaned.append(s)
        return cleaned


class PassphraseRotatePayload(BaseModel):
    current: str
    new: str = Field(min_length=MIN_PASSPHRASE_LENGTH)


@router.get("")
async def get_household(request: Request):
    return await request.app.state.kernel.household.get_config()


@router.patch("")
async def patch_household(payload: HouseholdPatchPayload, request: Request):
    updates = payload.model_dump(exclude_unset=True)
    if "meal_types" in updates and payload.meal_types is not None:
        updates["meal_types"] = [
            slot.model_dump(exclude_none=True) for slot in payload.meal_types
        ]
    return await request.app.state.kernel.household.update_config(updates)


@router.put("/passphrase", status_code=204)
async def rotate_passphrase(payload: PassphraseRotatePayload, request: Request):
    kernel = request.app.state.kernel
    ip = client_ip(request)
    # Checking the current passphrase is a guessing oracle like login is.
    kernel.rate_limiter.require_allowed(ip)

    passphrase_info = await kernel.household.get_passphrase_info()
    if passphrase_info is None:
        raise SetupRequiredError("Household setup required")
    if not await verify_passphrase_async(payload.current, passphrase_info["passphrase_hash"]):
        kernel.rate_limiter.record_login_failure(ip)
        raise UnauthorizedError("Current passphrase incorrect")
    kernel.rate_limiter.record_login_success(ip)

    new_version = await kernel.household.set_passphrase(await hash_passphrase_async(payload.new))
    res = Response(status_code=204)
    issue_session_cookie(
        res, kernel.key_manager, passphrase_version=new_version, secure=cookie_secure(request)
    )
    return res

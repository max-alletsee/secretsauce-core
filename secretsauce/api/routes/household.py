from typing import Any

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

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


class PassphraseRotatePayload(BaseModel):
    current: str
    new: str = Field(min_length=MIN_PASSPHRASE_LENGTH)


@router.get("")
async def get_household(request: Request):
    return await request.app.state.kernel.household.get_config()


@router.patch("")
async def patch_household(payload: HouseholdPatchPayload, request: Request):
    return await request.app.state.kernel.household.update_config(
        payload.model_dump(exclude_unset=True)
    )


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

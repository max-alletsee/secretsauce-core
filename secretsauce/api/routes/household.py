from typing import Any
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from secretsauce.auth import (
    hash_passphrase,
    issue_session_cookie,
    verify_passphrase,
)

router = APIRouter(prefix="/api/household", tags=["household"])


class HouseholdPatchPayload(BaseModel):
    household_name: str | None = None
    meal_types: list[dict[str, Any]] | None = None
    languages: dict[str, Any] | None = None
    units: str | None = None


class PassphraseRotatePayload(BaseModel):
    current: str
    new: str


@router.get("")
async def get_household(request: Request):
    kernel = request.app.state.kernel
    cfg = await kernel.household.get_config()
    return cfg


@router.patch("")
async def patch_household(payload: HouseholdPatchPayload, request: Request):
    kernel = request.app.state.kernel
    updates = payload.model_dump(exclude_unset=True)
    cfg = await kernel.household.update_config(updates)
    return cfg


@router.put("/passphrase", status_code=204)
async def rotate_passphrase(
    payload: PassphraseRotatePayload, request: Request
):
    kernel = request.app.state.kernel
    passphrase_info = await kernel.household.get_passphrase_info()
    if passphrase_info is None:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "setup_required",
                    "message": "Household setup required",
                }
            },
        )

    if not verify_passphrase(payload.current, passphrase_info["passphrase_hash"]):
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "unauthorized",
                    "message": "Current passphrase incorrect",
                }
            },
        )

    new_hash = hash_passphrase(payload.new)
    new_version = await kernel.household.set_passphrase(new_hash)

    res = Response(status_code=204)
    issue_session_cookie(
        res, kernel.key_manager, passphrase_version=new_version
    )
    return res

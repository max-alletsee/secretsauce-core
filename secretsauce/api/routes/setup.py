from typing import Any
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

from secretsauce.auth import hash_passphrase, issue_session_cookie

router = APIRouter(prefix="/api/setup", tags=["setup"])


class FirstMemberPayload(BaseModel):
    name: str
    color: str | None = "#0088cc"
    avatar_asset_id: str | None = None
    preferred_language: str | None = "en"


class SetupPayload(BaseModel):
    household_name: str
    passphrase: str = Field(min_length=1)
    first_member: FirstMemberPayload
    languages: dict[str, Any] | None = None
    units: str | None = "metric"
    meal_types: list[dict[str, Any]] | None = None


@router.get("")
async def get_setup_status(request: Request):
    kernel = request.app.state.kernel
    passphrase_info = await kernel.household.get_passphrase_info()
    return {"setup_required": passphrase_info is None}


@router.post("", status_code=201)
async def perform_setup(
    payload: SetupPayload, request: Request, response: Response
):
    kernel = request.app.state.kernel

    passphrase_info = await kernel.household.get_passphrase_info()
    if passphrase_info is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "conflict",
                    "message": "Household already set up",
                }
            },
        )

    pass_hash = hash_passphrase(payload.passphrase)

    config_updates: dict[str, Any] = {
        "household_name": payload.household_name,
        "languages": payload.languages or {"primary": "en"},
        "units": payload.units or "metric",
        "meal_types": payload.meal_types
        or [
            {"id": "breakfast", "label": "Breakfast"},
            {"id": "lunch", "label": "Lunch"},
            {"id": "dinner", "label": "Dinner"},
        ],
    }
    await kernel.household.update_config(config_updates)
    version = await kernel.household.set_passphrase(pass_hash)

    member_data = payload.first_member.model_dump()
    first_member = await kernel.members.create_member(member_data)

    issue_session_cookie(
        response, kernel.key_manager, passphrase_version=version
    )

    return {
        "household_name": payload.household_name,
        "first_member": first_member,
    }

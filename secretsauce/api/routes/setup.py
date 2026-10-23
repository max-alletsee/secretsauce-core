from typing import Any

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field

from secretsauce.auth import (
    MIN_PASSPHRASE_LENGTH,
    cookie_secure,
    hash_passphrase_async,
    issue_session_cookie,
)
from secretsauce.errors import ConflictError
from secretsauce.api.models import MealTypesPayload
from secretsauce.nouns.household import DEFAULT_MEAL_TYPES

router = APIRouter(prefix="/api/setup", tags=["setup"])


class FirstMemberPayload(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    color: str | None = Field(default="#0088cc", max_length=32)
    preferred_language: str | None = "en"


class SetupPayload(MealTypesPayload):
    household_name: str = Field(min_length=1, max_length=200)
    passphrase: str = Field(min_length=MIN_PASSPHRASE_LENGTH)
    first_member: FirstMemberPayload
    languages: dict[str, Any] | None = None
    units: str | None = "metric"


@router.get("")
async def get_setup_status(request: Request):
    needs_setup = await request.app.state.kernel.household.get_passphrase_info() is None
    return {"needs_setup": needs_setup, "setup_required": needs_setup}


@router.post("", status_code=201)
async def perform_setup(payload: SetupPayload, request: Request, response: Response):
    kernel = request.app.state.kernel
    pass_hash = await hash_passphrase_async(payload.passphrase)

    # One transaction: a failure leaves no half-configured household, and two
    # concurrent setups cannot both succeed.
    async with kernel.db.transaction() as tx:
        existing = await kernel.db.read_val(
            "SELECT 1 FROM household_config WHERE key = 'passphrase_hash';", conn=tx
        )
        if existing is not None:
            raise ConflictError("Household already set up")
        await kernel.household.update_config(
            {
                "household_name": payload.household_name,
                "languages": payload.languages or {"primary": "en"},
                "units": payload.units or "metric",
                "meal_types": [slot.model_dump(exclude_none=True) for slot in payload.meal_types] if payload.meal_types is not None else DEFAULT_MEAL_TYPES,
            }
        )
        version = await kernel.household.set_passphrase(pass_hash)
        first_member = await kernel.members.create_member(
            {
                "name": payload.first_member.name,
                "avatar_color": payload.first_member.color,
                "preferred_language": payload.first_member.preferred_language,
            },
            conn=tx,
        )

    issue_session_cookie(
        response, kernel.key_manager, passphrase_version=version, secure=cookie_secure(request)
    )
    return {"household_name": payload.household_name, "first_member": first_member}

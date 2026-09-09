import math
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from secretsauce.auth import (
    clear_session_cookie,
    issue_session_cookie,
    rate_limiter,
    verify_passphrase,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginPayload(BaseModel):
    passphrase: str


def _get_client_ip(request: Request) -> str:
    if request.client:
        return request.client.host
    return "unknown"


@router.post("/login")
async def login(payload: LoginPayload, request: Request, response: Response):
    kernel = request.app.state.kernel
    client_ip = _get_client_ip(request)

    wait_sec = rate_limiter.check_login_rate_limit(client_ip)
    if wait_sec is not None:
        retry_after = max(1, math.ceil(wait_sec))
        return JSONResponse(
            status_code=429,
            headers={"Retry-After": str(retry_after)},
            content={
                "error": {
                    "code": "rate_limited",
                    "message": "Too many failed attempts. Please try again later.",
                }
            },
        )

    passphrase_info = await kernel.household.get_passphrase_info()
    if passphrase_info is None:
        return JSONResponse(
            status_code=409,
            content={
                "error": {
                    "code": "setup_required",
                    "message": "Household setup required",
                }
            },
        )

    stored_hash = passphrase_info["passphrase_hash"]
    if not verify_passphrase(payload.passphrase, stored_hash):
        rate_limiter.record_login_failure(client_ip)
        return JSONResponse(
            status_code=401,
            content={
                "error": {
                    "code": "unauthorized",
                    "message": "Invalid passphrase",
                }
            },
        )

    rate_limiter.record_login_success(client_ip)
    issue_session_cookie(
        response,
        kernel.key_manager,
        passphrase_version=passphrase_info["passphrase_version"],
    )
    return {"status": "ok"}


@router.post("/logout")
async def logout(response: Response):
    clear_session_cookie(response)
    return {"status": "ok"}


@router.get("/session")
async def get_session(request: Request):
    actor_member_id = getattr(request.state, "actor_member_id", None)
    return {"authenticated": True, "actor_member_id": actor_member_id}

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel

from secretsauce import __version__
from secretsauce.auth import (
    SESSION_COOKIE,
    clear_session_cookie,
    client_ip,
    cookie_secure,
    issue_session_cookie,
    verify_passphrase_async,
    verify_session_cookie,
)
from secretsauce.errors import SetupRequiredError, UnauthorizedError

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginPayload(BaseModel):
    passphrase: str


@router.post("/login")
async def login(payload: LoginPayload, request: Request, response: Response):
    kernel = request.app.state.kernel
    ip = client_ip(request)
    kernel.rate_limiter.require_allowed(ip)

    passphrase_info = await kernel.household.get_passphrase_info()
    if passphrase_info is None:
        raise SetupRequiredError("Household setup required")

    if not await verify_passphrase_async(payload.passphrase, passphrase_info["passphrase_hash"]):
        kernel.rate_limiter.record_login_failure(ip)
        raise UnauthorizedError("Invalid passphrase")

    kernel.rate_limiter.record_login_success(ip)
    issue_session_cookie(
        response,
        kernel.key_manager,
        passphrase_version=passphrase_info["passphrase_version"],
        secure=cookie_secure(request),
    )
    return {"status": "ok"}


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Revokes this session server-side, so a copied cookie stops working too."""
    kernel = request.app.state.kernel
    cookie = request.cookies.get(SESSION_COOKIE)
    passphrase_info = await kernel.household.get_passphrase_info()
    if cookie and passphrase_info is not None:
        session = verify_session_cookie(
            cookie, kernel.key_manager, passphrase_info["passphrase_version"]
        )
        if session and session.get("session_id"):
            await kernel.sessions.revoke(session["session_id"])
    clear_session_cookie(response, secure=cookie_secure(request))
    return {"status": "ok"}


@router.get("/session")
async def get_session(request: Request):
    token_info = getattr(request.state, "token_info", None)
    return {
        "authenticated": True,
        "logged_in": True,
        "auth": "token" if token_info else "cookie",
        "plugin_id": token_info["plugin_id"] if token_info else None,
        "actor_member_id": getattr(request.state, "actor_member_id", None),
        "boot_id": request.app.state.kernel.boot_id,
        "version": __version__,
    }

from datetime import datetime, timezone
import hashlib
import hmac
import secrets
import time
from typing import Any
import uuid

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from starlette.middleware.base import BaseHTTPMiddleware

from secretsauce.secrets import KeyManager


def hash_passphrase(passphrase: str, salt: bytes | None = None) -> str:
    if salt is None:
        salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        passphrase.encode("utf-8"),
        salt=salt,
        n=16384,
        r=8,
        p=1,
    )
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_passphrase(passphrase: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) != 3 or parts[0] != "scrypt":
            return False
        salt = bytes.fromhex(parts[1])
        expected = bytes.fromhex(parts[2])
        derived = hashlib.scrypt(
            passphrase.encode("utf-8"),
            salt=salt,
            n=16384,
            r=8,
            p=1,
        )
        return hmac.compare_digest(derived, expected)
    except Exception:
        return False


class RateLimiter:
    def __init__(self):
        # ip -> (consecutive_failures, last_failure_timestamp)
        self._failures: dict[str, tuple[int, float]] = {}

    def check_login_rate_limit(self, ip: str) -> float | None:
        if ip not in self._failures:
            return None
        count, last_time = self._failures[ip]
        if count <= 0:
            return None
        wait_sec = min(2 ** (count - 1), 60.0)
        elapsed = time.monotonic() - last_time
        if elapsed < wait_sec:
            return wait_sec - elapsed
        return None

    def record_login_failure(self, ip: str) -> None:
        count, _ = self._failures.get(ip, (0, 0.0))
        self._failures[ip] = (count + 1, time.monotonic())

    def record_login_success(self, ip: str) -> None:
        self._failures.pop(ip, None)


rate_limiter = RateLimiter()


def issue_session_cookie(
    response: Response,
    key_manager: KeyManager,
    passphrase_version: int,
    secure: bool = False,
) -> str:
    serializer = URLSafeTimedSerializer(
        key_manager.derive_session_key(), salt="session"
    )
    session_id = uuid.uuid4().hex
    token = serializer.dumps(
        {"session_id": session_id, "passphrase_version": passphrase_version}
    )
    response.set_cookie(
        key="ss_session",
        value=token,
        max_age=30 * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
    )
    return token


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key="ss_session",
        path="/",
        httponly=True,
        samesite="lax",
    )


def verify_session_cookie(
    cookie_str: str,
    key_manager: KeyManager,
    expected_version: int,
) -> dict[str, Any] | None:
    serializer = URLSafeTimedSerializer(
        key_manager.derive_session_key(), salt="session"
    )
    try:
        data = serializer.loads(cookie_str, max_age=30 * 24 * 3600)
        if data.get("passphrase_version") != expected_version:
            return None
        return data
    except (BadSignature, SignatureExpired, Exception):
        return None


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Static assets or non-API endpoints pass through
        if not path.startswith("/api"):
            return await call_next(request)

        # /api/health is always public
        if path == "/api/health":
            return await call_next(request)

        kernel = getattr(request.app.state, "kernel", None)
        if kernel is None:
            return await call_next(request)

        # Cross-site cookie check
        if (
            "ss_session" in request.cookies
            and request.headers.get("sec-fetch-site", "").lower() == "cross-site"
        ):
            return JSONResponse(
                status_code=403,
                content={
                    "error": {
                        "code": "forbidden",
                        "message": "Cross-site request blocked",
                    }
                },
            )

        # Setup check
        passphrase_info = await kernel.household.get_passphrase_info()
        is_setup = passphrase_info is not None

        if not is_setup:
            if path == "/api/setup":
                return await call_next(request)
            return JSONResponse(
                status_code=409,
                content={
                    "error": {
                        "code": "setup_required",
                        "message": "Household setup required",
                    }
                },
            )

        # Already set up: /api/setup is blocked
        if path == "/api/setup" and request.method.upper() == "POST":
            return JSONResponse(
                status_code=409,
                content={
                    "error": {
                        "code": "conflict",
                        "message": "Household already set up",
                    }
                },
            )

        # /api/auth/login is public when setup is complete
        if path == "/api/auth/login":
            return await call_next(request)

        # Check authentication (Bearer token or session cookie)
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            verified = await kernel.tokens.verify(token)
            if verified is None:
                return JSONResponse(
                    status_code=401,
                    content={
                        "error": {
                            "code": "unauthorized",
                            "message": "Invalid token",
                        }
                    },
                )
            request.state.token_info = verified
            request.state.actor_member_id = None
            return await call_next(request)

        cookie = request.cookies.get("ss_session")
        if not cookie:
            return JSONResponse(
                status_code=401,
                content={
                    "error": {
                        "code": "unauthorized",
                        "message": "Authentication required",
                    }
                },
            )

        session_data = verify_session_cookie(
            cookie, kernel.key_manager, passphrase_info["passphrase_version"]
        )
        if not session_data:
            return JSONResponse(
                status_code=401,
                content={
                    "error": {
                        "code": "unauthorized",
                        "message": "Invalid or expired session",
                    }
                },
            )

        request.state.session = session_data

        # Check actor member header
        actor_header = request.headers.get("x-actor-member")
        if actor_header:
            try:
                member = await kernel.members.get_member(actor_header)
                request.state.actor_member_id = actor_header
            except Exception:
                request.state.actor_member_id = None
        else:
            request.state.actor_member_id = None

        response = await call_next(request)
        if path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store"
        return response

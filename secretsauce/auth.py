import asyncio
import base64
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import logging
import math
import secrets
import time
from typing import Any
import uuid

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from starlette.middleware.base import BaseHTTPMiddleware

from secretsauce.db import Database
from secretsauce.errors import TooManyRequestsError, error_body
from secretsauce.secrets import KeyManager

logger = logging.getLogger(__name__)

SESSION_COOKIE = "ss_session"
SESSION_MAX_AGE = 30 * 24 * 3600
MIN_PASSPHRASE_LENGTH = 8

# Spec 5.2: scrypt n=2**15, r=8, p=1, 16-byte salt, "scrypt$n$r$p$salt$hash" with base64 parts.
_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**15, 8, 1
_SCRYPT_MAXMEM = 64 * 1024 * 1024


def _scrypt(passphrase: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(
        passphrase.encode("utf-8"), salt=salt, n=n, r=r, p=p, maxmem=_SCRYPT_MAXMEM, dklen=32
    )


def hash_passphrase(passphrase: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    derived = _scrypt(passphrase, salt, _SCRYPT_N, _SCRYPT_R, _SCRYPT_P)
    b64 = lambda raw: base64.b64encode(raw).decode("ascii")  # noqa: E731
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${b64(salt)}${b64(derived)}"


def verify_passphrase(passphrase: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) == 6 and parts[0] == "scrypt":
            n, r, p = int(parts[1]), int(parts[2]), int(parts[3])
            salt, expected = base64.b64decode(parts[4]), base64.b64decode(parts[5])
            derived = _scrypt(passphrase, salt, n, r, p)
        elif len(parts) == 3 and parts[0] == "scrypt":
            # Legacy format: scrypt$<salt hex>$<hash hex> with n=2**14.
            salt, expected = bytes.fromhex(parts[1]), bytes.fromhex(parts[2])
            derived = hashlib.scrypt(passphrase.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
        else:
            return False
        return hmac.compare_digest(derived, expected)
    except (ValueError, TypeError):
        return False


async def hash_passphrase_async(passphrase: str) -> str:
    """scrypt takes ~100 ms of CPU; run it off the event loop."""
    return await asyncio.to_thread(hash_passphrase, passphrase)


async def verify_passphrase_async(passphrase: str, stored_hash: str) -> bool:
    return await asyncio.to_thread(verify_passphrase, passphrase, stored_hash)


class RateLimiter:
    """Consecutive-failure delay per client address (spec 5.3), with bounded memory."""

    def __init__(self, max_entries: int = 10_000):
        self.max_entries = max_entries
        # ip -> (consecutive_failures, last_failure_monotonic)
        self._failures: OrderedDict[str, tuple[int, float]] = OrderedDict()

    def check_login_rate_limit(self, ip: str) -> float | None:
        entry = self._failures.get(ip)
        if entry is None:
            return None
        count, last_time = entry
        wait_sec = min(2 ** (count - 1), 60.0)
        elapsed = time.monotonic() - last_time
        return wait_sec - elapsed if elapsed < wait_sec else None

    def require_allowed(self, ip: str) -> None:
        wait = self.check_login_rate_limit(ip)
        if wait is not None:
            raise TooManyRequestsError(
                "Too many failed attempts. Please try again later.",
                retry_after=max(1, math.ceil(wait)),
            )

    def record_login_failure(self, ip: str) -> None:
        count, _ = self._failures.pop(ip, (0, 0.0))
        self._failures[ip] = (count + 1, time.monotonic())
        while len(self._failures) > self.max_entries:
            self._failures.popitem(last=False)

    def record_login_success(self, ip: str) -> None:
        self._failures.pop(ip, None)

    def reset(self) -> None:
        self._failures.clear()


def client_ip(request: Request) -> str:
    """The client address as resolved by uvicorn's proxy handling (spec 5.1)."""
    return request.client.host if request.client else "unknown"


class SessionStore:
    """Session ids revoked by logout, kept until their cookies would have expired anyway."""

    def __init__(self, db: Database):
        self.db = db
        self._revoked: set[str] = set()

    async def load(self) -> None:
        now = _iso(datetime.now(timezone.utc))
        await self.db.write("DELETE FROM revoked_sessions WHERE expires_at < ?;", (now,))
        rows = await self.db.read_all("SELECT session_id FROM revoked_sessions;")
        self._revoked = {r["session_id"] for r in rows}

    def is_revoked(self, session_id: str | None) -> bool:
        return session_id is None or session_id in self._revoked

    async def revoke(self, session_id: str) -> None:
        expires = _iso(datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE))
        await self.db.write(
            "INSERT OR IGNORE INTO revoked_sessions (session_id, expires_at) VALUES (?, ?);",
            (session_id, expires),
        )
        self._revoked.add(session_id)


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _serializer(key_manager: KeyManager) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(key_manager.derive_session_key(), salt="session")


def make_session_token(key_manager: KeyManager, passphrase_version: int) -> str:
    return _serializer(key_manager).dumps(
        {"session_id": uuid.uuid4().hex, "passphrase_version": passphrase_version}
    )


def cookie_secure(request: Request) -> bool:
    """COOKIE_SECURE: true, false, or auto (Secure when the request scheme is https)."""
    kernel = getattr(request.app.state, "kernel", None)
    setting = (kernel.config.cookie_secure if kernel else "auto").lower()
    if setting in ("true", "1", "yes"):
        return True
    if setting in ("false", "0", "no"):
        return False
    return request.url.scheme == "https"


def issue_session_cookie(
    response: Response,
    key_manager: KeyManager,
    passphrase_version: int,
    secure: bool = False,
) -> str:
    token = make_session_token(key_manager, passphrase_version)
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
    )
    return token


def clear_session_cookie(response: Response, secure: bool = False) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE, path="/", httponly=True, samesite="lax", secure=secure
    )


def verify_session_cookie(
    cookie_str: str,
    key_manager: KeyManager,
    expected_version: int,
) -> dict[str, Any] | None:
    try:
        data = _serializer(key_manager).loads(cookie_str, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(data, dict) or data.get("passphrase_version") != expected_version:
        return None
    return data


def _deny(status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content=error_body(code, message))


# Routes that work without a session once the household is set up.
_PUBLIC = {("GET", "/api/setup"), ("POST", "/api/auth/login")}


class AuthMiddleware(BaseHTTPMiddleware):
    """Authenticates every /api request and fails closed.

    Kernel and cookie-auth plugin routes need the session cookie. Bearer
    tokens are accepted only on routes a plugin mounted with auth="token"
    (scope and owning plugin must match) and on GET /api/auth/session.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api") or path == "/api/health":
            return await call_next(request)

        kernel = getattr(request.app.state, "kernel", None)
        if kernel is None:
            return _deny(503, "unavailable", "Server is starting")

        try:
            denial = await self._authorize(request, kernel)
        except Exception:
            logger.exception("Authentication failed unexpectedly")
            return _deny(500, "internal_error", "Authentication failed")
        if denial is not None:
            return denial

        response = await call_next(request)
        if "cache-control" not in response.headers:
            response.headers["Cache-Control"] = "no-store"
        return response

    async def _authorize(self, request: Request, kernel: Any) -> JSONResponse | None:
        path = request.url.path
        method = request.method.upper()
        request.state.actor_member_id = None
        request.state.token_info = None

        cookie = request.cookies.get(SESSION_COOKIE)
        if cookie and request.headers.get("sec-fetch-site", "").lower() == "cross-site":
            return _deny(403, "forbidden", "Cross-site request blocked")

        passphrase_info = await kernel.household.get_passphrase_info()
        if passphrase_info is None:
            if path == "/api/setup":
                return None
            return _deny(409, "setup_required", "Household setup required")
        if path == "/api/setup" and method != "GET":
            return _deny(409, "conflict", "Household already set up")
        if (method, path) in _PUBLIC:
            return None

        token_route = kernel.router_registry.token_route_for(request.scope)
        auth_header = request.headers.get("authorization")
        if auth_header is not None:
            if not auth_header.startswith("Bearer "):
                return _deny(401, "unauthorized", "Unsupported authorization scheme")
            if token_route is None and not (method == "GET" and path == "/api/auth/session"):
                return _deny(401, "unauthorized", "API tokens are not accepted on this route")
            verified = await kernel.tokens.verify(
                auth_header[7:].strip(),
                required_scope=token_route.scope if token_route else None,
            )
            if verified is None or (
                token_route is not None and verified["plugin_id"] != token_route.plugin_id
            ):
                return _deny(401, "unauthorized", "Invalid token")
            request.state.token_info = verified
            return None

        if token_route is not None:
            return _deny(401, "unauthorized", "This route requires an API token")
        if not cookie:
            return _deny(401, "unauthorized", "Authentication required")

        session = verify_session_cookie(
            cookie, kernel.key_manager, passphrase_info["passphrase_version"]
        )
        if session is None or kernel.sessions.is_revoked(session.get("session_id")):
            return _deny(401, "unauthorized", "Invalid or expired session")
        request.state.session = session

        actor = request.headers.get("x-actor-member")
        if actor and await kernel.members.member_exists(actor):
            request.state.actor_member_id = actor
        return None

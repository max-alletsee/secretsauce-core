"""Outbound HTTP for plugins that fetch user-supplied URLs.

A URL typed by a household member must not become a way to reach the
server's own network (SSRF): the router, other containers, cloud metadata
endpoints. fetch_public_text() only talks to public addresses, re-checks
every redirect hop, and caps the response size.
"""

import asyncio
import ipaddress
import socket
from urllib.parse import urljoin, urlsplit

import httpx

from secretsauce.errors import PayloadTooLargeError, ValidationError

MAX_REDIRECTS = 5
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
USER_AGENT = "Mozilla/5.0 (compatible; SecretSauce/1.0)"


class UnsafeURLError(ValidationError):
    """The URL is malformed, not http(s), or resolves to a non-public address."""


async def _resolve(host: str, port: int) -> list[str]:
    infos = await asyncio.get_running_loop().getaddrinfo(
        host, port, type=socket.SOCK_STREAM
    )
    return [info[4][0] for info in infos]


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%", 1)[0])
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


async def assert_public_url(url: str) -> None:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise UnsafeURLError("Only http and https URLs can be fetched", fields={"url": "Invalid URL"})
    if parts.username or parts.password:
        raise UnsafeURLError("URLs with credentials are not allowed", fields={"url": "Invalid URL"})
    port = parts.port or (443 if parts.scheme == "https" else 80)
    try:
        addresses = await _resolve(parts.hostname, port)
    except (socket.gaierror, UnicodeError):
        raise UnsafeURLError(f"Cannot resolve host '{parts.hostname}'", fields={"url": "Unknown host"})
    if not addresses or not all(_is_public(a) for a in addresses):
        raise UnsafeURLError(
            "URL points to a private or local address", fields={"url": "Address not allowed"}
        )


async def fetch_public_text(
    url: str,
    *,
    timeout: float = 20.0,
    max_bytes: int = MAX_RESPONSE_BYTES,
) -> str:
    """GETs url and returns the body as text; raises on unsafe targets and HTTP errors."""
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        current = url
        for _ in range(MAX_REDIRECTS + 1):
            await assert_public_url(current)
            async with client.stream("GET", current, headers={"User-Agent": USER_AGENT}) as resp:
                if resp.is_redirect and "location" in resp.headers:
                    current = urljoin(current, resp.headers["location"])
                    continue
                if resp.status_code >= 400:
                    raise ValidationError(
                        f"Failed to fetch URL: HTTP {resp.status_code}", fields={"url": "Fetch failed"}
                    )
                chunks: list[bytes] = []
                size = 0
                async for chunk in resp.aiter_bytes():
                    size += len(chunk)
                    if size > max_bytes:
                        raise PayloadTooLargeError(f"Response exceeds {max_bytes} bytes")
                    chunks.append(chunk)
                return b"".join(chunks).decode(resp.encoding or "utf-8", errors="replace")
        raise UnsafeURLError("Too many redirects", fields={"url": "Too many redirects"})

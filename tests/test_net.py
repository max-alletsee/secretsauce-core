import httpx
import pytest

from secretsauce import net
from secretsauce.errors import PayloadTooLargeError


@pytest.fixture
def dns(monkeypatch):
    table: dict[str, list[str]] = {}

    async def fake_resolve(host, port):
        return table[host]

    monkeypatch.setattr(net, "_resolve", fake_resolve)
    return table


@pytest.mark.parametrize(
    "address",
    ["127.0.0.1", "10.1.2.3", "192.168.0.10", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "0.0.0.0"],
)
async def test_private_and_local_addresses_are_refused(dns, address):
    dns["evil.example"] = [address]
    with pytest.raises(net.UnsafeURLError):
        await net.assert_public_url("http://evil.example/recipe")


async def test_any_private_address_in_the_answer_is_refused(dns):
    dns["mixed.example"] = ["93.184.216.34", "10.0.0.1"]
    with pytest.raises(net.UnsafeURLError):
        await net.assert_public_url("https://mixed.example/")


@pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://example.com/", "http://user:pw@example.com/", "not a url"])
async def test_non_http_and_credential_urls_are_refused(dns, url):
    with pytest.raises(net.UnsafeURLError):
        await net.assert_public_url(url)


def _transport(routes):
    def handler(request: httpx.Request) -> httpx.Response:
        return routes[str(request.url)]()
    return httpx.MockTransport(handler)


async def test_redirects_are_rechecked(dns, monkeypatch):
    dns["public.example"] = ["93.184.216.34"]
    dns["internal.example"] = ["10.0.0.5"]
    routes = {
        "https://public.example/r": lambda: httpx.Response(302, headers={"location": "http://internal.example/admin"}),
        "http://internal.example/admin": lambda: httpx.Response(200, text="secret"),
    }
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        net.httpx, "AsyncClient", lambda **kw: real_client(transport=_transport(routes), **kw)
    )
    with pytest.raises(net.UnsafeURLError):
        await net.fetch_public_text("https://public.example/r")


async def test_fetch_returns_text_and_caps_size(dns, monkeypatch):
    dns["public.example"] = ["93.184.216.34"]
    routes = {
        "https://public.example/ok": lambda: httpx.Response(200, text="<h1>Soup</h1>"),
        "https://public.example/huge": lambda: httpx.Response(200, content=b"x" * 2048),
    }
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        net.httpx, "AsyncClient", lambda **kw: real_client(transport=_transport(routes), **kw)
    )
    assert await net.fetch_public_text("https://public.example/ok") == "<h1>Soup</h1>"
    with pytest.raises(PayloadTooLargeError):
        await net.fetch_public_text("https://public.example/huge", max_bytes=1024)

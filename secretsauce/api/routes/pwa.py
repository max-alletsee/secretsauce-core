import hashlib
import json
from pathlib import Path
from typing import Any
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse

import secretsauce
from secretsauce.auth import verify_session_cookie

router = APIRouter()

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static"


def compute_precache_info() -> dict[str, Any]:
    if not STATIC_DIR.exists():
        return {"build": "dev", "files": []}
    files = []
    hasher = hashlib.sha256()
    for p in sorted(STATIC_DIR.rglob("*")):
        if p.is_file() and p.name != "sw.js" and p.name != "index.html":
            rel = "/" + p.relative_to(STATIC_DIR.parent).as_posix()
            files.append(rel)
            hasher.update(p.read_bytes())
    version = getattr(secretsauce, "__version__", "0.1.0")
    hasher.update(version.encode("utf-8"))
    return {"build": hasher.hexdigest()[:16], "files": files}


@router.get("/manifest.webmanifest")
async def get_manifest(request: Request) -> Response:
    kernel = getattr(request.app.state, "kernel", None)
    base_path = kernel.config.base_path if kernel else "/"
    if not base_path.endswith("/"):
        base_path += "/"

    household_name = None
    cookie = request.cookies.get("ss_session")
    if kernel and cookie:
        passphrase_info = await kernel.household.get_passphrase_info()
        if passphrase_info is not None:
            session_data = verify_session_cookie(
                cookie, kernel.key_manager, passphrase_info["passphrase_version"]
            )
            if session_data:
                cfg = await kernel.household.get_config()
                household_name = cfg.get("household_name")

    name = f"SecretSauce – {household_name}" if household_name else "SecretSauce"

    manifest_data = {
        "id": base_path,
        "name": name,
        "short_name": "SecretSauce",
        "start_url": base_path,
        "scope": base_path,
        "display": "standalone",
        "background_color": "#faf7f2",
        "theme_color": "#c2410c",
        "icons": [
            {"src": f"{base_path}static/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": f"{base_path}static/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": f"{base_path}static/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
        "share_target": {
            "action": f"{base_path}share",
            "method": "GET",
            "params": {"title": "title", "text": "text", "url": "url"},
        },
    }
    return Response(
        content=json.dumps(manifest_data, indent=2),
        media_type="application/manifest+json",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/sw.js")
async def get_sw(request: Request) -> Response:
    sw_path = STATIC_DIR / "sw.js"
    if not sw_path.exists():
        content = "/* sw.js not found - development mode */"
    else:
        content = sw_path.read_text(encoding="utf-8")

    precache_data = compute_precache_info()
    content = content.replace("__SS_PRECACHE__", json.dumps(precache_data))

    return Response(
        content=content,
        media_type="text/javascript",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/static/{file_path:path}")
async def get_static_file(file_path: str) -> Response:
    if file_path == "sw.js" or file_path == "index.html" or ".." in file_path:
        raise HTTPException(status_code=404, detail="Not found")
    target = (STATIC_DIR / file_path).resolve()
    static_resolved = STATIC_DIR.resolve()
    try:
        target.relative_to(static_resolved)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        target,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


def render_index_html(kernel, base_path: str) -> str:
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        template = index_file.read_text(encoding="utf-8")
    else:
        template = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SecretSauce</title>
  <script>__SS_INJECT__</script>
</head>
<body>
  <div id="app"></div>
</body>
</html>"""
    ss_meta = {
        "boot_id": kernel.boot_id if kernel else "dev",
        "base_path": base_path,
        "version": getattr(secretsauce, "__version__", "0.1.0"),
    }
    inject_script = f"window.__SS__ = {json.dumps(ss_meta)};"
    if "__SS_INJECT__" in template:
        return template.replace("__SS_INJECT__", inject_script)
    elif "<head>" in template:
        return template.replace("<head>", f"<head><script>{inject_script}</script>")
    return f"<script>{inject_script}</script>\n" + template

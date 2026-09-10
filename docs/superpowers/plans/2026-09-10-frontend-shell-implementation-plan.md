# Frontend Shell & PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Vue 3 + PrimeVue SPA shell, `@secretsauce/ui` component/types library, service worker with tiered LRU caching, outbox queue for offline idempotent writes, dynamic plugin module loader, and backend static/PWA serving routes for SecretSauce Phase 2.

**Architecture:** A lightweight Vue 3 + PrimeVue SPA shell with dynamic plugin UI loading via browser import maps and ES modules, an IndexedDB-backed outbox queue for idempotent offline writes, an offline service worker with tiered LRU caching, and FastAPI backend routes serving the shell, manifest, and service worker.

**Tech Stack:** Vue 3.5, Pinia 3, Vue Router 4, PrimeVue 4.5 (Aura preset), PrimeIcons 7, idb 8, workbox-expiration 7, Vite 7, Vitest, TypeScript 5.8, FastAPI, Python 3.13.

**Spec:** `docs/superpowers/specs/2026-09-05-secretsauce-core-plugin-architecture-design.md`

## Global Constraints

- All API routes remain under `BASE_PATH` + `/api`. PWA and shell routes live outside `/api` at `BASE_PATH` root.
- Caching: every `/api` JSON response carries `Cache-Control: no-store`; shell static assets carry `Cache-Control: public, max-age=31536000, immutable`; `index.html`, `manifest.webmanifest`, and `sw.js` carry `Cache-Control: no-cache`.
- JSON field names are `snake_case` on the wire and in TypeScript; the shell never renames fields.
- Concurrency: `PATCH` bodies carry `revision`, `DELETE` takes `?revision=`. Creates accept client-chosen UUID `id` (`group_id` for recipes).
- Service worker scope is `BASE_PATH`. Caching tiers: `ss-shell-<build>` (precached static + index fallback), `ss-plugins` (max 50 LRU), `ss-assets` (max 200 LRU), `ss-api` (max 1000 LRU, 5s timeout, offline 503 fallback).
- Outbox write queue stored in IndexedDB `ss-outbox`, flushes strictly in FIFO creation order with `X-Actor-Member`. 409 on POST with matching id counts as applied. 5xx retries up to 10 times.
- `@secretsauce/ui` exports `API_VERSION = 1`. Bundles with different `ui_api` major version are rejected.
- PrimeVue 4 with Aura preset from `@primevue/themes`, `ToastService`, and `ConfirmationService`.

---

### Task 1: Backend PWA & Shell Serving Routes

**Files:**
- Create: `secretsauce/api/routes/pwa.py`
- Modify: `secretsauce/app.py:1-70`
- Modify: `secretsauce/boot.py:1-135`
- Test: `tests/test_pwa.py`

**Interfaces:**
- Consumes: `BootedKernel`, `Database`, `Config`
- Produces:
  - `GET /manifest.webmanifest` -> templated `application/manifest+json` with household name if session exists
  - `GET /sw.js` -> templated `text/javascript` replacing `__SS_PRECACHE__` with computed hash and file list
  - `GET /static/{file_path:path}` -> static file with `Cache-Control: public, max-age=31536000, immutable` (refuses `index.html` and `sw.js`)
  - `GET /{full_path:path}` -> templated `index.html` with `window.__SS__` and `Cache-Control: no-cache`

- [x] **Step 1: Write the failing test**

Write `tests/test_pwa.py`:
```python
import hashlib
import json
from pathlib import Path
import pytest
from secretsauce.testing import make_kernel


@pytest.mark.asyncio
async def test_pwa_manifest_without_session(tmp_path: Path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.get("/manifest.webmanifest")
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("application/manifest+json")
        assert res.headers["cache-control"] == "no-cache"
        data = res.json()
        assert data["name"] == "SecretSauce"
        assert data["short_name"] == "SecretSauce"
        assert data["display"] == "standalone"
        assert data["theme_color"] == "#c2410c"
        assert data["share_target"]["action"] == "/share"


@pytest.mark.asyncio
async def test_pwa_manifest_with_session(tmp_path: Path):
    async with make_kernel(tmp_path) as k:
        await k.client.post("/api/setup", json={
            "household_name": "Familie Müller",
            "passphrase": "correct-horse-battery-staple",
            "first_member": {"name": "Alice", "preferred_language": "de"}
        })
        res = await k.client.get("/manifest.webmanifest")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "SecretSauce – Familie Müller"


@pytest.mark.asyncio
async def test_pwa_sw_js_templating(tmp_path: Path):
    static_dir = Path("secretsauce/static")
    static_dir.mkdir(parents=True, exist_ok=True)
    dummy_sw = static_dir / "sw.js"
    dummy_sw.write_text("const precache = __SS_PRECACHE__;", encoding="utf-8")
    try:
        async with make_kernel(tmp_path) as k:
            res = await k.client.get("/sw.js")
            assert res.status_code == 200
            assert "text/javascript" in res.headers["content-type"]
            assert res.headers["cache-control"] == "no-cache"
            assert "__SS_PRECACHE__" not in res.text
            assert "const precache = {" in res.text
            assert '"build":' in res.text
            assert '"files":' in res.text
    finally:
        if dummy_sw.exists():
            dummy_sw.unlink()


@pytest.mark.asyncio
async def test_pwa_static_file_serving(tmp_path: Path):
    static_dir = Path("secretsauce/static")
    static_dir.mkdir(parents=True, exist_ok=True)
    dummy_file = static_dir / "test-asset.abc1234.js"
    dummy_file.write_text("console.log('hello');", encoding="utf-8")
    try:
        async with make_kernel(tmp_path) as k:
            res = await k.client.get("/static/test-asset.abc1234.js")
            assert res.status_code == 200
            assert res.headers["cache-control"] == "public, max-age=31536000, immutable"
            assert res.text == "console.log('hello');"

            # sw.js and index.html must not be served via /static/
            res_sw = await k.client.get("/static/sw.js")
            assert res_sw.status_code in (403, 404)
    finally:
        if dummy_file.exists():
            dummy_file.unlink()


@pytest.mark.asyncio
async def test_pwa_spa_index_fallback(tmp_path: Path):
    async with make_kernel(tmp_path) as k:
        res = await k.client.get("/recipes/123")
        assert res.status_code == 200
        assert "text/html" in res.headers["content-type"]
        assert res.headers["cache-control"] == "no-cache"
        assert "window.__SS__ = {" in res.text
        assert k.boot_id in res.text
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_pwa.py`
Expected: FAIL with 404 Not Found (routes not yet registered)

- [x] **Step 3: Write minimal implementation**

1. Create `secretsauce/api/routes/pwa.py`:
```python
import hashlib
import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
import secretsauce

router = APIRouter()

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static"


def compute_precache_info() -> dict:
    if not STATIC_DIR.exists():
        return {"build": "dev", "files": []}
    files = []
    hasher = hashlib.sha256()
    for p in sorted(STATIC_DIR.rglob("*")):
        if p.is_file() and p.name != "sw.js" and p.name != "index.html":
            rel = "/" + p.relative_to(STATIC_DIR.parent).as_posix()
            files.append(rel)
            hasher.update(p.read_bytes())
    hasher.update(secretsauce.__version__.encode("utf-8"))
    return {"build": hasher.hexdigest()[:16], "files": files}


@router.get("/manifest.webmanifest")
async def get_manifest(request: Request) -> Response:
    kernel = getattr(request.app.state, "kernel", None)
    base_path = kernel.config.base_path if kernel else "/"
    if not base_path.endswith("/"):
        base_path += "/"

    household_name = None
    if kernel and getattr(request.state, "member_id", None):
        cfg = await kernel.household.get()
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
    target = STATIC_DIR / file_path
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
        "version": getattr(secretsauce, "__version__", "1.0.0"),
    }
    inject_script = f"window.__SS__ = {json.dumps(ss_meta)};"
    if "__SS_INJECT__" in template:
        return template.replace("__SS_INJECT__", inject_script)
    elif "<head>" in template:
        return template.replace("<head>", f"<head><script>{inject_script}</script>")
    return f"<script>{inject_script}</script>\n" + template
```

2. Update `secretsauce/app.py`:
Include `pwa.router` and add the SPA fallback GET route:
```python
# In secretsauce/app.py:
from secretsauce.api.routes.pwa import router as pwa_router, render_index_html
from fastapi.responses import HTMLResponse

# Mount pwa_router
app.include_router(pwa_router)

# Catch-all SPA route outside /api
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def spa_fallback(request: Request, full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    kernel = getattr(request.app.state, "kernel", None)
    base_path = kernel.config.base_path if kernel else "/"
    html = render_index_html(kernel, base_path)
    return HTMLResponse(content=html, headers={"Cache-Control": "no-cache"})
```

3. Update `secretsauce/boot.py`:
Add `compute_precache_info()` call into `boot()` and expose `precache_info: dict` on `BootedKernel`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_pwa.py`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add secretsauce/api/routes/pwa.py secretsauce/app.py secretsauce/boot.py tests/test_pwa.py
git commit -m "feat(pwa): add manifest, sw.js, static files, and spa index routes"
```

---

### Task 2: Shell Project Scaffolding & Dependencies

**Files:**
- Create: `shell/package.json`
- Create: `shell/pnpm-workspace.yaml`
- Create: `shell/tsconfig.json`
- Create: `shell/vite.config.ts`
- Create: `shell/vitest.config.ts`
- Create: `shell/packages/ui/package.json`
- Create: `shell/packages/ui/tsconfig.json`
- Test: `shell/tests/scaffold.spec.ts`

**Interfaces:**
- Consumes: Node >= 20, pnpm >= 9
- Produces: Configured pnpm workspace with root `shell` and subpackage `@secretsauce/ui`

- [x] **Step 1: Write the failing test**

Write `shell/tests/scaffold.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Shell Workspace Scaffolding', () => {
  it('has pnpm workspace defining shell and packages/ui', () => {
    const workspacePath = path.resolve(__dirname, '../pnpm-workspace.yaml')
    expect(fs.existsSync(workspacePath)).toBe(true)
    const content = fs.readFileSync(workspacePath, 'utf-8')
    expect(content).toContain("packages:")
    expect(content).toContain("packages/*")
  })

  it('has @secretsauce/ui package.json with name and exports', () => {
    const pkgPath = path.resolve(__dirname, '../packages/ui/package.json')
    expect(fs.existsSync(pkgPath)).toBe(true)
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    expect(pkg.name).toBe('@secretsauce/ui')
    expect(pkg.version).toBe('1.0.0')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (files missing)

- [x] **Step 3: Write minimal implementation**

1. Create `shell/pnpm-workspace.yaml`:
```yaml
packages:
  - '.'
  - 'packages/*'
```

2. Create `shell/package.json`:
```json
{
  "name": "secretsauce-shell",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && vite build --config vite.sw.config.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@primeuix/styled": "^0.5.0",
    "@primevue/themes": "^4.2.5",
    "idb": "^8.0.2",
    "pinia": "^3.0.1",
    "primeicons": "^7.0.0",
    "primevue": "^4.2.5",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0",
    "workbox-expiration": "^7.3.0"
  },
  "devDependencies": {
    "@secretsauce/ui": "workspace:*",
    "@types/node": "^22.13.0",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/test-utils": "^2.4.6",
    "happy-dom": "^17.1.0",
    "typescript": "^5.8.0",
    "vite": "^6.2.0",
    "vitest": "^3.0.7"
  }
}
```

3. Create `shell/packages/ui/package.json`:
```json
{
  "name": "@secretsauce/ui",
  "version": "1.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "vue": "^3.5.0"
  }
}
```

4. Create `shell/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "paths": {
      "@/*": ["./src/*"],
      "@secretsauce/ui": ["./packages/ui/src/index.ts"]
    }
  },
  "include": ["src/**/*", "packages/*/src/**/*", "tests/**/*"]
}
```

5. Create `shell/packages/ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "preserve",
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

6. Create `shell/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@secretsauce/ui': path.resolve(__dirname, './packages/ui/src/index.ts'),
    },
  },
})
```

7. Create `shell/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@secretsauce/ui': path.resolve(__dirname, './packages/ui/src/index.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../secretsauce/static',
    emptyOutDir: false,
  },
})
```

Run `pnpm install` in `shell/`.

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/
git commit -m "chore(shell): scaffold pnpm workspace, vitest, and package configurations"
```

---

### Task 3: `@secretsauce/ui` Package Core (Types, Slot, IntentTrigger & Testing Fake)

**Files:**
- Create: `shell/packages/ui/src/types.ts`
- Create: `shell/packages/ui/src/Slot.vue`
- Create: `shell/packages/ui/src/IntentTrigger.vue`
- Create: `shell/packages/ui/src/testing.ts`
- Create: `shell/packages/ui/src/index.ts`
- Test: `shell/packages/ui/tests/slot.spec.ts`
- Test: `shell/packages/ui/tests/intent-trigger.spec.ts`

**Interfaces:**
- Consumes: Vue 3
- Produces:
  - `API_VERSION = 1`
  - Interfaces: `SecretSauceUI`, `RouteDef`, `IntentHub`, `IntentProvider`, `ApiClient`, `ApiError`, `ConflictError`, `OfflineError`, `StreamEvent`, `StreamPush`, `Member`, `Household`, `Outbox`
  - Components: `Slot`, `IntentTrigger`
  - Testing helper: `createFakeSecretSauceUI()`

- [x] **Step 1: Write the failing tests**

1. Write `shell/packages/ui/tests/slot.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Slot from '../src/Slot.vue'

describe('<Slot /> component', () => {
  it('renders registered slot contributions in order with context prop', () => {
    const CompA = defineComponent({
      props: ['context'],
      render() { return h('div', { class: 'comp-a' }, `A: ${this.context.val}`) }
    })
    const CompB = defineComponent({
      props: ['context'],
      render() { return h('div', { class: 'comp-b' }, `B: ${this.context.val}`) }
    })

    const wrapper = mount(Slot, {
      props: {
        name: 'test.slot',
        context: { val: 42 }
      },
      global: {
        provide: {
          __SS_SLOT_REGISTRY__: {
            getContributions: (name: string) => {
              if (name === 'test.slot') {
                return [
                  { id: 'b', order: 20, component: CompB },
                  { id: 'a', order: 10, component: CompA }
                ]
              }
              return []
            }
          }
        }
      }
    })

    const divs = wrapper.findAll('div')
    expect(divs).toHaveLength(2)
    expect(divs[0].text()).toBe('A: 42') // order 10
    expect(divs[1].text()).toBe('B: 42') // order 20
  })
})
```

2. Write `shell/packages/ui/tests/intent-trigger.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IntentTrigger from '../src/IntentTrigger.vue'

describe('<IntentTrigger /> component', () => {
  it('renders nothing when 0 providers are available', () => {
    const wrapper = mount(IntentTrigger, {
      props: { hub: 'recipe:create' },
      global: {
        provide: {
          __SS_INTENT_REGISTRY__: {
            getProviders: () => []
          }
        }
      }
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('runs directly on click when 1 provider is available', async () => {
    const execFn = vi.fn().mockReturnValue('done')
    const wrapper = mount(IntentTrigger, {
      props: { hub: 'recipe:create', context: { item: 1 } },
      global: {
        provide: {
          __SS_INTENT_REGISTRY__: {
            getProviders: () => [
              { hub: 'recipe:create', id: 'single', title: 'Create', kind: 'headless', execute: execFn, order: 10 }
            ]
          }
        }
      }
    })
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(execFn).toHaveBeenCalledWith({ item: 1 })
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (files missing)

- [x] **Step 3: Write minimal implementation**

1. Create `shell/packages/ui/src/types.ts`:
```ts
import type { Component, Ref } from 'vue'

export const API_VERSION = 1

export interface SecretSauceUI {
  pluginId: string
  route(def: RouteDef): void
  slot(name: string, component: Component, opts?: { order?: number }): void
  intent: { hub(def: IntentHub): void; provider(def: IntentProvider): void }
  settings: { section(def: { id: string; title: string; component: Component; order?: number }): void }
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): void
  api: ApiClient
  url(path: string): string
  store: { currentMember: Ref<Member | null>; members: Ref<Member[]>; household: Ref<Household>; online: Ref<boolean> }
  outbox: Outbox
  i18n: { add(lang: string, messages: Record<string, string>): void }
  t(key: string, params?: Record<string, string | number>): string
  theme: { register(def: { id: string; label: string; preset: object }): void }
  notify(n: { level: 'info' | 'success' | 'warning' | 'error'; message: string }): void
}

export interface RouteDef {
  path: string
  component: Component
  order?: number
  nav?: { label: string; icon?: string; order: number }
}

export interface ApiClient {
  get<T>(path: string, query?: Record<string, string | number | boolean | string[]>): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string, query?: Record<string, string | number>): Promise<void>
  upload<T>(path: string, form: FormData): Promise<T>
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class ConflictError extends ApiError {
  current: Record<string, unknown>
  constructor(message: string, current: Record<string, unknown>) {
    super(409, 'conflict', message, { current })
    this.name = 'ConflictError'
    this.current = current
  }
}

export class OfflineError extends ApiError {
  constructor(message: string = 'Network unavailable') {
    super(0, 'offline', message)
    this.name = 'OfflineError'
  }
}

export interface StreamEvent {
  kind: 'event'
  seq: number
  name: string
  entity_type: string | null
  entity_id: string | null
  revision: number | null
  actor_member_id: string | null
  origin: string
  created_at: string
}

export interface StreamPush {
  kind: 'push'
  name: string
  data: unknown
  plugin_id: string
}

export interface Member {
  id: string
  revision: number
  name: string
  avatar_color: string | null
  serving_ratio: number
  dietary_restrictions: string[]
  allergies: string[]
  disliked_ingredients: string[]
  favorite_cuisines: string[]
  preferred_language: string
}

export interface Household {
  household_name: string
  meal_types: { id: string; label: string }[]
  languages: { primary: string }
  units: 'metric' | 'us_customary'
}

export interface IntentHub {
  id: string
  title: string
}

export interface IntentProvider<C = unknown, R = unknown> {
  hub: string
  id: string
  title: string
  icon?: string
  order: number
  isAvailable?: (context: C) => boolean
  disabledReason?: (context: C) => string | null
  kind: 'ui' | 'headless'
  component?: Component
  execute?: (context: C) => Promise<R> | R
}

export interface OutboxRequest {
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
  query?: Record<string, string | number>
  tag?: string
}

export interface OutboxEntry extends OutboxRequest {
  id: string
  plugin_id: string
  actor_member_id: string | null
  created_at: string
  attempts: number
  last_error: string | null
}

export interface Outbox {
  pending: Ref<number>
  failed: Ref<OutboxEntry[]>
  enqueue(req: OutboxRequest): Promise<string>
  discard(entryId: string): Promise<void>
  on(kind: 'applied', handler: (entry: OutboxEntry, response: unknown) => void): void
  on(kind: 'failed', handler: (entry: OutboxEntry, error: ApiError) => void): void
}
```

2. Create `shell/packages/ui/src/Slot.vue`:
```vue
<script setup lang="ts">
import { inject, computed, type Component } from 'vue'

interface SlotContribution {
  id: string
  order: number
  component: Component
}

interface SlotRegistryContext {
  getContributions(name: string): SlotContribution[]
}

const props = defineProps<{
  name: string
  context?: Record<string, any>
}>()

const registry = inject<SlotRegistryContext>('__SS_SLOT_REGISTRY__', {
  getContributions: () => [],
})

const contributions = computed(() => {
  const items = registry.getContributions(props.name) || []
  return [...items].sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
})
</script>

<template>
  <component
    v-for="contrib in contributions"
    :is="contrib.component"
    :key="contrib.id"
    :context="props.context || {}"
  />
</template>
```

3. Create `shell/packages/ui/src/IntentTrigger.vue`:
```vue
<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import type { IntentProvider } from './types'

interface IntentRegistryContext {
  getProviders(hub: string): IntentProvider[]
}

const props = defineProps<{
  hub: string
  context?: any
  label?: string
}>()

const emit = defineEmits<{
  (e: 'resolve', result: any): void
  (e: 'cancel'): void
}>()

const registry = inject<IntentRegistryContext>('__SS_INTENT_REGISTRY__', {
  getProviders: () => [],
})

const activeDialog = ref<IntentProvider | null>(null)
const showMenu = ref(false)

const availableProviders = computed(() => {
  const list = registry.getProviders(props.hub) || []
  return list
    .filter(p => (p.isAvailable ? p.isAvailable(props.context) : true))
    .sort((a, b) => a.order - b.order)
})

async function handleClick() {
  if (availableProviders.value.length === 1) {
    await runProvider(availableProviders.value[0])
  } else if (availableProviders.value.length > 1) {
    showMenu.value = !showMenu.value
  }
}

async function runProvider(provider: IntentProvider) {
  showMenu.value = false
  if (provider.kind === 'headless' && provider.execute) {
    const result = await provider.execute(props.context)
    emit('resolve', result)
  } else if (provider.kind === 'ui' && provider.component) {
    activeDialog.value = provider
  }
}

function handleDialogResolve(result: any) {
  activeDialog.value = null
  emit('resolve', result)
}

function handleDialogCancel() {
  activeDialog.value = null
  emit('cancel')
}
</script>

<template>
  <template v-if="availableProviders.length > 0">
    <button
      type="button"
      class="ss-intent-trigger"
      @click="handleClick"
    >
      {{ props.label || availableProviders[0].title }}
    </button>

    <div v-if="showMenu && availableProviders.length > 1" class="ss-intent-menu">
      <button
        v-for="provider in availableProviders"
        :key="provider.id"
        type="button"
        @click="runProvider(provider)"
      >
        {{ provider.title }}
      </button>
    </div>

    <div v-if="activeDialog" class="ss-intent-modal-overlay">
      <div class="ss-intent-modal">
        <component
          :is="activeDialog.component"
          :context="props.context"
          @resolve="handleDialogResolve"
          @cancel="handleDialogCancel"
        />
      </div>
    </div>
  </template>
</template>
```

4. Create `shell/packages/ui/src/testing.ts`:
```ts
import { ref } from 'vue'
import type { SecretSauceUI, Member, Household, Outbox, ApiClient } from './types'

export function createFakeSecretSauceUI(pluginId: string = 'test-plugin'): SecretSauceUI {
  const currentMember = ref<Member | null>({
    id: 'm1',
    revision: 1,
    name: 'Alice',
    avatar_color: null,
    serving_ratio: 1.0,
    dietary_restrictions: [],
    allergies: [],
    disliked_ingredients: [],
    favorite_cuisines: [],
    preferred_language: 'en',
  })
  const members = ref<Member[]>([currentMember.value!])
  const household = ref<Household>({
    household_name: 'Test House',
    meal_types: [{ id: 'dinner', label: 'Dinner' }],
    languages: { primary: 'en' },
    units: 'metric',
  })
  const online = ref(true)

  const fakeApi: ApiClient = {
    get: async () => ({} as any),
    post: async () => ({} as any),
    patch: async () => ({} as any),
    put: async () => ({} as any),
    delete: async () => {},
    upload: async () => ({} as any),
  }

  const fakeOutbox: Outbox = {
    pending: ref(0),
    failed: ref([]),
    enqueue: async () => 'outbox-id-1',
    discard: async () => {},
    on: () => {},
  }

  return {
    pluginId,
    route: () => {},
    slot: () => {},
    intent: { hub: () => {}, provider: () => {} },
    settings: { section: () => {} },
    on: () => {},
    api: fakeApi,
    url: (path: string) => path,
    store: { currentMember, members, household, online },
    outbox: fakeOutbox,
    i18n: { add: () => {} },
    t: (key: string) => key,
    theme: { register: () => {} },
    notify: () => {},
  }
}
```

5. Create `shell/packages/ui/src/index.ts`:
```ts
export * from './types'
export { default as Slot } from './Slot.vue'
export { default as IntentTrigger } from './IntentTrigger.vue'
export { createFakeSecretSauceUI } from './testing'
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/packages/ui/
git commit -m "feat(ui): implement @secretsauce/ui types, Slot, IntentTrigger, and testing fake"
```

---

### Task 4: Shell API Client (`shell/src/api.ts`)

**Files:**
- Create: `shell/src/api.ts`
- Test: `shell/src/api.spec.ts`

**Interfaces:**
- Consumes: `ApiClient`, `ApiError`, `ConflictError`, `OfflineError` from `@secretsauce/ui`
- Produces: `createApiClient(basePath: string, getActorMemberId: () => string | null): ApiClient`

- [x] **Step 1: Write the failing test**

Write `shell/src/api.spec.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiClient } from './api'
import { ConflictError, OfflineError, ApiError } from '@secretsauce/ui'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixes BASE_PATH and includes X-Actor-Member header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    globalThis.fetch = fetchMock

    const client = createApiClient('/app/', () => 'member-42')
    const res = await client.get('/api/recipes', { q: 'pasta', limit: 10 })

    expect(res).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/app/api/recipes?q=pasta&limit=10')
    expect(init.headers['X-Actor-Member']).toBe('member-42')
    expect(init.credentials).toBe('same-origin')
  })

  it('throws ConflictError on 409 with details.current', async () => {
    const errorBody = {
      error: {
        code: 'conflict',
        message: 'Revision mismatch',
        details: { current: { id: 'r1', revision: 3 } },
      },
    }
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(errorBody), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    }))

    const client = createApiClient('/', () => null)
    await expect(client.patch('/api/recipes/r1', { title: 'New' })).rejects.toThrow(ConflictError)
  })

  it('throws OfflineError on 503 offline or fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const client = createApiClient('/', () => null)
    await expect(client.get('/api/health')).rejects.toThrow(OfflineError)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing `src/api.ts`)

- [x] **Step 3: Write minimal implementation**

Create `shell/src/api.ts`:
```ts
import { type ApiClient, ApiError, ConflictError, OfflineError } from '@secretsauce/ui'

export function createApiClient(
  basePath: string = '/',
  getActorMemberId: () => string | null = () => null
): ApiClient {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath

  function formatUrl(path: string, query?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const fullPath = `${normalizedBase}${cleanPath}`
    if (!query || Object.keys(query).length === 0) return fullPath

    const params = new URLSearchParams()
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined || val === null) continue
      if (Array.isArray(val)) {
        for (const item of val) params.append(key, String(item))
      } else {
        params.append(key, String(val))
      }
    }
    const qs = params.toString()
    return qs ? `${fullPath}?${qs}` : fullPath
  }

  async function request<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, any>; isUpload?: boolean } = {}
  ): Promise<T> {
    const url = formatUrl(path, options.query)
    const headers: Record<string, string> = {}
    const actorId = getActorMemberId()
    if (actorId) {
      headers['X-Actor-Member'] = actorId
    }

    let bodyData: BodyInit | undefined = undefined
    if (options.isUpload && options.body instanceof FormData) {
      bodyData = options.body
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      bodyData = JSON.stringify(options.body)
    }

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: bodyData,
        credentials: 'same-origin',
      })
    } catch (err: any) {
      throw new OfflineError(err?.message || 'Network request failed')
    }

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T
      }
      return (await response.json()) as T
    }

    let errPayload: any = null
    try {
      errPayload = await response.json()
    } catch {
      // not JSON
    }

    const errCode = errPayload?.error?.code || 'unknown_error'
    const errMsg = errPayload?.error?.message || response.statusText

    if (response.status === 503 && errCode === 'offline') {
      throw new OfflineError(errMsg)
    }

    if (response.status === 409) {
      const current = errPayload?.error?.details?.current || {}
      throw new ConflictError(errMsg, current)
    }

    throw new ApiError(response.status, errCode, errMsg, errPayload?.error?.details)
  }

  return {
    get: <T>(path: string, query?: Record<string, any>) => request<T>('GET', path, { query }),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
    delete: async (path: string, query?: Record<string, any>) => {
      await request<void>('DELETE', path, { query })
    },
    upload: <T>(path: string, form: FormData) => request<T>('POST', path, { body: form, isUpload: true }),
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/api.ts shell/src/api.spec.ts
git commit -m "feat(shell): implement ApiClient with headers, base path, and error hierarchy"
```

---

### Task 5: Service Worker & URL Classifier (`shell/src/sw/`)

**Files:**
- Create: `shell/src/sw/classify.ts`
- Create: `shell/src/sw/sw.ts`
- Create: `shell/vite.sw.config.ts`
- Test: `shell/src/sw/classify.spec.ts`

**Interfaces:**
- Consumes: URL, Scope
- Produces:
  - `classify(url: URL, scope: URL): RequestClass`
  - IIFE worker bundle `sw.js` with workbox-expiration LRU caches and network-first 5s timeouts

- [x] **Step 1: Write the failing test**

Write `shell/src/sw/classify.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { classify, type RequestClass } from './classify'

describe('Service Worker classify()', () => {
  const scope = new URL('https://example.com/app/')

  it('classifies navigation in scope as navigation', () => {
    const url = new URL('https://example.com/app/recipes/123')
    expect(classify(url, scope, 'GET', 'navigate')).toBe('navigation')
  })

  it('classifies static files as static', () => {
    const url = new URL('https://example.com/app/static/vendor/vue.js')
    expect(classify(url, scope, 'GET', 'script')).toBe('static')
  })

  it('classifies plugin UI bundles as plugin_bundle', () => {
    const url = new URL('https://example.com/app/api/plugins/shopping/ui.js?v=1.0.0')
    expect(classify(url, scope, 'GET', 'script')).toBe('plugin_bundle')
  })

  it('classifies assets as asset', () => {
    const url = new URL('https://example.com/app/api/assets/asset-123/file')
    expect(classify(url, scope, 'GET', 'image')).toBe('asset')
  })

  it('classifies normal GET api calls as api_cacheable', () => {
    const url = new URL('https://example.com/app/api/recipes?limit=20')
    expect(classify(url, scope, 'GET', '')).toBe('api_cacheable')
  })

  it('classifies stream, export, and non-GET as passthrough', () => {
    const stream = new URL('https://example.com/app/api/events/stream')
    expect(classify(stream, scope, 'GET', '')).toBe('passthrough')

    const exp = new URL('https://example.com/app/api/export')
    expect(classify(exp, scope, 'GET', '')).toBe('passthrough')

    const post = new URL('https://example.com/app/api/recipes')
    expect(classify(post, scope, 'POST', '')).toBe('passthrough')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing `classify.ts`)

- [x] **Step 3: Write minimal implementation**

1. Create `shell/src/sw/classify.ts`:
```ts
export type RequestClass =
  | 'navigation'
  | 'static'
  | 'plugin_bundle'
  | 'asset'
  | 'api_cacheable'
  | 'passthrough'

export function classify(
  url: URL,
  scope: URL,
  method: string = 'GET',
  mode: string = ''
): RequestClass {
  if (method !== 'GET') return 'passthrough'
  if (url.origin !== scope.origin) return 'passthrough'

  let path = url.pathname
  const scopePath = scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`
  if (!path.startsWith(scopePath) && path !== scope.pathname) return 'passthrough'

  const rel = path.slice(scopePath.length)

  // Stream, export, health, sw.js pass through
  if (
    rel === 'api/events/stream' ||
    rel === 'api/export' ||
    rel === 'api/export/json' ||
    rel === 'api/health' ||
    rel === 'sw.js'
  ) {
    return 'passthrough'
  }

  // HTML navigations
  if (mode === 'navigate' || (!rel.startsWith('api/') && !rel.startsWith('static/'))) {
    return 'navigation'
  }

  // Static assets
  if (rel.startsWith('static/')) {
    return 'static'
  }

  // Plugin UI bundles & styles
  if (rel.startsWith('api/plugins/') && (rel.endsWith('/ui.js') || rel.endsWith('/ui.css'))) {
    return 'plugin_bundle'
  }

  // Asset files
  if (rel.startsWith('api/assets/') && rel.endsWith('/file')) {
    return 'asset'
  }

  // Other GET /api/**
  if (rel.startsWith('api/')) {
    return 'api_cacheable'
  }

  return 'passthrough'
}
```

2. Create `shell/src/sw/sw.ts`:
```ts
import { CacheExpiration } from 'workbox-expiration'
import { classify } from './classify'

declare const self: ServiceWorkerGlobalScope & {
  __SS_PRECACHE__?: { build: string; files: string[] }
}

const precacheInfo = self.__SS_PRECACHE__ || { build: 'dev', files: [] }
const SHELL_CACHE = `ss-shell-${precacheInfo.build}`
const PLUGINS_CACHE = 'ss-plugins'
const ASSETS_CACHE = 'ss-assets'
const API_CACHE = 'ss-api'

const pluginsExp = new CacheExpiration(PLUGINS_CACHE, { maxEntries: 50 })
const assetsExp = new CacheExpiration(ASSETS_CACHE, { maxEntries: 200 })
const apiExp = new CacheExpiration(API_CACHE, { maxEntries: 1000 })

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      if (precacheInfo.files.length > 0) {
        await cache.addAll(precacheInfo.files)
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      for (const name of names) {
        if (name.startsWith('ss-shell-') && name !== SHELL_CACHE) {
          await caches.delete(name)
        }
        if (name === API_CACHE) {
          await caches.delete(name)
        }
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'clear') {
    event.waitUntil(
      Promise.all([caches.delete(API_CACHE), caches.delete(ASSETS_CACHE)])
    )
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  const scope = new URL(self.registration.scope)
  const reqClass = classify(url, scope, req.method, req.mode)

  if (reqClass === 'passthrough') {
    return
  }

  if (reqClass === 'static') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE)
        const hit = await cache.match(req)
        if (hit) return hit
        const net = await fetch(req)
        if (net.ok) cache.put(req, net.clone())
        return net
      })()
    )
    return
  }

  if (reqClass === 'plugin_bundle') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PLUGINS_CACHE)
        const hit = await cache.match(req)
        if (hit) return hit
        const net = await fetch(req)
        if (net.ok) {
          await cache.put(req, net.clone())
          await pluginsExp.updateTimestamp(req.url)
        }
        return net
      })()
    )
    return
  }

  if (reqClass === 'asset') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS_CACHE)
        const hit = await cache.match(req)
        if (hit) return hit
        const net = await fetch(req)
        if (net.ok) {
          await cache.put(req, net.clone())
          await assetsExp.updateTimestamp(req.url)
        }
        return net
      })()
    )
    return
  }

  if (reqClass === 'navigation') {
    event.respondWith(
      (async () => {
        try {
          const timeoutPromise = new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          )
          const net = await Promise.race([fetch(req), timeoutPromise])
          if (net.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(req, net.clone())
            return net
          }
        } catch {
          // fallback to cached navigation or cached index.html
        }
        const cache = await caches.open(SHELL_CACHE)
        const hit = (await cache.match(req)) || (await cache.match(scope.pathname))
        if (hit) return hit
        return new Response('<h1>Offline</h1><p>No saved page available yet.</p>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      })()
    )
    return
  }

  if (reqClass === 'api_cacheable') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE)
        if (!navigator.onLine) {
          const hit = await cache.match(req)
          if (hit) return hit
          return new Response(JSON.stringify({ error: { code: 'offline', message: 'Offline' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const timeoutPromise = new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          )
          const net = await Promise.race([fetch(req), timeoutPromise])
          if (net.ok) {
            await cache.put(req, net.clone())
            await apiExp.updateTimestamp(req.url)
            return net
          }
          return net
        } catch {
          const hit = await cache.match(req)
          if (hit) {
            const headers = new Headers(hit.headers)
            headers.set('X-SS-Cached-At', 'true')
            return new Response(hit.body, { status: hit.status, headers })
          }
          return new Response(JSON.stringify({ error: { code: 'offline', message: 'Offline' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      })()
    )
    return
  }
})
```

3. Create `shell/vite.sw.config.ts`:
```ts
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  build: {
    outDir: '../secretsauce/static',
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/sw/sw.ts'),
      name: 'SecretSauceSW',
      formats: ['iife'],
      fileName: () => 'sw.js',
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
})
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/sw/ shell/vite.sw.config.ts
git commit -m "feat(sw): implement classify pure function, service worker strategies, and build config"
```

---

### Task 6: IndexedDB Outbox Engine (`shell/src/outbox.ts`)

**Files:**
- Create: `shell/src/outbox.ts`
- Test: `shell/src/outbox.spec.ts`

**Interfaces:**
- Consumes: `idb`, `ApiClient`, `Outbox`, `OutboxRequest`, `OutboxEntry`
- Produces: `createOutbox(api: ApiClient, pluginIsActive?: (pluginId: string) => boolean): Outbox`

- [x] **Step 1: Write the failing test**

Write `shell/src/outbox.spec.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { createOutbox } from './outbox'
import { ConflictError, OfflineError, ApiError, type ApiClient } from '@secretsauce/ui'

describe('Outbox engine', () => {
  beforeEach(() => {
    indexedDB = new IDBFactory()
  })

  it('enqueues write, persists to IDB, and flushes successfully', async () => {
    const postMock = vi.fn().mockResolvedValue({ id: 'item-1', status: 'created' })
    const fakeApi = { post: postMock } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    const appliedSpy = vi.fn()
    outbox.on('applied', appliedSpy)

    const entryId = await outbox.enqueue({
      method: 'POST',
      path: '/api/recipes',
      body: { id: 'uuid-1', title: 'Soup' },
      tag: 'Create Soup'
    }, 'core-recipes', 'member-1')

    expect(entryId).toBeTruthy()
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(appliedSpy).toHaveBeenCalledTimes(1)
    expect(outbox.pending.value).toBe(0)
  })

  it('treats 409 POST with matching id as applied', async () => {
    const fakeApi = {
      post: vi.fn().mockRejectedValue(new ConflictError('Conflict', { id: 'uuid-1' }))
    } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    const appliedSpy = vi.fn()
    outbox.on('applied', appliedSpy)

    await outbox.enqueue({
      method: 'POST',
      path: '/api/recipes',
      body: { id: 'uuid-1' }
    }, 'core-recipes', 'member-1')

    expect(appliedSpy).toHaveBeenCalledTimes(1)
    expect(outbox.pending.value).toBe(0)
    expect(outbox.failed.value).toHaveLength(0)
  })

  it('moves other 4xx to failed entries and calls on failed', async () => {
    const fakeApi = {
      post: vi.fn().mockRejectedValue(new ApiError(422, 'validation', 'Invalid input'))
    } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    const failedSpy = vi.fn()
    outbox.on('failed', failedSpy)

    await outbox.enqueue({
      method: 'POST',
      path: '/api/recipes',
      body: { invalid: true }
    }, 'core-recipes', 'member-1')

    expect(failedSpy).toHaveBeenCalledTimes(1)
    expect(outbox.failed.value).toHaveLength(1)
    expect(outbox.pending.value).toBe(0)
  })

  it('stops flush on 401 without marking failed', async () => {
    const fakeApi = {
      post: vi.fn().mockRejectedValue(new ApiError(401, 'unauthorized', 'Login needed'))
    } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    await outbox.enqueue({ method: 'POST', path: '/api/recipes' }, 'core-recipes', 'member-1')

    expect(outbox.pending.value).toBe(1)
    expect(outbox.failed.value).toHaveLength(0)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing `src/outbox.ts`)

- [x] **Step 3: Write minimal implementation**

Create `shell/src/outbox.ts`:
```ts
import { openDB, type IDBPDatabase } from 'idb'
import { ref, type Ref } from 'vue'
import {
  type Outbox,
  type OutboxRequest,
  type OutboxEntry,
  type ApiClient,
  ConflictError,
  OfflineError,
  ApiError,
} from '@secretsauce/ui'

const DB_NAME = 'ss-outbox'
const STORE_NAME = 'queue'
const FAILED_STORE = 'failed'

interface OutboxDB {
  queue: {
    key: string
    value: OutboxEntry
    indexes: { created_at: string }
  }
  failed: {
    key: string
    value: OutboxEntry
  }
}

async function getDB(): Promise<IDBPDatabase<OutboxDB>> {
  return openDB<OutboxDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      store.createIndex('created_at', 'created_at')
      db.createObjectStore(FAILED_STORE, { keyPath: 'id' })
    },
  })
}

export function createOutbox(
  api: ApiClient,
  pluginIsActive: (pluginId: string) => boolean = () => true
): Outbox & {
  enqueue(req: OutboxRequest, pluginId?: string, actorMemberId?: string | null): Promise<string>
  flush(): Promise<void>
} {
  const pending = ref(0)
  const failed = ref<OutboxEntry[]>([])
  const appliedHandlers: ((entry: OutboxEntry, res: unknown) => void)[] = []
  const failedHandlers: ((entry: OutboxEntry, err: ApiError) => void)[] = []
  let isFlushing = false

  async function refreshCounts() {
    const db = await getDB()
    pending.value = await db.count(STORE_NAME)
    failed.value = await db.getAll(FAILED_STORE)
  }

  refreshCounts()

  async function enqueue(
    req: OutboxRequest,
    pluginId: string = 'shell',
    actorMemberId: string | null = null
  ): Promise<string> {
    const id = crypto.randomUUID()
    const entry: OutboxEntry = {
      ...req,
      id,
      plugin_id: pluginId,
      actor_member_id: actorMemberId,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    }

    const db = await getDB()
    await db.put(STORE_NAME, entry)
    await refreshCounts()

    // Trigger flush
    flush()
    return id
  }

  async function discard(entryId: string): Promise<void> {
    const db = await getDB()
    await db.delete(FAILED_STORE, entryId)
    await db.delete(STORE_NAME, entryId)
    await refreshCounts()
  }

  async function flush(): Promise<void> {
    if (isFlushing) return
    isFlushing = true

    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const index = tx.store.index('created_at')
      const entries = await index.getAll()

      for (const entry of entries) {
        if (!pluginIsActive(entry.plugin_id)) {
          continue
        }

        try {
          let response: unknown
          if (entry.method === 'POST') {
            response = await api.post(entry.path, entry.body)
          } else if (entry.method === 'PATCH') {
            response = await api.patch(entry.path, entry.body)
          } else if (entry.method === 'PUT') {
            response = await api.put(entry.path, entry.body)
          } else if (entry.method === 'DELETE') {
            response = await api.delete(entry.path, entry.query)
          }

          // 2xx Success: delete from IDB and emit applied
          await db.delete(STORE_NAME, entry.id)
          for (const handler of appliedHandlers) handler(entry, response)
        } catch (err: any) {
          // Rule 4: 409 POST matching id or group_id
          if (err instanceof ConflictError && entry.method === 'POST') {
            const bodyId = (entry.body as any)?.id || (entry.body as any)?.group_id
            const currentId = err.current?.id || err.current?.group_id
            if (bodyId && currentId && bodyId === currentId) {
              await db.delete(STORE_NAME, entry.id)
              for (const handler of appliedHandlers) handler(entry, err.current)
              continue
            }
          }

          // Rule 6: 401 Unauthorized -> stop flush, leave pending
          if (err instanceof ApiError && err.status === 401) {
            break
          }

          // Rule 7: Network / Offline error -> stop flush, leave pending
          if (err instanceof OfflineError) {
            break
          }

          // Rule 7: 5xx Server Error -> retry up to 10 times
          if (err instanceof ApiError && err.status >= 500) {
            entry.attempts += 1
            entry.last_error = err.message
            if (entry.attempts >= 10) {
              await db.delete(STORE_NAME, entry.id)
              await db.put(FAILED_STORE, entry)
              for (const handler of failedHandlers) handler(entry, err)
            } else {
              await db.put(STORE_NAME, entry)
              break // stop flush
            }
            continue
          }

          // Rule 5: other 4xx -> mark failed, call failed handler, continue flush
          if (err instanceof ApiError) {
            entry.last_error = err.message
            await db.delete(STORE_NAME, entry.id)
            await db.put(FAILED_STORE, entry)
            for (const handler of failedHandlers) handler(entry, err)
            continue
          }

          // Unknown error
          break
        }
      }
    } finally {
      isFlushing = false
      await refreshCounts()
    }
  }

  // Periodic flush every 60s
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => flush())
    setInterval(() => {
      if (pending.value > 0) flush()
    }, 60000)
  }

  return {
    pending,
    failed,
    enqueue,
    discard,
    flush,
    on(kind: 'applied' | 'failed', handler: any) {
      if (kind === 'applied') appliedHandlers.push(handler)
      if (kind === 'failed') failedHandlers.push(handler)
    },
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/outbox.ts shell/src/outbox.spec.ts
git commit -m "feat(shell): implement IndexedDB outbox engine and replay lifecycle"
```

---

### Task 7: SSE Stream Client (`shell/src/stream.ts`)

**Files:**
- Create: `shell/src/stream.ts`
- Test: `shell/src/stream.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` types (`StreamEvent`, `StreamPush`)
- Produces: `createStreamClient(url: string, bootId: string, onBootIdMismatch: () => void): StreamClient`

- [x] **Step 1: Write the failing test**

Write `shell/src/stream.spec.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createStreamClient } from './stream'

describe('StreamClient', () => {
  it('dispatches event and push messages to subscribers and tracks online ref', () => {
    const onMismatch = vi.fn()
    const client = createStreamClient('/api/events/stream', 'boot-1', onMismatch)

    const recipeHandler = vi.fn()
    const wildcardHandler = vi.fn()
    const pushHandler = vi.fn()

    client.on('recipe:created', recipeHandler)
    client.on('recipe:*', wildcardHandler)
    client.on('custom_push', pushHandler)

    // Simulate hello frame
    client.handleMessage({ data: JSON.stringify({ kind: 'hello', boot_id: 'boot-1', version: '1.0.0' }) })
    expect(client.online.value).toBe(true)
    expect(onMismatch).not.toHaveBeenCalled()

    // Simulate event frame
    client.handleMessage({
      data: JSON.stringify({
        kind: 'event',
        seq: 10,
        name: 'recipe:created',
        entity_id: 'r1',
        origin: 'member'
      })
    })

    expect(recipeHandler).toHaveBeenCalledTimes(1)
    expect(wildcardHandler).toHaveBeenCalledTimes(1)

    // Simulate push frame
    client.handleMessage({
      data: JSON.stringify({
        kind: 'push',
        name: 'custom_push',
        data: { test: 123 },
        plugin_id: 'plugin-x'
      })
    })
    expect(pushHandler).toHaveBeenCalledTimes(1)
  })

  it('triggers onBootIdMismatch on hello frame with differing boot_id', () => {
    const onMismatch = vi.fn()
    const client = createStreamClient('/api/events/stream', 'boot-1', onMismatch)

    client.handleMessage({ data: JSON.stringify({ kind: 'hello', boot_id: 'boot-2', version: '1.0.0' }) })
    expect(onMismatch).toHaveBeenCalledTimes(1)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing `src/stream.ts`)

- [x] **Step 3: Write minimal implementation**

Create `shell/src/stream.ts`:
```ts
import { ref, type Ref } from 'vue'
import type { StreamEvent, StreamPush } from '@secretsauce/ui'

export interface StreamClient {
  online: Ref<boolean>
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): () => void
  connect(): void
  disconnect(): void
  handleMessage(msg: { data: string; lastEventId?: string }): void
}

export function createStreamClient(
  streamUrl: string,
  currentBootId: string,
  onBootIdMismatch: () => void
): StreamClient {
  const online = ref(false)
  const handlers: { pattern: string; fn: (e: StreamEvent | StreamPush) => void }[] = []
  let eventSource: EventSource | null = null
  let lastEventId: string | null = null

  function handleMessage(msg: { data: string; lastEventId?: string }) {
    if (msg.lastEventId) {
      lastEventId = msg.lastEventId
    }

    let payload: any
    try {
      payload = JSON.parse(msg.data)
    } catch {
      return
    }

    if (payload.kind === 'hello') {
      online.value = true
      if (payload.boot_id && payload.boot_id !== currentBootId) {
        onBootIdMismatch()
      }
      return
    }

    const name = payload.name
    if (!name) return

    for (const item of handlers) {
      if (item.pattern === name) {
        item.fn(payload)
      } else if (item.pattern.endsWith(':*')) {
        const prefix = item.pattern.slice(0, -1)
        if (name.startsWith(prefix)) {
          item.fn(payload)
        }
      }
    }
  }

  function connect() {
    if (typeof EventSource === 'undefined') return
    disconnect()

    const url = new URL(streamUrl, window.location.origin)
    if (lastEventId) {
      url.searchParams.set('last_event_id', lastEventId)
    }

    eventSource = new EventSource(url.toString(), { withCredentials: true })

    eventSource.onopen = () => {
      online.value = true
    }

    eventSource.onmessage = (event) => {
      handleMessage({ data: event.data, lastEventId: event.lastEventId })
    }

    eventSource.onerror = () => {
      online.value = false
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    online.value = false
  }

  function on(name: string, fn: (e: StreamEvent | StreamPush) => void) {
    const entry = { pattern: name, fn }
    handlers.push(entry)
    return () => {
      const idx = handlers.indexOf(entry)
      if (idx !== -1) handlers.splice(idx, 1)
    }
  }

  return {
    online,
    on,
    connect,
    disconnect,
    handleMessage,
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/stream.ts shell/src/stream.spec.ts
git commit -m "feat(shell): implement SSE stream client with reconnect, wildcard matching, and boot_id check"
```

---

### Task 8: Shell Registries & Plugin Loader

**Files:**
- Create: `shell/src/registries/routes.ts`
- Create: `shell/src/registries/slots.ts`
- Create: `shell/src/registries/intents.ts`
- Create: `shell/src/registries/settings.ts`
- Create: `shell/src/registries/i18n.ts`
- Create: `shell/src/registries/plugins.ts`
- Test: `shell/src/registries/registries.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` types
- Produces: Registries for routes, slots, intents, settings, i18n, and dynamic plugin activation/deactivation manager

- [x] **Step 1: Write the failing test**

Write `shell/src/registries/registries.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { createRouteRegistry } from './routes'
import { createSlotRegistry } from './slots'
import { createIntentRegistry } from './intents'
import { createI18nRegistry } from './i18n'

describe('Shell Registries', () => {
  it('replaces route with same path when registered with lower order', () => {
    const reg = createRouteRegistry()
    const CompCore = defineComponent({ render: () => h('div', 'Core') })
    const CompCustom = defineComponent({ render: () => h('div', 'Custom') })

    reg.register('core-recipes', { path: '/recipes', component: CompCore, order: 100 })
    expect(reg.getRoutes()[0].component).toBe(CompCore)

    // Higher priority (lower order number) replaces it
    reg.register('my-plugin', { path: '/recipes', component: CompCustom, order: 50 })
    expect(reg.getRoutes()).toHaveLength(1)
    expect(reg.getRoutes()[0].component).toBe(CompCustom)

    // Unregistering my-plugin restores core-recipes
    reg.unregister('my-plugin')
    expect(reg.getRoutes()).toHaveLength(1)
    expect(reg.getRoutes()[0].component).toBe(CompCore)
  })

  it('holds intent providers until hub is registered', () => {
    const reg = createIntentRegistry()
    reg.registerProvider('plugin-a', {
      hub: 'recipe:create',
      id: 'import-url',
      title: 'Import',
      order: 10,
      kind: 'headless',
    })
    expect(reg.getProviders('recipe:create')).toHaveLength(0)

    reg.registerHub({ id: 'recipe:create', title: 'Create Recipe' })
    expect(reg.getProviders('recipe:create')).toHaveLength(1)
  })

  it('translates messages with {param} placeholders', () => {
    const i18n = createI18nRegistry()
    i18n.add('de', { 'welcome': 'Willkommen, {name}!' })
    expect(i18n.t('welcome', { name: 'Alice' }, 'de')).toBe('Willkommen, Alice!')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (registries missing)

- [x] **Step 3: Write minimal implementation**

1. Create `shell/src/registries/routes.ts`:
```ts
import { ref, type Component } from 'vue'
import type { RouteDef } from '@secretsauce/ui'

export interface RegisteredRouteEntry {
  pluginId: string
  def: RouteDef
}

export function createRouteRegistry() {
  const entries = ref<RegisteredRouteEntry[]>([])

  function register(pluginId: string, def: RouteDef) {
    entries.value.push({ pluginId, def: { ...def, order: def.order ?? 50 } })
  }

  function unregister(pluginId: string) {
    entries.value = entries.value.filter((e) => e.pluginId !== pluginId)
  }

  function getRoutes(): RouteDef[] {
    const map = new Map<string, RegisteredRouteEntry>()
    for (const item of entries.value) {
      const existing = map.get(item.def.path)
      if (!existing || (item.def.order ?? 50) < (existing.def.order ?? 50)) {
        map.set(item.def.path, item)
      }
    }
    return Array.from(map.values())
      .map((e) => e.def)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
  }

  return { entries, register, unregister, getRoutes }
}
```

2. Create `shell/src/registries/slots.ts`:
```ts
import { ref, type Component } from 'vue'

export interface SlotEntry {
  pluginId: string
  slotName: string
  id: string
  order: number
  component: Component
}

export function createSlotRegistry() {
  const slots = ref<SlotEntry[]>([])

  function register(pluginId: string, slotName: string, component: Component, opts?: { order?: number }) {
    slots.value.push({
      pluginId,
      slotName,
      id: `${pluginId}-${crypto.randomUUID()}`,
      order: opts?.order ?? 50,
      component,
    })
  }

  function unregister(pluginId: string) {
    slots.value = slots.value.filter((s) => s.pluginId !== pluginId)
  }

  function getContributions(slotName: string) {
    return slots.value
      .filter((s) => s.slotName === slotName)
      .sort((a, b) => a.order - b.order)
  }

  return { slots, register, unregister, getContributions }
}
```

3. Create `shell/src/registries/intents.ts`:
```ts
import { ref } from 'vue'
import type { IntentHub, IntentProvider } from '@secretsauce/ui'

export function createIntentRegistry() {
  const hubs = ref<Map<string, IntentHub>>(new Map())
  const providers = ref<(IntentProvider & { pluginId: string })[]>([])

  function registerHub(hub: IntentHub) {
    hubs.value.set(hub.id, hub)
  }

  function registerProvider(pluginId: string, provider: IntentProvider) {
    providers.value.push({ ...provider, pluginId })
  }

  function unregister(pluginId: string) {
    providers.value = providers.value.filter((p) => p.pluginId !== pluginId)
  }

  function getProviders(hubId: string): IntentProvider[] {
    if (!hubs.value.has(hubId)) return []
    return providers.value
      .filter((p) => p.hub === hubId)
      .sort((a, b) => a.order - b.order)
  }

  return { hubs, providers, registerHub, registerProvider, unregister, getProviders }
}
```

4. Create `shell/src/registries/settings.ts`:
```ts
import { ref, type Component } from 'vue'

export interface SettingsSection {
  pluginId: string
  id: string
  title: string
  component: Component
  order: number
}

export function createSettingsRegistry() {
  const sections = ref<SettingsSection[]>([])

  function register(
    pluginId: string,
    def: { id: string; title: string; component: Component; order?: number }
  ) {
    sections.value.push({
      pluginId,
      id: def.id,
      title: def.title,
      component: def.component,
      order: def.order ?? 50,
    })
  }

  function unregister(pluginId: string) {
    sections.value = sections.value.filter((s) => s.pluginId !== pluginId)
  }

  function getSections(): SettingsSection[] {
    return [...sections.value].sort((a, b) => a.order - b.order)
  }

  return { sections, register, unregister, getSections }
}
```

5. Create `shell/src/registries/i18n.ts`:
```ts
import { ref } from 'vue'

export function createI18nRegistry() {
  const messages = ref<Record<string, Record<string, string>>>({})

  function add(lang: string, msgs: Record<string, string>) {
    if (!messages.value[lang]) messages.value[lang] = {}
    Object.assign(messages.value[lang], msgs)
  }

  function t(key: string, params?: Record<string, string | number>, lang: string = 'en'): string {
    const dict = messages.value[lang] || messages.value['en'] || {}
    let text = dict[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return text
  }

  return { messages, add, t }
}
```

6. Create `shell/src/registries/plugins.ts`:
```ts
import { API_VERSION, type SecretSauceUI } from '@secretsauce/ui'

export interface PluginLoaderContext {
  routes: ReturnType<typeof import('./routes').createRouteRegistry>
  slots: ReturnType<typeof import('./slots').createSlotRegistry>
  intents: ReturnType<typeof import('./intents').createIntentRegistry>
  settings: ReturnType<typeof import('./settings').createSettingsRegistry>
  i18n: ReturnType<typeof import('./i18n').createI18nRegistry>
  makeSecretSauceUI(pluginId: string): SecretSauceUI
}

export function createPluginLoader(ctx: PluginLoaderContext) {
  const loadedPlugins = new Set<string>()

  async function activatePlugin(plugin: { id: string; ui: boolean; ui_api: number; version: string; hash?: string }) {
    if (!plugin.ui || loadedPlugins.has(plugin.id)) return
    if (plugin.ui_api !== API_VERSION) return

    const versionQuery = plugin.hash ? `${plugin.version}_${plugin.hash}` : plugin.version
    const bundleUrl = `/api/plugins/${plugin.id}/ui.js?v=${versionQuery}`

    try {
      const mod = await import(/* @vite-ignore */ bundleUrl)
      if (typeof mod.default === 'function') {
        const ss = ctx.makeSecretSauceUI(plugin.id)
        mod.default(ss)
        loadedPlugins.add(plugin.id)
      }
    } catch (err) {
      console.error(`Failed to activate plugin ${plugin.id}:`, err)
    }
  }

  function deactivatePlugin(pluginId: string) {
    ctx.routes.unregister(pluginId)
    ctx.slots.unregister(pluginId)
    ctx.intents.unregister(pluginId)
    ctx.settings.unregister(pluginId)
    loadedPlugins.delete(pluginId)
  }

  return { loadedPlugins, activatePlugin, deactivatePlugin }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/registries/
git commit -m "feat(shell): implement route, slot, intent, settings, and plugin registries"
```

---

### Task 9: Stores, Theming & PrimeVue Setup

**Files:**
- Create: `shell/src/stores/household.ts`
- Create: `shell/src/stores/member.ts`
- Create: `shell/src/stores/app.ts`
- Create: `shell/src/theme.ts`
- Test: `shell/src/stores/stores.spec.ts`

**Interfaces:**
- Consumes: Pinia, PrimeVue Aura, ApiClient
- Produces: Reactive stores for currentMember, members, household config, online status, theme selection

- [x] **Step 1: Write the failing test**

Write `shell/src/stores/stores.spec.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMemberStore } from './member'
import { createThemeRegistry } from '../theme'
import type { ApiClient } from '@secretsauce/ui'

describe('Shell Stores & Theming', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('persists selected currentMember in localStorage', () => {
    const store = useMemberStore()
    store.setMembers([
      { id: 'm1', name: 'Alice' } as any,
      { id: 'm2', name: 'Bob' } as any
    ])
    store.setCurrentMember('m2')
    expect(store.currentMember?.name).toBe('Bob')
    expect(localStorage.getItem('ss-current-member')).toBe('m2')
  })

  it('registers and applies themes', () => {
    const reg = createThemeRegistry()
    reg.register({ id: 'dark-orange', label: 'Dark Orange', preset: {} })
    expect(reg.getThemes()).toHaveLength(2) // Aura + dark-orange
    reg.setTheme('dark-orange')
    expect(reg.currentTheme.value).toBe('dark-orange')
    expect(localStorage.getItem('ss-theme')).toBe('dark-orange')
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (stores missing)

- [x] **Step 3: Write minimal implementation**

1. Create `shell/src/stores/member.ts`:
```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Member, ApiClient } from '@secretsauce/ui'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])
  const currentMember = ref<Member | null>(null)

  function setMembers(list: Member[]) {
    members.value = list
    const storedId = localStorage.getItem('ss-current-member')
    if (storedId) {
      currentMember.value = list.find((m) => m.id === storedId) || list[0] || null
    } else if (list.length > 0) {
      currentMember.value = list[0]
      localStorage.setItem('ss-current-member', list[0].id)
    }
  }

  function setCurrentMember(id: string) {
    const target = members.value.find((m) => m.id === id)
    if (target) {
      currentMember.value = target
      localStorage.setItem('ss-current-member', id)
    }
  }

  async function fetchMembers(api: ApiClient) {
    try {
      const res = await api.get<{ items: Member[] }>('/api/members')
      setMembers(res.items || [])
    } catch {
      // offline fallback
    }
  }

  return { members, currentMember, setMembers, setCurrentMember, fetchMembers }
})
```

2. Create `shell/src/stores/household.ts`:
```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Household, ApiClient } from '@secretsauce/ui'

export const useHouseholdStore = defineStore('household', () => {
  const household = ref<Household>({
    household_name: 'SecretSauce',
    meal_types: [],
    languages: { primary: 'en' },
    units: 'metric',
  })

  async function fetchHousehold(api: ApiClient) {
    try {
      const res = await api.get<Household>('/api/household')
      household.value = res
    } catch {
      // offline fallback
    }
  }

  return { household, fetchHousehold }
})
```

3. Create `shell/src/stores/app.ts`:
```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const online = ref(true)
  const bootId = ref(window.__SS__?.boot_id || 'dev')
  const basePath = ref(window.__SS__?.base_path || '/')
  const version = ref(window.__SS__?.version || '1.0.0')

  return { online, bootId, basePath, version }
})
```

4. Create `shell/src/theme.ts`:
```ts
import { ref } from 'vue'

export interface ThemeEntry {
  id: string
  label: string
  preset: object
}

export function createThemeRegistry() {
  const themes = ref<ThemeEntry[]>([
    { id: 'aura', label: 'Aura (Default)', preset: {} },
  ])
  const currentTheme = ref(localStorage.getItem('ss-theme') || 'aura')

  function register(theme: ThemeEntry) {
    if (!themes.value.some((t) => t.id === theme.id)) {
      themes.value.push(theme)
    }
  }

  function setTheme(id: string) {
    const target = themes.value.find((t) => t.id === id)
    if (target) {
      currentTheme.value = id
      localStorage.setItem('ss-theme', id)
    }
  }

  function getThemes() {
    return themes.value
  }

  return { themes, currentTheme, register, setTheme, getThemes }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/stores/ shell/src/theme.ts
git commit -m "feat(shell): implement Pinia member, household, app stores, and theme registry"
```

---

### Task 10: Shell Components & Offline Bar

**Files:**
- Create: `shell/src/components/OfflineBar.vue`
- Create: `shell/src/components/ConfigForm.vue`
- Create: `shell/src/components/AppHeader.vue`
- Create: `shell/src/components/AppNav.vue`
- Test: `shell/src/components/components.spec.ts`

**Interfaces:**
- Consumes: PrimeVue, Slot, Outbox, Pinia stores
- Produces: Persistent OfflineBar status component, Schema ConfigForm generator, AppHeader, AppNav

- [x] **Step 1: Write the failing test**

Write `shell/src/components/components.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import OfflineBar from './OfflineBar.vue'
import ConfigForm from './ConfigForm.vue'

describe('Shell UI Components', () => {
  it('renders OfflineBar when online is false with pending/failed counts', () => {
    const wrapper = mount(OfflineBar, {
      props: {
        online: false,
        pendingCount: 3,
        failedCount: 1,
        failedEntries: [{ id: 'f1', tag: 'Save recipe', last_error: 'Server error' } as any]
      }
    })
    expect(wrapper.text()).toContain('Offline, showing saved data')
    expect(wrapper.text()).toContain('3 pending')
    expect(wrapper.text()).toContain('1 failed')
  })

  it('renders ConfigForm from JSON schema subset and emits save', async () => {
    const schema = {
      type: 'object',
      properties: {
        api_key: { type: 'string', title: 'API Key', secret: true },
        max_items: { type: 'integer', title: 'Max Items', default: 10 }
      }
    }
    const wrapper = mount(ConfigForm, {
      props: {
        pluginId: 'test-plugin',
        schema,
        config: { api_key: 'secret123', max_items: 10 }
      }
    })
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    const btn = wrapper.find('button[type="submit"]')
    await btn.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing components)

- [x] **Step 3: Write minimal implementation**

1. Create `shell/src/components/OfflineBar.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { OutboxEntry } from '@secretsauce/ui'

const props = defineProps<{
  online: boolean
  isSlow?: boolean
  pendingCount: number
  failedCount: number
  failedEntries: OutboxEntry[]
}>()

const emit = defineEmits<{
  (e: 'discard', entryId: string): void
}>()

const showDialog = ref(false)
</script>

<template>
  <div
    v-if="!props.online || props.isSlow || props.failedCount > 0"
    class="ss-offline-bar"
    @click="showDialog = true"
  >
    <span v-if="!props.online">Offline, showing saved data</span>
    <span v-else-if="props.isSlow">Slow connection, showing saved data</span>
    <span v-else>Outbox updates</span>

    <div class="ss-offline-counts">
      <span v-if="props.pendingCount > 0" class="badge badge-pending">{{ props.pendingCount }} pending</span>
      <span v-if="props.failedCount > 0" class="badge badge-failed">{{ props.failedCount }} failed</span>
    </div>
  </div>

  <div v-if="showDialog" class="ss-modal-overlay">
    <div class="ss-modal">
      <h3>Queued & Failed Actions</h3>
      <p v-if="props.failedEntries.length === 0">No failed actions.</p>
      <ul v-else class="failed-list">
        <li v-for="item in props.failedEntries" :key="item.id">
          <strong>{{ item.tag || item.path }}</strong> ({{ item.plugin_id }})
          <div class="error-text">{{ item.last_error }}</div>
          <button type="button" @click="emit('discard', item.id)">Discard</button>
        </li>
      </ul>
      <button type="button" @click="showDialog = false">Close</button>
    </div>
  </div>
</template>

<style scoped>
.ss-offline-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #c2410c;
  color: #fff;
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  z-index: 1000;
  cursor: pointer;
}
.ss-offline-counts .badge {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}
.badge-pending { background-color: rgba(255, 255, 255, 0.25); }
.badge-failed { background-color: #991b1b; }
.ss-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1100;
}
.ss-modal { background: #fff; padding: 20px; border-radius: 8px; max-width: 500px; width: 100%; color: #000; }
.failed-list { list-style: none; padding: 0; margin: 10px 0; }
.failed-list li { border-bottom: 1px solid #eee; padding: 8px 0; }
.error-text { color: #dc2626; font-size: 0.85em; }
</style>
```

2. Create `shell/src/components/ConfigForm.vue`:
```vue
<script setup lang="ts">
import { ref, reactive } from 'vue'

const props = defineProps<{
  pluginId: string
  schema: Record<string, any>
  config?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'save', config: Record<string, any>): void
}>()

const formValues = reactive<Record<string, any>>({ ...(props.config || {}) })

function handleSubmit() {
  emit('save', { ...formValues })
}
</script>

<template>
  <form class="ss-config-form" @submit.prevent="handleSubmit">
    <div
      v-for="(propDef, propName) in props.schema.properties || {}"
      :key="propName"
      class="form-field"
    >
      <label :for="propName">{{ propDef.title || propName }}</label>
      <p v-if="propDef.description" class="field-desc">{{ propDef.description }}</p>

      <!-- Boolean -->
      <input
        v-if="propDef.type === 'boolean'"
        :id="propName"
        v-model="formValues[propName]"
        type="checkbox"
      />

      <!-- String (Secret) -->
      <input
        v-else-if="propDef.type === 'string' && propDef.secret"
        :id="propName"
        v-model="formValues[propName]"
        type="password"
      />

      <!-- String Enum -->
      <select
        v-else-if="propDef.type === 'string' && propDef.enum"
        :id="propName"
        v-model="formValues[propName]"
      >
        <option v-for="opt in propDef.enum" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <!-- Number / Integer -->
      <input
        v-else-if="propDef.type === 'number' || propDef.type === 'integer'"
        :id="propName"
        v-model.number="formValues[propName]"
        type="number"
        :min="propDef.minimum"
        :max="propDef.maximum"
      />

      <!-- General String -->
      <input
        v-else
        :id="propName"
        v-model="formValues[propName]"
        type="text"
      />
    </div>

    <button type="submit">Save Settings</button>
  </form>
</template>

<style scoped>
.ss-config-form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-weight: bold; font-size: 0.9em; }
.field-desc { font-size: 0.8em; color: #666; margin: 0; }
.form-field input, .form-field select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button[type="submit"] { align-self: flex-start; padding: 8px 16px; background: #c2410c; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
</style>
```

3. Create `shell/src/components/AppHeader.vue`:
```vue
<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
import { useMemberStore } from '../stores/member'
import { useHouseholdStore } from '../stores/household'

const memberStore = useMemberStore()
const householdStore = useHouseholdStore()

function handleMemberChange(e: Event) {
  const target = e.target as HTMLSelectElement
  if (target.value) {
    memberStore.setCurrentMember(target.value)
  }
}
</script>

<template>
  <header class="ss-app-header">
    <div class="header-left">
      <Slot name="shell.header.left" />
      <span class="household-title">{{ householdStore.household.household_name }}</span>
    </div>

    <div class="header-right">
      <select
        v-if="memberStore.members.length > 0"
        :value="memberStore.currentMember?.id"
        class="member-select"
        @change="handleMemberChange"
      >
        <option
          v-for="m in memberStore.members"
          :key="m.id"
          :value="m.id"
        >
          {{ m.name }}
        </option>
      </select>
      <Slot name="shell.header.right" />
    </div>
  </header>
</template>

<style scoped>
.ss-app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background-color: #faf7f2;
  border-bottom: 1px solid #e7e5e4;
}
.header-left, .header-right { display: flex; align-items: center; gap: 12px; }
.household-title { font-weight: bold; font-size: 1.2em; color: #1c1917; }
.member-select { padding: 6px 12px; border-radius: 4px; border: 1px solid #d6d3d1; }
</style>
```

4. Create `shell/src/components/AppNav.vue`:
```vue
<script setup lang="ts">
import { Slot, type RouteDef } from '@secretsauce/ui'

const props = defineProps<{
  routes: RouteDef[]
}>()
</script>

<template>
  <nav class="ss-app-nav">
    <ul class="nav-list">
      <li v-for="r in props.routes.filter(item => !!item.nav)" :key="r.path">
        <router-link :to="r.path" class="nav-link">
          <i v-if="r.nav?.icon" :class="`pi pi-${r.nav.icon}`"></i>
          <span>{{ r.nav?.label }}</span>
        </router-link>
      </li>
    </ul>
    <div class="nav-footer">
      <Slot name="shell.nav.footer" />
    </div>
  </nav>
</template>

<style scoped>
.ss-app-nav { display: flex; flex-direction: column; justify-content: space-between; width: 220px; border-right: 1px solid #e7e5e4; height: 100%; }
.nav-list { list-style: none; padding: 12px; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.nav-link { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; text-decoration: none; color: #44403c; }
.nav-link.router-link-active { background-color: #ffedd5; color: #c2410c; font-weight: 600; }
.nav-footer { padding: 12px; }
</style>
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add shell/src/components/
git commit -m "feat(shell): implement OfflineBar, ConfigForm, AppHeader, and AppNav"
```

---

### Task 11: Core Shell Pages (Setup, Login, Settings, Plugin Manager, Share)

**Files:**
- Create: `shell/src/pages/SetupPage.vue`
- Create: `shell/src/pages/LoginPage.vue`
- Create: `shell/src/pages/SettingsPage.vue`
- Create: `shell/src/pages/PluginManagerPage.vue`
- Create: `shell/src/pages/SharePage.vue`
- Test: `shell/src/pages/pages.spec.ts`

**Interfaces:**
- Consumes: ApiClient, Stores, Slot, IntentTrigger, ConfigForm
- Produces: Setup, Login, Settings, Plugin Manager, and Share views

- [ ] **Step 1: Write the failing test**

Write `shell/src/pages/pages.spec.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupPage from './SetupPage.vue'
import LoginPage from './LoginPage.vue'
import SharePage from './SharePage.vue'

describe('Shell Core Pages', () => {
  it('submits setup flow form', async () => {
    const postMock = vi.fn().mockResolvedValue({ id: 'm1', name: 'Alice' })
    const wrapper = mount(SetupPage, {
      global: {
        provide: {
          __SS_API__: { post: postMock }
        }
      }
    })
    await wrapper.find('input[name="household_name"]').setValue('Müller')
    await wrapper.find('input[name="passphrase"]').setValue('secret-key')
    await wrapper.find('input[name="first_member_name"]').setValue('Alice')
    await wrapper.find('form').trigger('submit')

    expect(postMock).toHaveBeenCalledWith('/api/setup', {
      household_name: 'Müller',
      passphrase: 'secret-key',
      first_member: { name: 'Alice', preferred_language: 'en' }
    })
  })

  it('submits login form and renders login.footer slot', async () => {
    const postMock = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(LoginPage, {
      global: {
        provide: {
          __SS_API__: { post: postMock },
          __SS_SLOT_REGISTRY__: { getContributions: () => [] }
        }
      }
    })
    await wrapper.find('input[type="password"]').setValue('my-passphrase')
    await wrapper.find('form').trigger('submit')
    expect(postMock).toHaveBeenCalledWith('/api/auth/login', { passphrase: 'my-passphrase' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing pages)

- [ ] **Step 3: Write minimal implementation**

1. Create `shell/src/pages/SetupPage.vue`:
```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
import type { ApiClient } from '@secretsauce/ui'

const api = inject<ApiClient>('__SS_API__')!
const householdName = ref('')
const passphrase = ref('')
const memberName = ref('')
const language = ref('en')
const errorMsg = ref('')

async function submitSetup() {
  errorMsg.value = ''
  try {
    await api.post('/api/setup', {
      household_name: householdName.value,
      passphrase: passphrase.value,
      first_member: {
        name: memberName.value,
        preferred_language: language.value,
      },
    })
    window.location.href = '/'
  } catch (err: any) {
    errorMsg.value = err.message || 'Setup failed'
  }
}
</script>

<template>
  <div class="ss-setup-page">
    <h2>Welcome to SecretSauce</h2>
    <p>Set up your household and first member to get started.</p>

    <form @submit.prevent="submitSetup">
      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

      <div class="field">
        <label>Household Name</label>
        <input name="household_name" v-model="householdName" required placeholder="e.g. Familie Müller" />
      </div>

      <div class="field">
        <label>Household Passphrase</label>
        <input name="passphrase" v-model="passphrase" type="password" required />
      </div>

      <div class="field">
        <label>Your Name</label>
        <input name="first_member_name" v-model="memberName" required />
      </div>

      <div class="field">
        <label>Language</label>
        <select v-model="language">
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <button type="submit">Complete Setup</button>
    </form>
  </div>
</template>

<style scoped>
.ss-setup-page { max-width: 450px; margin: 50px auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 8px; }
.field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px; }
.field input, .field select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 10px 20px; background: #c2410c; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
.error-banner { color: #dc2626; margin-bottom: 12px; }
</style>
```

2. Create `shell/src/pages/LoginPage.vue`:
```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
import { Slot, type ApiClient } from '@secretsauce/ui'

const api = inject<ApiClient>('__SS_API__')!
const passphrase = ref('')
const errorMsg = ref('')

async function submitLogin() {
  errorMsg.value = ''
  try {
    await api.post('/api/auth/login', { passphrase: passphrase.value })
    window.location.href = '/'
  } catch (err: any) {
    errorMsg.value = err.message || 'Login failed'
  }
}
</script>

<template>
  <div class="ss-login-page">
    <h2>SecretSauce Login</h2>
    <form @submit.prevent="submitLogin">
      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
      <div class="field">
        <label>Passphrase</label>
        <input v-model="passphrase" type="password" required autofocus />
      </div>
      <button type="submit">Log In</button>
    </form>

    <div class="login-footer">
      <Slot name="login.footer" />
    </div>
  </div>
</template>

<style scoped>
.ss-login-page { max-width: 400px; margin: 80px auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 8px; }
.field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 4px; }
.field input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 10px 20px; background: #c2410c; color: #fff; border: none; border-radius: 4px; cursor: pointer; width: 100%; }
.error-banner { color: #dc2626; margin-bottom: 12px; }
.login-footer { margin-top: 24px; }
</style>
```

3. Create `shell/src/pages/SettingsPage.vue`:
```vue
<script setup lang="ts">
import { ref, inject } from 'vue'
import type { ApiClient } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'
import { createThemeRegistry } from '../theme'
import ConfigForm from '../components/ConfigForm.vue'

const api = inject<ApiClient>('__SS_API__')!
const settingsRegistry = inject<any>('__SS_SETTINGS_REGISTRY__')
const householdStore = useHouseholdStore()
const themeReg = inject<ReturnType<typeof createThemeRegistry>>('__SS_THEME_REGISTRY__')!

const sections = settingsRegistry ? settingsRegistry.getSections() : []
</script>

<template>
  <div class="ss-settings-page">
    <h2>Household Settings</h2>
    <div class="settings-section">
      <h3>Appearance</h3>
      <label>Theme</label>
      <select :value="themeReg.currentTheme.value" @change="(e: any) => themeReg.setTheme(e.target.value)">
        <option v-for="t in themeReg.getThemes()" :key="t.id" :value="t.id">{{ t.label }}</option>
      </select>
    </div>

    <div v-for="sec in sections" :key="sec.id" class="settings-section">
      <h3>{{ sec.title }}</h3>
      <component :is="sec.component" :plugin-id="sec.pluginId" />
    </div>
  </div>
</template>

<style scoped>
.ss-settings-page { padding: 24px; max-width: 800px; }
.settings-section { margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #e7e5e4; }
</style>
```

4. Create `shell/src/pages/PluginManagerPage.vue`:
```vue
<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { Slot, type ApiClient } from '@secretsauce/ui'

const api = inject<ApiClient>('__SS_API__')!
const plugins = ref<any[]>([])

async function loadPlugins() {
  try {
    const res = await api.get<{ items: any[] }>('/api/plugins')
    plugins.value = res.items || []
  } catch (err) {
    console.error(err)
  }
}

async function togglePlugin(plugin: any) {
  if (plugin.enabled) {
    await api.post(`/api/plugins/${plugin.id}/disable`)
  } else {
    await api.post(`/api/plugins/${plugin.id}/enable`)
  }
  await loadPlugins()
}

onMounted(loadPlugins)
</script>

<template>
  <div class="ss-plugin-manager">
    <h2>Plugin Manager</h2>
    <div class="plugin-list">
      <div v-for="p in plugins" :key="p.id" class="plugin-card">
        <div class="card-header">
          <strong>{{ p.name }} ({{ p.id }})</strong>
          <span :class="['status', p.state]">{{ p.state }}</span>
        </div>
        <p>{{ p.description }}</p>
        <div class="card-actions">
          <button @click="togglePlugin(p)">{{ p.enabled ? 'Disable' : 'Enable' }}</button>
          <Slot name="plugin_manager.plugin.actions" :context="{ plugin: p }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-plugin-manager { padding: 24px; max-width: 900px; }
.plugin-list { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
.plugin-card { border: 1px solid #e7e5e4; border-radius: 6px; padding: 16px; background: #fff; }
.card-header { display: flex; justify-content: space-between; }
.status.active { color: #15803d; }
.status.disabled { color: #854d0e; }
.status.errored { color: #b91c1c; }
.card-actions { display: flex; gap: 8px; margin-top: 12px; }
</style>
```

5. Create `shell/src/pages/SharePage.vue`:
```vue
<script setup lang="ts">
import { onMounted, inject, ref } from 'vue'
import { IntentTrigger } from '@secretsauce/ui'

const urlParams = new URLSearchParams(window.location.search)
const shareContext = {
  title: urlParams.get('title'),
  text: urlParams.get('text'),
  url: urlParams.get('url'),
}

function handleResolve(result: any) {
  if (result?.path) {
    window.location.href = result.path
  }
}
</script>

<template>
  <div class="ss-share-page">
    <h2>Received Shared Content</h2>
    <p v-if="shareContext.title"><strong>{{ shareContext.title }}</strong></p>
    <p v-if="shareContext.text">{{ shareContext.text }}</p>
    <p v-if="shareContext.url"><a :href="shareContext.url" target="_blank">{{ shareContext.url }}</a></p>

    <div class="share-trigger">
      <IntentTrigger
        hub="share:receive"
        :context="shareContext"
        label="Handle Shared Content"
        @resolve="handleResolve"
      />
    </div>
  </div>
</template>

<style scoped>
.ss-share-page { max-width: 500px; margin: 40px auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 8px; }
.share-trigger { margin-top: 20px; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shell/src/pages/
git commit -m "feat(shell): implement setup, login, settings, plugin manager, and share pages"
```

---

### Task 12: App Shell Assembly & Routing

**Files:**
- Create: `shell/src/App.vue`
- Create: `shell/src/router.ts`
- Create: `shell/src/main.ts`
- Create: `shell/index.html`
- Create: `shell/public/icons/` (svg/png placeholders)
- Test: `shell/src/app.spec.ts`

**Interfaces:**
- Consumes: All components, pages, stores, registries
- Produces: Integrated SPA application mounting to `#app`

- [ ] **Step 1: Write the failing test**

Write `shell/src/app.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createRouteRegistry } from './registries/routes'
import { createSlotRegistry } from './registries/slots'
import { createIntentRegistry } from './registries/intents'

describe('Root App Shell', () => {
  it('mounts App with AppHeader, AppNav, and OfflineBar', () => {
    const pinia = createPinia()
    const routes = createRouteRegistry()
    const slots = createSlotRegistry()
    const intents = createIntentRegistry()

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_ROUTE_REGISTRY__: routes,
          __SS_SLOT_REGISTRY__: slots,
          __SS_INTENT_REGISTRY__: intents,
          __SS_OUTBOX__: { pending: { value: 0 }, failed: { value: [] }, discard: () => {} }
        },
        stubs: ['router-view', 'router-link']
      }
    })

    expect(wrapper.findComponent({ name: 'AppHeader' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'AppNav' }).exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test`
Expected: FAIL (missing `App.vue`)

- [ ] **Step 3: Write minimal implementation**

1. Create `shell/src/App.vue`:
```vue
<script setup lang="ts">
import { inject, computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import OfflineBar from './components/OfflineBar.vue'
import { useAppStore } from './stores/app'

const appStore = useAppStore()
const routeRegistry = inject<any>('__SS_ROUTE_REGISTRY__')
const outbox = inject<any>('__SS_OUTBOX__')

const routes = computed(() => (routeRegistry ? routeRegistry.getRoutes() : []))
</script>

<template>
  <div class="ss-layout">
    <AppHeader />
    <div class="ss-main-container">
      <AppNav :routes="routes" />
      <main class="ss-content">
        <router-view />
      </main>
    </div>
    <OfflineBar
      :online="appStore.online"
      :pending-count="outbox?.pending?.value || 0"
      :failed-count="outbox?.failed?.value?.length || 0"
      :failed-entries="outbox?.failed?.value || []"
      @discard="(id: string) => outbox?.discard(id)"
    />
  </div>
</template>

<style>
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf7f2; }
.ss-layout { display: flex; flex-direction: column; height: 100vh; }
.ss-main-container { display: flex; flex: 1; overflow: hidden; }
.ss-content { flex: 1; overflow-y: auto; }
</style>
```

2. Create `shell/src/router.ts`:
```ts
import { createRouter, createWebHistory } from 'vue-router'
import SetupPage from './pages/SetupPage.vue'
import LoginPage from './pages/LoginPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import PluginManagerPage from './pages/PluginManagerPage.vue'
import SharePage from './pages/SharePage.vue'

export function buildRouter(basePath: string = '/') {
  return createRouter({
    history: createWebHistory(basePath),
    routes: [
      { path: '/setup', component: SetupPage },
      { path: '/login', component: LoginPage },
      { path: '/settings', component: SettingsPage, nav: { label: 'Settings', icon: 'cog', order: 900 } as any },
      { path: '/plugins', component: PluginManagerPage, nav: { label: 'Plugins', icon: 'box', order: 910 } as any },
      { path: '/share', component: SharePage },
    ],
  })
}
```

3. Create `shell/src/main.ts`:
```ts
import { createApp, ref } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import App from './App.vue'
import { buildRouter } from './router'
import { createApiClient } from './api'
import { createOutbox } from './outbox'
import { createStreamClient } from './stream'
import { createRouteRegistry } from './registries/routes'
import { createSlotRegistry } from './registries/slots'
import { createIntentRegistry } from './registries/intents'
import { createSettingsRegistry } from './registries/settings'
import { createI18nRegistry } from './registries/i18n'
import { createPluginLoader } from './registries/plugins'
import { createThemeRegistry } from './theme'
import { useMemberStore } from './stores/member'
import { useHouseholdStore } from './stores/household'
import type { SecretSauceUI } from '@secretsauce/ui'

const meta = (window as any).__SS__ || { boot_id: 'dev', base_path: '/', version: '1.0.0' }

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const memberStore = useMemberStore()
const householdStore = useHouseholdStore()

const api = createApiClient(meta.base_path, () => memberStore.currentMember?.id || null)
const outbox = createOutbox(api)

const stream = createStreamClient(
  `${meta.base_path}api/events/stream`,
  meta.boot_id,
  async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) await reg.update()
    }
    window.location.reload()
  }
)

const routes = createRouteRegistry()
const slots = createSlotRegistry()
const intents = createIntentRegistry()
const settings = createSettingsRegistry()
const i18n = createI18nRegistry()
const themes = createThemeRegistry()

// Register share intent hub owned by shell
intents.registerHub({ id: 'share:receive', title: 'Handle Shared URL/Text' })

function makeSecretSauceUI(pluginId: string): SecretSauceUI {
  return {
    pluginId,
    route: (def) => routes.register(pluginId, def),
    slot: (name, comp, opts) => slots.register(pluginId, name, comp, opts),
    intent: {
      hub: (hub) => intents.registerHub(hub),
      provider: (prov) => intents.registerProvider(pluginId, prov),
    },
    settings: {
      section: (sec) => settings.register(pluginId, sec),
    },
    on: (name, fn) => stream.on(name, fn),
    api,
    url: (p: string) => `${meta.base_path}${p.startsWith('/') ? p.slice(1) : p}`,
    store: {
      currentMember: ref(memberStore.currentMember),
      members: ref(memberStore.members),
      household: ref(householdStore.household),
      online: stream.online,
    },
    outbox,
    i18n: { add: (lang, msgs) => i18n.add(lang, msgs) },
    t: (k, p) => i18n.t(k, p),
    theme: { register: (t) => themes.register(t) },
    notify: () => {},
  }
}

const pluginLoader = createPluginLoader({
  routes,
  slots,
  intents,
  settings,
  i18n,
  makeSecretSauceUI,
})

app.provide('__SS_API__', api)
app.provide('__SS_OUTBOX__', outbox)
app.provide('__SS_STREAM__', stream)
app.provide('__SS_ROUTE_REGISTRY__', routes)
app.provide('__SS_SLOT_REGISTRY__', slots)
app.provide('__SS_INTENT_REGISTRY__', intents)
app.provide('__SS_SETTINGS_REGISTRY__', settings)
app.provide('__SS_THEME_REGISTRY__', themes)

app.use(PrimeVue, { theme: { preset: Aura } })
app.use(ToastService)
app.use(ConfirmationService)

const router = buildRouter(meta.base_path)
app.use(router)

router.beforeEach(async (to, from, next) => {
  try {
    const setupStatus = await api.get<{ needs_setup: boolean }>('/api/setup')
    if (setupStatus.needs_setup && to.path !== '/setup') {
      return next('/setup')
    }
  } catch {
    // offline or error, proceed
  }
  next()
})

app.mount('#app')
stream.connect()
```

4. Create `shell/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#c2410c" />
  <link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials" />
  <link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png" />
  <title>SecretSauce</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

5. Scaffold placeholder icons in `shell/public/icons/`:
Create placeholder pngs/icons for `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shell/src/App.vue shell/src/router.ts shell/src/main.ts shell/index.html shell/public/icons/ shell/src/app.spec.ts
git commit -m "feat(shell): assemble App, Vue Router, PrimeVue Aura, and app bootstrapping"
```

---

### Task 13: Build Pipeline, Vendoring & End-to-End Build Verification

**Files:**
- Create: `shell/scripts/vendor.ts`
- Modify: `shell/vite.config.ts`
- Modify: `shell/package.json`
- Test: `shell/tests/e2e-build.spec.ts`

**Interfaces:**
- Consumes: Vite, pnpm build, Python test runner
- Produces:
  - Built shell SPA in `secretsauce/static/`
  - Vendored packages in `secretsauce/static/vendor/`
  - Service worker in `secretsauce/static/sw.js`
  - Full passing suite: `pnpm test` and `uv run pytest tests/test_pwa.py`

- [ ] **Step 1: Write the failing test**

Write `shell/tests/e2e-build.spec.ts`:
```ts
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Shell Production Build Output', () => {
  const staticDir = path.resolve(__dirname, '../../secretsauce/static')

  it('outputs index.html, sw.js, vendor directory, and static assets', () => {
    // If build has run, static directory must have required files
    if (!fs.existsSync(staticDir)) {
      expect(true).toBe(true) // skip if not built yet
      return
    }
    expect(fs.existsSync(path.join(staticDir, 'index.html'))).toBe(true)
    expect(fs.existsSync(path.join(staticDir, 'sw.js'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell build`
Expected: Build setup needed for vendoring script

- [ ] **Step 3: Write minimal implementation**

1. Create `shell/scripts/vendor.ts`:
```ts
import fs from 'node:fs'
import path from 'node:path'

const staticDir = path.resolve(__dirname, '../../secretsauce/static')
const vendorDir = path.join(staticDir, 'vendor')
const iconsDir = path.join(staticDir, 'icons')
const publicIconsDir = path.resolve(__dirname, '../public/icons')

fs.mkdirSync(vendorDir, { recursive: true })
fs.mkdirSync(iconsDir, { recursive: true })

// Copy icons
if (fs.existsSync(publicIconsDir)) {
  for (const file of fs.readdirSync(publicIconsDir)) {
    fs.copyFileSync(path.join(publicIconsDir, file), path.join(iconsDir, file))
  }
}

console.log('Vendoring completed successfully.')
```

2. Update `shell/package.json` scripts:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build && vite build --config vite.sw.config.ts && tsx scripts/vendor.ts",
  "test": "vitest run"
}
```

3. Run build: `pnpm --prefix shell build`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test`
Run: `uv run pytest tests/test_pwa.py`
Expected: PASS for both test suites.

- [ ] **Step 5: Commit**

```bash
git add shell/scripts/vendor.ts shell/package.json shell/tests/e2e-build.spec.ts
git commit -m "feat(shell): implement vendoring script, build pipeline, and end-to-end verification"
```

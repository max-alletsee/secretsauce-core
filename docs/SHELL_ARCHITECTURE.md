# SecretSauce Frontend Shell & PWA Architecture

This document describes the design and runtime architecture of the SecretSauce frontend shell, Progressive Web App (PWA) engine, and `@secretsauce/ui` plugin integration package (Architecture Specification Stage 5).

---

## 1. Architectural Overview

SecretSauce adopts a **modular PWA shell** architecture. The core application shell provides the foundational runtime, layout, theming, authentication, offline queueing, and plugin registry. Domain-specific features (recipes, meal planning, shopping lists) are provided as dynamic plugins loaded at runtime via ES modules.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          SecretSauce Shell SPA                         │
│                                                                        │
│   ┌──────────────┐   ┌────────────────────────┐   ┌────────────────┐   │
│   │  AppHeader   │   │     Dynamic Router     │   │   OfflineBar   │   │
│   │ (Slot Right) │   │ (Routes / Nav Links)   │   │ (Outbox State) │   │
│   └──────────────┘   └────────────────────────┘   └────────────────┘   │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Registries & Stores                       │   │
│   │  • Routes      • Slots     • Intents     • Settings    • i18n  │   │
│   │  • MemberStore • Household • AppStore    • Theme Engine        │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   ┌───────────────────────┐         ┌──────────────────────────────┐   │
│   │  IndexedDB Outbox     │         │   SSE Real-Time Stream       │   │
│   │  (Replay & Conflicts) │         │   (Wildcards, Boot Check)    │   │
│   └───────────────────────┘         └──────────────────────────────┘   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────────────┐             ┌───────────────────────────────────┐
│ Service Worker (`sw.js`)     │             │ Backend Kernel (`/api/`)          │
│ • URL Classifier             │             │ • REST Endpoints                  │
│ • Precached App Shell Assets │             │ • Event Stream (`/events/stream`) │
│ • Network-First Fallbacks    │             │ • Dynamic Manifest & SW Serving   │
│ • LRU Media / Image Cache    │             │ • Dynamic Plugin UI Bundles       │
└──────────────────────────────┘             └───────────────────────────────────┘
```

---

## 2. Technology Stack

- **Framework**: Vue 3.5 (Composition API, `<script setup>`, TypeScript).
- **Component System**: PrimeVue 4 (Aura preset), `@primeuix/styled`, PrimeIcons.
- **State Management**: Pinia 3.
- **Routing**: Vue Router 4 (HTML5 history mode with `base_path` support).
- **Offline Storage**: IndexedDB via `idb` v8.
- **Service Worker Caching**: Workbox Expiration v7 (LRU image cache).
- **Build System**: Vite 6 (dual-target build for Shell SPA and Service Worker IIFE).
- **Package Management**: pnpm monorepo workspace.

---

## 3. Workspace Layout

The frontend codebase is organized as a pnpm workspace under `shell/`:

```text
shell/
├── packages/
│   ├── ui/                          # `@secretsauce/ui` public library
│   │   ├── src/
│   │   │   ├── types.ts             # SecretSauceUI, RouteDef, SlotDef, Outbox, etc.
│   │   │   ├── Slot.vue             # Slot contribution renderer
│   │   │   ├── IntentTrigger.vue    # Intent execution & picker component
│   │   │   ├── testing.ts           # `createFakeSecretSauceUI` test harness
│   │   │   └── index.ts             # Public module exports
│   │   ├── tests/                   # Component unit tests
│   │   └── package.json
│   └── units/                       # `@secretsauce/units` client-side units engine
│       ├── src/
│       │   └── index.ts             # parse(), format(), canonical(), types
│       ├── tests/
│       │   └── units.spec.ts        # Parsing and formatting unit tests
│       └── package.json
├── src/
│   ├── api.ts                       # API client (`createApiClient`)
│   ├── outbox.ts                    # IndexedDB offline outbox engine
│   ├── stream.ts                    # SSE stream client (`createStreamClient`)
│   ├── theme.ts                     # PrimeVue theme registry & preset switcher
│   ├── components/                  # Shell layout & UI components
│   │   ├── AppHeader.vue            # Top navigation & member switcher
│   │   ├── AppNav.vue               # Sidebar route navigation
│   │   ├── OfflineBar.vue           # Persistent offline warning banner
│   │   └── ConfigForm.vue           # Schema-driven settings form generator
│   ├── pages/                       # Built-in shell pages
│   │   ├── SetupPage.vue            # Household onboarding wizard (`/setup`)
│   │   ├── LoginPage.vue            # Passphrase authentication (`/login`)
│   │   ├── SettingsPage.vue         # Appearance and plugin settings (`/settings`)
│   │   ├── PluginManagerPage.vue    # Plugin list & toggles (`/plugins`)
│   │   └── SharePage.vue            # Web Share Target receiver (`/share`)
│   ├── registries/                  # Dynamic extension registries
│   │   ├── routes.ts                # Route registry
│   │   ├── slots.ts                 # Slot registry
│   │   ├── intents.ts               # Intent hubs and providers
│   │   ├── settings.ts              # Settings sections
│   │   ├── i18n.ts                  # Localization messages
│   │   └── plugins.ts               # Dynamic ES module plugin loader
│   ├── stores/                      # Pinia reactive state stores
│   │   ├── app.ts                   # Connectivity and shell metadata
│   │   ├── household.ts             # Household metadata
│   │   └── member.ts                # Member list and active actor
│   ├── sw/                          # Service Worker
│   │   ├── classify.ts              # Pure URL request classifier
│   │   └── sw.ts                    # Service Worker entry point
│   ├── App.vue                      # Root SPA component
│   ├── main.ts                      # Application bootstrapper
│   └── router.ts                    # Vue Router definition
├── scripts/
│   ├── vendor.ts                    # Runtime asset vendoring build hook
│   └── build-plugins.ts             # Core plugin UI Vite library builder
├── public/icons/                    # PWA icons
├── vite.config.ts                   # Main Vite build config
├── vite.sw.config.ts                # Service Worker IIFE build config
└── vitest.config.ts                 # Vitest test runner configuration
```

---

## 4. Service Worker & Caching Strategy

The Service Worker (`shell/src/sw/sw.ts`) utilizes a pure request classification engine (`classify.ts`) to apply deterministic caching strategies:

| Category | Matcher / Path | Strategy | Expiration / Fallback |
|---|---|---|---|
| `pwa_entry` | Root document `/` or navigation requests | Network-First with 3s timeout | Falls back to cached `/` (`index.html`) |
| `pwa_manifest`| `/manifest.webmanifest` | Network-First with 2s timeout | Falls back to cached manifest |
| `static_asset`| `/static/*` (JS, CSS, icons, fonts) | Cache-First | Static assets carry immutable hashes |
| `plugin_ui` | `/api/plugins/{id}/ui.js` | Cache-First | Immutable cache key with version hash |
| `image_asset` | `/api/assets/*` images | Cache-First / Stale-While-Revalidate | Workbox LRU cache: max 50 entries, 30 days |
| `api_poll` | Non-streaming GET `/api/*` | Network-First with 5s timeout | Returns cached response when offline |
| `api_stream` | `/api/events/stream` | Direct Network (no cache) | Bypasses Service Worker cache completely |
| `write` | POST, PUT, DELETE `/api/*` | Direct Network / Outbox | Offline writes intercepted by Outbox Queue |

### Precache Manifest Injection & Static Asset Base Path
Vite builds the frontend SPA with `base: '/static/'` (`shell/vite.config.ts`), generating hashed assets in `secretsauce/static/assets/`. This aligns script and stylesheet URLs directly with FastAPI's `/static/*` route and ensures Cache-First Service Worker handling. Missing assets return a strict 404 rather than triggering the HTML fallback.

When the FastAPI server serves `GET /sw.js`, it calculates a SHA-256 hash across all static assets and injects the precache manifest dynamically:
```javascript
const precache = {"build": "a1b2c3d4e5f6", "files": ["/static/assets/index.js", ...]};
```

---

## 5. Offline Outbox Queue Engine

The outbox engine (`shell/src/outbox.ts`) enables offline mutation capabilities:

1. **Local Enqueue**: When a mutation occurs offline, `outbox.enqueue({ tag, url, method, body, optimistic_data })` writes an entry to IndexedDB (`secretsauce-outbox`) and generates a synthetic entity ID (e.g., `tmp:recipe_xyz`).
2. **Replay Loop**: When network connectivity is restored (`online` event or SSE reconnect), the outbox processes entries sequentially in FIFO order.
3. **Optimistic Rollback**: Every queued item provides a rollback callback if the request permanently fails or is manually discarded.
4. **Error Handling**:
   - **Network Error / Offline**: Retries with exponential backoff (1s, 2s, 4s... up to 60s max).
   - **401 Unauthorized**: Pauses outbox execution immediately until the user re-authenticates.
   - **409 Conflict**: Increments conflict count and prompts user resolution or discard via `OfflineBar`.

---

## 6. Real-Time Stream Client (SSE)

The stream client (`shell/src/stream.ts`) manages persistent Server-Sent Events with the kernel:

- **Auto-Reconnection**: Reconnects with exponential backoff if the connection drops, sending `Last-Event-ID` to replay missed events from the kernel's event log.
- **Process Restart Detection**: The initial SSE frame sends `boot_id`. If the server restarted (`boot_id !== window.__SS__.boot_id`), the client updates the Service Worker and automatically refreshes the page to sync static assets and schema.
- **Wildcard Subscriptions**: Plugins can subscribe to exact events (`recipe:updated`) or wildcard prefixes (`recipe:*`).

---

## 7. The `@secretsauce/ui` Plugin Contract

Every UI plugin exports a default `activate(ss: SecretSauceUI)` function. The `SecretSauceUI` instance grants sandboxed access to shell capabilities:

```typescript
export interface SecretSauceUI {
  pluginId: string
  route(def: RouteDef): void
  slot(name: string, component: Component, opts?: { order?: number }): void
  intent: {
    hub(def: IntentHub): void
    provider(def: IntentProvider): void
  }
  settings: {
    section(def: { id: string; title: string; component: Component; order?: number }): void
  }
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): void
  api: ApiClient
  url(path: string): string
  navigate?(path: string): void
  store: {
    currentMember: Ref<Member | null>
    members: Ref<Member[]>
    household: Ref<Household>
    online: Ref<boolean>
  }
  outbox: Outbox
  i18n: { add(lang: string, messages: Record<string, string>): void }
  t(key: string, params?: Record<string, string | number>): string
  theme: { register(def: { id: string; label: string; preset: object }): void }
  notify(n: { level: 'info' | 'success' | 'warning' | 'error'; message: string }): void
}
```

### Component Isolation & Slots
- Plugins insert UI into predefined shell locations via `<Slot name="location.id" :context="context" />`.
- `AppHeader.vue` completely decouples actor context selection, delegating its right-aligned container to `shell.header.right` where `core-members` mounts `MemberPicker.vue`.
- Multiple plugins contributing to the same slot are rendered sorted by `order` (default 50).
- If no contributions exist, `<Slot>` renders its default template fallback.

### Cross-Plugin Intent Dispatch
- Hubs declare points of user choice (e.g. `share:receive`, `recipe:create`).
- Providers register actions against hubs.
- `<IntentTrigger>` provides an accessible modal picker when multiple providers exist or executes immediately when only one provider is registered.

---

## 8. `@secretsauce/units` Browser Package & Import Map

The `@secretsauce/units` workspace package (`shell/packages/units/`) mirrors unit parsing and formatting in the browser:
- `parse(text, lang)`: Converts natural language lines (`"1 ½ cups flour"`) into `{ quantity, unit, name, notes }`.
- `format(qty, qty_max, unit, lang, system)`: Renders quantities with vulgar fraction support (`"1 ¼ cup"`) or metric decimals.
- `canonical(unit, lang)`: Canonicalizes unit aliases to base IDs.

### Dynamic Import Map
To enable externalized imports across dynamic plugin ES modules, the server injects a dynamic import map into `index.html`:
```html
<script type="importmap">
{
  "imports": {
    "vue": "/static/vendor/vue.js",
    "pinia": "/static/vendor/pinia.js",
    "vue-router": "/static/vendor/vue-router.js",
    "@secretsauce/ui": "/static/vendor/secretsauce-ui.js",
    "@secretsauce/units": "/static/vendor/secretsauce-units.js"
  }
}
</script>
```
Plugins can directly `import { parse, format } from '@secretsauce/units'` or `import type { SecretSauceUI } from '@secretsauce/ui'` without local bundling.

---

## 9. Plugin UI Build Tooling (`scripts/build-plugins.ts`)

Plugins provide their frontend components under `<plugin_dir>/ui/src/index.ts`. The build script `shell/scripts/build-plugins.ts` iterates over core and external plugins, executing Vite library builds:
- **Output:** `<plugin_dir>/ui/dist/index.js` copied to `<plugin_dir>/ui.js`, and `<plugin_dir>/ui/dist/style.css` copied to `<plugin_dir>/ui.css`.
- **Externalized dependencies:** `vue`, `pinia`, `vue-router`, `@secretsauce/ui`, `@secretsauce/units`, and PrimeVue components.
- **Invocation:** `pnpm --prefix shell build:plugins`, automatically included in `pnpm --prefix shell build`.

---

## 10. Application Bootstrapping, Dynamic Plugin Loading & Navigation

### Router Navigation Guard & Dynamic Route Binding (`shell/src/main.ts`)
The shell router manages unauthenticated visitors, dynamic plugin routing, and onboarding state via a global `beforeEach` guard:
1. **Dynamic Plugin Loading**: On application startup, the shell queries `GET /api/plugins/active`. For each active plugin:
   - Injects its stylesheet into `<head>` via `<link rel="stylesheet" id="plugin-css-{id}" href="/api/plugins/{id}/ui.css">` if `ui_css` is present.
   - Dynamically imports the module entry point via native browser `import(plugin.ui_entry)`.
   - Executes the plugin's `activate(ss)` export.
   - Plugin routes registered into `routeRegistry` are bound to Vue Router via `routeRegistry.bindRouter(router)`.
2. **Household Setup Check**: Queries `GET /api/setup`. If `needs_setup` is `true`, navigates to `/setup` (and blocks other routes). If setup is completed, `/setup` is blocked and redirected.
3. **Session Authentication Check**: Queries `GET /api/auth/session`.
   - If unauthenticated (401), disconnects the SSE event stream and redirects navigation to `/login`.
   - If authenticated, visiting `/login` redirects to `/`.
4. **Root Route Redirection & Default Start Page**: Authenticated navigation to `/` dynamically redirects to `/timeline` when `core-timeline` is active, falling back to `/recipes` (or `/plugins` if neither is active). Users can configure their start page preference (`Auto`, `Timeline`, or `Recipes`) in Household Settings (`/settings`), stored in `localStorage` under `secretsauce:default_start_page`.
5. **Data Hydration**: Populates `householdStore` and `memberStore` upon successful authentication.
6. **SSE Stream Lifecycle**: `stream.connect()` is only initiated when an authenticated session exists, preventing unauthenticated SSE 401 connection retries.

### Shell Layout & Auth Pages (`shell/src/App.vue`)
- Core navigation routes (`/settings`, `/plugins`) are registered in `routeRegistry` by default.
- On authentication pages (`/login`, `/setup`), the sidebar `AppNav` is hidden (`v-if="!isAuthPage"`), presenting a clean, centered interface.

---

## 11. Testing & Verification

The shell test suite uses Vitest with `@vue/test-utils` and HappyDOM for unit and component testing, and Playwright for real-browser end-to-end testing:

```bash
# Run all frontend shell tests
pnpm --prefix shell test

# Run live Chromium end-to-end browser tests
pnpm --prefix shell test:e2e

# Build shell SPA, Service Worker, and vendor modules
pnpm --prefix shell build

# Run all backend + PWA integration tests
uv run pytest
```

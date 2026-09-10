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
│   │ (Member Sel) │   │ (Routes / Nav Links)   │   │ (Outbox State) │   │
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
│   └── ui/                          # `@secretsauce/ui` public library
│       ├── src/
│       │   ├── types.ts             # SecretSauceUI, RouteDef, SlotDef, Outbox, etc.
│       │   ├── Slot.vue             # Slot contribution renderer
│       │   ├── IntentTrigger.vue    # Intent execution & picker component
│       │   ├── testing.ts           # `createFakeSecretSauceUI` test harness
│       │   └── index.ts             # Public module exports
│       ├── tests/                   # Component unit tests
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
│   └── vendor.ts                    # Asset vendoring build hook
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

### Precache Manifest Injection
During build, Vite generates shell bundles in `secretsauce/static/`. When the FastAPI server serves `GET /sw.js`, it calculates a SHA-256 hash across all static assets and injects the precache manifest dynamically:
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
- Multiple plugins contributing to the same slot are rendered sorted by `order` (default 50).
- If no contributions exist, `<Slot>` renders its default template fallback.

### Cross-Plugin Intent Dispatch
- Hubs declare points of user choice (e.g. `share:receive`, `recipe:create`).
- Providers register actions against hubs.
- `<IntentTrigger>` provides an accessible modal picker when multiple providers exist or executes immediately when only one provider is registered.

---

## 8. Testing & Verification

The shell test suite uses Vitest with `@vue/test-utils` and HappyDOM:

```bash
# Run all frontend shell tests
pnpm --prefix shell test

# Build shell SPA and Service Worker
pnpm --prefix shell build

# Run all backend + PWA integration tests
uv run pytest
```

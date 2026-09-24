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

When the FastAPI server serves `GET /sw.js`, it injects the precache manifest (a SHA-256 build hash over all static assets and the file list), computed once at boot:
```javascript
const precache = {"build": "a1b2c3d4e5f6", "files": ["/static/assets/index.js", ...]};
```

### Expiry and logout
Plugin bundles (50), assets (200) and cached API responses (1,000) are capped with Workbox `CacheExpiration`: every cached response records its timestamp and then runs `expireEntries()`, which evicts the least recently used entries past the cap. On logout the shell posts `{type: 'clear'}` to the worker, which deletes the API and asset caches, so household data does not outlive the session on the device (spec 8.6).

---

## 5. Offline Outbox Queue Engine

The outbox (`shell/src/outbox.ts`) lets plugins queue writes that must survive being offline:

1. **Enqueue**: `outbox.enqueue({ method, path, body, query, tag })` stores the request in IndexedDB (`ss-outbox`, one connection per outbox) and tries to flush immediately. Creates should carry a client-chosen `id` so a replay is idempotent.
2. **Flush**: Entries replay in creation order. A success removes the entry and fires `applied`.
3. **Outcomes**:
   - **Network error, timeout, 5xx**: The entry stays queued and the flush stops. A retry is scheduled with exponential backoff (1 s, 2 s, 4 s, … capped at 5 minutes), reset by the next success. A 5xx entry moves to `failed` after 10 attempts. The browser's `online` event and a 60-second safety timer also trigger flushes.
   - **409 on a POST whose `id`/`group_id` matches `details.current`**: The write already happened (an earlier replay); treated as applied.
   - **401**: The flush stops and entries wait for the next login.
   - **Other 4xx**: The entry moves to `failed` and fires `failed`; `OfflineBar` lets the user discard it.

---

## 6. Real-Time Stream Client (SSE)

The stream client (`shell/src/stream.ts`) keeps one `EventSource` on `GET /api/events/stream` while a session exists:

- **Named frames**: The kernel sends named SSE events (`hello`, `event`, `push`), which an `EventSource` delivers only to listeners registered for those names (not to `onmessage`). The client registers one listener per name and dispatches on each frame's `kind`.
- **Resuming**: The browser's automatic reconnects send `Last-Event-ID`. When the shell itself reopens the stream, it passes the last seen event id as `?last_event_id=`, so no event in between is lost.
- **Restart detection**: The `hello` frame carries `boot_id`. If it differs from `window.__SS__.boot_id`, the server restarted; the client updates the service worker and reloads the page.
- **Subscriptions**: `ss.on(name, handler)` matches exact names (`recipe:updated`), prefixes (`recipe:*`) and pushes by name (`job:progress`).
- **Online state**: Once a session opened the stream, its connection state drives `appStore.online`, which shows the offline bar.

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

Common slots established across the application:
| Slot Name | Provider | Context | Description |
|---|---|---|---|
| `shell.header.right` | Shell (`AppHeader.vue`) | `{}` | Header actions & member picker. |
| `settings.tab.members` | Shell (`SettingsPage.vue`) | `{}` | Member profiles & household settings. |
| `recipe.card.actions` | Core Recipes (`RecipeCard.vue`) | `{ recipe, isShortlisted }` | Action buttons on recipe cards. |
| `recipe.list.filters` | Core Recipes (`RecipeListPage.vue`) | `{ filterShortlist, toggleShortlist }` | Filter chips in recipe list. |
| `timeline.day.actions` | Core Timeline (`TimelinePage.vue`) | `{ date }` | Quick shortcuts on day headers. |
| `timeline.entry.badge` | Core Timeline (`ScheduleCard.vue`) | `{ entry }` | Status badges on schedule cards (e.g. `CookedBadge`). |
| `timeline.entry.actions`| Core Timeline (`ScheduleCard.vue`) | `{ entry }` | Contextual action buttons on scheduled meals. |
| `journal.entry.footer` | Cook Tracker (`JournalPage.vue`) | `{ entry }` | Feedback and voting on cooked entries (e.g. `VoteRating`). |

### Cross-Plugin Intent Dispatch
- Hubs declare points of user choice (e.g. `share:receive`, `entry:create`, `entry:interact`).
- Providers register actions against hubs.
- `<IntentTrigger>` provides an accessible modal picker when multiple providers exist or executes immediately when only one provider is registered.

Standard intent hubs:
- `entry:create`: Dispatches meal planning dialog with recipe search, shortlist, and suggestions.
- `entry:interact`: Contextual operations on scheduled meals (e.g. `mark-cooked`, recipe detail navigation).

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
The shell router manages unauthenticated visitors, dynamic plugin routing, and onboarding state via a global `beforeEach` guard backed by `createAuthState` (`shell/src/session.ts`):
1. **Household Setup Check**: `GET /api/setup`. While `needs_setup` is true every route leads to `/setup`; once setup is complete `/setup` redirects to `/login`. A completed setup is cached and never re-checked.
2. **Session Check**: `GET /api/auth/session`. A confirmed session is cached, so navigating costs no requests; any 401 from the API client (`onUnauthorized`) drops the cache and the next navigation re-checks. Without a session the stream is closed and navigation goes to `/login`; with one, `/login` redirects to `/`.
3. **Dynamic Plugin Loading** (once per session): `GET /api/plugins/active`. Stylesheets are injected into `<head>`, every bundle is fetched in parallel via `import(plugin.ui_entry)` (the URL includes `BASE_PATH` and a content version), and then each plugin's `activate(ss)` runs in the order the kernel listed them. Plugin routes are bound to Vue Router via `routeRegistry.bindRouter(router)`.
4. **Root Route Redirection & Default Start Page**: `/` redirects to `/timeline` when `core-timeline` is active, else `/recipes`, unless the user chose a start page in Settings (`localStorage` key `secretsauce:default_start_page`).
5. **Data Hydration**: Populates `householdStore` and `memberStore` once per session. Plugins see them through `ss.store`, whose refs are live (`storeToRefs`), not snapshots.
6. **SSE Stream Lifecycle**: The stream connects only once a session exists.

### Logout (`shell/src/session.ts`)
Settings offers **Log out**. It calls `POST /api/auth/logout` (the kernel revokes the session), asks the service worker to clear its API and asset caches, deletes the outbox database and every `localStorage` key starting with `ss-` or `secretsauce:`, then reloads at `/login`. Local data is cleared even when the server cannot be reached.

### API Client (`shell/src/api.ts`)
Prefixes `BASE_PATH`, sends `X-Actor-Member`, and aborts requests after 30 s (uploads 120 s), reporting them as `OfflineError`. An empty success body resolves to `undefined`. Only a 409 whose code is `conflict` becomes a `ConflictError`; other errors are `ApiError` with the envelope's `code` and message (or FastAPI's `detail`).

### Notifications
`ss.notify({ level, message })` shows a PrimeVue toast (`<Toast />` in `App.vue`).

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

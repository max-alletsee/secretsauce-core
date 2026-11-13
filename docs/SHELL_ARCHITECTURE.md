# SecretSauce Frontend Shell & PWA Architecture

This document describes the design and runtime architecture of the SecretSauce frontend shell, Progressive Web App (PWA) engine, and `@secretsauce/ui` plugin integration package.

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
- **Component System**: PrimeVue 4 with Aura, Nora, Material and Lara presets, `@primeuix/styled`, PrimeIcons.
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
│   │   ├── SettingsPage.vue         # Appearance, household, and plugin settings (`/settings`)
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
Plugin bundles (50), assets (200) and cached API responses (1,000) are capped with Workbox `CacheExpiration`: every cached response records its timestamp and then runs `expireEntries()`, which evicts the least recently used entries past the cap. On logout the shell posts `{type: 'clear'}` to the worker, which deletes the API and asset caches, so household data does not outlive the session on the device.

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
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): void | (() => void)
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
  confirm(options: ConfirmOptions): Promise<boolean>
}
```

### Host controls, context and confirmation
`API_VERSION` remains **1**. `shell/src/ui/install.ts` installs PrimeVue, ToastService, ConfirmationService and `v-tooltip`. It reserves these global component names: `Button`, `SplitButton`, `Menu`, `Dialog`, `ConfirmDialog`, `Drawer`, `Accordion`, `AccordionPanel`, `AccordionHeader`, `AccordionContent`, `Tabs`, `TabList`, `Tab`, `TabPanels`, `TabPanel`, `InputText`, `Textarea`, `InputNumber`, `Select`, `SelectButton`, `AutoComplete`, `ToggleSwitch`, `Checkbox`, `IconField`, `InputIcon`, `Tag`, `Avatar`, `Message`, `ProgressSpinner`, `Card`, `Divider`. Plugins use the global tags, not private copies or competing global registrations. CSS uses PrimeVue semantic tokens rather than fixed theme colors.

`shell/src/pluginContext.ts` wraps route, slot, Settings and UI-intent components, providing the owning plugin's `ss` both as a legacy prop and through `useSecretSauce()`. `SECRET_SAUCE_UI_KEY` is the string `__SS_UI__`; registry injection keys also remain strings (`__SS_SLOT_REGISTRY__`, `__SS_INTENT_REGISTRY__`, etc.). Do not replace them with cross-bundle Symbols. `ss.confirm({ message, header?, acceptLabel?, rejectLabel?, severity? })` resolves true only on acceptance; rejection or dismissal resolves false. One host `ConfirmDialog` handles destructive confirmations.

### Component Isolation & Slots
- Plugins insert UI into predefined shell locations via `<Slot name="location.id" :context="context" />`.
- `AppHeader.vue` completely decouples actor context selection, delegating its right-aligned container to `shell.header.right` where `core-members` mounts `MemberPicker.vue`.
- Multiple plugins contributing to the same slot are rendered sorted by `order` (default 50).
- If no contributions exist, `<Slot>` renders its default template fallback.

Common slots established across the application:
| Slot Name | Provider | Context | Description |
|---|---|---|---|
| `shell.header.right` | Shell (`AppHeader.vue`) | `{}` | Header actions & member picker. |
| `recipe.card.actions` | Core Recipes (`RecipeCard.vue`) | `{ recipe }` | Recipe includes `is_shortlisted` for shortlist controls. |
| `recipe.list.filters` | Core Recipes (`RecipeListPage.vue`) | `{ active, toggle }` | Shortlist filter state and toggle callback. |
| `timeline.day.actions` | Core Timeline (`TimelinePage.vue`) | `{ date }` | Quick shortcuts on day headers. |
| `timeline.entry.badge` | Core Timeline (`ScheduleCard.vue`) | `{ entry }` | Status badges on schedule cards (e.g. `CookedBadge`). |
| `timeline.entry.actions`| Core Timeline (`ScheduleCard.vue`) | `{ entry }` | Contextual action buttons on scheduled meals. |
| `timeline.sidebar` | Core Timeline | `{ from, to }` | Shortlist and AI widgets; phone accordion, desktop sidebar. |
| `journal.entry.footer` | Cook Tracker (`JournalPage.vue`) | `{ entry }` | Feedback and voting on cooked entries (e.g. `VoteRating`). |

### Cross-Plugin Intent Dispatch
- Hubs declare points of user choice (e.g. `share:receive`, `entry:create`, `entry:interact`).
- Providers register actions against hubs.
- `<IntentTrigger>` filters `isAvailable(context)`, sorts by `order`, hides when no providers remain, runs one provider directly, or opens an anchored PrimeVue Menu for multiple providers. `disabledReason(context)` disables an action with a tooltip. A `headless` provider requires `execute`; a `ui` provider requires `component` and resolves/cancels through component events. Invalid definitions are rejected by the registry.
- Providers keep a required static `title` and may supply `titleFor(context)` (for example, “Repeat every Tuesday”). The contextual title is used for buttons, menus and dialog headers. Scoped triggers expose `{ open }` so icon buttons can use the same filtering, menu and dialog behavior.

Standard intent hubs:
- `entry:create`: Dispatches meal planning dialog with recipe search, shortlist, and suggestions.
- `entry:interact`: `{ entry, mealType }` for scheduled meal operations; `mealType` is the resolved canonical slot id. Providers include recipe navigation, cooked status, repeat weekly and confirmed removal.
- `recipe:create` / `recipe:actions`: recipe creation/import and recipe actions.
- `timeline:assist`: planning assistance; `share:receive`: incoming shared content.

### Reactive Settings and live subscriptions
Settings is a reactive, multiple-open Accordion. Built-in sections are Household, Plugins and This device (appearance/start page/account); plugin sections are registered with `ss.settings.section` and disappear on deactivation. Open ids persist in `ss-settings-open`; `?section=<id>` opens and scrolls to an existing section. The shell owns section headings; contributed Settings components must not repeat the section title as a heading. Members and recurring rules use forms/dialogs within their sections. Appearance stores theme and default start page separately from household metadata.

Activation-owned `ss.on` subscriptions are removed on deactivation and failed activation. Components must also call their returned unsubscribe functions on unmount. Timeline refreshes after schedule/journal events and `core-timeline:slots-changed`, debounces bursts, ignores stale responses and disposes listeners on navigation. Its vertical feed starts at today−2 through today+6, collapses past days, and extends explicitly with earlier/more buttons. All feed APIs are loaded in 63-inclusive-day chunks, so extending beyond a single API range still works. Unknown legacy meal-type strings remain visible in synthetic slots; they have individual meal actions, not an invalid bulk slot-removal action.

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
- On authentication pages (`/login`, `/setup`), navigation is hidden, presenting a centered interface.
- At widths below 768px the desktop sidebar is hidden and the header hamburger opens a PrimeVue Drawer; successful route navigation closes it. Settings is pinned at the navigation footer with a gear icon, Plugins is a Settings section (`/plugins` redirects to `/settings?section=plugins`), and the header shows the household name. Timeline is first when enabled; there is no replacement top-tab navigation.
- Device theme ids are `aura-tomato` (default), `nora-tomato`, `material-indigo`, `lara-amber`. Tomato uses the rose primitive palette; all presets use zinc surfaces and light mode (`darkModeSelector: false`). The selection persists as `ss-theme`; unknown ids fall back to Aura. Changing a theme updates host and plugin controls without reloading.

---

## 11. Testing & Verification

The shell test suite uses Vitest with `@vue/test-utils` and HappyDOM for unit and component testing, and Playwright for real-browser end-to-end testing. Registered-plugin and component harnesses exercise the host installer (`mountWithUi` and `registeredPlugin` helpers), while `tests/test_ui_{household,timeline,recurring}_runtime.py` exercise real application lifespans, HTTP routes, and background delivery. Browser suites (`ui-foundation`, `ui-settings`, `ui-plugins`, `ui-timeline`, `ui-recurring`, `ui-import`, `ui-members`, `ui-recipe-magic`, and `ui-theme-smoke`) test compiled bundles, SSE, and browser globals. The theme matrix captures labeled screenshots under `shell/test-results/` across four presets at 390px and 1280px, checks outer and inner horizontal overflow, and fails on page errors or authenticated console errors (only the initial unauthenticated session-probe 401 is exempt). Setup smoke uses a separate disposable server rather than the seeded household.

Verification commands:

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

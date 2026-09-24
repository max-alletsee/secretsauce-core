import { createApp, watch } from 'vue'
import { createPinia, storeToRefs } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import ToastEventBus from 'primevue/toasteventbus'

import App from './App.vue'
import { buildRouter } from './router'
import { createApiClient } from './api'
import { createOutbox } from './outbox'
import { createStreamClient } from './stream'
import { createAuthState, logout } from './session'
import { createRouteRegistry } from './registries/routes'
import { createSlotRegistry } from './registries/slots'
import { createIntentRegistry } from './registries/intents'
import { createSettingsRegistry } from './registries/settings'
import { createI18nRegistry } from './registries/i18n'
import { createPluginLoader } from './registries/plugins'
import { createThemeRegistry } from './theme'
import { useMemberStore } from './stores/member'
import { useHouseholdStore } from './stores/household'
import { useAppStore } from './stores/app'
import SettingsPage from './pages/SettingsPage.vue'
import PluginManagerPage from './pages/PluginManagerPage.vue'
import type { SecretSauceUI } from '@secretsauce/ui'

const meta = (typeof window !== 'undefined' && (window as any).__SS__) || {
  boot_id: 'dev',
  base_path: '/',
  version: '1.0.0',
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const memberStore = useMemberStore()
const householdStore = useHouseholdStore()
const appStore = useAppStore()

const basePath: string = meta.base_path.endsWith('/') ? meta.base_path : `${meta.base_path}/`

const api = createApiClient(basePath, () => memberStore.currentMember?.id || null, {
  // A session revoked elsewhere (logout, passphrase change) ends the cached one here.
  onUnauthorized: () => auth.invalidate(),
})
const auth = createAuthState(api)
const outbox = createOutbox(api)
const { currentMember, members } = storeToRefs(memberStore)
const { household } = storeToRefs(householdStore)

const TOAST_SEVERITY = { info: 'info', success: 'success', warning: 'warn', error: 'error' } as const

const stream = createStreamClient(
  `${basePath}api/events/stream`,
  meta.boot_id,
  async () => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) await reg.update()
    }
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }
)

// The offline bar follows the event stream once a session has opened it.
let streamStarted = false
watch(stream.online, (online) => {
  if (streamStarted) appStore.online = online
})
function startStream() {
  streamStarted = true
  stream.connect()
}
function stopStream() {
  streamStarted = false
  stream.disconnect()
  appStore.online = true
}

const routes = createRouteRegistry()
const slots = createSlotRegistry()
const intents = createIntentRegistry()
const settings = createSettingsRegistry()
const i18n = createI18nRegistry()
const themes = createThemeRegistry()

// Register shell core navigation routes
routes.register('shell', {
  path: '/settings',
  component: SettingsPage,
  nav: { label: 'Settings', icon: 'cog', order: 900 },
})
routes.register('shell', {
  path: '/plugins',
  component: PluginManagerPage,
  nav: { label: 'Plugins', icon: 'box', order: 910 },
})

// Register share intent hub owned by shell
intents.registerHub({ id: 'share:receive', title: 'Handle Shared URL/Text' })

function makeSecretSauceUI(pluginId: string): SecretSauceUI {
  return {
    pluginId,
    navigate: (p: string) => router.push(p),
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
    url: (p: string) => `${basePath}${p.startsWith('/') ? p.slice(1) : p}`,
    // Live refs into the stores, not snapshots taken at activation time.
    store: { currentMember, members, household, online: stream.online },
    outbox,
    i18n: { add: (lang, msgs) => i18n.add(lang, msgs) },
    t: (k, p) => i18n.t(k, p),
    theme: { register: (t) => themes.register(t) },
    notify: ({ level, message }) =>
      ToastEventBus.emit('add', {
        severity: TOAST_SEVERITY[level] || 'info',
        summary: pluginId,
        detail: message,
        life: level === 'error' ? 8000 : 4000,
      }),
  }
}

const pluginLoader = createPluginLoader({
  basePath,
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
app.provide('__SS_PLUGIN_LOADER__', pluginLoader)
app.provide('__SS_NAVIGATE__', (path: string) => router.push(path))
app.provide('__SS_BASE_PATH__', basePath)
app.provide('__SS_LOGOUT__', async () => {
  stopStream()
  await logout({
    api,
    serviceWorker: typeof navigator !== 'undefined' ? navigator.serviceWorker : null,
    storage: typeof localStorage !== 'undefined' ? localStorage : null,
    deleteDatabase: (name) => typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase(name),
  })
  auth.invalidate()
  // A full reload drops every plugin's in-memory state along with the session.
  if (typeof window !== 'undefined') window.location.assign(`${basePath}login`)
})

app.use(PrimeVue, { theme: { preset: Aura } })
app.use(ToastService)
app.use(ConfirmationService)

const router = buildRouter(basePath)
routes.bindRouter(router)
app.use(router)

let storesFetched = false
let pluginsLoaded = false

router.beforeEach(async (to, from, next) => {
  if (await auth.needsSetup()) {
    return to.path === '/setup' ? next() : next('/setup')
  }
  // Setup is complete; disallow visiting /setup
  if (to.path === '/setup') {
    return next('/login')
  }

  if (!(await auth.isAuthenticated())) {
    storesFetched = false
    pluginsLoaded = false
    stopStream()
    return to.path === '/login' ? next() : next('/login')
  }

  // Authenticated user navigating to /login -> redirect to home
  if (to.path === '/login') {
    return next('/')
  }

  // Connect stream and fetch stores once authenticated
  if (typeof document !== 'undefined' && document.getElementById('app') && !streamStarted) {
    startStream()
  }

  if (!pluginsLoaded) {
    pluginsLoaded = true
    await pluginLoader.loadActivePlugins(api)
  }

  if (to.path === '/' || to.redirectedFrom?.path === '/') {
    const preferred = typeof localStorage !== 'undefined' ? localStorage.getItem('secretsauce:default_start_page') : null
    if (preferred === '/timeline' || preferred === '/recipes') {
      if (to.path !== preferred) return next(preferred)
    } else {
      const isTimelineActive = router.getRoutes().some((r) => r.path === '/timeline')
      const target = isTimelineActive ? '/timeline' : '/recipes'
      if (to.path !== target) return next(target)
    }
  }

  if (to.matched.length === 0) {
    return next(to.fullPath)
  }

  if (!storesFetched) {
    storesFetched = true
    await Promise.all([
      householdStore.fetchHousehold(api),
      memberStore.fetchMembers(api),
    ])
  }

  next()
})

if (typeof document !== 'undefined' && document.getElementById('app')) {
  app.mount('#app')
}

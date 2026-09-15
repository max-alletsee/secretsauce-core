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

const api = createApiClient(meta.base_path, () => memberStore.currentMember?.id || null)
const outbox = createOutbox(api)

const stream = createStreamClient(
  `${meta.base_path}api/events/stream`,
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
    url: (p: string) => `${meta.base_path}${p.startsWith('/') ? p.slice(1) : p}`,
    store: {
      currentMember: ref(memberStore.currentMember) as any,
      members: ref(memberStore.members) as any,
      household: ref(householdStore.household) as any,
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
app.provide('__SS_PLUGIN_LOADER__', pluginLoader)
app.provide('__SS_NAVIGATE__', (path: string) => router.push(path))

app.use(PrimeVue, { theme: { preset: Aura } })
app.use(ToastService)
app.use(ConfirmationService)

const router = buildRouter(meta.base_path)
routes.bindRouter(router)
app.use(router)

let storesFetched = false
let pluginsLoaded = false

router.beforeEach(async (to, _from, next) => {
  let needsSetup = false
  try {
    const setupStatus = await api.get<{ needs_setup?: boolean; setup_required?: boolean }>('/api/setup')
    needsSetup = Boolean(setupStatus?.needs_setup ?? setupStatus?.setup_required)
  } catch {
    // offline or network error, proceed
  }

  if (needsSetup) {
    if (to.path !== '/setup') {
      return next('/setup')
    }
    return next()
  }

  // Setup is complete; disallow visiting /setup
  if (to.path === '/setup') {
    return next('/login')
  }

  // Check auth session
  let isAuthenticated = false
  try {
    const session = await api.get<{ authenticated: boolean }>('/api/auth/session')
    isAuthenticated = Boolean(session?.authenticated)
  } catch {
    isAuthenticated = false
  }

  if (!isAuthenticated) {
    storesFetched = false
    pluginsLoaded = false
    stream.disconnect()
    if (to.path !== '/login') {
      return next('/login')
    }
    return next()
  }

  // Authenticated user navigating to /login -> redirect to home
  if (to.path === '/login') {
    return next('/')
  }

  // Connect stream and fetch stores once authenticated
  if (typeof document !== 'undefined' && document.getElementById('app')) {
    stream.connect()
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

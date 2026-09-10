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

app.use(PrimeVue, { theme: { preset: Aura } })
app.use(ToastService)
app.use(ConfirmationService)

const router = buildRouter(meta.base_path)
app.use(router)

router.beforeEach(async (to, _from, next) => {
  try {
    const setupStatus = await api.get<{ needs_setup: boolean }>('/api/setup')
    if (setupStatus?.needs_setup && to.path !== '/setup') {
      return next('/setup')
    }
  } catch {
    // offline or error, proceed
  }
  next()
})

if (typeof document !== 'undefined' && document.getElementById('app')) {
  app.mount('#app')
  stream.connect()
}

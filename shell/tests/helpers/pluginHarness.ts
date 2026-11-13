import { ref } from 'vue'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createRouteRegistry } from '../../src/registries/routes'
import { createSlotRegistry } from '../../src/registries/slots'
import { createIntentRegistry } from '../../src/registries/intents'
import { createSettingsRegistry } from '../../src/registries/settings'
import { createI18nRegistry } from '../../src/registries/i18n'
import { createThemeRegistry } from '../../src/theme'
import { makeSecretSauceUI } from '../../src/pluginContext'
import { useMemberStore } from '../../src/stores/member'
import { useHouseholdStore } from '../../src/stores/household'
import type { SecretSauceUI } from '@secretsauce/ui'

export function pluginHarness(api: SecretSauceUI['api']) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const memberStore = useMemberStore(pinia), householdStore = useHouseholdStore(pinia)
  const routes = createRouteRegistry(), slots = createSlotRegistry(), intents = createIntentRegistry()
  const settings = createSettingsRegistry(), i18n = createI18nRegistry(), themes = createThemeRegistry()
  const router = createRouter({ history: createMemoryHistory(), routes: [] })
  routes.bindRouter(router)
  const { currentMember, members } = storeToRefs(memberStore), { household } = storeToRefs(householdStore)
  const notifications: unknown[] = []
  const streamListeners = new Map<string, Set<(e: any) => void>>()
  const stream = {
    on: (name: string, fn: (e: any) => void) => {
      let set = streamListeners.get(name)
      if (!set) { set = new Set(); streamListeners.set(name, set) }
      set.add(fn)
      return () => { set?.delete(fn) }
    },
  }
  const emitStream = (name: string, event: any) => {
    for (const fn of streamListeners.get(name) || []) fn(event)
  }
  const deps = {
    routes, slots, intents, settings, i18n, themes, router, basePath: '/', api,
    store: { currentMember, members, household, online: ref(true) },
    stream,
    outbox: { pending: ref(0), failed: ref([]), enqueue: async () => 'id', discard: async () => {}, on: () => {} },
    notify: (n: unknown) => { notifications.push(n) },
  }
  return { ...deps, emitStream, pinia, memberStore, householdStore, notifications, ss: (id: string) => makeSecretSauceUI(id, deps), provide: {
    __SS_ROUTE_REGISTRY__: routes, __SS_SLOT_REGISTRY__: slots, __SS_INTENT_REGISTRY__: intents,
    __SS_SETTINGS_REGISTRY__: settings, __SS_THEME_REGISTRY__: themes,
    __SS_API__: api, __SS_NAVIGATE__: (path: string) => { router.push(path) },
  } }
}

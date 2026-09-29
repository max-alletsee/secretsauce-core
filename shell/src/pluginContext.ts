import { defineComponent, h, provide, type Component } from 'vue'
import { SECRET_SAUCE_UI_KEY, type SecretSauceUI } from '@secretsauce/ui'
import ConfirmationEventBus from 'primevue/confirmationeventbus'
import type { Router } from 'vue-router'
import type { createRouteRegistry } from './registries/routes'
import type { createSlotRegistry } from './registries/slots'
import type { createIntentRegistry } from './registries/intents'
import type { createSettingsRegistry } from './registries/settings'
import type { createI18nRegistry } from './registries/i18n'
import type { createThemeRegistry } from './theme'
import type { StreamClient } from './stream'

export interface PluginUiDependencies {
  routes: ReturnType<typeof createRouteRegistry>
  slots: ReturnType<typeof createSlotRegistry>
  intents: ReturnType<typeof createIntentRegistry>
  settings: ReturnType<typeof createSettingsRegistry>
  i18n: ReturnType<typeof createI18nRegistry>
  themes: ReturnType<typeof createThemeRegistry>
  router: Pick<Router, 'push'>
  stream: Pick<StreamClient, 'on'>
  basePath: string
  api: SecretSauceUI['api']
  store: SecretSauceUI['store']
  outbox: SecretSauceUI['outbox']
  notify: SecretSauceUI['notify']
}

export function withPlugin(component: Component, ss: SecretSauceUI): Component {
  return defineComponent({
    name: 'PluginContext',
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      provide(SECRET_SAUCE_UI_KEY, ss)
      return () => h(component, { ...attrs, ss }, slots)
    },
  })
}

export function makeSecretSauceUI(pluginId: string, d: PluginUiDependencies): SecretSauceUI {
  const ss: SecretSauceUI = {
    pluginId,
    navigate: p => { d.router.push(p) },
    route: def => d.routes.register(pluginId, { ...def, component: withPlugin(def.component, ss) }),
    slot: (name, comp, opts) => d.slots.register(pluginId, name, withPlugin(comp, ss), opts),
    intent: { hub: hub => d.intents.registerHub(hub), provider: prov => d.intents.registerProvider(pluginId,
      prov.kind === 'ui' && prov.component ? { ...prov, component: withPlugin(prov.component, ss) } : prov) },
    settings: { section: sec => d.settings.register(pluginId, { ...sec, component: withPlugin(sec.component, ss) }) },
    on: (name, fn) => d.stream.on(name, fn),
    api: d.api,
    url: p => `${d.basePath}${p.startsWith('/') ? p.slice(1) : p}`,
    store: d.store,
    outbox: d.outbox,
    i18n: { add: (lang, msgs) => d.i18n.add(lang, msgs) },
    t: (k, p) => d.i18n.t(k, p),
    theme: { register: theme => d.themes.register(theme) },
    notify: d.notify,
    confirm: options => new Promise<boolean>(resolve => {
      ConfirmationEventBus.emit('confirm', {
        ...options, acceptProps: { severity: options.severity },
        accept: () => resolve(true), reject: () => resolve(false), onHide: () => resolve(false),
      })
    }),
  }
  return ss
}

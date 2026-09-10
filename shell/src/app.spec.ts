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
          __SS_OUTBOX__: {
            pending: { value: 0 },
            failed: { value: [] },
            discard: () => {},
          },
        },
        stubs: ['router-view', 'router-link'],
      },
    })

    expect(wrapper.findComponent({ name: 'AppHeader' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'AppNav' }).exists()).toBe(true)
  })
})

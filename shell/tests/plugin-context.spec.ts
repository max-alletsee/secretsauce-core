import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView } from 'vue-router'
import { useSecretSauce } from '@secretsauce/ui'
import { mount } from '@vue/test-utils'
import { pluginHarness } from './helpers/pluginHarness'

const api: any = { get: async () => [], post: async () => ({}), patch: async () => ({}), put: async () => ({}), delete: async () => {}, upload: async () => ({}) }

describe('production plugin context registrations', () => {
  it('passes actual router params through the plugin wrapper', async () => {
    const harness = pluginHarness(api)
    const ss = harness.ss('example')
    ss.route({ path: '/recipes/:id', component: defineComponent({ props: ['id'], setup(props) {
      const context = useSecretSauce()
      return () => h('p', `${context.pluginId}:${props.id}`)
    } }) })
    await harness.router.push('/recipes/r42')
    const wrapper = mount(RouterView, { global: { plugins: [harness.router] } })
    expect(wrapper.text()).toBe('example:r42')
    wrapper.unmount()
  })
  it.each(['route', 'slot', 'settings', 'intent'])('passes props and injected context through %s', async (path) => {
    const harness = pluginHarness(api)
    const ss = harness.ss('example')
    let received: any, provided: any
    const component = defineComponent({
      props: ['ss', 'id'],
      setup(props) { received = props.ss; provided = useSecretSauce(); return () => h('p', props.id) },
    })
    let registered: any
    if (path === 'route') { ss.route({ path: '/recipes/:id', component }); registered = harness.routes.getRoutes()[0].component }
    if (path === 'slot') { ss.slot('shell.header.right', component); registered = harness.slots.getContributions('shell.header.right')[0].component }
    if (path === 'settings') { ss.settings.section({ id: 'example', title: 'Example', component }); registered = harness.settings.getSections()[0].component }
    if (path === 'intent') { ss.intent.hub({ id: 'test', title: 'Test' }); ss.intent.provider({ hub: 'test', id: 'ui', title: 'UI', order: 0, kind: 'ui', component }); registered = harness.intents.getProviders('test')[0].component }
    const wrapper = mount(registered, { props: { id: 'r42' } })
    expect(wrapper.text()).toBe('r42')
    expect(received).toBe(ss)
    expect(provided).toBe(ss)
    wrapper.unmount()
  })
})

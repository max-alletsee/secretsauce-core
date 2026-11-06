import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import CustomizeSettings from '../../../secretsauce/plugins/core/core-customize-recipe/ui/src/CustomizeSettings.vue'
import CustomizePluginSettings from '../../../secretsauce/plugins/core/core-customize-recipe/ui/src/CustomizePluginSettings.vue'

describe('CustomizeSettings Component', () => {
  it('loads actions, allows editing, reordering, adding, saving, and resetting', async () => {
    const initialActions = [
      { id: 'act_1', title: 'Action 1', description: 'Desc 1', prompt: 'Prompt 1' },
      { id: 'act_2', title: 'Action 2', description: 'Desc 2', prompt: 'Prompt 2' },
    ]
    let savedPayload: any = null
    let resetCalled = false

    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-customize-recipe/actions') return initialActions
        return {}
      },
      put: async (path: string, body: any) => {
        if (path === '/api/x/core-customize-recipe/actions') {
          savedPayload = body
          return body
        }
        return {}
      },
      post: async (path: string) => {
        if (path === '/api/x/core-customize-recipe/actions/reset') {
          resetCalled = true
          return initialActions
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    const wrapper = mountWithUi(CustomizeSettings, {
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })

    await flushPromises()

    const actionCards = wrapper.findAll('.action-card')
    expect(actionCards.length).toBe(2)

    const moveDownBtn = actionCards[0].find('.btn-move-down')
    await moveDownBtn.trigger('click')
    await flushPromises()

    const addBtn = wrapper.find('.btn-add-action')
    await addBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.action-card').length).toBe(3)

    const saveBtn = wrapper.find('.btn-save-settings')
    await saveBtn.trigger('click')
    await flushPromises()

    expect(savedPayload).toBeDefined()
    expect(savedPayload.length).toBe(3)
    expect(savedPayload[0].id).toBe('act_2')

    const resetBtn = wrapper.find('.btn-reset-actions')
    await resetBtn.trigger('click')
    await flushPromises()

    expect(resetCalled).toBe(true)
  })

  it('renders inline expandable toggle in plugin card actions for core-customize-recipe', async () => {
    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-customize-recipe/actions') {
          return [{ id: 'a1', title: 'Act 1', description: 'Desc 1', prompt: 'Prompt 1' }]
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)

    const otherWrapper = mountWithUi(CustomizePluginSettings, {
      props: {
        context: {
          plugin: { id: 'other-plugin', state: 'active', enabled: true },
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })
    expect(otherWrapper.find('.btn-customize-settings-toggle').exists()).toBe(false)

    const wrapper = mountWithUi(CustomizePluginSettings, {
      props: {
        context: {
          plugin: { id: 'core-customize-recipe', state: 'active', enabled: true },
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })

    const toggleBtn = wrapper.find('.btn-customize-settings-toggle')
    expect(toggleBtn.exists()).toBe(true)
    expect(toggleBtn.text()).toContain('Settings')
    expect(wrapper.find('.customize-inline-settings').exists()).toBe(false)

    await toggleBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.customize-inline-settings').exists()).toBe(true)
    expect(toggleBtn.text()).toContain('Close Settings')
    expect(wrapper.findAll('.action-card').length).toBe(1)

    await toggleBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.customize-inline-settings').exists()).toBe(false)
    expect(toggleBtn.text()).toContain('Settings')
  })

  it('loads and saves adapt_model_key alongside actions in CustomizeSettings', async () => {
    let savedConfig: any = null
    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-customize-recipe/actions') {
          return [{ id: 'a1', title: 'Act 1', description: 'Desc 1', prompt: 'Prompt 1' }]
        }
        if (path === '/api/x/core-ai-provider/settings') {
          return { models: { default: 'gpt-4o-mini', chef: 'gpt-4o' } }
        }
        if (path === '/api/plugins/core-customize-recipe/config') {
          return { adapt_model_key: 'chef' }
        }
        return {}
      },
      put: async (path: string, body: any) => {
        if (path === '/api/plugins/core-customize-recipe/config') {
          savedConfig = body
          return body
        }
        return body
      },
    } as any

    const harness = pluginHarness(mockApi)
    const wrapper = mountWithUi(CustomizeSettings, {
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('#customize-adapt-model-key').exists()).toBe(true)
    await wrapper.find('.btn-save-settings').trigger('click')
    await flushPromises()

    expect(savedConfig).toEqual(expect.objectContaining({ adapt_model_key: 'chef' }))
  })
})

import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import MagicSettings from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/MagicSettings.vue'
import MagicPluginSettings from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/MagicPluginSettings.vue'

describe('MagicSettings Component', () => {
  it('loads actions, allows editing and saving', async () => {
    const initialActions = [
      { id: 'act_1', title: 'Action 1', description: 'Desc 1', prompt: 'Prompt 1' },
      { id: 'act_2', title: 'Action 2', description: 'Desc 2', prompt: 'Prompt 2' },
    ]
    let savedPayload: any = null
    let resetCalled = false

    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-recipe-magic/actions') return initialActions
        return {}
      },
      put: async (path: string, body: any) => {
        if (path === '/api/x/core-recipe-magic/actions') {
          savedPayload = body
          return body
        }
        return {}
      },
      post: async (path: string) => {
        if (path === '/api/x/core-recipe-magic/actions/reset') {
          resetCalled = true
          return initialActions
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    const wrapper = mountWithUi(MagicSettings, {
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-recipe-magic'),
        },
      },
    })

    await flushPromises()

    // Check actions rendered
    const actionCards = wrapper.findAll('.action-card')
    expect(actionCards.length).toBe(2)

    // Reorder: click move down on first item
    const moveDownBtn = actionCards[0].find('.btn-move-down')
    expect(moveDownBtn.exists()).toBe(true)
    await moveDownBtn.trigger('click')
    await flushPromises()

    // Add new action
    const addBtn = wrapper.find('.btn-add-action')
    expect(addBtn.exists()).toBe(true)
    await addBtn.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.action-card').length).toBe(3)

    // Save actions
    const saveBtn = wrapper.find('.btn-save-settings')
    expect(saveBtn.exists()).toBe(true)
    await saveBtn.trigger('click')
    await flushPromises()

    expect(savedPayload).toBeDefined()
    expect(savedPayload.length).toBe(3)
    expect(savedPayload[0].id).toBe('act_2') // verified reorder

    // Reset actions
    const resetBtn = wrapper.find('.btn-reset-actions')
    expect(resetBtn.exists()).toBe(true)
    await resetBtn.trigger('click')
    await flushPromises()

    expect(resetCalled).toBe(true)
  })

  it('renders inline expandable toggle in plugin card actions and toggles settings view', async () => {
    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-recipe-magic/actions') {
          return [{ id: 'a1', title: 'Act 1', description: 'Desc 1', prompt: 'Prompt 1' }]
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)

    // 1. Should not render for other plugins
    const otherWrapper = mountWithUi(MagicPluginSettings, {
      props: {
        context: {
          plugin: { id: 'other-plugin', state: 'active', enabled: true },
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-recipe-magic'),
        },
      },
    })
    expect(otherWrapper.find('.btn-magic-settings-toggle').exists()).toBe(false)

    // 2. Should render for core-recipe-magic
    const wrapper = mountWithUi(MagicPluginSettings, {
      props: {
        context: {
          plugin: { id: 'core-recipe-magic', state: 'active', enabled: true },
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-recipe-magic'),
        },
      },
    })

    const toggleBtn = wrapper.find('.btn-magic-settings-toggle')
    expect(toggleBtn.exists()).toBe(true)
    expect(toggleBtn.text()).toContain('Settings')
    expect(wrapper.find('.magic-inline-settings').exists()).toBe(false)

    // 3. Click Settings to expand inline panel
    await toggleBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.magic-inline-settings').exists()).toBe(true)
    expect(toggleBtn.text()).toContain('Close Settings')
    expect(wrapper.findAll('.action-card').length).toBe(1)

    // 4. Click again to collapse
    await toggleBtn.trigger('click')
    await flushPromises()

    expect(wrapper.find('.magic-inline-settings').exists()).toBe(false)
    expect(toggleBtn.text()).toContain('Settings')
  })
})


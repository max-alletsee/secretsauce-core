import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OfflineBar from './OfflineBar.vue'
import ConfigForm from './ConfigForm.vue'

describe('Shell UI Components', () => {
  it('renders OfflineBar when online is false with pending/failed counts', () => {
    const wrapper = mount(OfflineBar, {
      props: {
        online: false,
        pendingCount: 3,
        failedCount: 1,
        failedEntries: [
          { id: 'f1', tag: 'Save recipe', last_error: 'Server error' } as any,
        ],
      },
    })
    expect(wrapper.text()).toContain('Offline, showing saved data')
    expect(wrapper.text()).toContain('3 pending')
    expect(wrapper.text()).toContain('1 failed')
  })

  it('renders ConfigForm from JSON schema subset and emits save', async () => {
    const schema = {
      type: 'object',
      properties: {
        api_key: { type: 'string', title: 'API Key', secret: true },
        max_items: { type: 'integer', title: 'Max Items', default: 10 },
      },
    }
    const wrapper = mount(ConfigForm, {
      props: {
        pluginId: 'test-plugin',
        schema,
        config: { api_key: 'secret123', max_items: 10 },
      },
    })
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    const btn = wrapper.find('button[type="submit"]')
    await btn.trigger('click')
    expect(wrapper.emitted('save')).toBeTruthy()
  })
})

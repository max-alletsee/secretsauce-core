import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import OfflineBar from './OfflineBar.vue'
import ConfigForm from './ConfigForm.vue'
import AppHeader from './AppHeader.vue'
import { useHouseholdStore } from '../stores/household'
import { useMemberStore } from '../stores/member'

describe('Shell UI Components', () => {
  it('AppHeader renders title and delegates right section to slot', () => {
    const pinia = createPinia()
    const household = useHouseholdStore(pinia)
    household.household.household_name = 'The Baker House'
    const memberStore = useMemberStore(pinia)
    memberStore.setMembers([{ id: 'm1', name: 'Alice' } as any])

    const wrapper = mount(AppHeader, {
      global: {
        plugins: [pinia],
        stubs: {
          Slot: {
            template: '<div class="slot-stub" :data-name="name"><slot /></div>',
            props: ['name'],
          },
        },
      },
    })

    expect(wrapper.text()).toContain('The Baker House')
    expect(wrapper.find('select.member-select').exists()).toBe(false)
    const slot = wrapper.find('.slot-stub[data-name="shell.header.right"]')
    expect(slot.exists()).toBe(true)
  })

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

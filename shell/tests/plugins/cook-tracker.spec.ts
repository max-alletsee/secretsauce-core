import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CookedBadge from '../../../secretsauce/plugins/core/cook-tracker/ui/src/components/CookedBadge.vue'
import JournalPage from '../../../secretsauce/plugins/core/cook-tracker/ui/src/pages/JournalPage.vue'
import activate from '../../../secretsauce/plugins/core/cook-tracker/ui/src/index'

describe('cook-tracker UI', () => {
  it('CookedBadge displays checkmark when entry is marked cooked', () => {
    const wrapper = mount(CookedBadge, {
      props: {
        context: {
          entry: { id: 'entry-1', is_cooked: true },
        },
      },
    })
    expect(wrapper.find('.cooked-checkmark').exists()).toBe(true)
  })

  it('JournalPage renders cooked history and declares journal.entry.footer slot', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue([
        { id: 'j-1', date: '2026-09-13', recipe: { title: 'Spaghetti' }, servings: 2 },
      ]),
    }
    const wrapper = mount(JournalPage, {
      global: {
        provide: { __SS_API__: mockApi },
        stubs: {
          Slot: {
            template: '<div class="slot-stub" :data-name="name"><slot /></div>',
            props: ['name', 'context'],
          },
        },
      },
    })
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))
    expect(wrapper.text()).toContain('Spaghetti')
    expect(wrapper.find('.slot-stub[data-name="journal.entry.footer"]').exists()).toBe(true)
  })

  it('activator registers journal route, slot badge, and entry:interact providers', () => {
    const mockSS = {
      route: vi.fn(),
      nav: vi.fn(),
      slot: vi.fn(),
      intent: {
        provider: vi.fn(),
      },
    }
    activate(mockSS)
    expect(mockSS.route).toHaveBeenCalledWith(expect.objectContaining({ path: '/journal' }))
    expect(mockSS.slot).toHaveBeenCalledWith('timeline.entry.badge', CookedBadge, expect.any(Object))
    expect(mockSS.intent.provider).toHaveBeenCalledWith(expect.objectContaining({ id: 'mark-cooked' }))
  })
})

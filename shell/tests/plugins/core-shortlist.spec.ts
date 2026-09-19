import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ShortlistAction from '../../../secretsauce/plugins/core/core-shortlist/ui/src/ShortlistAction.vue'
import ShortlistFilter from '../../../secretsauce/plugins/core/core-shortlist/ui/src/ShortlistFilter.vue'
import ShortlistSidebar from '../../../secretsauce/plugins/core/core-shortlist/ui/src/ShortlistSidebar.vue'
import activate from '../../../secretsauce/plugins/core/core-shortlist/ui/src/index'

describe('Shortlist UI Components', () => {
  it('ShortlistAction toggles favorite state and calls API', async () => {
    const mockApi = {
      post: vi.fn().mockResolvedValue({ id: 's1' }),
      delete: vi.fn().mockResolvedValue({}),
    }

    const wrapper = mount(ShortlistAction, {
      props: {
        context: {
          recipe: { id: 'r1_en', title: 'Pancakes' },
          isShortlisted: false,
        },
      },
      global: {
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    const btn = wrapper.find('button.btn-shortlist')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/x/core-shortlist', { recipe_id: 'r1_en' })
  })

  it('ShortlistFilter renders active filter chip and emits toggle', async () => {
    const wrapper = mount(ShortlistFilter, {
      props: {
        context: {
          active: false,
        },
      },
    })

    const chip = wrapper.find('.shortlist-filter-chip')
    expect(chip.text()).toContain('Shortlist')
    await chip.trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
  })

  it('ShortlistSidebar fetches and renders shortlist entries', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue([
        { id: 's1', recipe_id: 'r1_en', recipe_title: 'Apple Pie' },
      ]),
    }

    const wrapper = mount(ShortlistSidebar, {
      global: {
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    await new Promise((r) => setTimeout(r, 10))
    expect(wrapper.text()).toContain('Shortlist (1)')
    expect(wrapper.text()).toContain('Apple Pie')
  })

  it('activator registers card action, list filter, and sidebar slots', () => {
    const mockSS = { slot: vi.fn() }
    activate(mockSS)
    expect(mockSS.slot).toHaveBeenCalledWith('recipe.card.actions', ShortlistAction, { order: 10 })
    expect(mockSS.slot).toHaveBeenCalledWith('recipe.list.filters', ShortlistFilter, { order: 10 })
    expect(mockSS.slot).toHaveBeenCalledWith('timeline.sidebar', ShortlistSidebar, { order: 20 })
  })
})

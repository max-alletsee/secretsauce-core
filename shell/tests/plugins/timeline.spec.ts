import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelinePage from '../../../secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue'
import AddEntryModal from '../../../secretsauce/plugins/core/core-timeline/ui/src/components/AddEntryModal.vue'
import activate from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import { createPinia } from 'pinia'

describe('Timeline Plugin UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a rolling 9-day span with 2 compact past days, today, and 6 future days', async () => {
    const pinia = createPinia()
    const mockApi = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockResolvedValue({ id: 'new-entry' }),
      delete: vi.fn().mockResolvedValue({}),
      patch: vi.fn().mockResolvedValue({}),
    }

    const wrapper = mount(TimelinePage, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
        },
        stubs: {
          Slot: {
            template: '<div class="slot-stub" :data-name="name"><slot /></div>',
            props: ['name', 'context'],
          },
        },
      },
    })

    await wrapper.vm.$nextTick()
    const days = wrapper.findAll('.timeline-day-column')
    expect(days.length).toBe(9)
    const compactDays = wrapper.findAll('.timeline-day-column.is-past')
    expect(compactDays.length).toBe(2)
    const today = wrapper.find('.timeline-day-column.is-today')
    expect(today.exists()).toBe(true)
  })

  it('AddEntryModal schedules a recipe via API', async () => {
    const mockApi = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/recipes')) {
          return Promise.resolve({ items: [{ id: 'r1', title: 'Tacos' }] })
        }
        return Promise.resolve([])
      }),
      post: vi.fn().mockResolvedValue({ id: 'entry-1' }),
    }

    const wrapper = mount(AddEntryModal, {
      props: {
        date: '2026-09-15',
        mealType: 'Dinner',
      },
      global: {
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    const input = wrapper.find('.search-box input')
    await input.setValue('Tacos')
    await input.trigger('input')
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))

    const scheduleBtn = wrapper.find('.select-btn')
    expect(scheduleBtn.exists()).toBe(true)
    await scheduleBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/schedule', expect.objectContaining({
      date: '2026-09-15',
      meal_type: 'Dinner',
      recipe_id: 'r1',
    }))
    expect(wrapper.emitted('created')).toBeTruthy()
  })

  it('activator registers timeline route, nav item, and hubs', () => {
    const mockSS = {
      route: vi.fn(),
      nav: vi.fn(),
      intent: {
        hub: vi.fn(),
        provider: vi.fn(),
      },
      api: { get: vi.fn().mockResolvedValue([]) },
    }
    activate(mockSS)
    expect(mockSS.route).toHaveBeenCalledWith(expect.objectContaining({ path: '/timeline' }))
    expect(mockSS.intent.hub).toHaveBeenCalledWith(expect.objectContaining({ id: 'entry:create' }))
    expect(mockSS.intent.hub).toHaveBeenCalledWith(expect.objectContaining({ id: 'entry:interact' }))
    expect(mockSS.intent.hub).toHaveBeenCalledWith(expect.objectContaining({ id: 'timeline:assist' }))
  })
})

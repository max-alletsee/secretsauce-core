import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouteRegistry } from '../../src/registries/routes'
import { createSlotRegistry } from '../../src/registries/slots'
import { createIntentRegistry } from '../../src/registries/intents'

import activateTimeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import activateCookTracker from '../../../secretsauce/plugins/core/core-cook-tracker/ui/src/index'
import activateRatings from '../../../secretsauce/plugins/core/core-ratings/ui/src/index'

import TimelinePage from '../../../secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue'
import JournalPage from '../../../secretsauce/plugins/core/core-cook-tracker/ui/src/pages/JournalPage.vue'
import { Slot } from '@secretsauce/ui'

describe('Phase 3C End-to-End Integration Flow', () => {
  it('integrates core-timeline, cook-tracker, and ratings across slots, hubs, and journal', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const routeRegistry = createRouteRegistry()
    const slotRegistry = createSlotRegistry()
    const intentRegistry = createIntentRegistry()

    const todayStr = new Date().toISOString().slice(0, 10)
    const mockSchedule = [
      {
        id: 'entry-1',
        date: todayStr,
        meal_type: 'Dinner',
        is_cooked: true,
        recipe: { id: 'r1', title: 'Savory Tacos' },
        servings_override: 3,
      },
    ]

    const mockJournal = [
      {
        id: 'j-1',
        date: todayStr,
        meal_type: 'dinner',
        recipe: { id: 'r1', title: 'Savory Tacos' },
        servings: 3,
      },
    ]

    const mockApi = {
      get: vi.fn((url: string) => {
        if (url.includes('/api/schedule')) return Promise.resolve(mockSchedule)
        if (url.includes('/api/journal')) return Promise.resolve(mockJournal)
        if (url.includes('/api/x/core-ratings')) {
          return Promise.resolve({ scores: [], net_score: 1 })
        }
        return Promise.resolve([])
      }),
      post: vi.fn().mockResolvedValue({ id: 'res-1' }),
      put: vi.fn().mockResolvedValue({ net_score: 2 }),
      delete: vi.fn().mockResolvedValue({}),
    }

    const makePluginSS = (pluginId: string) => ({
      slot: (slotName: string, component: any, options?: any) => {
        slotRegistry.register(pluginId, slotName, component, options)
      },
      route: (routeDef: any) => {
        routeRegistry.register(pluginId, routeDef)
      },
      intent: {
        hub: (hubDef: any) => intentRegistry.registerHub(hubDef),
        provider: (providerDef: any) => intentRegistry.registerProvider(pluginId, providerDef),
      },
      api: mockApi,
    })

    // 1. Activate Phase 3C plugins
    activateTimeline(makePluginSS('core-timeline'))
    activateCookTracker(makePluginSS('core-cook-tracker'))
    activateRatings(makePluginSS('core-ratings'))

    // 2. Mount TimelinePage
    const timelineWrapper = mount(TimelinePage, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
          __SS_ROUTE_REGISTRY__: routeRegistry,
          __SS_SLOT_REGISTRY__: slotRegistry,
          __SS_INTENT_REGISTRY__: intentRegistry,
        },
        components: { Slot },
      },
    })

    await new Promise((r) => setTimeout(r, 30))
    expect(timelineWrapper.text()).toContain('Savory Tacos')
    // Verify cook-tracker checkmark badge rendered into timeline card
    expect(timelineWrapper.find('.cooked-checkmark').exists()).toBe(true)

    // 3. Mount JournalPage
    const journalWrapper = mount(JournalPage, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
          __SS_ROUTE_REGISTRY__: routeRegistry,
          __SS_SLOT_REGISTRY__: slotRegistry,
          __SS_INTENT_REGISTRY__: intentRegistry,
          __SS_CURRENT_MEMBER__: { value: { id: 'm-1' } },
        },
        components: { Slot },
      },
    })

    await new Promise((r) => setTimeout(r, 30))
    expect(journalWrapper.text()).toContain('Savory Tacos')
    // Verify ratings plugin rendered VoteRating in journal.entry.footer slot
    expect(journalWrapper.find('.vote-rating').exists()).toBe(true)
    expect(journalWrapper.text()).toContain('+1')

    // Click upvote button
    await journalWrapper.find('.upvote-btn').trigger('click')
    expect(mockApi.put).toHaveBeenCalledWith('/api/x/core-ratings', {
      journal_id: 'j-1',
      member_id: 'm-1',
      score: 1,
    })
  })
})

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../../src/App.vue'
import { useMemberStore } from '../../src/stores/member'
import { createRouteRegistry } from '../../src/registries/routes'
import { createSlotRegistry } from '../../src/registries/slots'
import { createIntentRegistry } from '../../src/registries/intents'

import activateMembers from '../../../secretsauce/plugins/core/core-members/ui/src/index'
import activateShortlist from '../../../secretsauce/plugins/core/shortlist/ui/src/index'
import activateRecipes from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'

import RecipeListPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeListPage.vue'
import RecipeDetailPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeDetailPage.vue'

describe('Phase 3B End-to-End Integration', () => {
  it('integrates core-members, core-recipes, and shortlist via slots and intents', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const routeRegistry = createRouteRegistry()
    const slotRegistry = createSlotRegistry()
    const intentRegistry = createIntentRegistry()

    const mockApi = {
      get: vi.fn((url: string) => {
        if (url === '/api/members') {
          return Promise.resolve([
            { id: 'm1', name: 'Alice', color: '#ff0000', is_active: 1 },
            { id: 'm2', name: 'Bob', color: '#00ff00', is_active: 1 },
          ])
        }
        if (url.startsWith('/api/recipes/r1')) {
          return Promise.resolve({
            id: 'r1',
            group_id: 'grp_1',
            language: 'en',
            title: 'Fluffy Pancakes',
            servings: 2,
            languages: ['en'],
            ingredients: [
              { id: 'i1', quantity: 200, unit: 'g', name: 'Flour' },
              { id: 'i2', quantity: 300, unit: 'ml', name: 'Milk' },
            ],
            steps: [{ id: 's1', instruction: 'Whisk together and cook on skillet' }],
          })
        }
        if (url.startsWith('/api/recipes')) {
          return Promise.resolve({
            items: [
              {
                id: 'r1',
                title: 'Fluffy Pancakes',
                prep_time_minutes: 10,
                cook_time_minutes: 15,
                tags: ['breakfast', 'quick'],
              },
            ],
          })
        }
        if (url.startsWith('/api/x/shortlist')) {
          return Promise.resolve([])
        }
        return Promise.resolve({})
      }),
      post: vi.fn().mockResolvedValue({ id: 's1' }),
      delete: vi.fn().mockResolvedValue({}),
    }

    // Mock Secretsauce plugin API adapter passed to activators
    const makePluginSS = (pluginId: string) => ({
      slot: (slotName: string, component: any, options?: any) => {
        slotRegistry.register(pluginId, slotName, component, options)
      },
      route: (routeDef: any) => {
        routeRegistry.register(pluginId, routeDef)
      },
      settings: {
        section: vi.fn((sec: any) => {
          slotRegistry.register(pluginId, 'settings.content', sec.component, { order: sec.order })
        }),
      },
      intent: {
        hub: (hubDef: any) => intentRegistry.registerHub(hubDef),
        provider: (providerDef: any) => intentRegistry.registerProvider(pluginId, providerDef),
      },
    })

    // Activate plugins
    activateMembers(makePluginSS('core-members'))
    activateShortlist(makePluginSS('shortlist'))
    activateRecipes(makePluginSS('core-recipes'))

    const memberStore = useMemberStore(pinia)
    memberStore.setMembers([
      { id: 'm1', name: 'Alice', avatar_color: '#ff0000' } as any,
      { id: 'm2', name: 'Bob', avatar_color: '#00ff00' } as any,
    ])
    memberStore.setCurrentMember('m1')

    // 1. Verify AppHeader slot renders MemberPicker
    const appWrapper = mount(App, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
          __SS_ROUTE_REGISTRY__: routeRegistry,
          __SS_SLOT_REGISTRY__: slotRegistry,
          __SS_INTENT_REGISTRY__: intentRegistry,
          __SS_OUTBOX__: { pending: { value: 0 }, failed: { value: [] } },
        },
        stubs: ['router-view', 'router-link'],
      },
    })

    await new Promise((r) => setTimeout(r, 20))
    expect(appWrapper.find('.ss-member-picker').exists()).toBe(true)
    expect(appWrapper.text()).toContain('Alice')

    // 2. Verify RecipeListPage renders card with shortlist slot and filter slot
    const listWrapper = mount(RecipeListPage, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
          __SS_ROUTE_REGISTRY__: routeRegistry,
          __SS_SLOT_REGISTRY__: slotRegistry,
          __SS_INTENT_REGISTRY__: intentRegistry,
        },
        stubs: ['router-link'],
      },
    })

    await new Promise((r) => setTimeout(r, 30))
    expect(listWrapper.text()).toContain('Fluffy Pancakes')
    expect(listWrapper.find('button.btn-shortlist').exists()).toBe(true)
    expect(listWrapper.find('.shortlist-filter-chip').exists()).toBe(true)

    // Toggle Shortlist action
    await listWrapper.find('button.btn-shortlist').trigger('click')
    expect(mockApi.post).toHaveBeenCalledWith('/api/x/shortlist', { recipe_id: 'r1' })

    // 3. Verify RecipeDetailPage serving scaler
    const detailWrapper = mount(RecipeDetailPage, {
      props: { recipeId: 'r1' },
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
          __SS_ROUTE_REGISTRY__: routeRegistry,
          __SS_SLOT_REGISTRY__: slotRegistry,
          __SS_INTENT_REGISTRY__: intentRegistry,
        },
      },
    })

    await new Promise((r) => setTimeout(r, 30))
    expect(detailWrapper.text()).toContain('Fluffy Pancakes')
    expect(detailWrapper.text()).toContain('200') // base flour qty = 200 for 2 servings

    // Scale up to 3 servings
    await detailWrapper.find('button.btn-scaler-plus').trigger('click')
    expect(detailWrapper.text()).toContain('300') // 200 * 3/2 = 300
  })
})

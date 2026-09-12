import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import RecipeDetailPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeDetailPage.vue'
import RecipeListPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeListPage.vue'
import RecipeEditPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue'
import activate from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'

describe('Recipe Pages', () => {
  it('RecipeDetailPage scales ingredient quantities dynamically when servings are adjusted', async () => {
    const mockRecipe = {
      id: 'r1_en',
      group_id: 'grp_1',
      language: 'en',
      title: 'Crepes',
      servings: 2,
      languages: ['en', 'de'],
      ingredients: [
        { id: 'i1', quantity: 200, unit: 'g', name: 'Flour' },
        { id: 'i2', quantity: 2, unit: 'piece', name: 'Eggs' },
      ],
      steps: [{ id: 's1', instruction: 'Mix and fry' }],
    }

    const mockApi = {
      get: vi.fn().mockResolvedValue(mockRecipe),
    }

    const wrapper = mount(RecipeDetailPage, {
      props: {
        recipeId: 'r1_en',
      },
      global: {
        provide: {
          __SS_API__: mockApi,
        },
        stubs: {
          Slot: true,
          IntentTrigger: true,
        },
      },
    })

    // Wait for async fetch
    await new Promise((r) => setTimeout(r, 20))

    expect(wrapper.text()).toContain('Crepes')
    expect(wrapper.text()).toContain('200') // base servings = 2

    // Scale up to 4 servings
    const plusBtn = wrapper.find('button.btn-scaler-plus')
    await plusBtn.trigger('click')
    await plusBtn.trigger('click')
    expect(wrapper.text()).toContain('400') // scaled quantity = 400 for 4 servings
  })

  it('RecipeListPage renders search bar, filters slot, and empty state with intent', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue({ items: [] }),
    }

    const wrapper = mount(RecipeListPage, {
      global: {
        provide: {
          __SS_API__: mockApi,
        },
        stubs: {
          Slot: {
            template: '<div class="filters-slot-stub"><slot /></div>',
          },
          IntentTrigger: {
            template: '<button class="intent-stub">{{ label }}</button>',
            props: ['hub', 'label'],
          },
        },
      },
    })

    await new Promise((r) => setTimeout(r, 20))
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
    expect(wrapper.find('.filters-slot-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('No recipes found')
    expect(wrapper.find('button.intent-stub').text()).toContain('Add / Import Recipe')
  })

  it('activator registers recipes routes and recipe:create/recipe:actions hubs', () => {
    const mockSS = {
      route: vi.fn(),
      intent: {
        hub: vi.fn(),
        provider: vi.fn(),
      },
    }

    activate(mockSS)

    expect(mockSS.route).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/recipes' })
    )
    expect(mockSS.route).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/recipes/new' })
    )
    expect(mockSS.route).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/recipes/:id' })
    )
    expect(mockSS.route).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/recipes/:id/edit' })
    )
    expect(mockSS.intent.hub).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'recipe:create' })
    )
    expect(mockSS.intent.hub).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'recipe:actions' })
    )
  })

  it('RecipeEditPage saves new recipe via POST', async () => {
    const mockApi = {
      post: vi.fn().mockResolvedValue({ id: 'new_r1' }),
    }

    const wrapper = mount(RecipeEditPage, {
      global: {
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    const titleInput = wrapper.find('input.input-title')
    await titleInput.setValue('Grandma Chocolate Chip Cookies')
    const saveBtn = wrapper.find('button.btn-primary')
    await saveBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/recipes',
      expect.objectContaining({ title: 'Grandma Chocolate Chip Cookies' })
    )
  })
})

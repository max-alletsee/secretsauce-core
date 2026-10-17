import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import RecipeEditPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeEditPage.vue'
import { mountWithUi } from '../helpers/mountWithUi'
import { pluginHarness } from '../helpers/pluginHarness'

describe('RecipeEditPage Magic Wand Trigger Slot', () => {
  it('renders slot recipe.edit.actions with context containing recipe and applyAdaptation', async () => {
    let capturedContext: any = null
    const mockApi = {
      get: async (path: string) => ({
        id: 'recipe_1',
        title: 'Original Stew',
        description: 'Beef stew',
        language: 'en',
        servings: 4,
        prep_time_minutes: 20,
        cook_time_minutes: 60,
        tags: ['beef'],
        ingredients: [{ name: 'beef', quantity: 500, unit: 'g' }],
        steps: [{ instruction: 'Simmer beef.' }],
        group_id: 'grp_1',
        revision: 1,
      }),
      post: async () => ({}),
      patch: async () => ({}),
      delete: async () => ({}),
      upload: async () => ({}),
    } as any
    const harness = pluginHarness(mockApi)

    const wrapper = mountWithUi(RecipeEditPage, {
      props: { id: 'recipe_1' },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-recipes'),
        },
        stubs: {
          Slot: {
            props: ['name', 'context'],
            template: '<div class="stubbed-slot" :data-name="name">{{ name }}</div>',
            watch: {
              context: {
                handler(val) {
                  if (this.name === 'recipe.edit.actions') {
                    capturedContext = val
                  }
                },
                immediate: true,
                deep: true,
              },
            },
          },
          IngredientRowList: true,
          StepList: true,
          AutoComplete: true,
        },
      },
    })

    await flushPromises()

    const slotEl = wrapper.find('.stubbed-slot[data-name="recipe.edit.actions"]')
    expect(slotEl.exists()).toBe(true)
    expect(capturedContext).toBeDefined()
    expect(capturedContext.recipe.title).toBe('Original Stew')
    expect(typeof capturedContext.applyAdaptation).toBe('function')

    // Test applyAdaptation
    capturedContext.applyAdaptation({
      title: 'Magic Mushroom Stew',
      servings: 2,
      prep_time_minutes: 10,
      cook_time_minutes: 30,
      ingredients: [{ name: 'mushrooms', quantity: 300, unit: 'g' }],
      steps: [{ instruction: 'Sauté mushrooms.' }],
    })
    await flushPromises()

    expect(wrapper.find('input#recipe-title').element.value).toBe('Magic Mushroom Stew')
  })
})

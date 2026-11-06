import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import activateCustomizePlugin, {
  CustomizeRecipeDialog,
  CustomizeRecipeButton,
  CustomizedRecipePreview,
} from '../../../secretsauce/plugins/core/core-customize-recipe/ui/src/index'
import {
  computeIngredientDiff,
  computeIngredientDiffRows,
  diffText,
} from '../../../secretsauce/plugins/core/core-customize-recipe/ui/src/diff'
import RecipeDetailPage from '../../../secretsauce/plugins/core/core-recipes/ui/src/pages/RecipeDetailPage.vue'

describe('Inline Diff Engine (diff.ts)', () => {
  it('computes word-level inline diff segments for step instructions and titles', () => {
    const segments = diffText(
      'Bake at 350°F until the chicken is golden.',
      'Bake at 180°C until the tofu is golden.',
    )
    expect(segments).toEqual([
      { type: 'same', text: 'Bake at' },
      { type: 'removed', text: '350°F' },
      { type: 'added', text: '180°C' },
      { type: 'same', text: 'until the' },
      { type: 'removed', text: 'chicken' },
      { type: 'added', text: 'tofu' },
      { type: 'same', text: 'is golden.' },
    ])
  })

  it('pairs modified, 1-to-1 substituted, purely removed, and purely added ingredients in-place', () => {
    // 1. Modified (unit conversion) + 1-to-1 substitution
    const original = [
      { name: 'All-purpose flour', quantity: 1, unit: 'cup' },
      { name: 'Chicken breast', quantity: 500, unit: 'g' },
      { name: 'Garlic', quantity: 2, unit: 'clove' },
    ]
    const customized = [
      { name: 'All-purpose flour', quantity: 120, unit: 'g' },
      { name: 'Firm tofu', quantity: 400, unit: 'g' },
      { name: 'Garlic', quantity: 2, unit: 'clove' },
      { name: 'Nutritional yeast', quantity: 1, unit: 'tbsp' },
    ]
    const rows = computeIngredientDiffRows(original, customized)
    expect(rows).toHaveLength(4)
    expect(rows[0].kind).toBe('modified')
    expect(rows[0].qtyUnitChanged).toBe(true)
    expect(rows[1].kind).toBe('substituted')
    expect(rows[1].original.name).toBe('Chicken breast')
    expect(rows[1].customized.name).toBe('Firm tofu')
    expect(rows[2].kind).toBe('unchanged')
    expect(rows[3].kind).toBe('added')
    expect(rows[3].customized.name).toBe('Nutritional yeast')

    // 2. Pure removal (e.g. 10 ingredients or less)
    const streamlined = [
      { name: 'All-purpose flour', quantity: 1, unit: 'cup' },
      { name: 'Garlic', quantity: 2, unit: 'clove' },
    ]
    const removalRows = computeIngredientDiffRows(original, streamlined)
    expect(removalRows).toHaveLength(3)
    expect(removalRows[0].kind).toBe('unchanged')
    expect(removalRows[1].kind).toBe('removed')
    expect(removalRows[1].original.name).toBe('Chicken breast')
    expect(removalRows[2].kind).toBe('unchanged')

    const summary = computeIngredientDiff(original, customized)
    expect(summary.modified.map(i => i.name)).toContain('All-purpose flour')
    expect(summary.removed.map(i => i.name)).toContain('Chicken breast')
    expect(summary.added.map(i => i.name)).toContain('Firm tofu')
  })
})

describe('CustomizeRecipeDialog & Chat Interface', () => {
  it('populates chat input when shorthand is clicked and supports multi-turn customization with inline diff', async () => {
    const mockActions = [
      {
        id: 'substitute',
        title: 'Substitute ingredients',
        description: 'Swap ingredients',
        prompt: 'Substitute [ingredient] with ',
      },
      {
        id: 'metric',
        title: 'Convert to Metric',
        description: 'Metric units',
        prompt: 'Convert all units to metric.',
      },
    ]

    const calls: any[] = []
    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-customize-recipe/actions') return mockActions
        return {}
      },
      post: async (path: string, body: any) => {
        if (path === '/api/x/core-customize-recipe/customize') {
          calls.push(body)
          if (calls.length === 1) {
            return {
              title: 'Tofu Stir-Fry',
              description: 'Quick stir-fry',
              servings: 2,
              prep_time_minutes: 10,
              cook_time_minutes: 15,
              tags: ['vegan'],
              ingredients: [
                { name: 'Firm tofu', quantity: 14, unit: 'oz' },
                { name: 'Soy sauce', quantity: 2, unit: 'tbsp' },
              ],
              steps: [{ instruction: 'Sear tofu in a hot wok at 400°F.' }],
              adaptation_summary: 'Substituted chicken with firm tofu.',
            }
          }
          return {
            title: 'Tofu Stir-Fry',
            description: 'Quick stir-fry',
            servings: 2,
            prep_time_minutes: 10,
            cook_time_minutes: 15,
            tags: ['vegan'],
            ingredients: [
              { name: 'Firm tofu', quantity: 400, unit: 'g' },
              { name: 'Soy sauce', quantity: 30, unit: 'ml' },
            ],
            steps: [{ instruction: 'Sear tofu in a hot wok at 200°C.' }],
            adaptation_summary: 'Converted ounces, tablespoons, and temperature to metric.',
          }
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    let appliedData: any = null

    const wrapper = mountWithUi(CustomizeRecipeDialog, {
      props: {
        visible: true,
        context: {
          recipe: {
            id: 'r1',
            title: 'Chicken Stir-Fry',
            description: 'Quick stir-fry',
            servings: 2,
            ingredients: [
              { name: 'Chicken thigh', quantity: 14, unit: 'oz' },
              { name: 'Soy sauce', quantity: 2, unit: 'tbsp' },
            ],
            steps: [{ instruction: 'Sear chicken in a hot wok at 400°F.' }],
          },
          applyAdaptation: (data: any) => {
            appliedData = data
          },
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })

    await flushPromises()

    // 1. Click "Substitute ingredients" shorthand -> populates chat input without immediately sending
    const chips = wrapper.findAll('.action-chip')
    expect(chips).toHaveLength(2)
    await chips[0].trigger('click')
    await flushPromises()

    const chatInput = wrapper.find<HTMLTextAreaElement>('textarea.chat-input')
    expect(chatInput.element.value).toBe('Substitute [ingredient] with ')
    expect(calls).toHaveLength(0)

    // 2. Edit the populated shorthand prompt and send
    await chatInput.setValue('Substitute chicken thigh with firm tofu')
    await wrapper.find('.btn-send-customize').trigger('click')
    await flushPromises()

    expect(calls).toHaveLength(1)
    expect(calls[0].custom_prompt).toBe('Substitute chicken thigh with firm tofu')
    expect(wrapper.find('.diff-removed').text()).toBe('Chicken')
    expect(wrapper.find('.diff-added').text()).toBe('Tofu')
    expect(wrapper.text()).toContain('Substituted chicken with firm tofu.')

    // 3. Multi-turn follow-up: click "Convert to Metric" shorthand and send
    await chips[1].trigger('click')
    await wrapper.find('.btn-send-customize').trigger('click')
    await flushPromises()

    expect(calls).toHaveLength(2)
    expect(calls[1].action_id).toBe('metric')
    expect(calls[1].messages).toHaveLength(2)
    expect(calls[1].recipe.title).toBe('Tofu Stir-Fry')

    // Apply to editor
    await wrapper.find('.btn-apply-editor').trigger('click')
    await flushPromises()
    expect(appliedData.ingredients[0].unit).toBe('g')
  })

  it('saves as a new recipe via /api/x/core-customize-recipe/save', async () => {
    let savePayload: any = null
    const mockApi = {
      get: async () => [
        { id: 'metric', title: 'Convert to Metric', description: 'Metric', prompt: 'Metric' },
      ],
      post: async (path: string, body: any) => {
        if (path === '/api/x/core-customize-recipe/customize') {
          return {
            title: 'Metric Salad',
            ingredients: [{ name: 'Greens', quantity: 100, unit: 'g' }],
            steps: [{ instruction: 'Mix.' }],
            adaptation_summary: 'Converted to metric.',
          }
        }
        if (path === '/api/x/core-customize-recipe/save') {
          savePayload = body
          return { id: 'new_rec_456', title: body.recipe.title }
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    const wrapper = mountWithUi(CustomizeRecipeDialog, {
      props: {
        visible: true,
        context: {
          recipe: {
            title: 'Imperial Salad',
            ingredients: [{ name: 'Greens', quantity: 3.5, unit: 'oz' }],
            steps: [{ instruction: 'Toss.' }],
          },
          applyAdaptation: vi.fn(),
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })

    await flushPromises()
    await wrapper.find('.action-chip').trigger('click')
    await wrapper.find('.btn-send-customize').trigger('click')
    await flushPromises()

    const forkBtn = wrapper.find('.btn-save-fork')
    expect(forkBtn.exists()).toBe(true)
    await forkBtn.trigger('click')
    await flushPromises()

    expect(savePayload).toBeDefined()
    expect(savePayload.recipe.title).toBe('Metric Salad')
  })

  it('CustomizeRecipeButton opens dialog when clicked', async () => {
    const harness = pluginHarness({ get: async () => [] } as any)
    const wrapper = mountWithUi(CustomizeRecipeButton, {
      props: {
        context: {
          recipe: { title: 'Pie', ingredients: [{ name: 'Apples' }] },
          applyAdaptation: vi.fn(),
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-customize-recipe'),
        },
      },
    })

    const btn = wrapper.find('.btn-customize-recipe')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    await flushPromises()

    const dialog = wrapper.findComponent(CustomizeRecipeDialog)
    expect(dialog.props('visible')).toBe(true)
  })
})

describe('RecipeDetailPage Inline Customization Integration', () => {
  it('renders inline chat panel, highlights changes in-place, scales servings, and updates recipe', async () => {
    const baseRecipe = {
      id: 'rec_en',
      group_id: 'rec',
      language: 'en',
      languages: ['en'],
      revision: 1,
      title: 'Classic Pancakes',
      description: 'Fluffy breakfast pancakes',
      servings: 2,
      prep_time_minutes: 10,
      cook_time_minutes: 15,
      ingredients: [
        { name: 'flour', quantity: 1, unit: 'cup' },
        { name: 'parsley garnish', quantity: 1, unit: 'tbsp' },
      ],
      steps: [{ id: 's1', instruction: 'Cook on griddle at 350°F.' }],
    }

    let updatedCall: any = null
    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/recipes/rec_en') return baseRecipe
        if (path === '/api/x/core-customize-recipe/actions') {
          return [{ id: 'metric', title: 'Convert to Metric', description: 'Metric', prompt: 'Convert to metric' }]
        }
        return []
      },
      post: async (path: string, body: any) => {
        if (path === '/api/x/core-customize-recipe/customize') {
          return {
            title: 'Metric Pancakes',
            description: 'Fluffy breakfast pancakes',
            servings: 2,
            prep_time_minutes: 10,
            cook_time_minutes: 15,
            ingredients: [{ name: 'flour', quantity: 120, unit: 'g' }],
            steps: [{ instruction: 'Cook on griddle at 175°C.' }],
            adaptation_summary: 'Converted to metric and removed garnish.',
          }
        }
        if (path === '/api/x/core-customize-recipe/save') {
          updatedCall = body
          return {
            ...baseRecipe,
            title: body.recipe.title,
            ingredients: body.recipe.ingredients,
            steps: body.recipe.steps,
            revision: 2,
          }
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    const ss = harness.ss('core-customize-recipe')
    activateCustomizePlugin(ss)

    const wrapper = mountWithUi(RecipeDetailPage, {
      props: { id: 'rec_en' },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: ss,
        },
      },
    })

    await flushPromises()

    // Click "Customize Recipe" button on RecipeDetailPage
    const customizeBtn = wrapper.find('.btn-customize-recipe')
    expect(customizeBtn.exists()).toBe(true)
    await customizeBtn.trigger('click')
    await flushPromises()

    // Select "Convert to Metric" shorthand and send
    await wrapper.find('.action-chip[data-action-id="metric"]').trigger('click')
    await wrapper.find('.btn-send-customize').trigger('click')
    await flushPromises()

    // CustomizedRecipePreview is now rendered inline on RecipeDetailPage
    const preview = wrapper.findComponent(CustomizedRecipePreview)
    expect(preview.exists()).toBe(true)
    expect(preview.find('.ingredient-row-modified .diff-removed').text()).toBe('1 cup')
    expect(preview.find('.ingredient-row-modified .diff-added').text()).toBe('120 g')
    // Removed garnish row is kept in-place with strikethrough
    expect(preview.find('.ingredient-row-removed .diff-removed').text()).toContain('parsley garnish')

    // Increase servings from 2 -> 4 and verify both removed and added quantities scale
    await wrapper.find('.btn-scaler-plus').trigger('click')
    await wrapper.find('.btn-scaler-plus').trigger('click')
    await flushPromises()
    expect(preview.find('.ingredient-row-modified .diff-removed').text()).toBe('2 cup')
    expect(preview.find('.ingredient-row-modified .diff-added').text()).toBe('240 g')

    // Click "Update Recipe" to persist
    await wrapper.find('.btn-update-recipe').trigger('click')
    await flushPromises()
    expect(updatedCall).toBeDefined()
    expect(updatedCall.recipe_id).toBe('rec_en')
    expect(wrapper.find('h1').text()).toBe('Metric Pancakes')
  })
})

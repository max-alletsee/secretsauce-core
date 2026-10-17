import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import MagicWandDialog from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/MagicWandDialog.vue'
import MagicWandButton from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/MagicWandButton.vue'
import { computeIngredientDiff } from '../../../secretsauce/plugins/core/core-recipe-magic/ui/src/diff'

describe('Ingredient Diff Helper', () => {
  it('correctly categorizes added, removed, and modified ingredients', () => {
    const original = [
      { name: 'Ground beef', quantity: 500, unit: 'g' },
      { name: 'Onion', quantity: 1, unit: 'piece' },
      { name: 'Heavy cream', quantity: 100, unit: 'ml' },
    ]
    const adapted = [
      { name: 'Brown lentils', quantity: 250, unit: 'g' },
      { name: 'Onion', quantity: 2, unit: 'piece' },
      { name: 'Oat milk', quantity: 100, unit: 'ml' },
    ]
    const diff = computeIngredientDiff(original, adapted)
    expect(diff.removed.map(i => i.name.toLowerCase())).toContain('ground beef')
    expect(diff.removed.map(i => i.name.toLowerCase())).toContain('heavy cream')
    expect(diff.added.map(i => i.name.toLowerCase())).toContain('brown lentils')
    expect(diff.added.map(i => i.name.toLowerCase())).toContain('oat milk')
    expect(diff.modified.map(i => i.name.toLowerCase())).toContain('onion')
  })
})

describe('MagicWandDialog Component', () => {
  it('loads actions and triggers adaptation on action click', async () => {
    const mockActions = [
      { id: 'vegetarian', title: 'Make it vegetarian', description: 'No meat', prompt: 'Veg prompt' },
      { id: 'fast', title: 'Make it fast', description: 'Under 30 min', prompt: 'Fast prompt' },
    ]
    const mockAdapted = {
      title: 'Vegetarian Shepherd’s Pie',
      description: 'Lentil pie',
      servings: 4,
      prep_time_minutes: 15,
      cook_time_minutes: 30,
      tags: ['vegetarian'],
      ingredients: [{ name: 'Lentils', quantity: 200, unit: 'g' }],
      steps: [{ instruction: 'Cook lentils.' }],
      adaptation_summary: 'Replaced beef with lentils.',
    }

    let adaptCalled = false
    const mockApi = {
      get: async (path: string) => {
        if (path === '/api/x/core-recipe-magic/actions') return mockActions
        return {}
      },
      post: async (path: string, body: any) => {
        if (path === '/api/x/core-recipe-magic/adapt') {
          adaptCalled = true
          expect(body.action_id).toBe('vegetarian')
          return mockAdapted
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    let appliedData: any = null

    const wrapper = mountWithUi(MagicWandDialog, {
      props: {
        visible: true,
        context: {
          recipe: {
            id: 'r1',
            title: 'Shepherd’s Pie',
            ingredients: [{ name: 'Beef', quantity: 500, unit: 'g' }],
            steps: [{ instruction: 'Brown beef.' }],
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
          __SS_UI__: harness.ss('core-recipe-magic'),
        },
      },
    })

    await flushPromises()

    // Verify actions loaded
    const actionBtns = wrapper.findAll('.action-chip')
    expect(actionBtns.length).toBe(2)

    // Click vegetarian action
    await actionBtns[0].trigger('click')
    await flushPromises()

    expect(adaptCalled).toBe(true)
    const titleInput = wrapper.find<HTMLInputElement>('input')
    expect(titleInput.element.value).toBe('Vegetarian Shepherd’s Pie')
    expect(wrapper.text()).toContain('Replaced beef with lentils.')

    // Click "Apply to Editor"
    const applyBtn = wrapper.find('.btn-apply-editor')
    expect(applyBtn.exists()).toBe(true)
    await applyBtn.trigger('click')
    await flushPromises()

    expect(appliedData).toBeDefined()
    expect(appliedData.title).toBe('Vegetarian Shepherd’s Pie')
  })

  it('saves directly as a new recipe when Save as New Recipe is clicked', async () => {
    let newRecipePayload: any = null
    const mockApi = {
      get: async () => [
        { id: 'fast', title: 'Make it fast', description: 'Quick', prompt: 'Fast' },
      ],
      post: async (path: string, body: any) => {
        if (path === '/api/x/core-recipe-magic/adapt') {
          return {
            title: 'Quick Salad',
            ingredients: [{ name: 'Greens', quantity: 1, unit: 'bowl' }],
            steps: [{ instruction: 'Mix.' }],
            adaptation_summary: 'Simplified prep.',
          }
        }
        if (path === '/api/recipes') {
          newRecipePayload = body
          return { id: 'new_rec_456', title: body.title }
        }
        return {}
      },
    } as any

    const harness = pluginHarness(mockApi)
    const wrapper = mountWithUi(MagicWandDialog, {
      props: {
        visible: true,
        context: {
          recipe: {
            title: 'Complex Salad',
            ingredients: [{ name: 'Artisan greens', quantity: 1, unit: 'bowl' }],
            steps: [{ instruction: 'Toss.' }],
          },
          applyAdaptation: vi.fn(),
        },
      },
      global: {
        plugins: [harness.pinia],
        provide: {
          ...harness.provide,
          __SS_UI__: harness.ss('core-recipe-magic'),
        },
      },
    })

    await flushPromises()
    await wrapper.find('.action-chip').trigger('click')
    await flushPromises()

    const forkBtn = wrapper.find('.btn-save-fork')
    expect(forkBtn.exists()).toBe(true)
    await forkBtn.trigger('click')
    await flushPromises()

    expect(newRecipePayload).toBeDefined()
    expect(newRecipePayload.title).toBe('Quick Salad')
  })

  it('MagicWandButton opens dialog when clicked', async () => {
    const harness = pluginHarness({ get: async () => [] } as any)
    const wrapper = mountWithUi(MagicWandButton, {
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
          __SS_UI__: harness.ss('core-recipe-magic'),
        },
      },
    })

    const btn = wrapper.find('.btn-make-it-magic')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    await flushPromises()

    const dialog = wrapper.findComponent(MagicWandDialog)
    expect(dialog.props('visible')).toBe(true)
  })
})

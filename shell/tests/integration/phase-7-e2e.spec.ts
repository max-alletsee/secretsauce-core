import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImportRecipeModal from '../../../secretsauce/plugins/core/core-recipe-importer/ui/src/ImportRecipeModal.vue'
import TranslateAction from '../../../secretsauce/plugins/core/core-translator/ui/src/TranslateAction.vue'
import MealPlannerWidget from '../../../secretsauce/plugins/core/core-meal-planner-ai/ui/src/MealPlannerWidget.vue'
import ShoppingListPage from '../../../secretsauce/plugins/core/core-shopping-list/ui/src/ShoppingListPage.vue'

describe('Phase 7 End-to-End Multi-Plugin Frontend Integration', () => {
  it('walks through import -> translate -> plan -> shopping list flow', async () => {
    // 1. Mock API and Notify
    const mockDbState: {
      recipes: any[]
      scheduled: any[]
      shoppingItems: any[]
    } = {
      recipes: [],
      scheduled: [],
      shoppingItems: [],
    }

    const mockApi = {
      get: vi.fn((url: string, opts?: any) => {
        if (url === '/api/x/core-shopping-list') {
          return Promise.resolve({
            items: mockDbState.shoppingItems,
          })
        }
        if (url === '/api/x/core-shopping-list/staples') {
          return Promise.resolve([])
        }
        return Promise.resolve({})
      }),
      post: vi.fn((url: string, payload: any) => {
        if (url.includes('/parse-text')) {
          return Promise.resolve({
            title: 'Lemon Herb Salmon',
            servings: 2,
            ingredients: [
              { name: 'Salmon fillets', quantity: 2, unit: 'pieces', raw_text: '2 salmon fillets' },
              { name: 'Lemons', quantity: 1, unit: 'piece', raw_text: '1 lemon' },
            ],
            steps: [{ instruction: 'Pan sear salmon and squeeze lemon juice' }],
          })
        }
        if (url === '/api/recipes') {
          const newRec = { id: 'rec-salmon-en', group_id: 'grp-salmon', ...payload }
          mockDbState.recipes.push(newRec)
          return Promise.resolve(newRec)
        }
        if (url.includes('/translate')) {
          const transRec = {
            id: 'rec-salmon-es',
            group_id: 'grp-salmon',
            language: 'es',
            title: 'Salmón con Limón y Hierbas',
          }
          mockDbState.recipes.push(transRec)
          return Promise.resolve(transRec)
        }
        if (url.includes('/generate')) {
          return Promise.resolve({
            id: 'plan-1',
            title: 'Healthy Seafood Plan',
            suggestions: [
              {
                id: 'sug-salmon',
                recipe_id: 'rec-salmon-en',
                recipe_title: 'Lemon Herb Salmon',
                meal_type: 'dinner',
                confidence: 0.95,
                reasoning: 'Rich in omega-3, fast 15-min prep',
                status: 'suggested',
              },
            ],
          })
        }
        if (url.includes('/suggestions/sug-salmon/accept')) {
          const entry = {
            id: 'sched-1',
            date: payload.date,
            meal_type: payload.meal_type,
            recipe_id: 'rec-salmon-en',
          }
          mockDbState.scheduled.push(entry)
          // Add scaled ingredients to shopping list: 2 fillets * 2x scale = 4 fillets
          mockDbState.shoppingItems = [
            {
              key: 'salmon fillets_pieces',
              name: 'Salmon fillets',
              quantity: 4,
              unit: 'pieces',
              category: 'Meat & Seafood',
              checked: false,
              source_type: 'scheduled_recipe',
              sources: [{ recipe_title: 'Lemon Herb Salmon' }],
            },
            {
              key: 'lemons_piece',
              name: 'Lemons',
              quantity: 2,
              unit: 'piece',
              category: 'Produce',
              checked: false,
              source_type: 'scheduled_recipe',
              sources: [{ recipe_title: 'Lemon Herb Salmon' }],
            },
          ]
          return Promise.resolve({ id: 'sug-salmon', status: 'accepted', schedule_entry_id: entry.id })
        }
        if (url.includes('/toggle')) {
          const itm = mockDbState.shoppingItems.find((i) => i.key === payload.key)
          if (itm) itm.checked = payload.checked
          return Promise.resolve({ key: payload.key, checked: payload.checked })
        }
        return Promise.resolve({})
      }),
    }

    const mockNotify = vi.fn()
    const ss = { api: mockApi, notify: mockNotify }

    // -------------------------------------------------------------------------
    // 1. Recipe Importer Modal: extract & save recipe
    // -------------------------------------------------------------------------
    const importerWrapper = mount(ImportRecipeModal, {
      props: { isOpen: true, ss },
    })

    // Switch to text mode
    const textTab = importerWrapper.findAll('button').find((b) => b.text().includes('Raw Text'))
    expect(textTab).toBeDefined()
    await textTab!.trigger('click')

    const textarea = importerWrapper.find('textarea.textarea-text')
    await textarea.setValue('Salmon, lemon, pan sear for 10 minutes.')

    const extractBtn = importerWrapper.find('button.btn-extract')
    await extractBtn.trigger('click')
    await importerWrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(importerWrapper.text()).toContain('Lemon Herb Salmon')

    const saveRecipeBtn = importerWrapper.find('button.btn-save')
    await saveRecipeBtn.trigger('click')
    await importerWrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(mockDbState.recipes.length).toBe(1)
    expect(mockDbState.recipes[0].title).toBe('Lemon Herb Salmon')

    // -------------------------------------------------------------------------
    // 2. Recipe Translator: translate to Spanish
    // -------------------------------------------------------------------------
    const translatorWrapper = mount(TranslateAction, {
      props: {
        recipe: mockDbState.recipes[0],
        ss,
      },
    })

    const openTransBtn = translatorWrapper.find('button.btn-open-translate')
    await openTransBtn.trigger('click')

    const transSelect = translatorWrapper.find('select.select-target-lang')
    await transSelect.setValue('es')

    const doTransBtn = translatorWrapper.find('button.btn-do-translate')
    await doTransBtn.trigger('click')
    await translatorWrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(mockDbState.recipes.length).toBe(2)
    expect(mockDbState.recipes[1].language).toBe('es')

    // -------------------------------------------------------------------------
    // 3. AI Meal Planner: generate candidates & schedule
    // -------------------------------------------------------------------------
    const plannerWrapper = mount(MealPlannerWidget, {
      props: { ss },
    })

    const promptInput = plannerWrapper.find('input.input-prompt')
    await promptInput.setValue('Pescatarian dinners')
    const genPoolBtn = plannerWrapper.find('button.btn-generate')
    await genPoolBtn.trigger('click')
    await plannerWrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(plannerWrapper.text()).toContain('Lemon Herb Salmon')
    expect(plannerWrapper.text()).toContain('Rich in omega-3')

    const acceptBtn = plannerWrapper.find('button.btn-accept')
    await acceptBtn.trigger('click')
    await plannerWrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(plannerWrapper.text()).toContain('✓ Scheduled')
    expect(mockDbState.scheduled.length).toBe(1)

    // -------------------------------------------------------------------------
    // 4. Shopping List: view aggregated items and toggle checkbox
    // -------------------------------------------------------------------------
    const shoppingWrapper = mount(ShoppingListPage, {
      props: { ss },
    })

    await shoppingWrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(shoppingWrapper.text()).toContain('Salmon fillets')
    expect(shoppingWrapper.text()).toContain('4 pieces')
    expect(shoppingWrapper.text()).toContain('Lemons')

    // Toggle Salmon checkbox
    const checkboxes = shoppingWrapper.findAll('input.item-checkbox')
    expect(checkboxes.length).toBe(2)
    await checkboxes[0].trigger('change')

    expect(mockApi.post).toHaveBeenCalledWith('/api/x/core-shopping-list/toggle', {
      key: 'salmon fillets_pieces',
      checked: true,
    })
  })
})

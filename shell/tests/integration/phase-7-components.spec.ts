import { describe, it, expect, afterEach } from 'vitest'
import { RouterView } from 'vue-router'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import { recipeDraft, savedRecipe, clickButton, openProvider } from '../helpers/registeredPlugin'
import activateRecipes from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'
import activateImporter from '../../../secretsauce/plugins/core/core-recipe-importer/ui/src/index'
import activateTranslator from '../../../secretsauce/plugins/core/core-translator/ui/src/index'
import activateTimeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import activatePlanner from '../../../secretsauce/plugins/core/core-meal-planner-ai/ui/src/index'
import activateShopping from '../../../secretsauce/plugins/core/core-shopping-list/ui/src/index'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('Registered import/translate/plan/shopping components (API boundary doubles, not E2E)', () => {
  it('uses rendered providers and sidebar to complete the component workflow', async () => {
    const translated = { ...savedRecipe, id: 'cake_de', language: 'de', title: 'Schokoladenkuchen' }
    const suggestion = { id: 'suggestion-1', plan_id: 'plan-1', recipe_id: savedRecipe.id, recipe_title: savedRecipe.title, meal_type: 'dinner', suggested_date: null, reasoning: 'Easy dessert', confidence: .95, status: 'suggested', created_at: '2026-09-28T12:00:00Z' }
    let imported = false, scheduled = false, checked = false
    const harness = pluginHarness({ get: async (path: string, query: any) => {
      if (path === '/api/recipes') return { items: imported ? [savedRecipe] : [], total: imported ? 1 : 0, limit: 50, offset: 0 }
      if (path === '/api/recipes/cake_en') return savedRecipe
      if (path === '/api/recipes/cake_de') return translated
      if (path === '/api/x/core-shortlist' || path.startsWith('/api/timeline')) return []
      if (path === '/api/x/core-shopping-list') return { items: scheduled ? [{ key: 'cocoa_g', name: 'Cocoa', quantity: 100, unit: 'g', category: 'Other', source_type: 'scheduled_recipe', checked, sources: [{ recipe_title: savedRecipe.title, scaled_qty: 100, date: query.from_date }] }] : [], from_date: query.from_date, to_date: query.to_date }
      throw new Error(`Unexpected GET ${path}`)
    }, post: async (path: string, body: any) => {
      if (path === '/api/x/core-recipe-importer/parse-text') { expect(body).toEqual({ text: 'Chocolate cake instructions', auto_save: false }); return recipeDraft }
      if (path === '/api/recipes') { expect(body).toEqual(recipeDraft); imported = true; return savedRecipe }
      if (path === '/api/x/core-translator/translate') { expect(body).toEqual({ recipe_id: 'cake_en', target_language: 'de' }); return translated }
      if (path === '/api/x/core-meal-planner-ai/generate') return { id: 'plan-1', title: 'Desserts', prompt: null, start_date: null, suggestions: [{ ...suggestion }], created_at: suggestion.created_at }
      if (path === '/api/x/core-meal-planner-ai/suggestions/suggestion-1/accept') { scheduled = true; return { ...suggestion, status: 'accepted', timeline_entry_id: 'entry-1' } }
      if (path === '/api/x/core-shopping-list/toggle') { expect(body).toEqual({ key: 'cocoa_g', checked: true }); checked = true; return body }
      throw new Error(`Unexpected POST ${path}`)
    } } as any)
    for (const [id, activate] of [['core-recipes', activateRecipes], ['core-recipe-importer', activateImporter], ['core-translator', activateTranslator], ['core-timeline', activateTimeline], ['core-meal-planner-ai', activatePlanner], ['core-shopping-list', activateShopping]] as const) activate(harness.ss(id))
    harness.householdStore.household.meal_types = [{ id: 'dinner', label: 'Dinner' }]
    await harness.router.push('/recipes')
    const wrapper = mountWithUi(RouterView, { attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia, harness.router] } }); wrappers.push(wrapper); await flushPromises()
    await openProvider(wrapper.findComponent({ name: 'IntentTrigger' }), 'Import with AI…')
    await clickButton('Paste text')
    const text = document.querySelector<HTMLTextAreaElement>('#import-text')!; text.value = 'Chocolate cake instructions'; text.dispatchEvent(new Event('input'))
    await clickButton('Extract recipe'); expect(document.querySelector('[role=dialog]')?.textContent).toContain('Mix and bake')
    await clickButton('Save recipe'); expect(wrapper.text()).toContain('Chocolate cake')
    await wrapper.find('.ss-intent-trigger').trigger('click'); await flushPromises()
    Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => item.textContent?.includes('Translate…'))!.querySelector<HTMLElement>('a')!.click(); await flushPromises()
    await clickButton('Translate recipe'); expect(wrapper.text()).toContain('Schokoladenkuchen')
    await harness.router.push('/timeline'); await flushPromises(); await clickButton('Generate suggestions'); expect(wrapper.text()).toContain('Easy dessert')
    await clickButton('Add to schedule'); expect(wrapper.text()).toContain('Scheduled')
    await harness.router.push('/shopping-list'); await flushPromises(); expect(wrapper.text()).toContain('100 g')
    await wrapper.find('input[type=checkbox]').setValue(true); await flushPromises(); expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(true)
  }, 15000) // Several real PrimeVue routes/dialogs; allow CPU contention without weakening assertions.
})

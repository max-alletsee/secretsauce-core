import { describe, it, expect, afterEach } from 'vitest'
import { RouterView } from 'vue-router'
import { defineComponent, h } from 'vue'
import { Slot } from '@secretsauce/ui'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import { savedRecipe, testMember, clickButton } from '../helpers/registeredPlugin'
import activateMembers from '../../../secretsauce/plugins/core/core-members/ui/src/index'
import activateRecipes from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'
import activateShortlist from '../../../secretsauce/plugins/core/core-shortlist/ui/src/index'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('Members + Recipes + shortlist components (API boundary doubles)', () => {
  it('renders the registered picker and shortlist consumers, then scales the route recipe', async () => {
    const harness = pluginHarness({ get: async (path: string) => {
      if (path === '/api/recipes') return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
      if (path === '/api/recipes/cake_en') return { ...savedRecipe, servings: 2, ingredients: [{ ...savedRecipe.ingredients[0], quantity: 200, name: 'Flour' }] }
      if (path === '/api/x/core-shortlist') return []
      throw new Error(`Unexpected GET ${path}`)
    }, post: async (path: string, body: any) => { expect(path).toBe('/api/x/core-shortlist'); expect(body).toEqual({ recipe_id: 'cake_en' }); return { id: 'shortlist-1', recipe_id: 'cake_en', added_at: '2026-09-28T12:00:00Z', added_by_member_id: testMember.id } } } as any)
    activateMembers(harness.ss('core-members')); activateRecipes(harness.ss('core-recipes')); activateShortlist(harness.ss('core-shortlist'))
    harness.memberStore.setMembers([testMember]); harness.memberStore.setCurrentMember(testMember.id)
    await harness.router.push('/recipes')
    const view = defineComponent({ setup: () => () => h('div', [h(Slot, { name: 'shell.header.right' }), h(RouterView)]) })
    const wrapper = mountWithUi(view, { attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia, harness.router] } }); wrappers.push(wrapper); await flushPromises()
    expect(wrapper.find('.ss-member-picker').exists()).toBe(true); expect(wrapper.text()).toContain('Ann')
    expect(wrapper.find('.shortlist-filter-chip').exists()).toBe(true); expect(wrapper.text()).toContain('Chocolate cake')
    await clickButton('Add to shortlist'); expect(wrapper.find('.btn-shortlist').attributes('aria-pressed')).toBe('true')
    await harness.router.push('/recipes/cake_en'); await flushPromises()
    expect(wrapper.find('.ingredient-item strong').text()).toBe('200')
    await wrapper.find('.btn-scaler-plus').trigger('click'); expect(wrapper.find('.ingredient-item strong').text()).toBe('300')
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-shortlist/ui/src/index'
import { registeredSlot, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('registered shortlist slots (API boundary doubles)', () => {
  it('adds and removes the context recipe through the real card slot', async () => {
    const { wrapper } = registeredSlot(activate, 'core-shortlist', {
      post: async (path: string, body: any) => { expect(path).toBe('/api/x/core-shortlist'); expect(body).toEqual({ recipe_id: 'cake_en' }); return { id: 'shortlist-1', recipe_id: 'cake_en', added_by_member_id: null, added_at: '2026-09-28T12:00:00Z' } },
      delete: async (path: string) => { expect(path).toBe('/api/x/core-shortlist/cake_en') },
    } as any, 'recipe.card.actions', { recipe: { id: 'cake_en', title: 'Cake' } })
    wrappers.push(wrapper)
    await clickButton('Add to shortlist'); expect(wrapper.find('button').attributes('aria-pressed')).toBe('true')
    await clickButton('Remove from shortlist'); expect(wrapper.find('button').attributes('aria-pressed')).toBe('false')
  })
  it('keeps state and notifies when a write fails', async () => {
    const { wrapper, harness } = registeredSlot(activate, 'core-shortlist', { post: async () => { throw new Error('Shortlist unavailable') } } as any, 'recipe.card.actions', { recipe: { id: 'cake_en', title: 'Cake' } })
    wrappers.push(wrapper); await clickButton('Add to shortlist')
    expect(wrapper.find('button').attributes('aria-pressed')).toBe('false')
    expect(harness.notifications).toContainEqual({ level: 'error', message: 'Shortlist unavailable' })
  })
  it('renders saved entries and navigates through the real sidebar slot', async () => {
    const { wrapper, harness } = registeredSlot(activate, 'core-shortlist', { get: async (path: string) => { expect(path).toBe('/api/x/core-shortlist'); return [{ id: 'shortlist-1', recipe_id: 'cake_en', recipe_title: 'Cake', added_by_member_id: null, added_at: '2026-09-28T12:00:00Z' }] } } as any, 'timeline.sidebar')
    wrappers.push(wrapper); harness.router.addRoute({ path: '/recipes/:id', component: { template: '<p>Recipe</p>' } }); await flushPromises()
    expect(wrapper.text()).toContain('Cake'); expect(wrapper.find('a').attributes('href')).toBe('/recipes/cake_en')
    await wrapper.find('a').trigger('click'); await flushPromises()
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_en')
  })
  it('calls the supplied list filter context toggle', async () => {
    let active = false
    const { wrapper } = registeredSlot(activate, 'core-shortlist', {} as any, 'recipe.list.filters', { active: false, toggle: () => { active = !active } })
    wrappers.push(wrapper); await clickButton('Shortlist'); expect(active).toBe(true)
  })
})

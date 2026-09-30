import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import { registeredRoute, savedRecipe } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('registered Timeline route (API boundary double)', () => {
  it('renders nine days, including two compact past days and today', async () => {
    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', { get: async () => [] } as any, '/timeline')
    wrappers.push(wrapper)
    expect(wrapper.findAll('.timeline-day-column')).toHaveLength(9)
    expect(wrapper.findAll('.timeline-day-column.is-past')).toHaveLength(2)
    expect(wrapper.findAll('.timeline-day-column.is-today')).toHaveLength(1)
    expect(harness.routes.getRoutes()[0].nav).toEqual({ label: 'Timeline', icon: 'calendar', order: 5 })
  })
  it('schedules a searched recipe through the actual Add meal dialog', async () => {
    let scheduled: any
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string) => {
        if (path.startsWith('/api/recipes?')) return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
        if (path === '/api/x/core-shortlist') return []
        if (path.startsWith('/api/schedule')) return scheduled ? [scheduled] : []
        if (path.startsWith('/api/journal')) return []
        throw new Error(`Unexpected GET ${path}`)
      },
      post: async (path: string, body: any) => {
        expect(path).toBe('/api/schedule'); expect(body.recipe_id).toBe('cake_en'); expect(body.meal_type.toLowerCase()).toBe('dinner'); expect(body.servings_override).toBe(2)
        scheduled = { ...body, revision: 1, title: savedRecipe.title, recipe: savedRecipe, origin: 'manual', position: 0, created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
        return scheduled
      },
    } as any, '/timeline')
    wrappers.push(wrapper)
    await wrapper.find('.is-today .add-btn').trigger('click'); await flushPromises()
    await wrapper.find('.search-box input').setValue('Chocolate'); await flushPromises()
    await wrapper.find('.select-btn').trigger('click'); await flushPromises()
    expect(wrapper.find('.modal-backdrop').exists()).toBe(false)
    expect(wrapper.text()).toContain('Chocolate cake')
  })
})

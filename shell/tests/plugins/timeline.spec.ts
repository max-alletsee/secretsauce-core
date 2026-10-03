import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import { registeredRoute, savedRecipe, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
function resolved(from: string, to: string) {
  const days: Record<string, any[]> = {}
  for (let date=from;date<=to;) { days[date]=[{id:'dinner',label:'Dinner',kind:'default',skipped:false}]; const d=new Date(`${date}T12:00:00`); d.setDate(d.getDate()+1); date=d.toLocaleDateString('en-CA') }
  return {days}
}
describe('registered Timeline route (API boundary double)', () => {
  it('renders nine days, including two compact past days and today', async () => {
    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', { get: async (path: string, query: any) => path === '/api/x/core-timeline/slots' ? resolved(query.from,query.to) : [] } as any, '/timeline')
    wrappers.push(wrapper)
    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(9)
    expect(wrapper.findAll('.past-day-line')).toHaveLength(2)
    expect(wrapper.findAll('.day-card.is-today')).toHaveLength(1)
    expect(harness.routes.getRoutes()[0].nav).toEqual({ label: 'Timeline', icon: 'calendar', order: 5 })
  })
  it('schedules a searched recipe through the actual Add meal dialog', async () => {
    let scheduled: any
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/recipes') return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
        if (path === '/api/x/core-shortlist') return []
        if (path === '/api/x/core-timeline/slots') return resolved(query.from,query.to)
        if (path.startsWith('/api/schedule')) return scheduled ? [scheduled] : []
        if (path.startsWith('/api/journal')) return []
        throw new Error(`Unexpected GET ${path}`)
      },
      post: async (path: string, body: any) => {
        expect(path).toBe('/api/schedule'); expect(body.recipe_id).toBe('cake_en'); expect(body.meal_type).toBe('dinner'); expect(body.servings_override).toBe(2)
        scheduled = { ...body, id:'entry-1', revision: 1, title: savedRecipe.title, recipe: savedRecipe, origin: 'manual', position: 0, created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
        return scheduled
      },
    } as any, '/timeline')
    wrappers.push(wrapper)
    await clickButton('Add meal', wrapper.find('.is-today').element)
    const search = document.querySelector<HTMLInputElement>('#entry-recipe-search')!; search.value='Chocolate'; search.dispatchEvent(new Event('input')); await flushPromises()
    await clickButton('Schedule')
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(wrapper.text()).toContain('Chocolate cake')
  })
})

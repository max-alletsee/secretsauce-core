import { describe, it, expect, afterEach, vi } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import { registeredRoute, registeredSlot, savedRecipe, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
function resolved(from: string, to: string) {
  const days: Record<string, any[]> = {}
  for (let date=from;date<=to;) { days[date]=[{id:'dinner',label:'Dinner',kind:'default',skipped:false}]; const d=new Date(`${date}T12:00:00`); d.setDate(d.getDate()+1); date=d.toLocaleDateString('en-CA') }
  return {days}
}
describe('registered Timeline route (API boundary double)', () => {
  it('renders nine days, including two compact past days with ✓ cooked indicators and 4-day backward pagination', async () => {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
        if (path.startsWith('/api/timeline')) return [{ id: 'past-1', revision: 1, date: yesterday, meal_type: 'dinner', title: 'Lentil Stew', status: 'cooked' }]
        return []
      }
    } as any, '/timeline')
    wrappers.push(wrapper)
    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(9)
    expect(wrapper.findAll('.past-day-line')).toHaveLength(2)
    expect(wrapper.findAll('.past-day-line')[0].text()).toContain('—')
    expect(wrapper.findAll('.past-day-line')[1].text()).toContain('✓ DINNER Lentil Stew')
    const emptySlotBtn = wrapper.find('.is-today [data-slot-id=dinner] .empty-slot-btn')
    expect(emptySlotBtn.exists()).toBe(true)
    expect(emptySlotBtn.attributes('aria-label')).toBe('Add meal')
    expect(emptySlotBtn.find('.pi-plus').exists()).toBe(true)
    expect(wrapper.findAll('.day-card.is-today')).toHaveLength(1)
    expect(harness.routes.getRoutes()[0].nav).toEqual({ label: 'Timeline', icon: 'calendar', order: 5 })

    await clickButton('Show 4 earlier days')
    expect(wrapper.findAll('.past-day-line')).toHaveLength(6)
  })
  it('schedules a searched recipe through the actual Add meal dialog as planned on today and cooked on a past day', async () => {
    const scheduled: any[] = []
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/recipes') return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
        if (path === '/api/x/core-shortlist') return []
        if (path === '/api/x/core-timeline/slots') return resolved(query.from,query.to)
        if (path.startsWith('/api/timeline')) return [...scheduled]
        throw new Error(`Unexpected GET ${path}`)
      },
      post: async (path: string, body: any) => {
        expect(path).toBe('/api/timeline'); expect(body.recipe_id).toBe('cake_en'); expect(body.meal_type).toBe('dinner'); expect(body.servings_override).toBe(2)
        const item = { ...body, id:`entry-${scheduled.length + 1}`, revision: 1, title: savedRecipe.title, recipe: savedRecipe, origin: 'manual', position: 0, created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
        scheduled.push(item)
        return item
      },
    } as any, '/timeline')
    wrappers.push(wrapper)
    await clickButton('Add meal', wrapper.find('.is-today').element)
    const search = document.querySelector<HTMLInputElement>('#entry-recipe-search')!; search.value='Chocolate'; search.dispatchEvent(new Event('input')); await flushPromises()
    await clickButton('Schedule')
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(scheduled[0].status).toBe('planned')
    expect(wrapper.text()).toContain('Chocolate cake')

    // Expand a past day and add a meal -> defaults to status: 'cooked'
    await wrapper.findAll('.past-day-line')[0].trigger('click'); await flushPromises()
    await clickButton('Add meal', wrapper.find('.past-days .day-card').element)
    await flushPromises()
    await clickButton('Schedule')
    expect(scheduled[1].status).toBe('cooked')
  })
  it('schedules a custom pre-defined note like take-out from slot settings', async () => {
    let scheduled: any
    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/recipes') return { items: [], total: 0, limit: 50, offset: 0 }
        if (path === '/api/x/core-shortlist') return []
        if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
        if (path.startsWith('/api/timeline')) return scheduled ? [scheduled] : []
        throw new Error(`Unexpected GET ${path}`)
      },
      post: async (path: string, body: any) => {
        expect(path).toBe('/api/timeline')
        expect(body.entry_type).toBe('note')
        expect(body.title).toBe('take-out')
        expect(body.meal_type).toBe('dinner')
        expect(body.status).toBe('planned')
        scheduled = { ...body, id: 'entry-note-1', revision: 1, origin: 'member', created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
        return scheduled
      },
    } as any, '/timeline')
    wrappers.push(wrapper)

    harness.householdStore.household = {
      household_name: 'Our Household',
      meal_types: [
        { id: 'dinner', label: 'Dinner', predefined_notes: ['Leftovers', 'take-out'] }
      ],
      languages: { primary: 'en' },
      units: 'metric',
    }

    await clickButton('Add meal', wrapper.find('.is-today').element)
    await clickButton('Note')
    expect(document.querySelector('.quick-notes')?.textContent).toContain('take-out')
    await clickButton('take-out')
    const noteInput = document.querySelector<HTMLInputElement>('#entry-note')!
    expect(noteInput.value).toBe('take-out')
    await clickButton('Add meal', document.querySelector('[role=dialog]')!)
    expect(document.querySelector('[role=dialog]')).toBeNull()
    expect(wrapper.text()).toContain('take-out')
  })

  it('refreshes timeline when a recipe:deleted stream event arrives', async () => {
    vi.useFakeTimers()
    try {
      let timelineGets = 0
      const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', {
        get: async (path: string, query: any) => {
          if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
          if (path.startsWith('/api/timeline')) { timelineGets++; return [] }
          return []
        },
      } as any, '/timeline')
      wrappers.push(wrapper)

      const initialGets = timelineGets
      harness.emitStream('recipe:deleted', { kind: 'event', seq: 99, name: 'recipe:deleted', entity_type: 'recipe', entity_id: 'cake_en', revision: 1, actor_member_id: null, origin: 'member', created_at: '2026-10-01T00:00:00Z' })
      vi.advanceTimersByTime(350)
      await flushPromises()
      expect(timelineGets).toBeGreaterThan(initialGets)
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses configured Timeline Window, hides empty past container when 0, and chunks wide warmCache requests', async () => {
    const timelineQueries: Array<{ from: string; to: string }> = []
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/settings') return { default_past_days: 0, default_planning_days: 3 }
        if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
        if (path.startsWith('/api/timeline')) {
          if (query) timelineQueries.push({ from: query.from, to: query.to })
          else {
            const url = new URL(path, 'http://localhost')
            timelineQueries.push({ from: url.searchParams.get('from')!, to: url.searchParams.get('to')! })
          }
          return []
        }
        return []
      },
    } as any, '/timeline')
    wrappers.push(wrapper)

    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(3)
    expect(wrapper.findAll('.past-day-line')).toHaveLength(0)
    expect(wrapper.find('.past-days').exists()).toBe(false)

    await clickButton('Show 4 earlier days')
    expect(wrapper.find('.past-days').exists()).toBe(true)
    expect(wrapper.findAll('.past-day-line')).toHaveLength(4)

    // Verify warmCache covered at least 15 days (today..today+14)
    expect(timelineQueries.some(q => {
      const diff = Math.round((new Date(`${q.to}T12:00:00`).getTime() - new Date(`${q.from}T12:00:00`).getTime()) / 86400000)
      return diff >= 14 && diff <= 62
    })).toBe(true)
  })

  it('chunks warmCache into <=62 day requests when configured window exceeds 62 days', async () => {
    const warmRanges: Array<{ from: string; to: string; diff: number }> = []
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/settings') return { default_past_days: 30, default_planning_days: 60 }
        if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
        if (path.startsWith('/api/timeline')) {
          const from = query?.from ?? new URL(path, 'http://localhost').searchParams.get('from')!
          const to = query?.to ?? new URL(path, 'http://localhost').searchParams.get('to')!
          const diff = Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000)
          expect(diff).toBeLessThanOrEqual(62)
          warmRanges.push({ from, to, diff })
          return []
        }
        return []
      },
    } as any, '/timeline')
    wrappers.push(wrapper)

    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(90)
    expect(warmRanges.length).toBeGreaterThanOrEqual(2)
  })

  it('updates unexpanded Timeline on settings-changed push, preserves expanded window until Today reset', async () => {
    let settings = { default_past_days: 2, default_planning_days: 7 }
    const { wrapper, harness } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/settings') return { ...settings }
        if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
        if (path.startsWith('/api/timeline')) return []
        return []
      },
    } as any, '/timeline')
    wrappers.push(wrapper)

    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(9)

    // Unexpanded view reacts immediately to settings-changed
    settings = { default_past_days: 1, default_planning_days: 4 }
    harness.emitStream('core-timeline:settings-changed', { kind: 'push', name: 'core-timeline:settings-changed', data: settings, plugin_id: 'core-timeline' })
    await flushPromises()
    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(5)
    expect(wrapper.findAll('.past-day-line')).toHaveLength(1)

    // Manually expand window -> subsequent settings-changed does not clobber until Today click
    await clickButton('Show 4 earlier days')
    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(9)

    settings = { default_past_days: 0, default_planning_days: 2 }
    harness.emitStream('core-timeline:settings-changed', { kind: 'push', name: 'core-timeline:settings-changed', data: settings, plugin_id: 'core-timeline' })
    await flushPromises()
    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(9)

    await clickButton('Today', wrapper.element)
    await flushPromises()
    expect(wrapper.findAll('[data-timeline-date]')).toHaveLength(2)
    expect(wrapper.find('.past-days').exists()).toBe(false)
  })

  it('renders inline plugin settings for Timeline Window and saves validated settings', async () => {
    let saved: any = null
    const { wrapper, harness } = registeredSlot(
      activate,
      'core-timeline',
      {
        get: async (path: string) => {
          if (path === '/api/x/core-timeline/settings') return { default_past_days: 2, default_planning_days: 7 }
          if (path.startsWith('/api/timeline')) return []
          throw new Error(`Unexpected GET ${path}`)
        },
        put: async (path: string, body: any) => {
          expect(path).toBe('/api/x/core-timeline/settings')
          saved = body
          return body
        },
      } as any,
      'plugin_manager.plugin.actions',
      { plugin: { id: 'core-timeline', state: 'active', enabled: true } },
    )
    wrappers.push(wrapper)

    await clickButton('Settings', wrapper.element)
    await flushPromises()

    const pastInput = wrapper.find<HTMLInputElement>('#timeline-default-past-days')
    const planningInput = wrapper.find<HTMLInputElement>('#timeline-default-planning-days')
    expect(pastInput.element.value).toBe('2')
    expect(planningInput.element.value).toBe('7')

    await pastInput.setValue('4')
    await planningInput.setValue('10')
    await clickButton('Save Settings', wrapper.element)

    expect(saved).toEqual({ default_past_days: 4, default_planning_days: 10 })
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))

    // Out-of-range input is rejected inline without issuing PUT
    saved = null
    await pastInput.setValue('31')
    await clickButton('Save Settings', wrapper.element)
    expect(saved).toBeNull()
    expect(wrapper.text()).toContain('Default past days must be between 0 and 30.')
  })

  it('shows the recipe book icon only when recipe_id is present, omitting it for Meal Notes and unlinked deleted recipes', async () => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const { wrapper } = await registeredRoute(activate, 'core-timeline', {
      get: async (path: string, query: any) => {
        if (path === '/api/x/core-timeline/slots') return resolved(query.from, query.to)
        if (path.startsWith('/api/timeline')) {
          return [
            { id: 'linked-1', revision: 1, date: today, meal_type: 'dinner', entry_type: 'recipe', recipe_id: savedRecipe.id, recipe: savedRecipe, title: savedRecipe.title, status: 'planned' },
            { id: 'note-1', revision: 1, date: today, meal_type: 'dinner', entry_type: 'note', recipe_id: null, title: 'Leftovers', status: 'planned' },
            { id: 'unlinked-1', revision: 2, date: today, meal_type: 'dinner', entry_type: 'recipe', recipe_id: null, title: 'Deleted Recipe Dish', status: 'cooked' },
          ]
        }
        return []
      },
    } as any, '/timeline')
    wrappers.push(wrapper)

    const slot = wrapper.find('.is-today [data-slot-id=dinner]')
    expect(slot.find('.empty-slot-btn').exists()).toBe(false)
    const cards = slot.findAll('.timeline-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].find('.recipe-entry-icon.pi-book').exists()).toBe(true)
    expect(cards[1].find('.recipe-entry-icon').exists()).toBe(false)
    expect(cards[2].find('.recipe-entry-icon').exists()).toBe(false)
  })
})

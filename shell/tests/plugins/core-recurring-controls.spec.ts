import { describe, it, expect, vi, afterEach } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recurring/ui/src/index'
import { registeredSlot, clickButton } from '../helpers/registeredPlugin'

const wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('registered recurring controls (API boundary double)', () => {
  it('renders route-shaped rules and deletes through the timeline sidebar widget', async () => {
    const rules = [
      {
        id: 'rule-1',
        weekday: 0,
        meal_type: 'dinner',
        entry_type: 'recipe',
        recipe_id: 'recipe-1',
        recipe_title: 'Monday pasta',
        title: 'Monday pasta',
        servings: 3,
        created_at: '2026-09-28T12:00:00Z',
      },
    ]
    const api = {
      get: vi.fn(async (path: string) => {
        if (path === '/api/x/core-recurring/rules') return [...rules]
        return []
      }),
      delete: vi.fn(async () => {
        rules.splice(0)
        return { ok: true }
      }),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
    }
    const { wrapper, harness } = registeredSlot(activate, 'core-recurring', api, 'timeline.sidebar')
    harness.householdStore.household.meal_types = [{ id: 'dinner', label: 'Dinner' }]
    await flushPromises()
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('Every Monday · Dinner · Monday pasta (3 servings)')
    await clickButton('Delete', wrapper.element)
    await flushPromises()
    expect(api.delete).toHaveBeenCalledWith('/api/x/core-recurring/rules/rule-1')
    expect(wrapper.text()).toContain('No recurring rules configured.')
  })

  it('explains a read failure in the timeline sidebar widget', async () => {
    const api = {
      get: vi.fn(async () => {
        throw new Error('Rule read failed')
      }),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    }
    const { wrapper } = registeredSlot(activate, 'core-recurring', api, 'timeline.sidebar')
    await flushPromises()
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('Rule read failed')
  })

  it('renders inline ghost suggestions in timeline slots and supports approve and dismiss', async () => {
    const suggestions = [
      {
        rule_id: 'rule-1',
        date: '2026-09-30',
        weekday: 2,
        meal_type: 'dinner',
        entry_type: 'recipe',
        recipe_id: 'rec-1',
        recipe_title: 'Wednesday Pasta',
        title: 'Wednesday Pasta',
        servings: 2.5,
      },
      {
        rule_id: 'rule-2',
        date: '2026-09-30',
        weekday: 2,
        meal_type: 'dinner',
        entry_type: 'note',
        recipe_id: null,
        recipe_title: null,
        title: 'Garlic bread',
        servings: 4,
      },
    ]
    const posts: any[] = []
    let changedCount = 0
    const api = {
      get: vi.fn(async (path: string) => {
        if (path === '/api/x/core-recurring/suggestions') return [...suggestions]
        return []
      }),
      post: vi.fn(async (path: string, body: any) => {
        posts.push([path, body])
        return { ok: true }
      }),
    }
    const { wrapper } = registeredSlot(activate, 'core-recurring', api, 'timeline.slot.suggestions', {
      date: '2026-09-30',
      slot: { id: 'dinner', label: 'Dinner', skipped: false },
      onChanged: () => {
        changedCount += 1
      },
    })
    await flushPromises()
    wrappers.push(wrapper)

    expect(wrapper.text()).toContain('Wednesday Pasta')
    expect(wrapper.text()).toContain('2.5 servings')
    expect(wrapper.text()).toContain('Garlic bread')
    expect(wrapper.text()).toContain('4 servings')

    await clickButton('Approve', wrapper.element)
    expect(posts[0]).toEqual(['/api/x/core-recurring/rules/rule-1/approve', { date: '2026-09-30' }])
    expect(changedCount).toBe(1)
    expect(wrapper.text()).not.toContain('Wednesday Pasta')
    expect(wrapper.text()).toContain('Garlic bread')

    await clickButton('Dismiss', wrapper.element)
    expect(posts[1]).toEqual(['/api/x/core-recurring/rules/rule-2/dismiss', { date: '2026-09-30' }])
    expect(wrapper.text()).not.toContain('Garlic bread')
  })
})

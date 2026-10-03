import { describe, it, expect, vi, afterEach } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recurring/ui/src/index'
import { registeredRoute, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })

describe('registered recurring controls (API boundary double)', () => {
  it('renders route-shaped rules and deletes through the actual section', async () => {
    const rules = [{ id: 'rule-1', weekday: 0, meal_type: 'dinner', recipe_id: 'recipe-1', recipe_title: 'Monday pasta', created_at: '2026-09-28T12:00:00Z' }]
    const api = { get: vi.fn(async () => [...rules]), delete: vi.fn(async () => { rules.splice(0); return {ok:true} }), post: vi.fn(), put: vi.fn(), patch: vi.fn() }
    const { wrapper, harness } = await registeredRoute(activate, 'core-recurring', api, '/settings')
    harness.householdStore.household.meal_types=[{id:'dinner',label:'Dinner'}]
    await flushPromises()
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('Every Monday · Dinner · Monday pasta')
    expect(wrapper.text()).toContain('A recurring meal is planned automatically')
    expect(wrapper.text()).not.toContain('Materialize')
    await clickButton('Delete'); await flushPromises()
    expect(api.delete).toHaveBeenCalledWith('/api/x/core-recurring/rules/rule-1')
    expect(wrapper.text()).toContain('No recurring rules configured.')
  })
  it('explains a read failure in the real Settings section', async () => {
    const api = { get: vi.fn(async () => { throw new Error('Rule read failed') }), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }
    const { wrapper } = await registeredRoute(activate, 'core-recurring', api, '/settings')
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('Rule read failed')
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recurring/ui/src/index'
import { registeredRoute, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })

describe('registered recurring controls (API boundary double; rule creation remains Phase 6)', () => {
  it('renders route-shaped rules and retains working delete/materialize actions', async () => {
    const rules = [{ id: 'rule-1', weekday: 0, meal_type: 'dinner', recipe_id: 'recipe-1', recipe_title: 'Monday pasta', servings_override: null, enabled: true }]
    const api = { get: vi.fn(async () => [...rules]), delete: vi.fn(async () => { rules.splice(0) }), post: vi.fn(async () => ({ created: 2, skipped: 0 })), put: vi.fn(), patch: vi.fn() }
    const { wrapper, harness } = await registeredRoute(activate, 'core-recurring', api, '/settings')
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('Monday · dinner · Monday pasta')
    await clickButton('Materialize Now'); await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/api/x/core-recurring/materialize', {})
    expect(harness.notifications).toContainEqual({ level: 'success', message: 'Schedule updated.' })
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

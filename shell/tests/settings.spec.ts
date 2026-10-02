import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import SettingsPage from '../src/pages/SettingsPage.vue'
import { registerShellSettings } from '../src/settings'
import { createPluginLoader } from '../src/registries/plugins'
import activateShopping from '../../secretsauce/plugins/core/core-shopping-list/ui/src/index'
import { pluginHarness } from './helpers/pluginHarness'
import { mountWithUi } from './helpers/mountWithUi'
import { clickButton } from './helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
beforeEach(() => localStorage.clear())
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })

async function renderSettings(api: any = { get: vi.fn(async () => []), patch: vi.fn() }, path = '/settings', prepare?: (harness: any) => Promise<any> | void) {
  const harness = pluginHarness(api)
  harness.householdStore.household = { household_name: 'Family', meal_types: [{ id: 'dinner', label: 'Dinner' }], languages: { primary: 'en', translations: ['de'] }, units: 'metric' }
  registerShellSettings(harness.settings)
  const loader = await prepare?.(harness)
  harness.router.addRoute({ path: '/settings', component: SettingsPage })
  await harness.router.push(path); await harness.router.isReady()
  const wrapper = mountWithUi(SettingsPage, { attachTo: document.body, global: { plugins: [harness.pinia, harness.router], provide: { ...harness.provide, __SS_PLUGIN_LOADER__: loader } } })
  wrappers.push(wrapper); await flushPromises()
  return { wrapper, harness }
}
function header(wrapper: VueWrapper, id: string) { return wrapper.find(`#settings-${id} [data-pc-name=accordionheader]`) }

describe('Settings through real sections and global controls (API boundary doubles)', () => {
  it('settings_sections_update_from_live_registrations', async () => {
    const { wrapper, harness } = await renderSettings()
    expect(header(wrapper, 'household').attributes('aria-expanded')).toBe('true')
    harness.ss('late-plugin').settings.section({ id: 'late-tools', title: 'Late tools', order: 40, component: defineComponent({ template: '<p>Newly enabled tool content</p>' }) })
    await flushPromises()
    expect(wrapper.findAll('#settings-late-tools [data-pc-name=accordionheader]')).toHaveLength(1)
    await harness.router.push('/settings?section=late-tools'); await flushPromises()
    expect(header(wrapper, 'late-tools').attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Newly enabled tool content')
    harness.settings.unregister('late-plugin'); await flushPromises()
    expect(wrapper.find('#settings-late-tools').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Newly enabled tool content')
  })
  it('restores multiple device panels while ignoring stale ids and unknown queries', async () => {
    localStorage.setItem('ss-settings-open', '["device","stale"]')
    const { wrapper, harness } = await renderSettings(undefined, '/settings?section=plugins')
    expect(header(wrapper, 'device').attributes('aria-expanded')).toBe('true')
    expect(header(wrapper, 'plugins').attributes('aria-expanded')).toBe('true')
    expect(JSON.parse(localStorage.getItem('ss-settings-open')!)).toEqual(['device', 'plugins'])
    await harness.router.push('/settings?section=unknown'); await flushPromises()
    expect(wrapper.findAll('[data-pc-name=accordionpanel]')).toHaveLength(3)
  })
  it('saves the complete household draft and updates the live store', async () => {
    const api = { get: vi.fn(async () => []), patch: vi.fn(async (_: string, body: any) => ({ ...body, passphrase_version: 1 })) }
    const { wrapper, harness } = await renderSettings(api)
    await wrapper.find('#household-name').setValue('Changed Family')
    await wrapper.find('#slot-label-dinner').setValue('Evening meal')
    await clickButton('Save household')
    expect(api.patch).toHaveBeenCalledWith('/api/household', { household_name: 'Changed Family', meal_types: [{ id: 'dinner', label: 'Evening meal' }], languages: { primary: 'en', translations: ['de'] }, units: 'metric' })
    expect(harness.householdStore.household.household_name).toBe('Changed Family')
    expect(harness.householdStore.household.meal_types).toEqual([{ id: 'dinner', label: 'Evening meal' }])
  })
  it('retains the household draft and explains a failed save', async () => {
    const { wrapper, harness } = await renderSettings({ get: vi.fn(async () => []), patch: vi.fn(async () => { throw new Error('Household write failed') }) })
    await wrapper.find('#household-name').setValue('Unsaved Family'); await clickButton('Save household')
    expect(wrapper.text()).toContain('Household write failed')
    expect((wrapper.find('#household-name').element as HTMLInputElement).value).toBe('Unsaved Family')
    expect(harness.householdStore.household.household_name).toBe('Family')
  })
  it('synchronizes real loader registrations on toggle and renders states, errors and commands', async () => {
    const rows = [
      { id: 'core-shopping-list', name: 'Shopping List', state: 'active', enabled: true, description: 'Buy ingredients', error: null, commands: [{ id: 'refresh', title: 'Refresh data' }] },
      { id: 'disabled', name: 'Disabled tool', state: 'disabled', enabled: false, description: '', error: null, commands: [] },
      { id: 'errored', name: 'Errored tool', state: 'errored', enabled: true, description: '', error: 'Traceback\nProvider exploded', commands: [] },
      { id: 'blocked', name: 'Blocked tool', state: 'blocked', enabled: true, description: '', error: 'Dependency missing', commands: [] },
    ]
    const api = { get: vi.fn(async (path: string) => path === '/api/plugins/active' ? rows.filter(row => row.state === 'active').map(row => ({ ...row, ui_entry: '/shopping.js' })) : rows.map(row => ({ ...row }))), post: vi.fn(async (path: string) => {
      if (path.endsWith('/commands/refresh')) return { job_id: 'job-42' }
      rows[0].enabled = path.endsWith('/enable'); rows[0].state = rows[0].enabled ? 'active' : 'disabled'
      return rows[0]
    }) }
    const { wrapper, harness } = await renderSettings(api, '/settings?section=plugins', async harness => {
      const loader = createPluginLoader({ ...harness, makeSecretSauceUI: harness.ss, importModule: async () => ({ default: activateShopping }) })
      await loader.loadActivePlugins(api)
      return loader
    })
    expect(wrapper.text()).toContain('Provider exploded'); expect(wrapper.text()).toContain('Dependency missing')
    for (const state of ['active', 'disabled', 'errored', 'blocked']) expect(wrapper.text()).toContain(state)
    await clickButton('Refresh data'); expect(wrapper.text()).toContain('job-42')
    const input = wrapper.find('[data-plugin-id=core-shopping-list] input[type=checkbox]').element as HTMLInputElement
    input.click(); await flushPromises()
    expect(harness.routes.getRoutes().some(route => route.path === '/shopping-list')).toBe(false)
    expect(api.get.mock.calls.filter(([path]) => path === '/api/plugins/active')).toHaveLength(2) // initial load + one reconciliation
    input.click(); await flushPromises()
    expect(harness.routes.getRoutes().filter(route => route.path === '/shopping-list')).toHaveLength(1)
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-ai-provider/ui/src/index'
import { registeredRoute, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
const settings = {
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  models: { default: 'gemini-3.8-flash', fast: 'gemini-2.5-flash-lite' },
  gemini_api_key: '••••••••',
  openai_api_key: '',
  openrouter_api_key: '',
  enforce_budget: true,
  monthly_budget: 15,
}
const usage = { total_cost_usd: 1.2345, month_cost_usd: .5432, total_input_tokens: 15000, total_output_tokens: 5000, breakdown_by_plugin: [{ calling_plugin: 'core-recipe-importer', cost: .5, call_count: 5 }] }
const read = async (path: string) => { if (path.endsWith('/settings')) return settings; if (path.endsWith('/usage')) return usage; throw new Error(`Unexpected GET ${path}`) }
describe('registered AI Settings section (API boundary double)', () => {
  it('renders usage, locks default model key, allows adding/removing custom model keys, and saves models map', async () => {
    let savedBody: any = null
    const { wrapper, harness } = await registeredRoute(
      activate,
      'core-ai-provider',
      {
        get: read,
        put: async (path: string, body: any) => {
          expect(path).toBe('/api/x/core-ai-provider/settings')
          savedBody = body
          return { ...settings, ...body }
        },
      } as any,
      '/settings',
    )
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('0.5432')
    expect(wrapper.text()).toContain('core-recipe-importer')

    // Default key input is locked and cannot be deleted
    const defaultKeyInput = wrapper.find('#ai-model-key-default')
    expect(defaultKeyInput.exists()).toBe(true)
    expect((defaultKeyInput.element as HTMLInputElement).value).toBe('default')
    expect((defaultKeyInput.element as HTMLInputElement).disabled).toBe(true)

    // Update default model name
    await wrapper.find('#ai-model').setValue('gemini-test-model')

    // Add a new custom model key/value pair
    await clickButton('Add model')
    const keyInputs = wrapper.findAll('.model-key-input')
    const valInputs = wrapper.findAll('.model-value-input')
    expect(keyInputs.length).toBe(2) // 'fast' + newly added row
    await keyInputs[1].setValue('smart')
    await valInputs[1].setValue('gemini-2.5-pro')

    // Remove the first custom row ('fast')
    const removeBtns = wrapper.findAll('.btn-remove-model')
    expect(removeBtns.length).toBe(2)
    await removeBtns[0].trigger('click')

    await clickButton('Save Settings')
    expect(savedBody).toBeTruthy()
    expect(savedBody.models).toEqual({
      default: 'gemini-test-model',
      smart: 'gemini-2.5-pro',
    })
    expect(savedBody.monthly_budget).toBe(15)
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))
  })
  it('shows the backend save error and retains model input', async () => {
    const { wrapper } = await registeredRoute(activate, 'core-ai-provider', { get: read, put: async () => { throw new Error('AI settings write failed') } } as any, '/settings')
    wrappers.push(wrapper); await wrapper.find('#ai-model').setValue('unsaved-model'); await clickButton('Save Settings')
    expect(wrapper.text()).toContain('AI settings write failed'); expect((wrapper.find('#ai-model').element as HTMLInputElement).value).toBe('unsaved-model')
  })
})

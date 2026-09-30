import { describe, it, expect, afterEach } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-ai-provider/ui/src/index'
import { registeredRoute, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
const settings = { provider: 'gemini', model: 'gemini-3.8-flash', gemini_api_key: '••••••••', openai_api_key: '', openrouter_api_key: '', enforce_budget: true, monthly_budget: 15 }
const usage = { total_cost_usd: 1.2345, month_cost_usd: .5432, total_input_tokens: 15000, total_output_tokens: 5000, breakdown_by_plugin: [{ calling_plugin: 'core-recipe-importer', cost: .5, call_count: 5 }] }
const read = async (path: string) => { if (path.endsWith('/settings')) return settings; if (path.endsWith('/usage')) return usage; throw new Error(`Unexpected GET ${path}`) }
describe('registered AI Settings section (API boundary double)', () => {
  it('renders usage and saves model/budget through the actual section', async () => {
    const { wrapper, harness } = await registeredRoute(activate, 'core-ai-provider', { get: read, put: async (path: string, body: any) => { expect(path).toBe('/api/x/core-ai-provider/settings'); expect(body.model).toBe('gemini-test-model'); expect(body.monthly_budget).toBe(15); return { ...settings, ...body } } } as any, '/settings')
    wrappers.push(wrapper); expect(wrapper.text()).toContain('0.5432'); expect(wrapper.text()).toContain('core-recipe-importer')
    await wrapper.find('.model-input').setValue('gemini-test-model'); await clickButton('Save Settings')
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))
  })
  it('shows the backend save error and retains model input', async () => {
    const { wrapper } = await registeredRoute(activate, 'core-ai-provider', { get: read, put: async () => { throw new Error('AI settings write failed') } } as any, '/settings')
    wrappers.push(wrapper); await wrapper.find('.model-input').setValue('unsaved-model'); await clickButton('Save Settings')
    expect(wrapper.text()).toContain('AI settings write failed'); expect((wrapper.find('.model-input').element as HTMLInputElement).value).toBe('unsaved-model')
  })
})

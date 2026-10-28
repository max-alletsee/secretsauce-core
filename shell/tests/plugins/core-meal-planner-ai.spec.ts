import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-meal-planner-ai/ui/src/index'
import { registeredSlot, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
const suggestions = ['Salad', 'Stew'].map((title, index) => ({ id: `sug-${index}`, plan_id: 'plan-1', recipe_id: `recipe-${index}_en`, recipe_title: title, meal_type: 'dinner', suggested_date: null, reasoning: 'Easy weeknight meal', confidence: .92, status: 'suggested', created_at: '2026-09-28T12:00:00Z' }))
describe('registered meal planner sidebar (API boundary double)', () => {
  it('uses household slots, accepts a suggestion and dismisses another', async () => {
    const { wrapper, harness } = registeredSlot(activate, 'core-meal-planner-ai', { post: async (path: string, body: any) => {
      if (path === '/api/x/core-meal-planner-ai/generate') {
        expect(body).toEqual({ days: 5, prompt: 'Healthy meals', meal_types: ['supper'] })
        return { id: 'plan-1', title: 'Weeknight meals', start_date: null, prompt: 'Healthy meals', created_at: '2026-09-28T12:00:00Z', suggestions: suggestions.map(s => ({ ...s })) }
      }
      if (path === '/api/x/core-meal-planner-ai/suggestions/sug-0/accept') {
        expect(body.meal_type).toBe('supper'); expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        return { ...suggestions[0], status: 'accepted', schedule_entry_id: 'schedule-1' }
      }
      if (path === '/api/x/core-meal-planner-ai/suggestions/sug-1/dismiss') return { ...suggestions[1], status: 'dismissed' }
      throw new Error(`Unexpected POST ${path}`)
    } } as any, 'timeline.sidebar')
    wrappers.push(wrapper)
    harness.householdStore.household.meal_types = [{ id: 'supper', label: 'Evening supper' }]
    await wrapper.find('#planner-prompt').setValue('Healthy meals')
    await clickButton('Generate suggestions')
    expect(wrapper.text()).toContain('Salad'); expect(wrapper.text()).toContain('Stew'); expect(wrapper.text()).toContain('92% match')
    await clickButton('Add to schedule')
    expect(wrapper.text()).toContain('Scheduled')
    await clickButton('Dismiss')
    expect(wrapper.text()).toContain('Dismissed')
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))
  })
  it('retains a suggestion and explains failed acceptance', async () => {
    const { wrapper, harness } = registeredSlot(activate, 'core-meal-planner-ai', { post: async (path: string) => {
      if (path.endsWith('/generate')) return { suggestions: [{ ...suggestions[0] }] }
      throw new Error('Suggestion was already accepted on another device')
    } } as any, 'timeline.sidebar')
    wrappers.push(wrapper)
    harness.householdStore.household.meal_types = [{ id: 'dinner', label: 'Dinner' }]
    await flushPromises(); await clickButton('Generate suggestions'); await clickButton('Add to schedule')
    expect(wrapper.text()).toContain('Suggestion was already accepted on another device')
    expect(wrapper.text()).not.toContain('Scheduled')
  })

  it('renders inline plugin settings for meal planner generate_model_key', async () => {
    let savedConfig: any = null
    const { wrapper, harness } = registeredSlot(
      activate,
      'core-meal-planner-ai',
      {
        get: async (path: string) => {
          if (path === '/api/x/core-ai-provider/settings') {
            return { models: { default: 'gpt-4o-mini', fast: 'gpt-4o-nano' } }
          }
          if (path === '/api/plugins/core-meal-planner-ai/config') {
            return { generate_model_key: 'fast' }
          }
          throw new Error(`Unexpected GET ${path}`)
        },
        put: async (path: string, body: any) => {
          expect(path).toBe('/api/plugins/core-meal-planner-ai/config')
          savedConfig = body
          return body
        },
      } as any,
      'plugin_manager.plugin.actions',
      { plugin: { id: 'core-meal-planner-ai', state: 'active', enabled: true } },
    )
    wrappers.push(wrapper)

    await clickButton('Settings', wrapper.element)
    await flushPromises()
    await clickButton('Save Settings', wrapper.element)
    expect(savedConfig).toEqual({ generate_model_key: 'fast' })
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { ApiError } from '@secretsauce/ui'
import activate from '../../../secretsauce/plugins/core/core-translator/ui/src/index'
import { registeredIntent, registeredSlot, openProvider, clickButton, savedRecipe } from '../helpers/registeredPlugin'

const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
async function open(api: any) {
  const result = registeredIntent(activate, 'core-translator', api, 'recipe:actions', { recipe: savedRecipe })
  wrappers.push(result.wrapper)
  result.harness.router.addRoute({ path: '/recipes/:id', component: { template: '<p>Recipe destination</p>' } })
  await openProvider(result.wrapper, 'Translate…')
  return result
}
describe('registered translator component (API boundary double)', () => {
  it('translates the context recipe and resolves the persisted variant', async () => {
    const translated = { ...savedRecipe, id: 'cake_de', language: 'de', title: 'Schokoladenkuchen', languages: ['en', 'de'] }
    const { wrapper, harness } = await open({ post: async (path: string, body: any) => {
      expect(path).toBe('/api/x/core-translator/translate')
      expect(body).toEqual({ recipe_id: 'cake_en', target_language: 'de' })
      return translated
    } })
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Chocolate cake')
    await clickButton('Translate recipe')
    expect(wrapper.emitted('resolve')).toEqual([[translated]])
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_de')
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })
  it.each([[503, 'unavailable', 'AI isn’t set up yet'], [500, 'internal_error', 'Provider rejected translation']])('shows standard error %s without resolving', async (status, code, message) => {
    const { wrapper } = await open({ post: async () => { throw new ApiError(status as number, code as string, 'Provider rejected translation') } })
    await clickButton('Translate recipe')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain(message as string)
    expect(wrapper.emitted('resolve')).toBeUndefined()
    await clickButton('Cancel')
    expect(wrapper.emitted('cancel')).toEqual([[]])
  })

  it('renders inline plugin settings for single and bulk translation model keys', async () => {
    let savedConfig: any = null
    const { wrapper, harness } = registeredSlot(
      activate,
      'core-translator',
      {
        get: async (path: string) => {
          if (path === '/api/x/core-ai-provider/settings') {
            return { models: { default: 'gpt-4o-mini', bulk: 'gpt-4o-nano' } }
          }
          if (path === '/api/plugins/core-translator/config') {
            return {
              auto_translate_members: true,
              translate_model_key: 'default',
              translate_all_model_key: 'bulk',
            }
          }
          throw new Error(`Unexpected GET ${path}`)
        },
        put: async (path: string, body: any) => {
          expect(path).toBe('/api/plugins/core-translator/config')
          savedConfig = body
          return body
        },
      } as any,
      'plugin_manager.plugin.actions',
      { plugin: { id: 'core-translator', state: 'active', enabled: true } },
    )
    wrappers.push(wrapper)

    await clickButton('Settings', wrapper.element)
    await flushPromises()
    await clickButton('Save Settings', wrapper.element)
    expect(savedConfig).toEqual({
      auto_translate_members: true,
      translate_model_key: 'default',
      translate_all_model_key: 'bulk',
    })
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))
  })
})

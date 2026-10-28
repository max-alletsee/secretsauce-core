import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { ApiError } from '@secretsauce/ui'
import activate from '../../../secretsauce/plugins/core/core-recipe-importer/ui/src/index'
import { registeredIntent, registeredSlot, openProvider, clickButton, recipeDraft, savedRecipe } from '../helpers/registeredPlugin'

const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
async function open(api: any) {
  const result = registeredIntent(activate, 'core-recipe-importer', api, 'recipe:create')
  wrappers.push(result.wrapper)
  // Navigation is real, with a destination for the saved recipe.
  result.harness.router.addRoute({ path: '/recipes/:id', component: { template: '<p>Recipe destination</p>' } })
  result.harness.router.addRoute({ path: '/settings', component: { template: '<p>Settings destination</p>' } })
  await openProvider(result.wrapper, 'Import with AI…')
  return result
}
describe('registered importer component (API boundary double)', () => {
  it('extracts a URL draft without autosave and resolves only after saving the complete draft', async () => {
    const writes: unknown[] = []
    const api = { post: async (path: string, body: any) => {
      if (path === '/api/x/core-recipe-importer/parse-url') {
        expect(body).toEqual({ url: 'https://recipes.example.com/cake', auto_save: false })
        return recipeDraft
      }
      if (path === '/api/recipes') { expect(body).toEqual(recipeDraft); writes.push(body); return savedRecipe }
      throw new Error(`Unexpected POST ${path}`)
    } }
    const { wrapper, harness } = await open(api)
    const input = document.querySelector<HTMLInputElement>('#import-url')!
    input.value = ' https://recipes.example.com/cake '; input.dispatchEvent(new Event('input'))
    await clickButton('Extract recipe')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('100 g Cocoa')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Mix and bake')
    expect(writes).toEqual([])
    expect(wrapper.emitted('resolve')).toBeUndefined()
    await clickButton('Save recipe')
    expect(writes).toHaveLength(1)
    expect(wrapper.emitted('resolve')).toEqual([[savedRecipe]])
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_en')
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })
  it('keeps the extracted draft and displays the backend error when Save fails', async () => {
    const { wrapper } = await open({ post: async (path: string) => {
      if (path === '/api/x/core-recipe-importer/parse-url') return recipeDraft
      if (path === '/api/recipes') throw new ApiError(422, 'validation', 'Servings must be positive')
      throw new Error(`Unexpected POST ${path}`)
    } })
    const input = document.querySelector<HTMLInputElement>('#import-url')!
    input.value = 'https://example.com/cake'; input.dispatchEvent(new Event('input'))
    await clickButton('Extract recipe'); await clickButton('Save recipe')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Servings must be positive')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Chocolate cake')
    expect(wrapper.emitted('resolve')).toBeUndefined()
    await clickButton('Cancel')
    expect(wrapper.emitted('cancel')).toEqual([[]])
  })
  it('explains unavailable AI and closes the provider when navigating to Settings', async () => {
    const { wrapper, harness } = await open({ post: async () => { throw new ApiError(503, 'unavailable', 'Configure AI') } })
    const input = document.querySelector<HTMLInputElement>('#import-url')!
    input.value = 'https://example.com/cake'; input.dispatchEvent(new Event('input'))
    await clickButton('Extract recipe')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('AI isn’t set up yet')
    await clickButton('Open AI settings'); await flushPromises()
    expect(harness.router.currentRoute.value.fullPath).toBe('/settings?section=core-ai-provider')
    expect(wrapper.emitted('cancel')).toEqual([[]])
  })

  it('renders inline plugin settings with task model keys and missing-key fallback indicator', async () => {
    let savedConfig: any = null
    const { wrapper, harness } = registeredSlot(
      activate,
      'core-recipe-importer',
      {
        get: async (path: string) => {
          if (path === '/api/x/core-ai-provider/settings') {
            return { models: { default: 'gpt-4o-mini', vision: 'gpt-4o' } }
          }
          if (path === '/api/plugins/core-recipe-importer/config') {
            return {
              url_model_key: 'deleted-key',
              text_model_key: 'default',
              image_model_key: 'vision',
            }
          }
          throw new Error(`Unexpected GET ${path}`)
        },
        put: async (path: string, body: any) => {
          expect(path).toBe('/api/plugins/core-recipe-importer/config')
          savedConfig = body
          return body
        },
      } as any,
      'plugin_manager.plugin.actions',
      { plugin: { id: 'core-recipe-importer', state: 'active', enabled: true } },
    )
    wrappers.push(wrapper)

    await clickButton('Settings', wrapper.element)
    await flushPromises()

    expect(wrapper.text()).toContain('deleted-key (missing — uses default)')
    await clickButton('Save Settings', wrapper.element)
    expect(savedConfig).toEqual({
      url_model_key: 'deleted-key',
      text_model_key: 'default',
      image_model_key: 'vision',
    })
    expect(harness.notifications).toContainEqual(expect.objectContaining({ level: 'success' }))
  })
})

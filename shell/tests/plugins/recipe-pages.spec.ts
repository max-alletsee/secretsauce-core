import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'
import { registeredRoute, savedRecipe, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('registered Recipe pages (API boundary double)', () => {
  it('receives actual route id and scales ingredient quantities', async () => {
    const { wrapper } = await registeredRoute(activate, 'core-recipes', { get: async (path: string) => {
      if (path === '/api/recipes/cake_en') return { ...savedRecipe, servings: 2, ingredients: [{ ...savedRecipe.ingredients[0], name: 'Flour', quantity: 200 }] }
      if (path === '/api/x/core-shortlist') return []
      throw new Error(`Unexpected GET ${path}`)
    } } as any, '/recipes/cake_en')
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('Chocolate cake'); expect(wrapper.find('.ingredient-item strong').text()).toBe('200')
    await wrapper.find('.btn-scaler-plus').trigger('click'); await wrapper.find('.btn-scaler-plus').trigger('click')
    expect(wrapper.find('.ingredient-item strong').text()).toBe('400')
  })
  it.each([
    { kind: 'missing IDs', ids: [undefined, undefined, undefined] },
    { kind: 'duplicate IDs', ids: ['same', 'same', 'same'] },
    { kind: 'unique IDs', ids: ['one', 'two', 'three'] },
  ])('keeps ingredient checks independent with $kind and resets on recipe navigation', async ({ ids }) => {
    const ingredients = ['Flour', 'Sugar', 'Flour'].map((name, index) => ({
      name, quantity: 100, unit: 'g', ...(ids[index] === undefined ? {} : { id: ids[index] }),
    }))
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', { get: async (path: string) => {
      if (path === '/api/recipes/cake_en' || path === '/api/recipes/other_en') return { ...savedRecipe, ingredients }
      return []
    } } as any, '/recipes/cake_en')
    wrappers.push(wrapper)
    const inputs = () => wrapper.findAll<HTMLInputElement>('.ingredient-item input[type=checkbox]')
    await inputs()[0].setValue(true)
    expect(inputs().map(input => input.element.checked)).toEqual([true, false, false])
    expect(wrapper.findAll('.ingredient-item label').map(label => label.classes().includes('struck'))).toEqual([true, false, false])
    await inputs()[2].setValue(true)
    await inputs()[0].setValue(false)
    expect(inputs().map(input => input.element.checked)).toEqual([false, false, true])
    await harness.router.push('/recipes/other_en')
    await flushPromises()
    expect(inputs().map(input => input.element.checked)).toEqual([false, false, false])
  })
  it('renders the real empty-state intents and navigates to manual creation', async () => {
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', { get: async (path: string) => path === '/api/recipes' ? { items: [], total: 0, limit: 50, offset: 0 } : [] } as any, '/recipes')
    wrappers.push(wrapper)
    expect(wrapper.find('input[type=search]').exists()).toBe(true); expect(wrapper.text()).toContain('No recipes found')
    await clickButton('Add your first recipe')
    expect(harness.router.currentRoute.value.path).toBe('/recipes/new')
    expect(wrapper.text()).toContain('New Recipe')
  })
  it('saves a manual draft through the route and navigates to its detail', async () => {
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', {
      post: async (path: string, body: any) => { expect(path).toBe('/api/recipes'); expect(body.title).toBe('Manual cake'); expect(body.language).toBe('en'); return { ...savedRecipe, title: 'Manual cake' } },
      get: async (path: string) => path === '/api/recipes/cake_en' ? { ...savedRecipe, title: 'Manual cake' } : [],
    } as any, '/recipes/new')
    wrappers.push(wrapper); await wrapper.find('.input-title').setValue('Manual cake'); await clickButton('Save Recipe')
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_en'); expect(wrapper.text()).toContain('Manual cake')
  })
  it('keeps entered values and explains a failed manual save', async () => {
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', { post: async () => { throw new Error('Recipe write failed') } } as any, '/recipes/new')
    wrappers.push(wrapper); await wrapper.find('.input-title').setValue('Unsaved cake'); await clickButton('Save Recipe')
    expect(wrapper.text()).toContain('Recipe write failed'); expect((wrapper.find('.input-title').element as HTMLInputElement).value).toBe('Unsaved cake'); expect(harness.router.currentRoute.value.path).toBe('/recipes/new')
  })
  it('fetches covers and shows images by default on recipe list', async () => {
    localStorage.clear()
    const assetGetCalls: any[] = []
    const { wrapper } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string, params: any) => {
        if (path === '/api/recipes') return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
        if (path === '/api/x/core-shortlist') return []
        if (path === '/api/assets') {
          assetGetCalls.push(params)
          return [{ id: 'asset-1', slot: 'cover' }]
        }
        return []
      },
    } as any, '/recipes')
    wrappers.push(wrapper)
    await flushPromises()
    expect(assetGetCalls.length).toBeGreaterThan(0)
    expect(wrapper.find('.cover-image').exists()).toBe(true)
  })
  it('skips fetching covers and hides cover images on recipe list when disabled', async () => {
    localStorage.setItem('secretsauce:show_recipe_images', 'false')
    const assetGetCalls: any[] = []
    const { wrapper } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string, params: any) => {
        if (path === '/api/recipes') return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
        if (path === '/api/x/core-shortlist') return []
        if (path === '/api/assets') {
          assetGetCalls.push(params)
          return [{ id: 'asset-1', slot: 'cover' }]
        }
        return []
      },
    } as any, '/recipes')
    wrappers.push(wrapper)
    await flushPromises()
    expect(assetGetCalls.length).toBe(0)
    expect(wrapper.find('.cover-image').exists()).toBe(false)
  })
})

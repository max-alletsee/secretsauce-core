import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'
import { registeredRoute, savedRecipe, clickButton, openProvider } from '../helpers/registeredPlugin'
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

  it('renders source attribution on detail page and filters recipe list when clicking source name', async () => {
    const listQueries: any[] = []
    const bookRecipe = {
      ...savedRecipe,
      id: 'eggplant_en',
      group_id: 'eggplant',
      title: 'Roasted Eggplant',
      source: { type: 'cookbook', name: 'Simple', author: 'Yotam Ottolenghi', page: '142' },
    }
    const webRecipe = {
      ...savedRecipe,
      id: 'ravioli_en',
      group_id: 'ravioli',
      title: 'Skillet Ravioli',
      source: { type: 'website', name: 'Smitten Kitchen', url: 'https://smittenkitchen.com/ravioli' },
    }
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string, params: any) => {
        if (path === '/api/recipes/eggplant_en') return bookRecipe
        if (path === '/api/recipes/ravioli_en') return webRecipe
        if (path === '/api/recipes/sources') {
          return {
            items: [
              { name: 'Simple', type: 'cookbook', author: 'Yotam Ottolenghi', count: 1 },
              { name: 'Smitten Kitchen', type: 'website', author: null, count: 1 },
            ],
          }
        }
        if (path === '/api/recipes') {
          listQueries.push(params)
          if (params?.source?.includes('Simple')) {
            return { items: [bookRecipe], total: 1, limit: 50, offset: 0 }
          }
          return { items: [bookRecipe, webRecipe], total: 2, limit: 50, offset: 0 }
        }
        return []
      },
    } as any, '/recipes/eggplant_en')
    wrappers.push(wrapper)

    expect(wrapper.find('.recipe-source-attribution').text()).toContain('Simple')
    expect(wrapper.find('.recipe-source-attribution').text()).toContain('p. 142')
    expect(wrapper.find('.recipe-source-attribution').text()).toContain('Yotam Ottolenghi')

    await harness.router.push('/recipes/ravioli_en')
    await flushPromises()
    const extLink = wrapper.find('.source-external-link')
    expect(extLink.exists()).toBe(true)
    expect(extLink.attributes('href')).toBe('https://smittenkitchen.com/ravioli')

    await harness.router.push('/recipes/eggplant_en')
    await flushPromises()
    await wrapper.find('.source-filter-link').trigger('click')
    await flushPromises()

    expect(harness.router.currentRoute.value.path).toBe('/recipes')
    expect(listQueries.at(-1)).toEqual({ q: '', source: ['Simple'] })
    expect(wrapper.findAll('.recipe-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Roasted Eggplant')
  })

  it('saves structured source from RecipeEditPage and clears it when removed', async () => {
    const patches: any[] = []
    const existing = {
      ...savedRecipe,
      source: { type: 'cookbook', name: 'Simple', author: 'Yotam Ottolenghi', page: '142' },
    }
    const { wrapper } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string) => {
        if (path === '/api/recipes/cake_en') return existing
        if (path === '/api/recipes/sources') return { items: [{ name: 'Simple', type: 'cookbook', author: 'Yotam Ottolenghi', count: 1 }] }
        return []
      },
      patch: async (path: string, body: any) => {
        patches.push({ path, body })
        return { ...existing, ...body }
      },
    } as any, '/recipes/cake_en/edit')
    wrappers.push(wrapper)

    expect((wrapper.find('#recipe-source-name').element as HTMLInputElement).value).toBe('Simple')
    expect((wrapper.find('#recipe-source-page').element as HTMLInputElement).value).toBe('142')

    await wrapper.find('#recipe-source-page').setValue('145')
    await clickButton('Save Recipe')
    expect(patches).toHaveLength(1)
    expect(patches[0].body.source).toEqual({
      type: 'cookbook',
      name: 'Simple',
      author: 'Yotam Ottolenghi',
      page: '145',
    })
  })

  it('deletes a recipe from RecipeDetailPage Actions menu after confirmation and cancels cleanly', async () => {
    const deletes: string[] = []
    let listed = [savedRecipe]
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string) => {
        if (path === '/api/recipes/cake_en') return savedRecipe
        if (path === '/api/recipes') return { items: listed, total: listed.length, limit: 50, offset: 0 }
        return []
      },
      delete: async (path: string) => {
        deletes.push(path)
        listed = []
      },
    } as any, '/recipes/cake_en')
    wrappers.push(wrapper)

    // Cancel leaves recipe untouched
    await openProvider(wrapper, 'Delete')
    const dialog = document.querySelector('[role=alertdialog], .p-confirmdialog')!
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain("Delete 'Chocolate cake'?")
    expect(dialog.textContent).toContain('Timeline history')
    await clickButton('Cancel', document)
    expect(deletes).toEqual([])
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_en')

    // Accept deletes the entire recipe group and navigates to /recipes
    await openProvider(wrapper, 'Delete')
    await clickButton('Delete', document)
    await flushPromises()
    expect(deletes).toEqual(['/api/recipes/cake'])
    expect(harness.router.currentRoute.value.path).toBe('/recipes')
    expect(harness.notifications).toContainEqual({ level: 'success', message: 'Recipe deleted' })
  })

  it('mentions all language versions in confirmation when deleting a multi-language recipe', async () => {
    const multiLang = { ...savedRecipe, languages: ['en', 'de'] }
    const { wrapper } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string) => path === '/api/recipes/cake_en' ? multiLang : [],
      delete: async () => {},
    } as any, '/recipes/cake_en')
    wrappers.push(wrapper)

    await openProvider(wrapper, 'Delete')
    const dialog = document.querySelector('[role=alertdialog], .p-confirmdialog')!
    expect(dialog.textContent).toContain("Delete 'Chocolate cake' and all 2 language versions (EN, DE)?")
    await clickButton('Cancel', document)
  })

  it('shows Delete Recipe button only on existing recipes in RecipeEditPage and handles errors', async () => {
    const deletes: string[] = []
    let failDelete = true
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string) => {
        if (path === '/api/recipes/cake_en') return savedRecipe
        if (path === '/api/recipes') return { items: [], total: 0, limit: 50, offset: 0 }
        return []
      },
      delete: async (path: string) => {
        if (failDelete) throw new Error('Network unavailable')
        deletes.push(path)
      },
    } as any, '/recipes/new')
    wrappers.push(wrapper)

    expect(wrapper.findAll('button').some(b => b.text().includes('Delete Recipe'))).toBe(false)

    await harness.router.push('/recipes/cake_en/edit')
    await flushPromises()
    expect(wrapper.findAll('button').some(b => b.text().includes('Delete Recipe'))).toBe(true)

    // Failed delete keeps user on edit page and displays error
    await clickButton('Delete Recipe')
    await clickButton('Delete', document)
    await flushPromises()
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_en/edit')
    expect(wrapper.text()).toContain('Network unavailable')

    // Successful delete navigates to /recipes
    failDelete = false
    await clickButton('Delete Recipe')
    await clickButton('Delete', document)
    await flushPromises()
    expect(deletes).toEqual(['/api/recipes/cake'])
    expect(harness.router.currentRoute.value.path).toBe('/recipes')
  })

  it('reacts to remote recipe:deleted events on list, detail, and edit pages', async () => {
    let listCalls = 0
    let sourceCalls = 0
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string) => {
        if (path === '/api/recipes') { listCalls++; return { items: [savedRecipe], total: 1, limit: 50, offset: 0 } }
        if (path === '/api/recipes/sources') { sourceCalls++; return { items: [] } }
        if (path === '/api/recipes/cake_en') return savedRecipe
        return []
      },
    } as any, '/recipes')
    wrappers.push(wrapper)

    const initialListCalls = listCalls
    const initialSourceCalls = sourceCalls
    harness.emitStream('recipe:deleted', { kind: 'event', seq: 10, name: 'recipe:deleted', entity_type: 'recipe', entity_id: 'cake_en', revision: 1, actor_member_id: null, origin: 'member', created_at: '2026-10-01T00:00:00Z' })
    await flushPromises()
    expect(listCalls).toBeGreaterThan(initialListCalls)
    expect(sourceCalls).toBeGreaterThan(initialSourceCalls)

    // Detail view redirects away on remote deletion
    await harness.router.push('/recipes/cake_en')
    await flushPromises()
    harness.emitStream('recipe:deleted', { kind: 'event', seq: 11, name: 'recipe:deleted', entity_type: 'recipe', entity_id: 'cake_en', revision: 1, actor_member_id: null, origin: 'member', created_at: '2026-10-01T00:00:00Z' })
    await flushPromises()
    expect(harness.router.currentRoute.value.path).toBe('/recipes')
    expect(harness.notifications).toContainEqual({ level: 'info', message: 'This recipe was deleted' })

    // Edit view keeps user on page with warning banner and disables Save/Delete
    await harness.router.push('/recipes/cake_en/edit')
    await flushPromises()
    await wrapper.find('.input-title').setValue('Unsaved edits')
    harness.emitStream('recipe:deleted', { kind: 'event', seq: 12, name: 'recipe:deleted', entity_type: 'recipe', entity_id: 'cake_en', revision: 1, actor_member_id: null, origin: 'member', created_at: '2026-10-01T00:00:00Z' })
    await flushPromises()
    expect(harness.router.currentRoute.value.path).toBe('/recipes/cake_en/edit')
    expect(wrapper.text()).toContain('This recipe was deleted in another session')
    expect((wrapper.find('.input-title').element as HTMLInputElement).value).toBe('Unsaved edits')
    const saveBtn = wrapper.findAll('button').find(b => b.text().includes('Save Recipe'))!
    expect(saveBtn.attributes('disabled')).toBeDefined()
  })

  it('displays household tag counts from /api/recipes/tags, filters server-side, and refreshes on recipe events', async () => {
    localStorage.clear()
    const listQueries: any[] = []
    let tagCalls = 0
    let currentTags = [
      { name: 'Weeknight', count: 55 },
      { name: 'Quick', count: 12 },
    ]
    const weeknightRecipe = { ...savedRecipe, id: 'r1_en', group_id: 'r1', title: 'Weeknight Stir Fry', tags: ['Weeknight'] }
    const quickRecipe = { ...savedRecipe, id: 'r2_en', group_id: 'r2', title: 'Quick Salad', tags: ['Quick'] }
    const { wrapper, harness } = await registeredRoute(activate, 'core-recipes', {
      get: async (path: string, params: any) => {
        if (path === '/api/recipes/tags') {
          tagCalls++
          return { items: currentTags }
        }
        if (path === '/api/recipes/sources') return { items: [] }
        if (path === '/api/x/core-shortlist') return []
        if (path === '/api/recipes') {
          listQueries.push(params)
          if (params?.tag === 'Quick') return { items: [quickRecipe], total: 1, limit: 50, offset: 0 }
          return { items: [weeknightRecipe], total: 55, limit: 50, offset: 0 }
        }
        return []
      },
    } as any, '/recipes')
    wrappers.push(wrapper)

    const tagButtons = wrapper.findAll('.tag-filter-btn')
    expect(tagButtons.map(b => b.text())).toEqual(['Weeknight (55)', 'Quick (12)'])
    expect(tagButtons[0].attributes('aria-pressed')).toBe('false')

    // Selecting a tag triggers server-side filtering and sets aria-pressed
    await tagButtons[1].trigger('click')
    await flushPromises()
    expect(listQueries.at(-1)).toEqual({ q: '', tag: 'Quick' })
    expect(wrapper.findAll('.tag-filter-btn')[1].attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Quick Salad')

    // Clicking again clears the server-side tag filter
    await wrapper.findAll('.tag-filter-btn')[1].trigger('click')
    await flushPromises()
    expect(listQueries.at(-1)).toEqual({ q: '' })

    // Live recipe:created / recipe:updated events refresh tags & counts
    const callsBefore = tagCalls
    currentTags = [
      { name: 'Weeknight', count: 56 },
      { name: 'Quick', count: 12 },
    ]
    harness.emitStream('recipe:updated', { kind: 'event', seq: 20, name: 'recipe:updated', entity_type: 'recipe', entity_id: 'r1_en', revision: 2, actor_member_id: null, origin: 'member', created_at: '2026-10-01T00:00:00Z' })
    await flushPromises()
    expect(tagCalls).toBeGreaterThan(callsBefore)
    expect(wrapper.findAll('.tag-filter-btn').map(b => b.text())).toEqual(['Weeknight (56)', 'Quick (12)'])
  })
})

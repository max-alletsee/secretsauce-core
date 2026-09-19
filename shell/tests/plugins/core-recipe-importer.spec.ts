import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImportRecipeModal from '../../../secretsauce/plugins/core/core-recipe-importer/ui/src/ImportRecipeModal.vue'
import activate from '../../../secretsauce/plugins/core/core-recipe-importer/ui/src/index'

describe('core-recipe-importer UI', () => {
  it('extracts recipe from URL and allows saving', async () => {
    const mockExtracted = {
      title: 'Decadent Chocolate Cake',
      servings: 6,
      ingredients: [{ name: 'Cocoa', quantity: 100, unit: 'g', raw_text: '100g cocoa' }],
      steps: [{ instruction: 'Mix and bake' }],
    }

    const mockApi = {
      post: vi.fn((url: string, payload: any) => {
        if (url.includes('/parse-url')) {
          return Promise.resolve(mockExtracted)
        }
        if (url === '/api/recipes') {
          return Promise.resolve({ id: 'new-recipe-123' })
        }
        return Promise.resolve({})
      }),
    }
    const mockNotify = vi.fn()

    const wrapper = mount(ImportRecipeModal, {
      props: {
        isOpen: true,
        ss: { api: mockApi, notify: mockNotify },
      },
    })

    // Input URL
    const input = wrapper.find('input.input-url')
    await input.setValue('https://recipes.example.com/cake')

    // Click extract
    const extractBtn = wrapper.find('button.btn-extract')
    await extractBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/x/core-recipe-importer/parse-url',
      expect.objectContaining({ url: 'https://recipes.example.com/cake' })
    )

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    // Preview shown
    expect(wrapper.text()).toContain('Decadent Chocolate Cake')
    expect(wrapper.text()).toContain('100g cocoa')

    // Click Save
    const saveBtn = wrapper.find('button.btn-save')
    expect(saveBtn.exists()).toBe(true)
    await saveBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({ title: 'Decadent Chocolate Cake' }))
    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('saved')![0]).toEqual(['new-recipe-123'])
  })

  it('activator registers recipe:create intent provider', () => {
    const mockSS = {
      intent: {
        provider: vi.fn(),
      },
      slot: vi.fn(),
    }

    activate(mockSS)
    expect(mockSS.intent.provider).toHaveBeenCalledWith(
      expect.objectContaining({
        hub: 'recipe:create',
        id: 'ai-import',
      })
    )
  })
})

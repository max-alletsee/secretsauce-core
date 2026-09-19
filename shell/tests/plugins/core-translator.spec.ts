import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TranslateAction from '../../../secretsauce/plugins/core/core-translator/ui/src/TranslateAction.vue'
import activate from '../../../secretsauce/plugins/core/core-translator/ui/src/index'

describe('core-translator UI', () => {
  it('opens dialog, triggers translation, and emits translated event', async () => {
    const mockTranslatedRecipe = {
      id: 'r-1_es',
      group_id: 'grp-1',
      language: 'es',
      title: 'Tacos Al Pastor',
    }

    const mockApi = {
      post: vi.fn().mockResolvedValue(mockTranslatedRecipe),
    }
    const mockNotify = vi.fn()

    const wrapper = mount(TranslateAction, {
      props: {
        recipe: { id: 'r-1', title: 'Tacos Al Pastor' },
        ss: { api: mockApi, notify: mockNotify },
      },
    })

    // Open modal
    const openBtn = wrapper.find('button.btn-open-translate')
    expect(openBtn.exists()).toBe(true)
    await openBtn.trigger('click')

    expect(wrapper.text()).toContain('Translate Recipe')

    // Select language
    const select = wrapper.find('select.select-target-lang')
    await select.setValue('es')

    // Submit translation
    const submitBtn = wrapper.find('button.btn-do-translate')
    await submitBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/x/core-translator/translate', {
      recipe_id: 'r-1',
      target_language: 'es',
    })

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(wrapper.emitted('translated')).toBeTruthy()
    expect(wrapper.emitted('translated')![0]).toEqual([mockTranslatedRecipe])
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'success' })
    )
  })

  it('activates and registers slots and intent providers', () => {
    const mockSS = {
      slot: vi.fn(),
      intent: {
        provider: vi.fn(),
      },
    }

    activate(mockSS)
    expect(mockSS.slot).toHaveBeenCalledWith(
      'recipe.card.actions',
      TranslateAction,
      expect.objectContaining({ order: 30 })
    )
    expect(mockSS.intent.provider).toHaveBeenCalledWith(
      expect.objectContaining({ hub: 'recipe:actions', id: 'ai-translate' })
    )
  })
})

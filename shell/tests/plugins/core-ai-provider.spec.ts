import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AiSettings from '../../../secretsauce/plugins/core/core-ai-provider/ui/src/AiSettings.vue'
import activate from '../../../secretsauce/plugins/core/core-ai-provider/ui/src/index'

describe('core-ai-provider UI', () => {
  it('loads settings and usage stats on mount', async () => {
    const mockApi = {
      get: vi.fn((url: string) => {
        if (url.includes('/settings')) {
          return Promise.resolve({
            provider: 'gemini',
            model: 'gemini-3.8-flash',
            enforce_budget: true,
            monthly_budget: 15.0,
            gemini_api_key: '••••••••',
          })
        }
        if (url.includes('/usage')) {
          return Promise.resolve({
            total_cost_usd: 1.2345,
            month_cost_usd: 0.5432,
            total_input_tokens: 15000,
            total_output_tokens: 5000,
            breakdown_by_plugin: [{ calling_plugin: 'core-recipe-importer', cost: 0.5, call_count: 5 }],
          })
        }
        return Promise.resolve({})
      }),
      put: vi.fn().mockResolvedValue({}),
    }

    const wrapper = mount(AiSettings, {
      props: {
        ss: { api: mockApi },
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(mockApi.get).toHaveBeenCalledWith('/api/x/core-ai-provider/settings')
    expect(mockApi.get).toHaveBeenCalledWith('/api/x/core-ai-provider/usage')

    // Check rendered stats
    expect(wrapper.text()).toContain('0.5432')
    expect(wrapper.find('select.provider-select').element.value).toBe('gemini')
    expect(wrapper.find('input.model-input').element.value).toBe('gemini-3.8-flash')
  })

  it('saves updated settings on button click', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({
        provider: 'openai',
        model: 'gpt-4o',
        enforce_budget: false,
        monthly_budget: 25.0,
      }),
    }
    const mockNotify = vi.fn()

    const wrapper = mount(AiSettings, {
      props: {
        ss: { api: mockApi, notify: mockNotify },
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.find('button.save-btn').trigger('click')

    expect(mockApi.put).toHaveBeenCalledWith(
      '/api/x/core-ai-provider/settings',
      expect.objectContaining({
        provider: 'gemini',
        model: 'gemini-3.8-flash',
      })
    )
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ level: 'success' }))
  })

  it('activator registers settings section with core-ai-provider id', () => {
    const mockSS = {
      settings: {
        section: vi.fn(),
      },
    }

    activate(mockSS)
    expect(mockSS.settings.section).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'core-ai-provider',
        title: 'AI & Budget',
        component: AiSettings,
      })
    )
  })
})

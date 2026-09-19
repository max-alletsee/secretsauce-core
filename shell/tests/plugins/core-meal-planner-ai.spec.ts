import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MealPlannerWidget from '../../../secretsauce/plugins/core/core-meal-planner-ai/ui/src/MealPlannerWidget.vue'
import activate from '../../../secretsauce/plugins/core/core-meal-planner-ai/ui/src/index'

describe('core-meal-planner-ai UI', () => {
  it('generates candidates, accepts one, and dismisses one', async () => {
    const mockPlan = {
      id: 'plan-101',
      title: '7-Day Plan',
      suggestions: [
        {
          id: 'sug-1',
          recipe_id: 'rec-1',
          recipe_title: 'Mediterranean Salad',
          meal_type: 'dinner',
          reasoning: 'Fresh and light',
          confidence: 0.92,
          status: 'suggested',
        },
        {
          id: 'sug-2',
          recipe_id: 'rec-2',
          recipe_title: 'Hearty Lentil Stew',
          meal_type: 'dinner',
          reasoning: 'Warm and comforting',
          confidence: 0.85,
          status: 'suggested',
        },
      ],
    }

    const mockApi = {
      post: vi.fn((url: string, payload: any) => {
        if (url.includes('/generate')) {
          return Promise.resolve(mockPlan)
        }
        if (url.includes('/sug-1/accept')) {
          return Promise.resolve({ id: 'sug-1', status: 'accepted', schedule_entry_id: 'sched-1' })
        }
        if (url.includes('/sug-2/dismiss')) {
          return Promise.resolve({ id: 'sug-2', status: 'dismissed' })
        }
        return Promise.resolve({})
      }),
    }
    const mockNotify = vi.fn()

    const wrapper = mount(MealPlannerWidget, {
      props: {
        ss: { api: mockApi, notify: mockNotify },
      },
    })

    // Set input
    const promptInput = wrapper.find('input.input-prompt')
    await promptInput.setValue('Healthy and high protein')

    // Click Generate Pool
    const genBtn = wrapper.find('button.btn-generate')
    await genBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/x/core-meal-planner-ai/generate',
      expect.objectContaining({
        prompt: 'Healthy and high protein',
      })
    )

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    // Check suggestions rendered
    expect(wrapper.text()).toContain('Mediterranean Salad')
    expect(wrapper.text()).toContain('Hearty Lentil Stew')
    expect(wrapper.text()).toContain('92% match')

    // Accept first suggestion
    const acceptBtns = wrapper.findAll('button.btn-accept')
    expect(acceptBtns.length).toBe(2)
    await acceptBtns[0].trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/x/core-meal-planner-ai/suggestions/sug-1/accept',
      expect.objectContaining({ meal_type: 'dinner' })
    )

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(wrapper.text()).toContain('✓ Scheduled')
    expect(wrapper.emitted('scheduled')).toBeTruthy()

    // Dismiss second suggestion
    const dismissBtns = wrapper.findAll('button.btn-dismiss')
    expect(dismissBtns.length).toBeGreaterThan(0)
    await dismissBtns[dismissBtns.length - 1].trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/x/core-meal-planner-ai/suggestions/sug-2/dismiss')
  })

  it('activates and registers schedule slot and intent', () => {
    const mockSS = {
      slot: vi.fn(),
      intent: {
        provider: vi.fn(),
      },
    }

    activate(mockSS)
    expect(mockSS.slot).toHaveBeenCalledWith(
      'schedule.sidebar',
      MealPlannerWidget,
      expect.objectContaining({ order: 10 })
    )
    expect(mockSS.intent.provider).toHaveBeenCalledWith(
      expect.objectContaining({ hub: 'meal:plan', id: 'ai-planner' })
    )
  })
})

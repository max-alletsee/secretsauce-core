import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IntentTrigger from '../src/IntentTrigger.vue'

describe('<IntentTrigger /> component', () => {
  it('renders nothing when 0 providers are available', () => {
    const wrapper = mount(IntentTrigger, {
      props: { hub: 'recipe:create' },
      global: {
        provide: {
          __SS_INTENT_REGISTRY__: {
            getProviders: () => []
          }
        }
      }
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('runs directly on click when 1 provider is available', async () => {
    const execFn = vi.fn().mockReturnValue('done')
    const wrapper = mount(IntentTrigger, {
      props: { hub: 'recipe:create', context: { item: 1 } },
      global: {
        provide: {
          __SS_INTENT_REGISTRY__: {
            getProviders: () => [
              { hub: 'recipe:create', id: 'single', title: 'Create', kind: 'headless', execute: execFn, order: 10 }
            ]
          }
        }
      }
    })
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(execFn).toHaveBeenCalledWith({ item: 1 })
  })
})

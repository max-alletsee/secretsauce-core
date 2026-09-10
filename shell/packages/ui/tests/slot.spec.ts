import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import Slot from '../src/Slot.vue'

describe('<Slot /> component', () => {
  it('renders registered slot contributions in order with context prop', () => {
    const CompA = defineComponent({
      props: ['context'],
      render() { return h('div', { class: 'comp-a' }, `A: ${this.context.val}`) }
    })
    const CompB = defineComponent({
      props: ['context'],
      render() { return h('div', { class: 'comp-b' }, `B: ${this.context.val}`) }
    })

    const wrapper = mount(Slot, {
      props: {
        name: 'test.slot',
        context: { val: 42 }
      },
      global: {
        provide: {
          __SS_SLOT_REGISTRY__: {
            getContributions: (name: string) => {
              if (name === 'test.slot') {
                return [
                  { id: 'b', order: 20, component: CompB },
                  { id: 'a', order: 10, component: CompA }
                ]
              }
              return []
            }
          }
        }
      }
    })

    const divs = wrapper.findAll('div')
    expect(divs).toHaveLength(2)
    expect(divs[0].text()).toBe('A: 42') // order 10
    expect(divs[1].text()).toBe('B: 42') // order 20
  })
})

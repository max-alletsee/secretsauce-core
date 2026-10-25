import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IngredientRowList from '../../../secretsauce/plugins/core/core-recipes/ui/src/components/IngredientRowList.vue'
import StepList from '../../../secretsauce/plugins/core/core-recipes/ui/src/components/StepList.vue'
import RecipeCard from '../../../secretsauce/plugins/core/core-recipes/ui/src/components/RecipeCard.vue'

describe('Recipe Sub-Components', () => {
  it('IngredientRowList adds and modifies rows', async () => {
    const wrapper = mount(IngredientRowList, {
      props: {
        modelValue: [
          { id: '1', quantity: 2, unit: 'cup', name: 'Flour', notes: 'all-purpose' },
        ],
      },
    })

    expect(wrapper.findAll('.ingredient-row')).toHaveLength(1)
    await wrapper.find('button.btn-add-ingredient').trigger('click')
    expect(wrapper.emitted('update:modelValue')![0][0]).toHaveLength(2)
  })

  it('StepList adds instructions with optional timer', async () => {
    const wrapper = mount(StepList, {
      props: {
        modelValue: [
          { id: '1', instruction: 'Chop onions', timer_minutes: null },
        ],
      },
    })

    expect(wrapper.findAll('.step-row')).toHaveLength(1)
    await wrapper.find('button.btn-add-step').trigger('click')
    expect(wrapper.emitted('update:modelValue')![0][0]).toHaveLength(2)
  })

  it('RecipeCard renders title, time, tags, and card.actions slot', () => {
    const wrapper = mount(RecipeCard, {
      props: {
        recipe: {
          id: 'r1_en',
          title: 'Lemon Cake',
          prep_time_minutes: 15,
          cook_time_minutes: 45,
          tags: ['dessert', 'baking'],
        },
      },
      global: {
        stubs: {
          Slot: {
            template: '<div class="card-actions-slot"><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Lemon Cake')
    expect(wrapper.text()).toContain('15m prep')
    expect(wrapper.text()).toContain('45m cook')
    expect(wrapper.text()).toContain('dessert')
    expect(wrapper.find('.card-actions-slot').exists()).toBe(true)
    expect(wrapper.find('.cover-image').exists()).toBe(true)
  })

  it('RecipeCard hides cover image when showCover is false', () => {
    const wrapper = mount(RecipeCard, {
      props: {
        recipe: {
          id: 'r1_en',
          title: 'Lemon Cake',
          prep_time_minutes: 15,
          cook_time_minutes: 45,
          tags: ['dessert'],
          cover_asset_id: 'asset_1',
        },
        showCover: false,
      },
      global: {
        stubs: {
          Slot: {
            template: '<div class="card-actions-slot"><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Lemon Cake')
    expect(wrapper.find('.cover-image').exists()).toBe(false)
  })
})

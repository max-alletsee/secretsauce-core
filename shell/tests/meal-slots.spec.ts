import { describe, it, expect, afterEach } from 'vitest'
import { type VueWrapper } from '@vue/test-utils'
import { mountWithUi } from './helpers/mountWithUi'
import { clickButton } from './helpers/registeredPlugin'
import { slugMealType } from '../src/settings/mealSlots'
import MealSlotEditor from '../src/settings/MealSlotEditor.vue'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })

describe('default meal slots', () => {
  it.each([
    ['Breakfast', [], 'breakfast'], ['Sunday Brunch', [], 'sunday-brunch'], [' Lunch! ', ['lunch', 'lunch-2'], 'lunch-3'], ['晚餐', [], 'slot'], ['---', ['slot'], 'slot-2'],
    ['x'.repeat(80), [], 'x'.repeat(64)], ['x'.repeat(80), ['x'.repeat(64)], `${'x'.repeat(62)}-2`],
  ])('slugs %s with existing ids %s as %s', (label, ids, expected) => {
    expect(slugMealType(label as string, ids as string[])).toBe(expected)
  })
  it('slot_slug_collisions_and_renames_preserve_identity', async () => {
    const wrapper = mountWithUi(MealSlotEditor, { props: { modelValue: [{ id: 'dinner', label: 'Dinner' }], 'onUpdate:modelValue': (slots: any) => wrapper.setProps({ modelValue: slots }) }, attachTo: document.body })
    wrappers.push(wrapper)
    await wrapper.find('#slot-label-dinner').setValue('Evening meal')
    expect(wrapper.props('modelValue')).toEqual([{ id: 'dinner', label: 'Evening meal' }])
    expect(wrapper.find('button[aria-label="Remove Evening meal"]').attributes('disabled')).toBeDefined()
    await clickButton('Add slot')
    const input = document.querySelector<HTMLInputElement>('#new-slot-name')!; input.value = 'Lunch'; input.dispatchEvent(new Event('input'))
    await clickButton('Add')
    expect(wrapper.props('modelValue')).toEqual([{ id: 'dinner', label: 'Evening meal' }, { id: 'lunch', label: 'Lunch' }])
    await clickButton('Move Lunch up')
    expect(wrapper.props('modelValue')).toEqual([{ id: 'lunch', label: 'Lunch' }, { id: 'dinner', label: 'Evening meal' }])
    await clickButton('Remove Evening meal')
    expect(wrapper.props('modelValue')).toEqual([{ id: 'lunch', label: 'Lunch' }])
  })
})

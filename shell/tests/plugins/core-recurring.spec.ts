import { it, expect, vi, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recurring/ui/src/index'
import { registeredSlot, clickButton, savedRecipe, testMember } from '../helpers/registeredPlugin'
import { pluginHarness } from '../helpers/pluginHarness'
import activateTimeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'

const wrappers: VueWrapper[] = []
afterEach(() => {
  wrappers.splice(0).forEach((w) => w.unmount())
  document.body.innerHTML = ''
})

it('does not register repeat-weekly intent or settings section', () => {
  const harness = pluginHarness({ get: async () => [] } as any)
  activateTimeline(harness.ss('core-timeline'))
  activate(harness.ss('core-recurring'))
  expect(harness.intents.getProviders('entry:interact').find((p) => p.id === 'repeat-weekly')).toBeUndefined()
  expect(harness.settings.getSections().find((s) => s.id === 'core-recurring')).toBeUndefined()
  expect(harness.slots.getContributions('timeline.sidebar').some((c) => c.pluginId === 'core-recurring')).toBe(true)
  expect(harness.slots.getContributions('timeline.slot.suggestions').some((c) => c.pluginId === 'core-recurring')).toBe(true)
})

it('creates a recipe rule and a note rule with household member servings default, edits, and retains a rejected draft', async () => {
  let reject = true
  const rules: any[] = []
  const calls: any[] = []
  const api = {
    get: async (path: string, query: any) => {
      if (path === '/api/x/core-recurring/rules') return [...rules]
      if (path === '/api/x/core-recurring/suggestions') return []
      if (path === '/api/x/core-shortlist') return []
      if (path === '/api/recipes') return { items: [savedRecipe], total: 1, limit: 50, offset: 0 }
      throw new Error(`Unexpected GET ${path}`)
    },
    post: async (path: string, body: any) => {
      calls.push(['POST', path, body])
      if (reject) throw new Error('Could not save rule')
      const rule = {
        id: `rule-${rules.length + 1}`,
        ...body,
        recipe_title: body.recipe_id ? savedRecipe.title : null,
        title: body.recipe_id ? savedRecipe.title : body.title,
      }
      rules.push(rule)
      return rule
    },
    put: async (path: string, body: any) => {
      calls.push(['PUT', path, body])
      const updated = {
        ...rules[0],
        ...body,
        recipe_title: body.recipe_id ? savedRecipe.title : null,
        title: body.recipe_id ? savedRecipe.title : body.title,
      }
      rules[0] = updated
      return updated
    },
  }

  const { wrapper, harness } = registeredSlot(activate, 'core-recurring', api, 'timeline.sidebar')
  harness.householdStore.household.meal_types = [{ id: 'dinner', label: 'Dinner', predefined_notes: ['Takeout'] }]
  harness.memberStore.setMembers([
    { ...testMember, id: 'm1', serving_ratio: 1.5 },
    { ...testMember, id: 'm2', name: 'Bob', serving_ratio: 2.0 },
  ])
  await flushPromises()
  wrappers.push(wrapper)

  await clickButton('Add recurring meal')
  const dialog = document.querySelector('[role=dialog]')!
  expect(dialog).toBeTruthy()
  // Select recipe
  await clickButton('Select', dialog)
  await clickButton('Add recurring meal', dialog)
  expect(dialog.textContent).toContain('Could not save rule')
  expect(dialog.textContent).toContain('Chocolate cake')

  reject = false
  await clickButton('Add recurring meal', dialog)
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(wrapper.text()).toContain('Every Monday · Dinner · Chocolate cake (3.5 servings)')

  // Edit the rule to a Note rule using quick note
  await clickButton('Edit', wrapper.element)
  const editDialog = document.querySelector('[role=dialog]')!
  const noteTab = Array.from(editDialog.querySelectorAll('[role=tab]')).find((t) => t.textContent?.trim() === 'Note') as HTMLElement
  noteTab.click()
  await flushPromises()
  await clickButton('Takeout', editDialog)
  await clickButton('Save recurring meal', editDialog)
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(wrapper.text()).toContain('Every Monday · Dinner · Takeout (3.5 servings)')

  expect(calls).toEqual([
    ['POST', '/api/x/core-recurring/rules', { weekday: 0, meal_type: 'dinner', entry_type: 'recipe', recipe_id: 'cake_en', servings: 3.5 }],
    ['POST', '/api/x/core-recurring/rules', { weekday: 0, meal_type: 'dinner', entry_type: 'recipe', recipe_id: 'cake_en', servings: 3.5 }],
    ['PUT', '/api/x/core-recurring/rules/rule-1', { weekday: 0, meal_type: 'dinner', entry_type: 'note', title: 'Takeout', servings: 3.5 }],
  ])
})

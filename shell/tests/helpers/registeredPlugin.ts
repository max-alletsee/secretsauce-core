import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { IntentTrigger, Slot } from '@secretsauce/ui'
import { pluginHarness } from './pluginHarness'
import { mountWithUi } from './mountWithUi'
import activateRecipes from '../../../secretsauce/plugins/core/core-recipes/ui/src/index'
import SettingsPage from '../../src/pages/SettingsPage.vue'
import { registerShellSettings } from '../../src/settings'

/** Mount the real registry consumer, never the plugin's unwrapped implementation. */
export function registeredIntent(activate: (ss: any) => void, pluginId: string, api: any, hub: string, context: any = {}) {
  const harness = pluginHarness(api)
  if (hub.startsWith('recipe:')) activateRecipes(harness.ss('core-recipes'))
  activate(harness.ss(pluginId))
  const wrapper = mountWithUi(IntentTrigger, { props: { hub, context }, attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia] } })
  return { harness, wrapper }
}
export function registeredSlot(activate: (ss: any) => void, pluginId: string, api: any, name: string, context: any = {}) {
  const harness = pluginHarness(api)
  activate(harness.ss(pluginId))
  const wrapper = mountWithUi(Slot, { props: { name, context }, attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia] } })
  return { harness, wrapper }
}
export async function registeredRoute(activate: (ss: any) => void, pluginId: string, api: any, path: string) {
  const harness = pluginHarness(api)
  activate(harness.ss(pluginId))
  if (path.startsWith('/settings')) {
    const section = harness.settings.getSections().find(section => section.pluginId === pluginId)
    registerShellSettings(harness.settings)
    harness.router.addRoute({ path: '/settings', component: SettingsPage })
    if (!path.includes('?') && section) path += `?section=${section.id}`
  }
  await harness.router.push(path)
  await harness.router.isReady()
  const { RouterView } = await import('vue-router')
  const wrapper = mountWithUi(defineComponent({ setup: () => () => h(RouterView) }), { attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia, harness.router] } })
  await flushPromises()
  return { harness, wrapper }
}
export async function openProvider(wrapper: any, label: string) {
  await wrapper.find('button.ss-intent-trigger').trigger('click')
  await flushPromises()
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => item.textContent?.includes(label))
  if (item) { item.querySelector<HTMLElement>('a')!.click(); await flushPromises() }
}
export async function clickButton(label: string, root: ParentNode = document) {
  await flushPromises()
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === label || button.getAttribute('aria-label') === label)
  if (!button) throw new Error(`Missing button: ${label}`)
  button.click()
  await flushPromises()
}
export const testMember = { id: 'member-1', revision: 1, name: 'Ann', avatar_color: null, serving_ratio: 1, dietary_restrictions: [], allergies: [], disliked_ingredients: [], favorite_cuisines: [], preferred_language: 'en' }
export const recipeDraft = { title: 'Chocolate cake', description: 'A rich cake', servings: 6, prep_time_minutes: 10, cook_time_minutes: 30, language: 'en', tags: ['cake'], ingredients: [{ name: 'Cocoa', quantity: 100, quantity_max: null, unit: 'g', raw_text: '100g cocoa' }], steps: [{ instruction: 'Mix and bake' }] }
// Fields checked against RecipesRepo serialization and the real importer/translator routes.
export const savedRecipe = { ...recipeDraft, id: 'cake_en', group_id: 'cake', revision: 1, origin: 'manual', created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z', languages: ['en'], attributes: {}, ingredients: [{ ...recipeDraft.ingredients[0], id: 'ingredient-1', order: 0, notes: null }], steps: [{ ...recipeDraft.steps[0], id: 'step-1', order: 0, timer_minutes: null }] }

import { describe, it, expect, vi, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { ConflictError } from '@secretsauce/ui'
import activate from '../../../secretsauce/plugins/core/core-members/ui/src/index'
import { registeredRoute, testMember, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = ''; localStorage.clear() })
async function settings(api: any) {
  const result = await registeredRoute(activate, 'core-members', api, '/settings')
  wrappers.push(result.wrapper)
  result.harness.memberStore.setMembers([testMember])
  result.harness.householdStore.household.languages = { primary: 'pt', translations: ['sv', 'en'] }
  await flushPromises()
  return result
}
function input(id: string, value: string) {
  const el = document.querySelector<HTMLInputElement>(`#${id}`)!
  el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); return el
}
describe('member dialog through registered Settings (API boundary doubles)', () => {
  it('edits preferences with a revision and updates the selected member and card', async () => {
    const saved = { ...testMember, revision: 2, name: 'Anna', serving_ratio: 1.75, allergies: ['peanut'] }
    const api = { patch: vi.fn(async () => saved) }
    const { harness, wrapper } = await settings(api)
    expect(wrapper.find('button[aria-label="Delete Ann"]').attributes('disabled')).toBeDefined()
    await clickButton('Edit Ann')
    input('member-name', 'Anna')
    const portion = input('member-serving', '1.75'); portion.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); portion.dispatchEvent(new Event('blur'))
    const allergy = input('member-allergies', 'peanut'); allergy.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); await flushPromises()
    expect(document.querySelectorAll('[data-pc-name=autocomplete]')).toHaveLength(4)
    expect(document.querySelector('input[type=color]')).toBeNull()
    await clickButton('Save Member')
    expect(api.patch).toHaveBeenCalledWith('/api/members/member-1', expect.objectContaining({ revision: 1, name: 'Anna', allergies: ['peanut'], serving_ratio: 1.75, disliked_ingredients: [], favorite_cuisines: [] }))
    expect(harness.store.currentMember.value).toEqual(saved)
    expect(wrapper.text()).toContain('1.75×'); expect(wrapper.text()).toContain('peanut')
  })
  it('member_conflict_reloads_current_revision_without_overwriting', async () => {
    const current = { ...testMember, name: 'Concurrent Ann', revision: 2, allergies: ['peanut'], serving_ratio: 2 }
    const api = { patch: vi.fn().mockRejectedValueOnce(new ConflictError('Revision mismatch', current)).mockResolvedValueOnce({ ...current, revision: 3 }) }
    const { harness } = await settings(api)
    await clickButton('Edit Ann'); input('member-name', 'Stale edit'); await clickButton('Save Member')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Someone else changed this member')
    expect((document.querySelector('#member-name') as HTMLInputElement).value).toBe('Concurrent Ann')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('peanut')
    await clickButton('Save Member')
    expect(api.patch).toHaveBeenLastCalledWith('/api/members/member-1', expect.objectContaining({ revision: 2, name: 'Concurrent Ann', allergies: ['peanut'] }))
    expect(harness.store.currentMember.value?.revision).toBe(3)
  })
  it('offers household languages without duplicates and keeps errors/input on failed add', async () => {
    const { wrapper } = await settings({ post: async () => { throw new Error('Write failed') } })
    await clickButton('Add Member')
    await clickButton('Save Member'); expect(document.querySelector('[role=dialog]')).not.toBeNull()
    input('member-name', 'Unsaved')
    const language = document.querySelector<HTMLElement>('#member-language')!; language.click(); await flushPromises()
    const options = Array.from(document.querySelectorAll(`#${language.getAttribute('aria-controls')} [role=option]`)).map(option => option.textContent?.trim())
    expect(options).toEqual(['pt', 'sv', 'en', 'de', 'fr', 'es', 'it', 'nl'])
    language.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await clickButton('Save Member')
    expect(document.querySelector('[role=dialog]')?.textContent).toContain('Write failed')
    expect((document.querySelector('#member-name') as HTMLInputElement).value).toBe('Unsaved')
    expect(wrapper.text()).toContain('Ann')
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-members/ui/src/index'
import { registeredSlot, registeredRoute, testMember, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = ''; localStorage.removeItem('ss-current-member') })
describe('registered member controls (API boundary doubles)', () => {
  it('changes the same current-member ref used by production APIs', async () => {
    const { wrapper, harness } = registeredSlot(activate, 'core-members', {} as any, 'shell.header.right')
    wrappers.push(wrapper); harness.memberStore.setMembers([testMember, { ...testMember, id: 'member-2', name: 'Bob' }]); harness.memberStore.setCurrentMember(testMember.id); await flushPromises()
    expect(wrapper.find('.member-avatar').text()).toBe('A')
    await wrapper.find('[role=combobox]').trigger('click'); await flushPromises()
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role=option]')).find(option => option.textContent?.trim() === 'Bob')!
    // Real pointer activation includes mousedown; PrimeVue selects on that event.
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); option.click(); await flushPromises()
    expect(harness.store.currentMember.value?.id).toBe('member-2'); expect(localStorage.getItem('ss-current-member')).toBe('member-2')
  })
  it('adds a route-valid member through the actual Settings consumer', async () => {
    const created = { ...testMember, id: 'member-2', name: 'Charlie', preferred_language: 'fr' }
    const { wrapper, harness } = await registeredRoute(activate, 'core-members', { post: async (path: string, body: any) => { expect(path).toBe('/api/members'); expect(body.name).toBe('Charlie'); expect(body.preferred_language).toBe('fr'); return created } } as any, '/settings')
    wrappers.push(wrapper); harness.memberStore.setMembers([{ ...testMember, dietary_restrictions: ['vegan'] }]); await flushPromises()
    expect(wrapper.text()).toContain('Ann'); expect(wrapper.text()).toContain('vegan')
    await clickButton('Add Member')
    const name = document.querySelector<HTMLInputElement>('#member-name')!; name.value = 'Charlie'; name.dispatchEvent(new Event('input'))
    const language = document.querySelector<HTMLInputElement>('#member-language')!; language.value = 'fr'; language.dispatchEvent(new Event('input'))
    await clickButton('Save Member'); expect(wrapper.text()).toContain('Charlie'); expect(harness.store.members.value).toContainEqual(created)
  })
  it('retains the add form and explains write errors', async () => {
    const { wrapper } = await registeredRoute(activate, 'core-members', { post: async () => { throw new Error('Member write failed') } } as any, '/settings')
    wrappers.push(wrapper); await clickButton('Add Member')
    const name = document.querySelector<HTMLInputElement>('#member-name')!; name.value = 'Unstored name'; name.dispatchEvent(new Event('input'))
    await clickButton('Save Member'); expect(document.querySelector('[role=dialog]')?.textContent).toContain('Member write failed'); expect(name.value).toBe('Unstored name')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { mountWithUi } from '../../tests/helpers/mountWithUi'
import { pluginHarness } from '../../tests/helpers/pluginHarness'
import { registerShellSettings } from '../settings'
import SetupPage from './SetupPage.vue'
import LoginPage from './LoginPage.vue'
import SettingsPage from './SettingsPage.vue'

describe('Shell Core Pages', () => {
  it('submits setup flow form', async () => {
    const postMock = vi.fn().mockResolvedValue({ id: 'm1', name: 'Alice' })
    const wrapper = mount(SetupPage, {
      global: {
        provide: {
          __SS_API__: { post: postMock },
        },
      },
    })
    await wrapper.find('input[name="household_name"]').setValue('Müller')
    await wrapper.find('input[name="passphrase"]').setValue('secret-key')
    await wrapper.find('input[name="first_member_name"]').setValue('Alice')
    await wrapper.find('form').trigger('submit')

    expect(postMock).toHaveBeenCalledWith('/api/setup', {
      household_name: 'Müller',
      passphrase: 'secret-key',
      first_member: { name: 'Alice', preferred_language: 'en' },
    })
  })

  it('submits login form and renders login.footer slot', async () => {
    const postMock = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(LoginPage, {
      global: {
        provide: {
          __SS_API__: { post: postMock },
          __SS_SLOT_REGISTRY__: { getContributions: () => [] },
        },
      },
    })
    await wrapper.find('input[type="password"]').setValue('my-passphrase')
    await wrapper.find('form').trigger('submit')
    expect(postMock).toHaveBeenCalledWith('/api/auth/login', {
      passphrase: 'my-passphrase',
    })
  })

  it('updates default start page in settings', async () => {
    localStorage.clear()
    const harness = pluginHarness({ get: async () => [] } as any)
    registerShellSettings(harness.settings)
    harness.router.addRoute({ path: '/settings', component: SettingsPage })
    await harness.router.push('/settings?section=device')
    const wrapper = mountWithUi(SettingsPage, { attachTo: document.body, global: { plugins: [harness.pinia, harness.router], provide: harness.provide } })
    await flushPromises()
    async function choose(label: string) {
      await wrapper.find('#default-start-page').trigger('click')
      await flushPromises()
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role=option]')).find(item => item.textContent?.trim() === label)!
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      option.click()
      await flushPromises()
    }
    await choose('Timeline')
    expect(localStorage.getItem('secretsauce:default_start_page')).toBe('/timeline')
    await choose('Automatic (Timeline when active, else Recipes)')
    expect(localStorage.getItem('secretsauce:default_start_page')).toBeNull()
    wrapper.unmount()
  })
})

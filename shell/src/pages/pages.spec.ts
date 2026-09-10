import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SetupPage from './SetupPage.vue'
import LoginPage from './LoginPage.vue'
import SharePage from './SharePage.vue'

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
})

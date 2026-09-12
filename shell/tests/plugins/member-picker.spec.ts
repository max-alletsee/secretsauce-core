import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MemberPicker from '../../../secretsauce/plugins/core/core-members/ui/src/MemberPicker.vue'
import MemberSettings from '../../../secretsauce/plugins/core/core-members/ui/src/MemberSettings.vue'
import activate from '../../../secretsauce/plugins/core/core-members/ui/src/index'
import { useMemberStore } from '../../src/stores/member'

describe('MemberPicker', () => {
  it('renders active member avatar and changes current member on select', async () => {
    const pinia = createPinia()
    const memberStore = useMemberStore(pinia)
    memberStore.setMembers([
      { id: 'm1', name: 'Alice', avatar_color: '#ef4444' } as any,
      { id: 'm2', name: 'Bob', avatar_color: '#3b82f6' } as any,
    ])
    memberStore.setCurrentMember('m1')

    const mockApi = {
      setDefaultHeader: vi.fn(),
    }

    const wrapper = mount(MemberPicker, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    expect(wrapper.find('.member-avatar').text()).toBe('A')
    const select = wrapper.find('select.member-select')
    await select.setValue('m2')

    expect(memberStore.currentMember?.id).toBe('m2')
    expect(localStorage.getItem('secretsauce:current_member_id')).toBe('m2')
    expect(mockApi.setDefaultHeader).toHaveBeenCalledWith('x-actor-member', 'm2')
  })

  it('MemberSettings renders members list and adds new member', async () => {
    const pinia = createPinia()
    const memberStore = useMemberStore(pinia)
    memberStore.setMembers([
      { id: 'm1', name: 'Alice', preferred_language: 'en', serving_ratio: 1.0, dietary_restrictions: ['vegan'] } as any,
    ])

    const mockApi = {
      post: vi.fn().mockResolvedValue({
        id: 'm2',
        name: 'Charlie',
        preferred_language: 'fr',
        serving_ratio: 1.2,
      }),
    }

    const wrapper = mount(MemberSettings, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
        },
      },
    })

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('vegan')

    // Open add modal
    await wrapper.find('button.btn-primary').trigger('click')
    const nameInput = wrapper.find('input[placeholder="Name"]')
    await nameInput.setValue('Charlie')
    const saveBtn = wrapper.findAll('button.btn-primary')[1]
    await saveBtn.trigger('click')

    expect(mockApi.post).toHaveBeenCalledWith('/api/members', expect.objectContaining({ name: 'Charlie' }))
  })

  it('activator registers slot shell.header.right and settings section', () => {
    const mockSS = {
      slot: vi.fn(),
      settings: {
        section: vi.fn(),
      },
    }
    activate(mockSS)
    expect(mockSS.slot).toHaveBeenCalledWith('shell.header.right', MemberPicker, { order: 10 })
    expect(mockSS.settings.section).toHaveBeenCalledWith(expect.objectContaining({ id: 'members', title: 'Household Members' }))
  })
})

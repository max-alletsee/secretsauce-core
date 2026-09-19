import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VoteRating from '../../../secretsauce/plugins/core/core-ratings/ui/src/VoteRating.vue'
import activate from '../../../secretsauce/plugins/core/core-ratings/ui/src/index'

describe('VoteRating.vue', () => {
  it('renders upvote and downvote buttons and handles click toggle', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue({ net_score: 2, scores: [] }),
      put: vi.fn().mockResolvedValue({ net_score: 3 }),
      delete: vi.fn().mockResolvedValue({}),
    }
    const wrapper = mount(VoteRating, {
      props: {
        context: {
          entry: { id: 'journal-1' },
        },
      },
      global: {
        provide: {
          __SS_API__: mockApi,
          __SS_CURRENT_MEMBER__: { value: { id: 'member-1' } },
        },
      },
    })
    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 10))

    expect(wrapper.find('.upvote-btn').exists()).toBe(true)
    expect(wrapper.find('.downvote-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('2')

    await wrapper.find('.upvote-btn').trigger('click')
    expect(mockApi.put).toHaveBeenCalledWith('/api/x/core-ratings', {
      journal_id: 'journal-1',
      member_id: 'member-1',
      score: 1,
    })
  })

  it('activator registers journal.entry.footer slot', () => {
    const mockSS = { slot: vi.fn() }
    activate(mockSS)
    expect(mockSS.slot).toHaveBeenCalledWith('journal.entry.footer', VoteRating, expect.any(Object))
  })
})

import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-ratings/ui/src/index'
import { registeredSlot, testMember } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('registered ratings footer (API boundary double)', () => {
  it('votes, switches members, and toggles the selected member vote off on cooked entries', async () => {
    const scores: { member_id: string; score: number }[] = []
    const { wrapper, harness } = registeredSlot(activate, 'core-ratings', {
      get: async (path: string, query: any) => { expect(path).toBe('/api/x/core-ratings'); expect(query).toEqual({ timeline_entry_id: 'tl-1' }); return { scores: scores.map(s => ({ ...s })), net_score: scores.reduce((sum, s) => sum + s.score, 0) } },
      put: async (path: string, body: any) => { expect(path).toBe('/api/x/core-ratings'); expect(body).toEqual({ timeline_entry_id: 'tl-1', member_id: 'member-1', score: 1 }); scores.push({ member_id: body.member_id, score: body.score }); return { status: 'ok', net_score: 1 } },
      delete: async (path: string, query: any) => { expect(path).toBe('/api/x/core-ratings'); expect(query).toEqual({ timeline_entry_id: 'tl-1', member_id: 'member-1' }); scores.splice(0); },
    } as any, 'timeline.entry.footer', { entry: { id: 'tl-1', status: 'cooked' } })
    wrappers.push(wrapper)
    harness.memberStore.setMembers([testMember, { ...testMember, id: 'member-2', name: 'Bob' }]); harness.memberStore.setCurrentMember('member-1')
    await flushPromises(); await wrapper.find('.upvote-btn').trigger('click'); await flushPromises()
    expect(wrapper.find('.upvote-btn').attributes('aria-pressed')).toBe('true'); expect(wrapper.text()).toContain('+1')
    harness.memberStore.setCurrentMember('member-2'); await flushPromises()
    expect(wrapper.find('.upvote-btn').attributes('aria-pressed')).toBe('false')
    harness.memberStore.setCurrentMember('member-1'); await flushPromises(); await wrapper.find('.upvote-btn').trigger('click'); await flushPromises()
    expect(wrapper.find('.upvote-btn').attributes('aria-pressed')).toBe('false'); expect(wrapper.text()).toContain('0')
  })
  it('does not render or fetch ratings when the timeline entry is still planned', async () => {
    let fetched = false
    const { wrapper } = registeredSlot(activate, 'core-ratings', {
      get: async () => { fetched = true; return { scores: [], net_score: 0 } },
    } as any, 'timeline.entry.footer', { entry: { id: 'tl-planned', status: 'planned' } })
    wrappers.push(wrapper); await flushPromises()
    expect(wrapper.find('.vote-rating').exists()).toBe(false)
    expect(fetched).toBe(false)
  })
  it('requires a real member and explains write failures without inventing a vote', async () => {
    const { wrapper, harness } = registeredSlot(activate, 'core-ratings', { get: async () => ({ scores: [], net_score: 0 }), put: async () => { throw new Error('Vote not saved') } } as any, 'timeline.entry.footer', { entry: { id: 'tl-1', status: 'cooked' } })
    wrappers.push(wrapper); await flushPromises()
    expect(wrapper.find('.upvote-btn').attributes('disabled')).toBeDefined()
    harness.memberStore.setMembers([testMember]); harness.memberStore.setCurrentMember(testMember.id); await flushPromises()
    await wrapper.find('.upvote-btn').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('Vote not saved'); expect(wrapper.find('.upvote-btn').attributes('aria-pressed')).toBe('false')
  })
})

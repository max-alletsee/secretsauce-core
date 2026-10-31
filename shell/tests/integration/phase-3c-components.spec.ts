import { describe, it, expect, afterEach, vi } from 'vitest'
import { RouterView } from 'vue-router'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import { savedRecipe, testMember } from '../helpers/registeredPlugin'
import activateTimeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import activateRatings from '../../../secretsauce/plugins/core/core-ratings/ui/src/index'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('Unified Timeline + inline ratings components (API boundary doubles)', () => {
  it('toggles cooked status via outbox PATCH and renders inline member rating on cooked timeline entries without opening the action menu', async () => {
    const date = new Date().toLocaleDateString('en-CA')
    const entry: any = { id: 'tl-1', revision: 1, date, meal_type: 'dinner', recipe_id: savedRecipe.id, recipe: savedRecipe, title: savedRecipe.title, servings_override: 3, position: 0, status: 'planned', cooked_by_member_id: null, origin: 'member', created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
    let voted = false
    const harness = pluginHarness({ get: async (path: string) => {
      if (path === '/api/x/core-timeline/slots') return { days: { [date]: [{ id: 'dinner', label: 'Dinner', kind: 'default', skipped: false }] } }
      if (path.startsWith('/api/timeline')) return [entry]
      if (path === '/api/x/core-ratings') return { scores: voted ? [{ member_id: testMember.id, score: 1 }] : [], net_score: voted ? 1 : 0 }
      throw new Error(`Unexpected GET ${path}`)
    }, put: async (path: string, body: any) => { expect(path).toBe('/api/x/core-ratings'); expect(body).toEqual({ timeline_entry_id: 'tl-1', member_id: testMember.id, score: 1 }); voted = true; return { status: 'ok', net_score: 1 } } } as any)
    const queued = vi.spyOn(harness.outbox, 'enqueue')
    activateTimeline(harness.ss('core-timeline')); activateRatings(harness.ss('core-ratings'))
    harness.memberStore.setMembers([testMember]); harness.memberStore.setCurrentMember(testMember.id)
    await harness.router.push('/timeline')
    const wrapper = mountWithUi(RouterView, { attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia, harness.router] } }); wrappers.push(wrapper); await flushPromises()

    // Initially planned: no Cooked badge and no VoteRating
    expect(wrapper.text()).toContain('Chocolate cake')
    expect(wrapper.find('[title=Cooked]').exists()).toBe(false)
    expect(wrapper.find('.vote-rating').exists()).toBe(false)

    // Open meal action menu and click "Mark as cooked"
    await wrapper.find('.timeline-card-main').trigger('click'); await flushPromises()
    const markItem = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => /Mark as cooked/i.test(item.textContent || ''))!
    markItem.querySelector<HTMLElement>('a')!.click(); await flushPromises()

    expect(queued).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/api/timeline/tl-1',
      body: { revision: 1, status: 'cooked', cooked_by_member_id: testMember.id },
    })
    expect(wrapper.find('[title=Cooked]').exists()).toBe(true)
    expect(wrapper.find('.vote-rating').exists()).toBe(true)

    // Clicking upvote on the inline footer casts vote without opening the action menu
    await wrapper.find('.upvote-btn').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('+1')
    expect(wrapper.find('.upvote-btn').attributes('aria-pressed')).toBe('true')
    expect(document.querySelector('[role=menu]')).toBeNull()

    // Open meal action menu again and click "Unmark as cooked"
    await wrapper.find('.timeline-card-main').trigger('click'); await flushPromises()
    const unmarkItem = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => /Unmark as cooked/i.test(item.textContent || ''))!
    unmarkItem.querySelector<HTMLElement>('a')!.click(); await flushPromises()

    expect(queued).toHaveBeenLastCalledWith({
      method: 'PATCH',
      path: '/api/timeline/tl-1',
      body: { revision: 2, status: 'planned', cooked_by_member_id: null },
    })
    expect(wrapper.find('[title=Cooked]').exists()).toBe(false)
    expect(wrapper.find('.vote-rating').exists()).toBe(false)
  })
})

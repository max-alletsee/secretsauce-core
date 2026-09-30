import { describe, it, expect, afterEach } from 'vitest'
import { RouterView } from 'vue-router'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'
import { savedRecipe, testMember } from '../helpers/registeredPlugin'
import activateTimeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import activateCookTracker from '../../../secretsauce/plugins/core/core-cook-tracker/ui/src/index'
import activateRatings from '../../../secretsauce/plugins/core/core-ratings/ui/src/index'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
describe('Timeline + journal + ratings components (API boundary doubles)', () => {
  it('derives the cooked badge from real-shaped journal rows and renders the selected member vote', async () => {
    const date = new Date().toLocaleDateString('en-CA')
    const schedule = { id: 'schedule-1', revision: 1, date, meal_type: 'dinner', recipe_id: savedRecipe.id, recipe: savedRecipe, title: savedRecipe.title, servings_override: 3, position: 0, origin: 'manual', created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
    const journal = { id: 'journal-1', revision: 1, date, meal_type: 'dinner', schedule_entry_id: schedule.id, recipe_id: savedRecipe.id, recipe: savedRecipe, title: savedRecipe.title, status: 'cooked', servings_cooked: 3, cooked_by_member_id: testMember.id, notes: null, origin: 'manual', created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' }
    let voted = false
    const harness = pluginHarness({ get: async (path: string) => {
      if (path.startsWith('/api/schedule')) return [schedule]
      if (path.startsWith('/api/journal')) return [journal]
      if (path === '/api/x/core-ratings') return { scores: voted ? [{ member_id: testMember.id, score: 1 }] : [], net_score: voted ? 1 : 0 }
      throw new Error(`Unexpected GET ${path}`)
    }, put: async (path: string, body: any) => { expect(path).toBe('/api/x/core-ratings'); expect(body).toEqual({ journal_id: 'journal-1', member_id: testMember.id, score: 1 }); voted = true; return { status: 'ok', net_score: 1 } } } as any)
    activateTimeline(harness.ss('core-timeline')); activateCookTracker(harness.ss('core-cook-tracker')); activateRatings(harness.ss('core-ratings'))
    harness.memberStore.setMembers([testMember]); harness.memberStore.setCurrentMember(testMember.id)
    await harness.router.push('/timeline')
    const wrapper = mountWithUi(RouterView, { attachTo: document.body, global: { provide: harness.provide, plugins: [harness.pinia, harness.router] } }); wrappers.push(wrapper); await flushPromises()
    expect(wrapper.text()).toContain('Chocolate cake'); expect(wrapper.find('[title=Cooked]').exists()).toBe(true)
    await harness.router.push('/journal'); await flushPromises()
    expect(wrapper.text()).toContain('Chocolate cake'); expect(wrapper.find('.vote-rating').exists()).toBe(true)
    await wrapper.find('.upvote-btn').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('+1'); expect(wrapper.find('.upvote-btn').attributes('aria-pressed')).toBe('true')
  })
})

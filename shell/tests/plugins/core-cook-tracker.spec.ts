import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { IntentTrigger, Slot } from '@secretsauce/ui'
import activate from '../../../secretsauce/plugins/core/core-cook-tracker/ui/src/index'
import timeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
import { pluginHarness } from '../helpers/pluginHarness'
import { mountWithUi } from '../helpers/mountWithUi'

function harness() {
  const h = pluginHarness({ get: async () => [] } as any)
  timeline(h.ss('core-timeline')); activate(h.ss('core-cook-tracker'))
  h.memberStore.setMembers([{ id: 'm-1', name: 'Ann', preferred_language: 'en' } as any])
  return h
}

describe('registered cook tracker controls', () => {
  it('queues a route-valid journal write through the real intent trigger', async () => {
    const h = harness(), queued = vi.spyOn(h.outbox, 'enqueue')
    const entry = { id: 's-1', date: '2026-09-28', meal_type: 'dinner', title: 'Soup', servings_override: 3, revision: 1 }
    const wrapper = mountWithUi(IntentTrigger, { props: { hub: 'entry:interact', context: { entry } }, attachTo: document.body, global: { provide: h.provide } })
    try {
      await wrapper.find('button').trigger('click'); await flushPromises()
      const item = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => /Mark as cooked/i.test(item.textContent || ''))!
      item.querySelector<HTMLElement>('a')!.click(); await flushPromises()
      expect(queued).toHaveBeenCalledWith({ method: 'POST', path: '/api/journal', body: {
        id: expect.any(String), date: entry.date, meal_type: 'dinner', title: 'Soup', recipe_id: undefined,
        servings_cooked: 3, cooked_by_member_id: 'm-1', schedule_entry_id: entry.id, status: 'cooked',
      } })
      expect(wrapper.emitted('resolve')).toHaveLength(1)
    } finally { wrapper.unmount() }
  })
  it('renders the cooked badge through its registered slot', () => {
    const h = harness()
    const wrapper = mountWithUi(Slot, { props: { name: 'timeline.entry.badge', context: { entry: { is_cooked: true } } }, global: { provide: h.provide } })
    expect(wrapper.find('[title=Cooked]').exists()).toBe(true)
    wrapper.unmount()
  })
})

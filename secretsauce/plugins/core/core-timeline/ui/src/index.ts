import type { SecretSauceUI } from '@secretsauce/ui'
import CookedBadge from './components/CookedBadge.vue'
import MoveMealDialog from './components/MoveMealDialog.vue'
import TimelinePluginSettings from './components/TimelinePluginSettings.vue'
import TimelinePage from './pages/TimelinePage.vue'
import { localToday, shiftDate } from './days'
import { fetchTimelineSettings } from './settings'

export default function activate(ss: SecretSauceUI) {
  ss.route({ path: '/timeline', component: TimelinePage, nav: { label: 'Timeline', icon: 'calendar', order: 5 } })
  ss.slot('timeline.entry.badge', CookedBadge, { order: 10 })
  ss.slot('plugin_manager.plugin.actions', TimelinePluginSettings, { order: 10 })
  ss.intent.hub({ id: 'entry:create', title: 'Add entry to timeline' })
  ss.intent.hub({ id: 'entry:interact', title: 'Meal actions' })
  ss.intent.hub({ id: 'timeline:assist', title: 'Timeline planning assistance' })
  ss.intent.provider({ hub: 'entry:interact', id: 'view-recipe', title: 'View recipe', icon: 'book', order: 10, kind: 'headless',
    isAvailable: context => !!(context as any)?.entry?.recipe_id,
    execute: (context: any) => ss.navigate(`/recipes/${context.entry.recipe_id}`),
  })
  ss.intent.provider({
    hub: 'entry:interact',
    id: 'toggle-cooked',
    title: 'Mark as cooked',
    titleFor: (context: any) => context?.entry?.status === 'cooked' ? 'Unmark as cooked' : 'Mark as cooked',
    icon: 'check',
    iconFor: (context: any) => context?.entry?.status === 'cooked' ? 'undo' : 'check',
    order: 20,
    kind: 'headless',
    isAvailable: context => !!(context as any)?.entry,
    execute: async (context: any) => {
      const entry = context.entry
      if (entry.status === 'cooked') {
        await ss.outbox.enqueue({
          method: 'PATCH',
          path: `/api/timeline/${entry.id}`,
          body: { revision: entry.revision, status: 'planned', cooked_by_member_id: null },
        })
        entry.status = 'planned'
        entry.cooked_by_member_id = null
        entry.revision = (entry.revision || 1) + 1
        ss.notify({ level: 'info', message: 'Meal unmarked as cooked' })
      } else {
        const cookedBy = entry.assigned_cook_id || ss.store.currentMember.value?.id || null
        await ss.outbox.enqueue({
          method: 'PATCH',
          path: `/api/timeline/${entry.id}`,
          body: { revision: entry.revision, status: 'cooked', cooked_by_member_id: cookedBy },
        })
        entry.status = 'cooked'
        entry.cooked_by_member_id = cookedBy
        entry.revision = (entry.revision || 1) + 1
        ss.notify({ level: 'success', message: 'Meal marked as cooked!' })
      }
    },
  })
  ss.intent.provider({
    hub: 'entry:interact',
    id: 'move',
    title: 'Move meal',
    icon: 'arrow-right-arrow-left',
    order: 30,
    kind: 'ui',
    component: MoveMealDialog,
    isAvailable: context => !!(context as any)?.entry,
  })
  ss.intent.provider({ hub: 'entry:interact', id: 'remove', title: 'Remove from plan', icon: 'trash', order: 999, kind: 'headless',
    execute: async (context: any) => {
      const entry = context?.entry
      if (!entry || !await ss.confirm({ header: 'Remove meal', message: 'Remove this meal from the plan?', acceptLabel: 'Remove', rejectLabel: 'Cancel', severity: 'danger' })) return
      await ss.api.delete(`/api/timeline/${entry.id}?revision=${entry.revision}`)
      ss.notify({ level: 'success', message: 'Meal removed from plan' })
    },
  })
  const warmCache = async () => {
    try {
      // Timeline days are browser-local calendar dates, not UTC timestamps.
      const today = localToday()
      const settings = await fetchTimelineSettings(ss)
      const from = shiftDate(today, -settings.default_past_days)
      const to = shiftDate(today, Math.max(settings.default_planning_days - 1, 14))
      for (let start = from; start <= to;) {
        const end = shiftDate(start, 62) < to ? shiftDate(start, 62) : to
        const entries = await ss.api.get<any[]>(`/api/timeline?from=${start}&to=${end}`)
        for (const entry of entries) if (entry.recipe_id) ss.api.get(`/api/recipes/${entry.recipe_id}`).catch(() => {})
        start = shiftDate(end, 1)
      }
    } catch { /* cache warming must not prevent offline use */ }
  }
  warmCache()
  for (const name of ['timeline:created', 'timeline:updated', 'timeline:deleted', 'core-timeline:settings-changed']) ss.on(name, warmCache)
}

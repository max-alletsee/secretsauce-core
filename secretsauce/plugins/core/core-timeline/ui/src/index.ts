import type { SecretSauceUI } from '@secretsauce/ui'
import TimelinePage from './pages/TimelinePage.vue'

export default function activate(ss: SecretSauceUI) {
  ss.route({ path: '/timeline', component: TimelinePage, nav: { label: 'Timeline', icon: 'calendar', order: 5 } })
  ss.intent.hub({ id: 'entry:create', title: 'Add entry to timeline' })
  ss.intent.hub({ id: 'entry:interact', title: 'Meal actions' })
  ss.intent.hub({ id: 'timeline:assist', title: 'Timeline planning assistance' })
  ss.intent.provider({ hub: 'entry:interact', id: 'view-recipe', title: 'View recipe', icon: 'book', order: 10, kind: 'headless',
    isAvailable: context => !!(context as any)?.entry?.recipe_id,
    execute: (context: any) => ss.navigate(`/recipes/${context.entry.recipe_id}`),
  })
  ss.intent.provider({ hub: 'entry:interact', id: 'remove', title: 'Remove from plan', icon: 'trash', order: 999, kind: 'headless',
    execute: async (context: any) => {
      const entry = context?.entry
      if (!entry || !await ss.confirm({ header: 'Remove meal', message: 'Remove this meal from the plan?', acceptLabel: 'Remove', rejectLabel: 'Cancel', severity: 'danger' })) return
      await ss.api.delete(`/api/schedule/${entry.id}?revision=${entry.revision}`)
      ss.notify({ level: 'success', message: 'Meal removed from plan' })
    },
  })
  const warmCache = async () => {
    try {
      const today = new Date(), start = new Date(today), end = new Date(today)
      start.setDate(start.getDate() - 2); end.setDate(end.getDate() + 14)
      const entries = await ss.api.get<any[]>(`/api/schedule?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}`)
      for (const entry of entries) if (entry.recipe_id) ss.api.get(`/api/recipes/${entry.recipe_id}`).catch(() => {})
    } catch { /* cache warming must not prevent offline use */ }
  }
  warmCache()
  for (const name of ['schedule:created', 'schedule:updated', 'schedule:deleted']) ss.on(name, warmCache)
}

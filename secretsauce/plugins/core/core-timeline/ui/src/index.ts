import TimelinePage from './pages/TimelinePage.vue'

export default function activate(ss: any) {
  // 1. Register Route with Nav Definition
  ss.route({
    path: '/timeline',
    component: TimelinePage,
    nav: { label: 'Timeline', icon: 'calendar', order: 5 },
  })

  // Optional nav callback if supported by harness
  if (typeof ss.nav === 'function') {
    ss.nav({ label: 'Timeline', icon: 'calendar', path: '/timeline', order: 5 })
  }

  // 2. Register Hubs & Providers
  if (ss.intent) {
    ss.intent.hub({ id: 'entry:create', title: 'Add Entry to Timeline' })
    ss.intent.hub({ id: 'entry:interact', title: 'Meal Slot Interaction' })
    ss.intent.hub({ id: 'timeline:assist', title: 'Timeline Planning Assistance' })

    ss.intent.provider({
      hub: 'entry:interact',
      id: 'view-recipe',
      title: 'View Recipe',
      order: 10,
      kind: 'headless',
      execute: (ctx: any) => {
        if (ctx?.entry?.recipe_id) {
          if (ss.navigate) ss.navigate(`/recipes/${ctx.entry.recipe_id}`)
          else window.location.href = ss.url ? ss.url(`/recipes/${ctx.entry.recipe_id}`) : `/recipes/${ctx.entry.recipe_id}`
        }
      },
    })

    ss.intent.provider({
      hub: 'entry:interact',
      id: 'remove',
      title: 'Remove from Plan',
      order: 999,
      kind: 'headless',
      execute: async (ctx: any) => {
        if (ctx?.entry?.id && confirm('Remove this meal from timeline?')) {
          await ss.api.delete(`/api/schedule/${ctx.entry.id}?revision=${ctx.entry.revision || 1}`)
          window.location.reload()
        }
      },
    })
  }

  // Fallback for hub API if provided
  if (typeof ss.hub === 'function') {
    ss.hub('entry:create', {
      defaultProvider: {
        id: 'manual-add',
        order: 100,
        run: async () => {},
      },
    })
    ss.hub('entry:interact', { providers: [] })
    ss.hub('timeline:assist', { providers: [] })
  }

  // 3. Offline cache warming (Spec Section 8.8)
  const warmCache = async () => {
    try {
      if (!ss.api) return
      const today = new Date()
      const d1 = new Date(today)
      d1.setDate(d1.getDate() - 2)
      const d2 = new Date(today)
      d2.setDate(d2.getDate() + 14)
      const from = d1.toISOString().slice(0, 10)
      const to = d2.toISOString().slice(0, 10)
      const entries = await ss.api.get(`/api/schedule?from=${from}&to=${to}`)
      for (const e of entries || []) {
        if (e.recipe_id) {
          ss.api.get(`/api/recipes/${e.recipe_id}`).catch(() => {})
        }
      }
    } catch {
      // offline or error, safe to ignore
    }
  }

  warmCache()
  if (typeof ss.on === 'function') {
    ss.on('schedule:created', warmCache)
    ss.on('schedule:updated', warmCache)
    ss.on('schedule:deleted', warmCache)
  }
}

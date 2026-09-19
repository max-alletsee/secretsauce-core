import CookedBadge from './components/CookedBadge.vue'
import JournalPage from './pages/JournalPage.vue'

export default function activate(ss: any) {
  // 1. Route & Navigation
  ss.route({
    path: '/journal',
    component: JournalPage,
    nav: { label: 'Journal', icon: 'book-open', order: 15 },
  })

  if (typeof ss.nav === 'function') {
    ss.nav({ label: 'Journal', icon: 'book-open', path: '/journal', order: 15 })
  }

  // 2. Badge slot injection
  ss.slot('timeline.entry.badge', CookedBadge, { order: 10 })

  // 3. entry:interact Providers
  if (ss.intent?.provider) {
    ss.intent.provider({
      hub: 'entry:interact',
      id: 'mark-cooked',
      title: 'Mark as Cooked',
      order: 20,
      kind: 'headless',
      execute: async (ctx: any) => {
        const entry = ctx?.entry
        if (!entry) return
        const journalId = crypto.randomUUID()
        const currentMember = ss.store?.currentMember?.value
        const payload = {
          id: journalId,
          date: entry.date,
          meal_type: entry.meal_type,
          recipe_id: entry.recipe_id,
          servings: entry.servings_override || 2,
          assigned_cook_id: entry.assigned_cook_id || currentMember?.id,
          schedule_entry_id: entry.id,
        }

        if (ss.outbox?.enqueue) {
          await ss.outbox.enqueue({
            method: 'POST',
            url: '/api/journal',
            body: payload,
          })
        } else if (ss.api?.post) {
          await ss.api.post('/api/journal', payload)
        }

        entry.is_cooked = true
        if (typeof ss.notify === 'function') {
          ss.notify({ level: 'success', message: 'Meal marked as cooked!' })
        }
      },
    })

    ss.intent.provider({
      hub: 'entry:interact',
      id: 'skip',
      title: 'Skip Meal',
      order: 30,
      kind: 'headless',
      execute: async (ctx: any) => {
        const entry = ctx?.entry
        if (!entry) return
        entry.is_skipped = true
        if (typeof ss.notify === 'function') {
          ss.notify({ level: 'info', message: 'Meal marked as skipped.' })
        }
      },
    })

    ss.intent.provider({
      hub: 'entry:interact',
      id: 'log-leftover',
      title: 'Log Leftovers',
      order: 40,
      kind: 'headless',
      execute: async (ctx: any) => {
        if (typeof ss.notify === 'function') {
          ss.notify({ level: 'info', message: 'Leftovers recorded for upcoming meals.' })
        }
      },
    })
  }
}

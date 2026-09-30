import type { SecretSauceUI } from '@secretsauce/ui'
import CookedBadge from './components/CookedBadge.vue'
import JournalPage from './pages/JournalPage.vue'

export default function activate(ss: SecretSauceUI) {
  ss.route({ path: '/journal', component: JournalPage, nav: { label: 'Journal', icon: 'history', order: 15 } })
  ss.slot('timeline.entry.badge', CookedBadge, { order: 10 })
  ss.intent.provider({ hub: 'entry:interact', id: 'mark-cooked', title: 'Mark as cooked', icon: 'check', order: 20, kind: 'headless',
    isAvailable: context => !!(context as any)?.entry,
    isDisabled: context => (context as any)?.entry?.is_cooked ? 'Already marked as cooked' : false,
    execute: async (context: any) => {
      const entry = context.entry
      await ss.outbox.enqueue({ method: 'POST', path: '/api/journal', body: {
        id: crypto.randomUUID(), date: entry.date, meal_type: entry.meal_type,
        recipe_id: entry.recipe_id, title: entry.recipe?.title || entry.title,
        servings_cooked: entry.servings_override || 2,
        cooked_by_member_id: entry.assigned_cook_id || ss.store.currentMember.value?.id,
        schedule_entry_id: entry.id, status: 'cooked',
      } })
      entry.is_cooked = true
      ss.notify({ level: 'success', message: 'Meal marked as cooked!' })
    },
  })
  ss.intent.provider({ hub: 'entry:interact', id: 'skip', title: 'Skip meal', icon: 'forward', order: 30, kind: 'headless',
    execute: (context: any) => { if (context?.entry) context.entry.is_skipped = true; ss.notify({ level: 'info', message: 'Meal marked as skipped.' }) },
  })
  ss.intent.provider({ hub: 'entry:interact', id: 'log-leftover', title: 'Log leftovers', icon: 'box', order: 40, kind: 'headless',
    execute: () => ss.notify({ level: 'info', message: 'Leftovers recorded for upcoming meals.' }),
  })
}

import type { SecretSauceUI } from '@secretsauce/ui'
import RecurringSettings from './RecurringSettings.vue'
import { pythonWeekday, weekdayName } from './weekday'

export default function activate(ss: SecretSauceUI) {
  ss.settings.section({
    id: 'core-recurring',
    title: 'Recurring Meals',
    order: 20,
    component: RecurringSettings
  })
  ss.intent.provider({
    hub: 'entry:interact', id: 'repeat-weekly', kind: 'headless',
    title: 'Repeat weekly', titleFor: (context: any) => `Repeat every ${weekdayName(context.entry.date)}`,
    icon: 'replay', order: 50,
    isAvailable: (context: any) => !!context?.entry?.recipe_id && context.entry.origin !== 'plugin:core-recurring',
    execute: async (context: any) => {
      const entry = context.entry
      const defaults = ss.store.household.value.meal_types
      const alias = entry.meal_type.toLowerCase()
      const slot = defaults.find(slot => slot.id.toLowerCase() === alias) || defaults.find(slot => slot.label.toLowerCase() === alias)
      const rule = await ss.api.post('/api/x/core-recurring/rules', {
        weekday: pythonWeekday(new Date(`${entry.date}T12:00:00`).getDay()),
        meal_type: context.mealType || slot?.id || entry.meal_type,
        recipe_id: entry.recipe_id,
      })
      ss.notify({ level: 'success', message: `Repeating every ${weekdayName(entry.date)}` })
      return rule
    },
  })
}

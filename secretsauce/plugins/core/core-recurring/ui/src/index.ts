import type { SecretSauceUI } from '@secretsauce/ui'
import RecurringMealsWidget from './RecurringMealsWidget.vue'
import RecurringSlotSuggestions from './RecurringSlotSuggestions.vue'

export default function activate(ss: SecretSauceUI) {
  ss.slot('timeline.sidebar', RecurringMealsWidget, { order: 20 })
  ss.slot('timeline.slot.suggestions', RecurringSlotSuggestions, { order: 10 })
}

export { RecurringMealsWidget, RecurringSlotSuggestions }

import type { SecretSauceUI } from '@secretsauce/ui'
import MealPlannerWidget from './MealPlannerWidget.vue'

export default function activate(ss: SecretSauceUI) {
  ss.slot('timeline.sidebar', MealPlannerWidget, { order: 10 })
}
export { MealPlannerWidget }

import type { SecretSauceUI } from '@secretsauce/ui'
import MealPlannerWidget from './MealPlannerWidget.vue'
import MealPlannerPluginSettings from './MealPlannerPluginSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.slot('timeline.sidebar', MealPlannerWidget, { order: 10 })
  ss.slot('plugin_manager.plugin.actions', MealPlannerPluginSettings, { order: 10 })
}
export { MealPlannerWidget, MealPlannerPluginSettings }

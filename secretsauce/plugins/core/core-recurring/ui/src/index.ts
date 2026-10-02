import type { SecretSauceUI } from '@secretsauce/ui'
import RecurringSettings from './RecurringSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.settings.section({
    id: 'core-recurring',
    title: 'Recurring Meals',
    order: 20,
    component: RecurringSettings
  })
}

import type { SecretSauceUI } from '@secretsauce/ui'
import RecurringSettings from './RecurringSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.settings.section({
    id: 'recurring',
    title: 'Recurring Meals',
    component: RecurringSettings
  })
}

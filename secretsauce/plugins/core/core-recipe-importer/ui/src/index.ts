import type { SecretSauceUI } from '@secretsauce/ui'
import ImportRecipeDialog from './ImportRecipeDialog.vue'

export default function activate(ss: SecretSauceUI) {
  ss.intent.provider({ hub: 'recipe:create', id: 'ai-import', kind: 'ui', title: 'Import with AI…',
    icon: 'sparkles', order: 15, component: ImportRecipeDialog })
}
export { ImportRecipeDialog }

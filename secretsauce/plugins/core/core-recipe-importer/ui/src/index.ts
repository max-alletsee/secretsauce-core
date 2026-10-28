import type { SecretSauceUI } from '@secretsauce/ui'
import ImportRecipeDialog from './ImportRecipeDialog.vue'
import ImporterPluginSettings from './ImporterPluginSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.intent.provider({ hub: 'recipe:create', id: 'ai-import', kind: 'ui', title: 'Import with AI…',
    icon: 'sparkles', order: 15, component: ImportRecipeDialog })
  ss.slot('plugin_manager.plugin.actions', ImporterPluginSettings, { order: 10 })
}
export { ImportRecipeDialog, ImporterPluginSettings }

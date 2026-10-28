import type { SecretSauceUI } from '@secretsauce/ui'
import TranslateDialog from './TranslateDialog.vue'
import TranslatorPluginSettings from './TranslatorPluginSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.intent.provider({ hub: 'recipe:actions', id: 'ai-translate', title: 'Translate…', kind: 'ui',
    icon: 'language', order: 30, component: TranslateDialog, isAvailable: context => !!(context as any)?.recipe?.id })
  ss.slot('plugin_manager.plugin.actions', TranslatorPluginSettings, { order: 10 })
}
export { TranslateDialog, TranslatorPluginSettings }

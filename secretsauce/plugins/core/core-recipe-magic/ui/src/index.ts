import type { SecretSauceUI } from '@secretsauce/ui'
import MagicWandButton from './MagicWandButton.vue'
import MagicSettings from './MagicSettings.vue'
import MagicPluginSettings from './MagicPluginSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.slot('recipe.edit.actions', MagicWandButton, { order: 10 })
  ss.slot('plugin_manager.plugin.actions', MagicPluginSettings, { order: 10 })
}

export { MagicWandButton, MagicSettings, MagicPluginSettings }


import type { SecretSauceUI } from '@secretsauce/ui'
import CustomizeDetailButton from './CustomizeDetailButton.vue'
import CustomizeDetailPanel from './CustomizeDetailPanel.vue'
import CustomizeRecipeButton from './CustomizeRecipeButton.vue'
import CustomizeRecipeDialog from './CustomizeRecipeDialog.vue'
import CustomizeChatPanel from './CustomizeChatPanel.vue'
import CustomizedRecipePreview from './CustomizedRecipePreview.vue'
import CustomizeSettings from './CustomizeSettings.vue'
import CustomizePluginSettings from './CustomizePluginSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.slot('recipe.detail.actions', CustomizeDetailButton, { order: 10 })
  ss.slot('recipe.detail.customize', CustomizeDetailPanel, { order: 10 })
  ss.slot('recipe.edit.actions', CustomizeRecipeButton, { order: 10 })
  ss.slot('plugin_manager.plugin.actions', CustomizePluginSettings, { order: 10 })
}

export {
  CustomizeDetailButton,
  CustomizeDetailPanel,
  CustomizeRecipeButton,
  CustomizeRecipeDialog,
  CustomizeChatPanel,
  CustomizedRecipePreview,
  CustomizeSettings,
  CustomizePluginSettings,
}

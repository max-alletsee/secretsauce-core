import type { SecretSauceUI } from '@secretsauce/ui'
import MagicWandButton from './MagicWandButton.vue'
import MagicSettings from './MagicSettings.vue'

export default function activate(ss: SecretSauceUI) {
  ss.slot('recipe.edit.actions', MagicWandButton, { order: 10 })
  ss.settings.section({
    id: 'core-recipe-magic',
    title: 'Recipe Magic',
    component: MagicSettings,
  })
}

export { MagicWandButton, MagicSettings }

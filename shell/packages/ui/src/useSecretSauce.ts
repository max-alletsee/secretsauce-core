import { inject } from 'vue'
import type { SecretSauceUI } from './types'

// A string is essential: shell and plugin vendor bundles do not share Symbols.
export const SECRET_SAUCE_UI_KEY = '__SS_UI__'
export function useSecretSauce(): SecretSauceUI {
  const ss = inject<SecretSauceUI>(SECRET_SAUCE_UI_KEY)
  if (!ss) throw new Error('useSecretSauce() requires a registered plugin component')
  return ss
}

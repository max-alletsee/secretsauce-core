import { ref } from 'vue'
import { definePreset, usePreset } from '@primevue/themes'
import Aura from '@primevue/themes/aura'
import Nora from '@primevue/themes/nora'
import Material from '@primevue/themes/material'
import Lara from '@primevue/themes/lara'

export interface ThemeEntry { id: string; label: string; preset: object }
const zinc = Aura.primitive.zinc
function themed(base: any, primary: string) {
  return definePreset(base, { semantic: {
    primary: Aura.primitive[primary],
    colorScheme: { light: { surface: zinc }, dark: { surface: zinc } },
  } })
}

export function createThemeRegistry(applyPreset: (preset: object) => void = usePreset) {
  const themes = ref<ThemeEntry[]>([
    { id: 'aura-tomato', label: 'Aura · Tomato', preset: themed(Aura, 'rose') },
    { id: 'nora-tomato', label: 'Nora · Tomato', preset: themed(Nora, 'rose') },
    { id: 'material-indigo', label: 'Material · Indigo', preset: themed(Material, 'indigo') },
    { id: 'lara-amber', label: 'Lara · Amber', preset: themed(Lara, 'amber') },
  ])
  const currentTheme = ref('aura-tomato')
  function register(theme: ThemeEntry) {
    if (!themes.value.some(t => t.id === theme.id)) themes.value.push(theme)
  }
  function setTheme(id: string) {
    const target = themes.value.find(t => t.id === id) || themes.value[0]
    currentTheme.value = target.id
    applyPreset(target.preset)
    try { localStorage.setItem('ss-theme', target.id) } catch { /* device storage is optional */ }
  }
  let stored = 'aura-tomato'
  try { stored = localStorage.getItem('ss-theme') || stored } catch { /* storage denied */ }
  setTheme(stored)
  return { themes, currentTheme, register, setTheme, getThemes: () => themes.value }
}

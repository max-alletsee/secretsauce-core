import { ref } from 'vue'

export interface ThemeEntry {
  id: string
  label: string
  preset: object
}

export function createThemeRegistry() {
  const themes = ref<ThemeEntry[]>([
    { id: 'aura', label: 'Aura (Default)', preset: {} },
  ])
  const currentTheme = ref(localStorage.getItem('ss-theme') || 'aura')

  function register(theme: ThemeEntry) {
    if (!themes.value.some((t) => t.id === theme.id)) {
      themes.value.push(theme)
    }
  }

  function setTheme(id: string) {
    const target = themes.value.find((t) => t.id === id)
    if (target) {
      currentTheme.value = id
      localStorage.setItem('ss-theme', id)
    }
  }

  function getThemes() {
    return themes.value
  }

  return { themes, currentTheme, register, setTheme, getThemes }
}

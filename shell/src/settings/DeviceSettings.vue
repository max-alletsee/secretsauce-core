<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { createThemeRegistry } from '../theme'
import { getShowRecipeImages, setShowRecipeImages } from './recipeImages'
const themes = inject<ReturnType<typeof createThemeRegistry>>('__SS_THEME_REGISTRY__')!
const logout = inject<(() => Promise<void>) | null>('__SS_LOGOUT__', null)
const selectedTheme = computed({ get: () => themes.currentTheme.value, set: id => themes.setTheme(id) })
const start = ref((() => { try { return localStorage.getItem('secretsauce:default_start_page') || 'auto' } catch { return 'auto' } })())
const startPages = [{ label: 'Automatic (Timeline when active, else Recipes)', value: 'auto' }, { label: 'Timeline', value: '/timeline' }, { label: 'Recipes', value: '/recipes' }]
function saveStart(value: string) {
  try {
    if (value === 'auto') localStorage.removeItem('secretsauce:default_start_page')
    else localStorage.setItem('secretsauce:default_start_page', value)
  } catch { /* Device storage is optional. */ }
}
const showRecipeImages = ref(getShowRecipeImages())
function saveShowRecipeImages(value: boolean) {
  setShowRecipeImages(value)
}
</script>
<template>
  <div class="device-settings">
    <label for="theme">Theme</label><Select inputId="theme" aria-label="Theme" v-model="selectedTheme" :options="themes.getThemes()" optionLabel="label" optionValue="id" />
    <label for="default-start-page">Default Start Page</label><Select inputId="default-start-page" aria-label="Default Start Page" v-model="start" :options="startPages" optionLabel="label" optionValue="value" @update:modelValue="saveStart" />
    <div class="device-toggle">
      <ToggleSwitch inputId="show-recipe-images" aria-label="Show recipe images in list" v-model="showRecipeImages" @update:modelValue="saveShowRecipeImages" />
      <label for="show-recipe-images">Show recipe images in list</label>
    </div>
    <template v-if="logout"><p>Logging out also removes this household's saved data and queued changes from this device.</p><Button label="Log out" severity="danger" outlined @click="logout()" /></template>
  </div>
</template>
<style scoped>
.device-settings { display: flex; flex-direction: column; gap: .5rem; }
.device-toggle { display: flex; align-items: center; gap: .75rem; margin-top: .25rem; }
.device-toggle label { cursor: pointer; }
.device-settings p { margin: .25rem 0; font-size: .875rem; color: var(--p-text-muted-color); }
.device-settings button { align-self: flex-start; }
</style>

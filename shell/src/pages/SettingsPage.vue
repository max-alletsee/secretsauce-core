<script setup lang="ts">
import { ref, inject } from 'vue'
import type { ApiClient } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'
import { createThemeRegistry } from '../theme'

const api = inject<ApiClient>('__SS_API__')!
const settingsRegistry = inject<any>('__SS_SETTINGS_REGISTRY__')
const householdStore = useHouseholdStore()
const themeReg = inject<ReturnType<typeof createThemeRegistry>>('__SS_THEME_REGISTRY__')!
const logout = inject<(() => Promise<void>) | null>('__SS_LOGOUT__', null)

const sections = settingsRegistry ? settingsRegistry.getSections() : []

const defaultStartPage = ref(
  (() => { try { return localStorage.getItem('secretsauce:default_start_page') || 'auto' } catch { return 'auto' } })()
)

function saveDefaultStartPage() {
  try {
    if (defaultStartPage.value === 'auto') {
      localStorage.removeItem('secretsauce:default_start_page')
    } else {
      localStorage.setItem('secretsauce:default_start_page', defaultStartPage.value)
    }
  } catch { /* optional device storage */ }
}
</script>

<template>
  <div class="ss-settings-page">
    <h2>Household Settings</h2>
    <div class="settings-section">
      <h3>General</h3>
      <div class="setting-row">
        <label for="default-start-page">Default Start Page</label>
        <select
          id="default-start-page"
          v-model="defaultStartPage"
          @change="saveDefaultStartPage"
        >
          <option value="auto">Automatic (Timeline when active, else Recipes)</option>
          <option value="/timeline">Timeline</option>
          <option value="/recipes">Recipes</option>
        </select>
      </div>
    </div>

    <div class="settings-section" v-if="themeReg">
      <h3>Appearance</h3>
      <label for="theme">Theme</label>
      <select
        id="theme"
        :value="themeReg.currentTheme.value"
        @change="(e: any) => themeReg.setTheme(e.target.value)"
      >
        <option
          v-for="t in themeReg.getThemes()"
          :key="t.id"
          :value="t.id"
        >
          {{ t.label }}
        </option>
      </select>
    </div>

    <div v-for="sec in sections" :key="sec.id" class="settings-section">
      <h3>{{ sec.title }}</h3>
      <component :is="sec.component" :plugin-id="sec.pluginId" />
    </div>

    <div v-if="logout" class="settings-section">
      <h3>This device</h3>
      <p>Logging out also removes this household's saved data and queued changes from this device.</p>
      <Button class="logout-button" label="Log out" severity="danger" outlined @click="logout()" />
    </div>
  </div>
</template>

<style scoped>
.ss-settings-page {
  padding: 24px;
  max-width: 800px;
}
.settings-section {
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--p-content-border-color);
}
</style>

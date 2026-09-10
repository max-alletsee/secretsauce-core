<script setup lang="ts">
import { inject } from 'vue'
import type { ApiClient } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'
import { createThemeRegistry } from '../theme'

const api = inject<ApiClient>('__SS_API__')!
const settingsRegistry = inject<any>('__SS_SETTINGS_REGISTRY__')
const householdStore = useHouseholdStore()
const themeReg = inject<ReturnType<typeof createThemeRegistry>>('__SS_THEME_REGISTRY__')!

const sections = settingsRegistry ? settingsRegistry.getSections() : []
</script>

<template>
  <div class="ss-settings-page">
    <h2>Household Settings</h2>
    <div class="settings-section" v-if="themeReg">
      <h3>Appearance</h3>
      <label>Theme</label>
      <select
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
  border-bottom: 1px solid #e7e5e4;
}
</style>

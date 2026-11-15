<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import {
  DEFAULT_PAST_DAYS,
  DEFAULT_PLANNING_DAYS,
  MAX_PAST_DAYS,
  MAX_PLANNING_DAYS,
  MIN_PAST_DAYS,
  MIN_PLANNING_DAYS,
  normalizeTimelineSettings,
} from '../settings'

defineOptions({ inheritAttrs: false })

defineProps<{
  context?: {
    plugin?: {
      id: string
      name?: string
      state: string
      enabled?: boolean
    }
  }
}>()

const ss = useSecretSauce()
const expanded = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const draftPastDays = ref(String(DEFAULT_PAST_DAYS))
const draftPlanningDays = ref(String(DEFAULT_PLANNING_DAYS))

function parseStrictInt(raw: string, label: string, min: number, max: number): number {
  const trimmed = String(raw ?? '').trim()
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error(`${label} must be a whole number between ${min} and ${max}.`)
  }
  const value = Number(trimmed)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`)
  }
  return value
}

async function loadSettings() {
  loading.value = true
  error.value = ''
  try {
    const loaded = normalizeTimelineSettings(await ss.api.get('/api/x/core-timeline/settings'))
    draftPastDays.value = String(loaded.default_past_days)
    draftPlanningDays.value = String(loaded.default_planning_days)
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load timeline settings'
  } finally {
    loading.value = false
  }
}

watch(expanded, isOpen => {
  if (isOpen) loadSettings()
})

async function saveSettings() {
  if (saving.value) return
  error.value = ''
  let default_past_days: number
  let default_planning_days: number
  try {
    default_past_days = parseStrictInt(draftPastDays.value, 'Default past days', MIN_PAST_DAYS, MAX_PAST_DAYS)
    default_planning_days = parseStrictInt(
      draftPlanningDays.value,
      'Default planning days (including Today)',
      MIN_PLANNING_DAYS,
      MAX_PLANNING_DAYS,
    )
  } catch (validationError: any) {
    error.value = validationError.message
    return
  }

  saving.value = true
  try {
    const saved = normalizeTimelineSettings(
      await ss.api.put('/api/x/core-timeline/settings', {
        default_past_days,
        default_planning_days,
      }),
    )
    draftPastDays.value = String(saved.default_past_days)
    draftPlanningDays.value = String(saved.default_planning_days)
    ss.notify({ level: 'success', message: 'Timeline settings updated.' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to save timeline settings'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <template v-if="context?.plugin?.id === 'core-timeline'">
    <Button
      :label="expanded ? 'Close Settings' : 'Settings'"
      :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-cog'"
      size="small"
      :outlined="!expanded"
      :disabled="context?.plugin?.state !== 'active'"
      class="btn-timeline-settings-toggle"
      @click="expanded = !expanded"
    />
    <div
      v-if="expanded && context?.plugin?.state === 'active'"
      class="plugin-inline-settings"
    >
      <Message v-if="error" severity="error">{{ error }}</Message>
      <div class="settings-grid">
        <div>
          <label for="timeline-default-past-days">Default past days</label>
          <InputText
            id="timeline-default-past-days"
            v-model="draftPastDays"
            type="number"
            :min="MIN_PAST_DAYS"
            :max="MAX_PAST_DAYS"
            step="1"
            :disabled="loading || saving"
            fluid
          />
          <small>Collapsed past days shown above Today (0–30).</small>
        </div>
        <div>
          <label for="timeline-default-planning-days">Default planning days (including Today)</label>
          <InputText
            id="timeline-default-planning-days"
            v-model="draftPlanningDays"
            type="number"
            :min="MIN_PLANNING_DAYS"
            :max="MAX_PLANNING_DAYS"
            step="1"
            :disabled="loading || saving"
            fluid
          />
          <small>Today plus upcoming days shown by default (1–60).</small>
        </div>
      </div>
      <div class="settings-actions">
        <Button label="Save Settings" icon="pi pi-check" size="small" :loading="saving" :disabled="loading" @click="saveSettings" />
      </div>
    </div>
  </template>
</template>

<style scoped>
.plugin-inline-settings {
  flex-basis: 100%;
  width: 100%;
  margin-top: .75rem;
  padding-top: .75rem;
  border-top: 1px solid var(--p-content-border-color);
  display: grid;
  gap: .75rem;
}
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: .75rem;
}
.settings-grid label {
  display: block;
  margin-bottom: .35rem;
  font-size: .875rem;
}
.settings-grid small {
  display: block;
  margin-top: .25rem;
  font-size: .78rem;
  color: var(--p-text-muted-color);
}
.settings-actions {
  display: flex;
  justify-content: flex-end;
}
</style>

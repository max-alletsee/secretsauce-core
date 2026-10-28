<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'

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
const saving = ref(false)
const error = ref('')
const availableKeys = ref<string[]>(['default'])
const form = ref({
  generate_model_key: 'default',
})

function optionsFor(currentKey: string) {
  const keys = availableKeys.value.length ? availableKeys.value : ['default']
  const opts = keys.map(k => ({ value: k, label: k }))
  if (currentKey && !keys.includes(currentKey)) {
    opts.unshift({ value: currentKey, label: `${currentKey} (missing — uses default)` })
  }
  return opts
}

async function loadSettings() {
  error.value = ''
  try {
    const [aiSettings, cfg] = await Promise.all([
      ss.api.get<any>('/api/x/core-ai-provider/settings').catch(() => ({ models: { default: 'gemini-3.8-flash' } })),
      ss.api.get<any>('/api/plugins/core-meal-planner-ai/config'),
    ])
    const models = aiSettings?.models && typeof aiSettings.models === 'object' ? Object.keys(aiSettings.models) : ['default']
    availableKeys.value = models.length ? models : ['default']
    form.value = {
      generate_model_key: cfg?.generate_model_key || 'default',
    }
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load meal planner settings'
  }
}

watch(expanded, isOpen => {
  if (isOpen) loadSettings()
})

async function saveSettings() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const saved = await ss.api.put<any>('/api/plugins/core-meal-planner-ai/config', { ...form.value })
    form.value = {
      generate_model_key: saved?.generate_model_key || form.value.generate_model_key,
    }
    ss.notify({ level: 'success', message: 'Meal planner settings updated.' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to save meal planner settings'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <template v-if="context?.plugin?.id === 'core-meal-planner-ai'">
    <Button
      :label="expanded ? 'Close Settings' : 'Settings'"
      :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-cog'"
      size="small"
      :outlined="!expanded"
      :disabled="context?.plugin?.state !== 'active'"
      class="btn-planner-settings-toggle"
      @click="expanded = !expanded"
    />
    <div
      v-if="expanded && context?.plugin?.state === 'active'"
      class="plugin-inline-settings"
    >
      <Message v-if="error" severity="error">{{ error }}</Message>
      <div class="settings-grid">
        <div>
          <label for="planner-generate-model-key">Meal plan generation model key</label>
          <Select
            inputId="planner-generate-model-key"
            aria-label="Meal plan generation model key"
            v-model="form.generate_model_key"
            :options="optionsFor(form.generate_model_key)"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
      </div>
      <div class="settings-actions">
        <Button label="Save Settings" icon="pi pi-check" size="small" :loading="saving" @click="saveSettings" />
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
.settings-actions {
  display: flex;
  justify-content: flex-end;
}
</style>

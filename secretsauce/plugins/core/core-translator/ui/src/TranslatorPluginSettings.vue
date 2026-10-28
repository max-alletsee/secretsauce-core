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
  auto_translate_members: false,
  translate_model_key: 'default',
  translate_all_model_key: 'default',
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
      ss.api.get<any>('/api/plugins/core-translator/config'),
    ])
    const models = aiSettings?.models && typeof aiSettings.models === 'object' ? Object.keys(aiSettings.models) : ['default']
    availableKeys.value = models.length ? models : ['default']
    form.value = {
      auto_translate_members: Boolean(cfg?.auto_translate_members),
      translate_model_key: cfg?.translate_model_key || 'default',
      translate_all_model_key: cfg?.translate_all_model_key || 'default',
    }
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load translator settings'
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
    const saved = await ss.api.put<any>('/api/plugins/core-translator/config', { ...form.value })
    form.value = {
      auto_translate_members: Boolean(saved?.auto_translate_members),
      translate_model_key: saved?.translate_model_key || form.value.translate_model_key,
      translate_all_model_key: saved?.translate_all_model_key || form.value.translate_all_model_key,
    }
    ss.notify({ level: 'success', message: 'Translator settings updated.' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to save translator settings'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <template v-if="context?.plugin?.id === 'core-translator'">
    <Button
      :label="expanded ? 'Close Settings' : 'Settings'"
      :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-cog'"
      size="small"
      :outlined="!expanded"
      :disabled="context?.plugin?.state !== 'active'"
      class="btn-translator-settings-toggle"
      @click="expanded = !expanded"
    />
    <div
      v-if="expanded && context?.plugin?.state === 'active'"
      class="plugin-inline-settings"
    >
      <Message v-if="error" severity="error">{{ error }}</Message>
      <div class="settings-grid">
        <div>
          <label for="translator-single-model-key">Single recipe translation model key</label>
          <Select
            inputId="translator-single-model-key"
            aria-label="Single recipe translation model key"
            v-model="form.translate_model_key"
            :options="optionsFor(form.translate_model_key)"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div>
          <label for="translator-bulk-model-key">Bulk translation model key</label>
          <Select
            inputId="translator-bulk-model-key"
            aria-label="Bulk translation model key"
            v-model="form.translate_all_model_key"
            :options="optionsFor(form.translate_all_model_key)"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div class="toggle-row">
          <ToggleSwitch inputId="translator-auto-members" v-model="form.auto_translate_members" />
          <label for="translator-auto-members">Auto-translate for member languages</label>
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
  align-items: end;
}
.settings-grid label {
  display: block;
  margin-bottom: .35rem;
  font-size: .875rem;
}
.toggle-row {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.toggle-row label {
  margin: 0;
}
.settings-actions {
  display: flex;
  justify-content: flex-end;
}
</style>

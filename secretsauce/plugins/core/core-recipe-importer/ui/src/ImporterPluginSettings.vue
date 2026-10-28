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
  url_model_key: 'default',
  text_model_key: 'default',
  image_model_key: 'default',
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
      ss.api.get<any>('/api/plugins/core-recipe-importer/config'),
    ])
    const models = aiSettings?.models && typeof aiSettings.models === 'object' ? Object.keys(aiSettings.models) : ['default']
    availableKeys.value = models.length ? models : ['default']
    form.value = {
      url_model_key: cfg?.url_model_key || 'default',
      text_model_key: cfg?.text_model_key || 'default',
      image_model_key: cfg?.image_model_key || 'default',
    }
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load importer settings'
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
    const saved = await ss.api.put<any>('/api/plugins/core-recipe-importer/config', { ...form.value })
    form.value = {
      url_model_key: saved?.url_model_key || form.value.url_model_key,
      text_model_key: saved?.text_model_key || form.value.text_model_key,
      image_model_key: saved?.image_model_key || form.value.image_model_key,
    }
    ss.notify({ level: 'success', message: 'Recipe importer settings updated.' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to save importer settings'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <template v-if="context?.plugin?.id === 'core-recipe-importer'">
    <Button
      :label="expanded ? 'Close Settings' : 'Settings'"
      :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-cog'"
      size="small"
      :outlined="!expanded"
      :disabled="context?.plugin?.state !== 'active'"
      class="btn-importer-settings-toggle"
      @click="expanded = !expanded"
    />
    <div
      v-if="expanded && context?.plugin?.state === 'active'"
      class="plugin-inline-settings"
    >
      <Message v-if="error" severity="error">{{ error }}</Message>
      <div class="settings-grid">
        <div>
          <label for="importer-url-model-key">URL import model key</label>
          <Select
            inputId="importer-url-model-key"
            aria-label="URL import model key"
            v-model="form.url_model_key"
            :options="optionsFor(form.url_model_key)"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div>
          <label for="importer-text-model-key">Text import model key</label>
          <Select
            inputId="importer-text-model-key"
            aria-label="Text import model key"
            v-model="form.text_model_key"
            :options="optionsFor(form.text_model_key)"
            optionLabel="label"
            optionValue="value"
            fluid
          />
        </div>
        <div>
          <label for="importer-image-model-key">Image / OCR import model key</label>
          <Select
            inputId="importer-image-model-key"
            aria-label="Image / OCR import model key"
            v-model="form.image_model_key"
            :options="optionsFor(form.image_model_key)"
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

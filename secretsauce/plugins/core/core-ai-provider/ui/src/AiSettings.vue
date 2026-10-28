<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'

interface ModelRow {
  id: number
  key: string
  value: string
}

const ss = useSecretSauce(), saving = ref(false), error = ref('')
const form = ref<any>({
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  models: { default: 'gemini-3.8-flash' },
  gemini_api_key: '',
  openai_api_key: '',
  openrouter_api_key: '',
  enforce_budget: false,
  monthly_budget: 10,
})
const defaultModel = ref('gemini-3.8-flash')
const customModels = ref<ModelRow[]>([])
let nextRowId = 1

const providers = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'openrouter', label: 'OpenRouter' },
]
const keyName = computed(() => `${form.value.provider}_api_key`)
const usage = ref<any>({
  total_cost_usd: 0,
  month_cost_usd: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  breakdown_by_plugin: [],
})

function syncRowsFromSettings(data: any) {
  const models: Record<string, string> =
    data?.models && typeof data.models === 'object'
      ? data.models
      : { default: data?.model || 'gemini-3.8-flash' }
  defaultModel.value = models.default || data?.model || 'gemini-3.8-flash'
  customModels.value = Object.entries(models)
    .filter(([k]) => k !== 'default')
    .map(([key, value]) => ({ id: nextRowId++, key, value: String(value) }))
}

function addModelRow() {
  customModels.value.push({ id: nextRowId++, key: '', value: '' })
}

function removeModelRow(index: number) {
  customModels.value.splice(index, 1)
}

async function loadSettings() {
  try {
    const loaded = await ss.api.get('/api/x/core-ai-provider/settings')
    Object.assign(form.value, loaded)
    syncRowsFromSettings(loaded)
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load AI settings'
  }
}

async function loadUsage() {
  try {
    usage.value = await ss.api.get('/api/x/core-ai-provider/usage')
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load AI usage'
  }
}

async function saveSettings() {
  if (saving.value) return
  error.value = ''
  const defVal = defaultModel.value.trim()
  if (!defVal) {
    error.value = 'The default fallback model name must not be empty'
    return
  }
  const models: Record<string, string> = { default: defVal }
  for (const row of customModels.value) {
    const k = row.key.trim()
    const v = row.value.trim()
    if (!k || !v) {
      error.value = 'All model keys and model names must be non-empty'
      return
    }
    if (k in models) {
      error.value = `Duplicate model key: ${k}`
      return
    }
    models[k] = v
  }
  saving.value = true
  try {
    const payload = { ...form.value, model: models.default, models }
    const saved = await ss.api.put('/api/x/core-ai-provider/settings', payload)
    Object.assign(form.value, saved)
    syncRowsFromSettings(saved)
    ss.notify({ level: 'success', message: 'AI settings updated successfully.' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to update AI settings'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
  loadUsage()
})
</script>
<template>
  <div class="ai-settings">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div class="fields">
      <div><label for="ai-provider">Provider engine</label><Select inputId="ai-provider" aria-label="Provider engine" v-model="form.provider" :options="providers" optionLabel="label" optionValue="id" fluid /></div>
      <div class="api-key"><label for="ai-key">API key</label><InputText id="ai-key" v-model="form[keyName]" type="password" autocomplete="new-password" fluid /><small>Stored keys are masked. Leave the mask unchanged to keep the saved key.</small></div>
      <div class="models-section">
        <div class="models-header">
          <span class="models-title">Model definitions (key / provider model)</span>
          <Button label="Add model" icon="pi pi-plus" size="small" outlined class="btn-add-model" @click="addModelRow" />
        </div>
        <div class="model-rows">
          <div class="model-row default-row">
            <InputText id="ai-model-key-default" modelValue="default" aria-label="Fallback model key" disabled readonly fluid />
            <InputText id="ai-model" aria-label="Model name" v-model="defaultModel" class="model-input" fluid />
            <span class="row-spacer" aria-hidden="true" />
          </div>
          <div v-for="(row, idx) in customModels" :key="row.id" class="model-row">
            <InputText :id="`ai-model-key-${idx}`" :aria-label="`Model key ${idx + 1}`" v-model="row.key" class="model-key-input" placeholder="Key (e.g. fast)" fluid />
            <InputText :id="`ai-model-value-${idx}`" :aria-label="`Model name ${idx + 1}`" v-model="row.value" class="model-value-input" placeholder="Provider model name" fluid />
            <Button icon="pi pi-trash" severity="danger" text rounded :aria-label="`Remove model ${row.key || idx + 1}`" class="btn-remove-model" @click="removeModelRow(idx)" />
          </div>
        </div>
      </div>
      <div class="budget-toggle"><ToggleSwitch inputId="enforce-budget" v-model="form.enforce_budget" /><label for="enforce-budget">Enforce monthly budget limit</label></div>
      <div><label for="ai-budget">Monthly budget limit ($)</label><InputNumber inputId="ai-budget" v-model="form.monthly_budget" :min="0" :step=".5" :maxFractionDigits="2" fluid /></div>
    </div>
    <div class="actions"><Button label="Save Settings" class="save-btn" icon="pi pi-check" :loading="saving" @click="saveSettings" /></div>
    <Divider />
    <div class="usage-header"><h4>Usage & cost</h4><Button label="Refresh" icon="pi pi-refresh" text @click="loadUsage" /></div>
    <div class="stats"><div><span>Month spend</span><strong>${{ usage.month_cost_usd?.toFixed(4) || '0.0000' }}</strong></div><div><span>All-time spend</span><strong>${{ usage.total_cost_usd?.toFixed(4) || '0.0000' }}</strong></div><div><span>Input tokens</span><strong>{{ usage.total_input_tokens?.toLocaleString() || '0' }}</strong></div><div><span>Output tokens</span><strong>{{ usage.total_output_tokens?.toLocaleString() || '0' }}</strong></div></div>
    <ul v-if="usage.breakdown_by_plugin?.length" class="usage-list"><li v-for="row in usage.breakdown_by_plugin" :key="row.calling_plugin"><span>{{ row.calling_plugin }}</span><Tag :value="`$${row.cost.toFixed(4)} (${row.call_count} calls)`" severity="secondary" /></li></ul>
  </div>
</template>
<style scoped>
.ai-settings { display: grid; gap: 1rem; }.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }.fields label { display: block; margin-bottom: .5rem; }.api-key, .models-section { grid-column: 1 / -1; }small, .stats span { color: var(--p-text-muted-color); }
.models-header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: .5rem; }.models-title { font-weight: 500; }
.model-rows { display: grid; gap: .5rem; }.model-row { display: grid; grid-template-columns: minmax(8rem, 1fr) 2fr auto; gap: .5rem; align-items: center; }.row-spacer { width: 2.5rem; }
.budget-toggle, .actions, .usage-header, .usage-list li { display: flex; align-items: center; gap: .75rem; justify-content: space-between; }.budget-toggle label { margin: 0; }.actions { justify-content: flex-end; }h4 { margin: 0; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }.stats > div { padding: .75rem; border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); background: var(--p-surface-50); }.stats strong { display: block; margin-top: .5rem; }.usage-list { padding: 0; list-style: none; display: grid; gap: .5rem; }
@media (max-width: 767px) { .fields { grid-template-columns: 1fr; }.model-row { grid-template-columns: 1fr 1fr auto; } }
</style>

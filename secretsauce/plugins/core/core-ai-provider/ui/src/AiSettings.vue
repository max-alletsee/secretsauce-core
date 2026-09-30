<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const ss = useSecretSauce(), saving = ref(false), error = ref('')
const form = ref<any>({ provider: 'gemini', model: 'gemini-3.8-flash', gemini_api_key: '', openai_api_key: '', openrouter_api_key: '', enforce_budget: false, monthly_budget: 10 })
const providers = [{ id: 'gemini', label: 'Google Gemini' }, { id: 'openai', label: 'OpenAI' }, { id: 'openrouter', label: 'OpenRouter' }]
const keyName = computed(() => `${form.value.provider}_api_key`)
const usage = ref<any>({ total_cost_usd: 0, month_cost_usd: 0, total_input_tokens: 0, total_output_tokens: 0, breakdown_by_plugin: [] })
async function loadSettings() {
  try { Object.assign(form.value, await ss.api.get('/api/x/core-ai-provider/settings')) }
  catch (failure: any) { error.value = failure?.message || 'Failed to load AI settings' }
}
async function loadUsage() {
  try { usage.value = await ss.api.get('/api/x/core-ai-provider/usage') }
  catch (failure: any) { error.value = failure?.message || 'Failed to load AI usage' }
}
async function saveSettings() {
  if (saving.value) return
  saving.value = true; error.value = ''
  try { Object.assign(form.value, await ss.api.put('/api/x/core-ai-provider/settings', form.value)); ss.notify({ level: 'success', message: 'AI settings updated successfully.' }) }
  catch (failure: any) { error.value = failure?.message || 'Failed to update AI settings' }
  finally { saving.value = false }
}
onMounted(() => { loadSettings(); loadUsage() })
</script>
<template>
  <div class="ai-settings">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div class="fields">
      <div><label for="ai-provider">Provider engine</label><Select inputId="ai-provider" aria-label="Provider engine" v-model="form.provider" :options="providers" optionLabel="label" optionValue="id" fluid /></div>
      <div><label for="ai-model">Model name</label><InputText id="ai-model" v-model="form.model" class="model-input" fluid /></div>
      <div class="api-key"><label for="ai-key">API key</label><InputText id="ai-key" v-model="form[keyName]" type="password" autocomplete="new-password" fluid /><small>Stored keys are masked. Leave the mask unchanged to keep the saved key.</small></div>
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
.ai-settings { display: grid; gap: 1rem; }.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }.fields label { display: block; margin-bottom: .5rem; }.api-key { grid-column: 1 / -1; }small, .stats span { color: var(--p-text-muted-color); }
.budget-toggle, .actions, .usage-header, .usage-list li { display: flex; align-items: center; gap: .75rem; justify-content: space-between; }.budget-toggle label { margin: 0; }.actions { justify-content: flex-end; }h4 { margin: 0; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }.stats > div { padding: .75rem; border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); background: var(--p-surface-50); }.stats strong { display: block; margin-top: .5rem; }.usage-list { padding: 0; list-style: none; display: grid; gap: .5rem; }
@media (max-width: 767px) { .fields { grid-template-columns: 1fr; } }
</style>

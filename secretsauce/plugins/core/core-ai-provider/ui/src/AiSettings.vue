<template>
  <div class="ai-settings p-4 space-y-6">
    <div class="header flex items-center justify-between">
      <h3 class="text-lg font-semibold text-stone-900">AI Provider & Budget Settings</h3>
      <button
        class="save-btn px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition"
        :disabled="saving"
        @click="saveSettings"
      >
        {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
    </div>

    <!-- Provider Configuration -->
    <div class="settings-card p-4 bg-white border border-stone-200 rounded-lg space-y-4">
      <h4 class="font-medium text-stone-800">Active Provider</h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-stone-600 uppercase mb-1">Provider Engine</label>
          <select
            v-model="form.provider"
            class="provider-select w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-stone-600 uppercase mb-1">Model Name</label>
          <input
            v-model="form.model"
            type="text"
            placeholder="e.g. gemini-3.8-flash"
            class="model-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <!-- API Keys -->
      <div class="space-y-3 pt-2">
        <div v-if="form.provider === 'gemini'">
          <label class="block text-xs font-semibold text-stone-600 uppercase mb-1">Gemini API Key</label>
          <input
            v-model="form.gemini_api_key"
            type="password"
            placeholder="AIzaSy..."
            class="gemini-key-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div v-if="form.provider === 'openai'">
          <label class="block text-xs font-semibold text-stone-600 uppercase mb-1">OpenAI API Key</label>
          <input
            v-model="form.openai_api_key"
            type="password"
            placeholder="sk-proj-..."
            class="openai-key-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div v-if="form.provider === 'openrouter'">
          <label class="block text-xs font-semibold text-stone-600 uppercase mb-1">OpenRouter API Key</label>
          <input
            v-model="form.openrouter_api_key"
            type="password"
            placeholder="sk-or-v1-..."
            class="openrouter-key-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>
    </div>

    <!-- Budget Controls -->
    <div class="settings-card p-4 bg-white border border-stone-200 rounded-lg space-y-4">
      <h4 class="font-medium text-stone-800">Monthly Budget & Safeguards</h4>

      <div class="flex items-center gap-3">
        <input
          id="enforce_budget_checkbox"
          v-model="form.enforce_budget"
          type="checkbox"
          class="budget-checkbox rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
        />
        <label for="enforce_budget_checkbox" class="text-sm font-medium text-stone-700">
          Enforce monthly budget limit (reject calls when exceeded)
        </label>
      </div>

      <div class="w-48">
        <label class="block text-xs font-semibold text-stone-600 uppercase mb-1">Monthly Budget Limit ($)</label>
        <input
          v-model.number="form.monthly_budget"
          type="number"
          step="0.5"
          min="0"
          class="budget-limit-input w-full border border-stone-300 rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-500"
        />
      </div>
    </div>

    <!-- Usage Dashboard -->
    <div class="settings-card p-4 bg-white border border-stone-200 rounded-lg space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-stone-800">Usage & Cost Dashboard</h4>
        <button
          class="refresh-btn text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          @click="loadUsage"
        >
          Refresh
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-box p-3 bg-stone-50 rounded border border-stone-200">
          <div class="text-xs text-stone-500 font-semibold uppercase">Month Spend</div>
          <div class="text-lg font-bold text-stone-900 month-spend-val">${{ usage.month_cost_usd?.toFixed(4) || '0.0000' }}</div>
        </div>
        <div class="stat-box p-3 bg-stone-50 rounded border border-stone-200">
          <div class="text-xs text-stone-500 font-semibold uppercase">All-Time Spend</div>
          <div class="text-lg font-bold text-stone-900">${{ usage.total_cost_usd?.toFixed(4) || '0.0000' }}</div>
        </div>
        <div class="stat-box p-3 bg-stone-50 rounded border border-stone-200">
          <div class="text-xs text-stone-500 font-semibold uppercase">Input Tokens</div>
          <div class="text-lg font-bold text-stone-900">{{ usage.total_input_tokens?.toLocaleString() || '0' }}</div>
        </div>
        <div class="stat-box p-3 bg-stone-50 rounded border border-stone-200">
          <div class="text-xs text-stone-500 font-semibold uppercase">Output Tokens</div>
          <div class="text-lg font-bold text-stone-900">{{ usage.total_output_tokens?.toLocaleString() || '0' }}</div>
        </div>
      </div>

      <div v-if="usage.breakdown_by_plugin?.length" class="mt-4">
        <h5 class="text-xs font-semibold text-stone-600 uppercase mb-2">Spend by Plugin</h5>
        <div class="space-y-1">
          <div
            v-for="b in usage.breakdown_by_plugin"
            :key="b.calling_plugin"
            class="flex items-center justify-between text-xs py-1 px-2 rounded bg-stone-50 border border-stone-100"
          >
            <span class="font-mono text-stone-700">{{ b.calling_plugin }}</span>
            <span class="font-medium text-stone-900">${{ b.cost.toFixed(4) }} ({{ b.call_count }} calls)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'

const props = defineProps<{
  ss?: any
  context?: any
}>()

const api = props.ss?.api || inject<any>('__SS_API__', null)
const notify = props.ss?.notify || inject<any>('__SS_NOTIFY__', null)

const form = ref({
  provider: 'gemini',
  model: 'gemini-3.8-flash',
  gemini_api_key: '',
  openai_api_key: '',
  openrouter_api_key: '',
  enforce_budget: false,
  monthly_budget: 10.0,
})

const usage = ref<any>({
  total_cost_usd: 0,
  month_cost_usd: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  breakdown_by_plugin: [],
})

const saving = ref(false)

async function loadSettings() {
  if (!api) return
  try {
    const data = await api.get('/api/x/core-ai-provider/settings')
    if (data) {
      form.value = {
        provider: data.provider || 'gemini',
        model: data.model || 'gemini-3.8-flash',
        gemini_api_key: data.gemini_api_key || '',
        openai_api_key: data.openai_api_key || '',
        openrouter_api_key: data.openrouter_api_key || '',
        enforce_budget: Boolean(data.enforce_budget),
        monthly_budget: Number(data.monthly_budget ?? 10.0),
      }
    }
  } catch (err) {
    console.error('Failed to load AI settings', err)
  }
}

async function loadUsage() {
  if (!api) return
  try {
    const data = await api.get('/api/x/core-ai-provider/usage')
    if (data) {
      usage.value = data
    }
  } catch (err) {
    console.error('Failed to load AI usage', err)
  }
}

async function saveSettings() {
  if (!api) return
  saving.value = true
  try {
    const updated = await api.put('/api/x/core-ai-provider/settings', form.value)
    if (updated) {
      form.value = { ...form.value, ...updated }
    }
    if (notify) {
      notify({ level: 'success', message: 'AI settings updated successfully.' })
    }
  } catch (err) {
    if (notify) {
      notify({ level: 'error', message: 'Failed to update AI settings.' })
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
  loadUsage()
})
</script>

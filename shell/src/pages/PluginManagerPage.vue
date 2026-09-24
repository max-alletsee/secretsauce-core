<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { Slot, type ApiClient } from '@secretsauce/ui'

interface PluginRow {
  id: string
  name?: string
  description?: string
  state: string
  enabled: boolean
  error?: string | null
  commands?: { id: string; title: string }[]
}

const api = inject<ApiClient>('__SS_API__')!
const plugins = ref<PluginRow[]>([])
const message = ref<string | null>(null)

async function loadPlugins() {
  try {
    // GET /api/plugins answers a plain list.
    const res = await api.get<PluginRow[] | { items: PluginRow[] }>('/api/plugins')
    plugins.value = Array.isArray(res) ? res : res?.items || []
  } catch (err) {
    console.error(err)
  }
}

async function togglePlugin(plugin: PluginRow) {
  await api.post(`/api/plugins/${plugin.id}/${plugin.enabled ? 'disable' : 'enable'}`)
  await loadPlugins()
}

async function runCommand(plugin: PluginRow, command: { id: string; title: string }) {
  try {
    const res = await api.post<{ job_id: string }>(`/api/plugins/${plugin.id}/commands/${command.id}`)
    message.value = `${command.title} started (job ${res?.job_id ?? '?'})`
  } catch (err: any) {
    message.value = `${command.title} failed: ${err?.message || err}`
  }
}

function errorSummary(error: string): string {
  const lines = error.trim().split('\n')
  return lines[lines.length - 1]
}

onMounted(loadPlugins)
</script>

<template>
  <div class="ss-plugin-manager">
    <h2>Plugin Manager</h2>
    <p v-if="message" class="notice" role="status">{{ message }}</p>
    <div class="plugin-list">
      <div v-for="p in plugins" :key="p.id" class="plugin-card">
        <div class="card-header">
          <strong>{{ p.name || p.id }} ({{ p.id }})</strong>
          <span :class="['status', p.state]">{{ p.state }}</span>
        </div>
        <p>{{ p.description }}</p>
        <details v-if="p.error && (p.state === 'errored' || p.state === 'blocked')" class="error">
          <summary>{{ errorSummary(p.error) }}</summary>
          <pre>{{ p.error }}</pre>
        </details>
        <div class="card-actions">
          <button @click="togglePlugin(p)">
            {{ p.enabled ? 'Disable' : 'Enable' }}
          </button>
          <button
            v-for="c in p.commands || []"
            :key="c.id"
            :data-command="c.id"
            :disabled="p.state !== 'active'"
            @click="runCommand(p, c)"
          >
            {{ c.title }}
          </button>
          <Slot name="plugin_manager.plugin.actions" :context="{ plugin: p }" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-plugin-manager {
  padding: 24px;
  max-width: 900px;
}
.plugin-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.plugin-card {
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  padding: 16px;
  background: #fff;
}
.card-header {
  display: flex;
  justify-content: space-between;
}
.status.active {
  color: #15803d;
}
.status.disabled {
  color: #854d0e;
}
.status.errored {
  color: #b91c1c;
}
.status.blocked {
  color: #b45309;
}
.error summary {
  color: #b91c1c;
  cursor: pointer;
}
.error pre {
  white-space: pre-wrap;
  font-size: 0.8em;
  max-height: 240px;
  overflow: auto;
}
.notice {
  color: #1c1917;
}
.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>

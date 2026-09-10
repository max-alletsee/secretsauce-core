<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { Slot, type ApiClient } from '@secretsauce/ui'

const api = inject<ApiClient>('__SS_API__')!
const plugins = ref<any[]>([])

async function loadPlugins() {
  try {
    const res = await api.get<{ items: any[] }>('/api/plugins')
    plugins.value = res.items || []
  } catch (err) {
    console.error(err)
  }
}

async function togglePlugin(plugin: any) {
  if (plugin.enabled) {
    await api.post(`/api/plugins/${plugin.id}/disable`)
  } else {
    await api.post(`/api/plugins/${plugin.id}/enable`)
  }
  await loadPlugins()
}

onMounted(loadPlugins)
</script>

<template>
  <div class="ss-plugin-manager">
    <h2>Plugin Manager</h2>
    <div class="plugin-list">
      <div v-for="p in plugins" :key="p.id" class="plugin-card">
        <div class="card-header">
          <strong>{{ p.name }} ({{ p.id }})</strong>
          <span :class="['status', p.state]">{{ p.state }}</span>
        </div>
        <p>{{ p.description }}</p>
        <div class="card-actions">
          <button @click="togglePlugin(p)">
            {{ p.enabled ? 'Disable' : 'Enable' }}
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
.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>

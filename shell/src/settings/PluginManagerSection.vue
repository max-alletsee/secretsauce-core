<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { Slot, type ApiClient } from '@secretsauce/ui'
import type { createPluginLoader } from '../registries/plugins'
interface PluginRow { id: string; name?: string; description?: string; state: string; enabled: boolean; error?: string | null; commands?: { id: string; title: string }[] }
const api = inject<ApiClient>('__SS_API__')!
const loader = inject<ReturnType<typeof createPluginLoader> | null>('__SS_PLUGIN_LOADER__', null)
const plugins = ref<PluginRow[]>([]), pending = ref(new Set<string>()), message = ref(''), error = ref('')
const severity: Record<string, string> = { active: 'success', disabled: 'secondary', errored: 'danger', blocked: 'warn' }
async function loadPlugins() { plugins.value = await api.get<PluginRow[]>('/api/plugins') }
async function toggle(plugin: PluginRow) {
  if (pending.value.has(plugin.id)) return
  pending.value.add(plugin.id); error.value = ''
  try {
    await api.post(`/api/plugins/${plugin.id}/${plugin.enabled ? 'disable' : 'enable'}`)
    // Disabling a dependency can deactivate several plugins: reconcile the full active list.
    if (loader) await loader.syncActivePlugins(api)
    await loadPlugins()
  } catch (err: any) { error.value = err.message || 'Could not update plugin'; await loadPlugins().catch(() => {}) }
  finally { pending.value.delete(plugin.id) }
}
async function runCommand(plugin: PluginRow, command: { id: string; title: string }) {
  if (pending.value.has(plugin.id)) return
  pending.value.add(plugin.id)
  try { const result = await api.post<{ job_id: string }>(`/api/plugins/${plugin.id}/commands/${command.id}`); message.value = `${command.title} started (job ${result.job_id})` }
  catch (err: any) { error.value = `${command.title} failed: ${err.message || err}` }
  finally { pending.value.delete(plugin.id) }
}
function errorSummary(value: string) { return value.trim().split('\n').at(-1) }
onMounted(() => loadPlugins().catch((err: any) => { error.value = err.message || 'Could not load plugins' }))
</script>
<template>
  <div class="ss-plugin-manager">
    <Message v-if="message" severity="info" role="status">{{ message }}</Message><Message v-if="error" severity="error">{{ error }}</Message>
    <div class="plugin-list">
      <div v-for="p in plugins" :key="p.id" :data-plugin-id="p.id" class="plugin-card">
        <div class="card-header"><strong>{{ p.name || p.id }}</strong><Tag :value="p.state" :severity="severity[p.state]" /></div>
        <p>{{ p.description }}</p>
        <details v-if="p.error" class="error"><summary>{{ errorSummary(p.error) }}</summary><pre>{{ p.error }}</pre></details>
        <div class="card-actions"><ToggleSwitch :modelValue="p.enabled" :aria-label="`Enable ${p.name || p.id}`" :disabled="pending.has(p.id)" @update:modelValue="toggle(p)" />
          <Button v-for="command in p.commands || []" :key="command.id" :data-command="command.id" :label="command.title" size="small" outlined :disabled="p.state !== 'active' || pending.has(p.id)" @click="runCommand(p, command)" />
          <Slot name="plugin_manager.plugin.actions" :context="{ plugin: p }" />
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.plugin-list { display: flex; flex-direction: column; gap: 1rem; }
.plugin-card { border: 1px solid var(--p-content-border-color); border-radius: var(--p-content-border-radius); padding: 1rem; background: var(--p-content-background); }
.card-header { display: flex; justify-content: space-between; gap: .5rem; }
.card-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; margin-top: .75rem; }
.error { color: var(--p-red-600); }
.error pre { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 15rem; overflow: auto; }
</style>

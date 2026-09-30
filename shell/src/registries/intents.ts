import { ref, markRaw } from 'vue'
import type { IntentHub, IntentProvider } from '@secretsauce/ui'

export function createIntentRegistry() {
  const hubs = ref<Map<string, IntentHub>>(new Map())
  const providers = ref<(IntentProvider & { pluginId: string })[]>([])

  function registerHub(hub: IntentHub) {
    hubs.value.set(hub.id, hub)
  }

  function registerProvider(pluginId: string, provider: IntentProvider) {
    if (!((provider.kind === 'ui' && provider.component) ||
      (provider.kind === 'headless' && typeof provider.execute === 'function'))) {
      console.error(`Invalid intent provider ${pluginId}/${provider.id}: expected ui/component or headless/execute`)
      return
    }
    providers.value.push({ ...provider, ...(provider.component ? { component: markRaw(provider.component) } : {}), pluginId })
  }

  function unregister(pluginId: string) {
    providers.value = providers.value.filter((p) => p.pluginId !== pluginId)
  }

  function getProviders(hubId: string): IntentProvider[] {
    if (!hubs.value.has(hubId)) return []
    return providers.value
      .filter((p) => p.hub === hubId)
      .sort((a, b) => a.order - b.order)
  }

  return { hubs, providers, registerHub, registerProvider, unregister, getProviders }
}

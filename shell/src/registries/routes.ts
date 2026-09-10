import { ref, markRaw } from 'vue'
import type { RouteDef } from '@secretsauce/ui'

export interface RegisteredRouteEntry {
  pluginId: string
  def: RouteDef
}

export function createRouteRegistry() {
  const entries = ref<RegisteredRouteEntry[]>([])

  function register(pluginId: string, def: RouteDef) {
    entries.value.push({
      pluginId,
      def: { ...def, component: markRaw(def.component), order: def.order ?? 50 },
    })
  }

  function unregister(pluginId: string) {
    entries.value = entries.value.filter((e) => e.pluginId !== pluginId)
  }

  function getRoutes(): RouteDef[] {
    const map = new Map<string, RegisteredRouteEntry>()
    for (const item of entries.value) {
      const existing = map.get(item.def.path)
      if (!existing || (item.def.order ?? 50) < (existing.def.order ?? 50)) {
        map.set(item.def.path, item)
      }
    }
    return Array.from(map.values())
      .map((e) => e.def)
      .sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
  }

  return { entries, register, unregister, getRoutes }
}

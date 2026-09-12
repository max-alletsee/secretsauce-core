import { ref, markRaw } from 'vue'
import type { RouteDef } from '@secretsauce/ui'
import type { Router } from 'vue-router'

export interface RegisteredRouteEntry {
  pluginId: string
  def: RouteDef
}

export function createRouteRegistry() {
  const entries = ref<RegisteredRouteEntry[]>([])
  let boundRouter: Router | null = null

  function bindRouter(router: Router) {
    boundRouter = router
    for (const entry of entries.value) {
      addRouterRoute(entry.def)
    }
  }

  function addRouterRoute(def: RouteDef) {
    if (!boundRouter) return
    if (!boundRouter.hasRoute(def.path)) {
      boundRouter.addRoute({
        name: def.path,
        path: def.path,
        component: def.component,
        props: true,
      })
    }
  }

  function register(pluginId: string, def: RouteDef) {
    entries.value.push({
      pluginId,
      def: { ...def, component: markRaw(def.component), order: def.order ?? 50 },
    })
    addRouterRoute(def)
  }

  function unregister(pluginId: string) {
    const toRemove = entries.value.filter((e) => e.pluginId === pluginId)
    entries.value = entries.value.filter((e) => e.pluginId !== pluginId)
    if (boundRouter) {
      for (const item of toRemove) {
        if (boundRouter.hasRoute(item.def.path)) {
          boundRouter.removeRoute(item.def.path)
        }
      }
    }
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

  return { entries, register, unregister, getRoutes, bindRouter }
}

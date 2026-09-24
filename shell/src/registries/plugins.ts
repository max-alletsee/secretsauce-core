import { API_VERSION, type SecretSauceUI } from '@secretsauce/ui'

export interface ActivePluginItem {
  id: string
  name: string
  version?: string
  state?: string
  ui_entry?: string | null
  ui_css?: string | null
  ui?: boolean | string | null
  ui_api?: number
  hash?: string
}

export interface PluginLoaderContext {
  routes: ReturnType<typeof import('./routes').createRouteRegistry>
  slots: ReturnType<typeof import('./slots').createSlotRegistry>
  intents: ReturnType<typeof import('./intents').createIntentRegistry>
  settings: ReturnType<typeof import('./settings').createSettingsRegistry>
  i18n: ReturnType<typeof import('./i18n').createI18nRegistry>
  makeSecretSauceUI(pluginId: string): SecretSauceUI
  /** BASE_PATH the app is served under, e.g. '/' or '/sauce/'. */
  basePath?: string
  /** Module loader; defaults to dynamic import (overridable in tests). */
  importModule?: (url: string) => Promise<any>
}

type PluginModule = { default?: unknown; activate?: unknown }

export function createPluginLoader(ctx: PluginLoaderContext) {
  const loadedPlugins = new Set<string>()
  const base = (ctx.basePath || '/').endsWith('/') ? ctx.basePath || '/' : `${ctx.basePath}/`
  const importModule =
    ctx.importModule || ((url: string) => import(/* @vite-ignore */ url) as Promise<PluginModule>)

  function isLoadable(plugin: ActivePluginItem): boolean {
    if (loadedPlugins.has(plugin.id)) return false
    if (plugin.state && plugin.state !== 'active') return false
    if (plugin.ui_api != null && plugin.ui_api !== API_VERSION) return false
    return Boolean(plugin.ui_entry || plugin.ui)
  }

  function bundleUrl(plugin: ActivePluginItem): string {
    // The kernel sends ui_entry with the base path and a content version.
    if (plugin.ui_entry) return plugin.ui_entry
    const version = plugin.hash ? `${plugin.version || '1'}_${plugin.hash}` : plugin.version || '1'
    return `${base}api/plugins/${plugin.id}/ui.js?v=${version}`
  }

  function injectCss(plugin: ActivePluginItem) {
    if (!plugin.ui_css || typeof document === 'undefined') return
    const cssId = `plugin-css-${plugin.id}`
    if (document.getElementById(cssId)) return
    const link = document.createElement('link')
    link.id = cssId
    link.rel = 'stylesheet'
    link.href = plugin.ui_css
    document.head.appendChild(link)
  }

  function runActivate(plugin: ActivePluginItem, mod: PluginModule | null) {
    const activate = mod && (mod.default || mod.activate)
    if (typeof activate !== 'function') return
    try {
      activate(ctx.makeSecretSauceUI(plugin.id))
      loadedPlugins.add(plugin.id)
    } catch (err) {
      console.error(`Failed to activate plugin ${plugin.id}:`, err)
    }
  }

  async function fetchModule(plugin: ActivePluginItem): Promise<PluginModule | null> {
    injectCss(plugin)
    try {
      return await importModule(bundleUrl(plugin))
    } catch (err) {
      console.error(`Failed to load plugin ${plugin.id}:`, err)
      return null
    }
  }

  async function activatePlugin(plugin: ActivePluginItem) {
    if (!isLoadable(plugin)) return
    runActivate(plugin, await fetchModule(plugin))
  }

  async function loadActivePlugins(api: { get<T>(url: string): Promise<T> }) {
    let activeList: ActivePluginItem[]
    try {
      activeList = await api.get<ActivePluginItem[]>('/api/plugins/active')
    } catch (err) {
      console.error('Failed to load active plugins:', err)
      return
    }
    if (!Array.isArray(activeList)) return

    // Download every bundle at once, then activate in the kernel's order so
    // registration order (routes, slots) stays deterministic.
    const loadable = activeList.filter(isLoadable)
    const modules = await Promise.all(loadable.map(fetchModule))
    loadable.forEach((plugin, i) => runActivate(plugin, modules[i]))
  }

  function deactivatePlugin(pluginId: string) {
    ctx.routes.unregister(pluginId)
    ctx.slots.unregister(pluginId)
    ctx.intents.unregister(pluginId)
    ctx.settings.unregister(pluginId)

    if (typeof document !== 'undefined') {
      document.getElementById(`plugin-css-${pluginId}`)?.remove()
    }
    loadedPlugins.delete(pluginId)
  }

  return { loadedPlugins, activatePlugin, loadActivePlugins, deactivatePlugin }
}

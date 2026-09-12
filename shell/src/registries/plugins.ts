import { API_VERSION, type SecretSauceUI } from '@secretsauce/ui'

export interface ActivePluginItem {
  id: string
  name: string
  version?: string
  state?: string
  ui_entry?: string | null
  ui_css?: string | null
  ui?: boolean
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
}

export function createPluginLoader(ctx: PluginLoaderContext) {
  const loadedPlugins = new Set<string>()

  async function activatePlugin(plugin: ActivePluginItem) {
    if (loadedPlugins.has(plugin.id)) return
    if (plugin.state && plugin.state !== 'active') return
    if (plugin.ui_api != null && plugin.ui_api !== API_VERSION) return

    let bundleUrl: string | null = null
    if (plugin.ui_entry) {
      bundleUrl = plugin.ui_entry
    } else if (plugin.ui) {
      const versionQuery = plugin.hash
        ? `${plugin.version || '1'}_${plugin.hash}`
        : plugin.version || '1'
      bundleUrl = `/api/plugins/${plugin.id}/ui.js?v=${versionQuery}`
    }

    if (!bundleUrl) return

    // Inject CSS stylesheet into DOM head if present
    if (plugin.ui_css && typeof document !== 'undefined') {
      const cssId = `plugin-css-${plugin.id}`
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link')
        link.id = cssId
        link.rel = 'stylesheet'
        link.href = plugin.ui_css
        document.head.appendChild(link)
      }
    }

    try {
      const mod = await import(/* @vite-ignore */ bundleUrl)
      const activate = mod.default || mod.activate
      if (typeof activate === 'function') {
        const ss = ctx.makeSecretSauceUI(plugin.id)
        activate(ss)
        loadedPlugins.add(plugin.id)
      }
    } catch (err) {
      console.error(`Failed to activate plugin ${plugin.id}:`, err)
    }
  }

  async function loadActivePlugins(api: { get<T>(url: string): Promise<T> }) {
    try {
      const activeList = await api.get<ActivePluginItem[]>('/api/plugins/active')
      if (Array.isArray(activeList)) {
        for (const p of activeList) {
          if ((p.ui_entry || p.ui) && (!p.state || p.state === 'active')) {
            await activatePlugin(p)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load active plugins:', err)
    }
  }

  function deactivatePlugin(pluginId: string) {
    ctx.routes.unregister(pluginId)
    ctx.slots.unregister(pluginId)
    ctx.intents.unregister(pluginId)
    ctx.settings.unregister(pluginId)

    if (typeof document !== 'undefined') {
      const cssEl = document.getElementById(`plugin-css-${pluginId}`)
      if (cssEl) cssEl.remove()
    }

    loadedPlugins.delete(pluginId)
  }

  return { loadedPlugins, activatePlugin, loadActivePlugins, deactivatePlugin }
}

import { API_VERSION, type SecretSauceUI } from '@secretsauce/ui'

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

  async function activatePlugin(plugin: {
    id: string
    ui: boolean
    ui_api: number
    version: string
    hash?: string
  }) {
    if (!plugin.ui || loadedPlugins.has(plugin.id)) return
    if (plugin.ui_api !== API_VERSION) return

    const versionQuery = plugin.hash ? `${plugin.version}_${plugin.hash}` : plugin.version
    const bundleUrl = `/api/plugins/${plugin.id}/ui.js?v=${versionQuery}`

    try {
      const mod = await import(/* @vite-ignore */ bundleUrl)
      if (typeof mod.default === 'function') {
        const ss = ctx.makeSecretSauceUI(plugin.id)
        mod.default(ss)
        loadedPlugins.add(plugin.id)
      }
    } catch (err) {
      console.error(`Failed to activate plugin ${plugin.id}:`, err)
    }
  }

  function deactivatePlugin(pluginId: string) {
    ctx.routes.unregister(pluginId)
    ctx.slots.unregister(pluginId)
    ctx.intents.unregister(pluginId)
    ctx.settings.unregister(pluginId)
    loadedPlugins.delete(pluginId)
  }

  return { loadedPlugins, activatePlugin, deactivatePlugin }
}

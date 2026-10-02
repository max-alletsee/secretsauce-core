import type { createSettingsRegistry } from '../registries/settings'
import HouseholdSettings from './HouseholdSettings.vue'
import PluginManagerSection from './PluginManagerSection.vue'
import DeviceSettings from './DeviceSettings.vue'

export function registerShellSettings(registry: ReturnType<typeof createSettingsRegistry>) {
  registry.register('shell', { id: 'household', title: 'Household', order: 0, component: HouseholdSettings })
  registry.register('shell', { id: 'plugins', title: 'Plugins', order: 900, component: PluginManagerSection })
  registry.register('shell', { id: 'device', title: 'This device', order: 1000, component: DeviceSettings })
}

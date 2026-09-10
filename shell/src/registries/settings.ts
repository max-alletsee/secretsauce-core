import { ref, markRaw, type Component } from 'vue'

export interface SettingsSection {
  pluginId: string
  id: string
  title: string
  component: Component
  order: number
}

export function createSettingsRegistry() {
  const sections = ref<SettingsSection[]>([])

  function register(
    pluginId: string,
    def: { id: string; title: string; component: Component; order?: number }
  ) {
    sections.value.push({
      pluginId,
      id: def.id,
      title: def.title,
      component: markRaw(def.component),
      order: def.order ?? 50,
    })
  }

  function unregister(pluginId: string) {
    sections.value = sections.value.filter((s) => s.pluginId !== pluginId)
  }

  function getSections(): SettingsSection[] {
    return [...sections.value].sort((a, b) => a.order - b.order)
  }

  return { sections, register, unregister, getSections }
}

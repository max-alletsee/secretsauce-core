import { ref, markRaw, type Component } from 'vue'

export interface SlotEntry {
  pluginId: string
  slotName: string
  id: string
  order: number
  component: Component
}

export function createSlotRegistry() {
  const slots = ref<SlotEntry[]>([])

  function register(
    pluginId: string,
    slotName: string,
    component: Component,
    opts?: { order?: number }
  ) {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `${pluginId}-${crypto.randomUUID()}`
        : `${pluginId}-${Date.now()}-${Math.random()}`
    slots.value.push({
      pluginId,
      slotName,
      id,
      order: opts?.order ?? 50,
      component: markRaw(component),
    })
  }

  function unregister(pluginId: string) {
    slots.value = slots.value.filter((s) => s.pluginId !== pluginId)
  }

  function getContributions(slotName: string) {
    return slots.value
      .filter((s) => s.slotName === slotName)
      .sort((a, b) => a.order - b.order)
  }

  return { slots, register, unregister, getContributions }
}

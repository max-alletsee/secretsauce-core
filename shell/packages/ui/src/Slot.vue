<script setup lang="ts">
import { inject, computed, type Component } from 'vue'

interface SlotContribution {
  id: string
  order: number
  component: Component
}

interface SlotRegistryContext {
  getContributions(name: string): SlotContribution[]
}

const props = defineProps<{
  name: string
  context?: Record<string, any>
}>()

const registry = inject<SlotRegistryContext>('__SS_SLOT_REGISTRY__', {
  getContributions: () => [],
})

const contributions = computed(() => {
  const items = registry.getContributions(props.name) || []
  return [...items].sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
})
</script>

<template>
  <component
    v-for="contrib in contributions"
    :is="contrib.component"
    :key="contrib.id"
    :context="props.context || {}"
  />
</template>

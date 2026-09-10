<script setup lang="ts">
import { inject, computed, ref } from 'vue'
import type { IntentProvider } from './types'

interface IntentRegistryContext {
  getProviders(hub: string): IntentProvider[]
}

const props = defineProps<{
  hub: string
  context?: any
  label?: string
}>()

const emit = defineEmits<{
  (e: 'resolve', result: any): void
  (e: 'cancel'): void
}>()

const registry = inject<IntentRegistryContext>('__SS_INTENT_REGISTRY__', {
  getProviders: () => [],
})

const activeDialog = ref<IntentProvider | null>(null)
const showMenu = ref(false)

const availableProviders = computed(() => {
  const list = registry.getProviders(props.hub) || []
  return list
    .filter(p => (p.isAvailable ? p.isAvailable(props.context) : true))
    .sort((a, b) => a.order - b.order)
})

async function handleClick() {
  if (availableProviders.value.length === 1) {
    await runProvider(availableProviders.value[0])
  } else if (availableProviders.value.length > 1) {
    showMenu.value = !showMenu.value
  }
}

async function runProvider(provider: IntentProvider) {
  showMenu.value = false
  if (provider.kind === 'headless' && provider.execute) {
    const result = await provider.execute(props.context)
    emit('resolve', result)
  } else if (provider.kind === 'ui' && provider.component) {
    activeDialog.value = provider
  }
}

function handleDialogResolve(result: any) {
  activeDialog.value = null
  emit('resolve', result)
}

function handleDialogCancel() {
  activeDialog.value = null
  emit('cancel')
}
</script>

<template>
  <template v-if="availableProviders.length > 0">
    <button
      type="button"
      class="ss-intent-trigger"
      @click="handleClick"
    >
      {{ props.label || availableProviders[0].title }}
    </button>

    <div v-if="showMenu && availableProviders.length > 1" class="ss-intent-menu">
      <button
        v-for="provider in availableProviders"
        :key="provider.id"
        type="button"
        @click="runProvider(provider)"
      >
        {{ provider.title }}
      </button>
    </div>

    <div v-if="activeDialog" class="ss-intent-modal-overlay">
      <div class="ss-intent-modal">
        <component
          :is="activeDialog.component"
          :context="props.context"
          @resolve="handleDialogResolve"
          @cancel="handleDialogCancel"
        />
      </div>
    </div>
  </template>
</template>

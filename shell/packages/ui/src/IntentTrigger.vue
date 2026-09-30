<script setup lang="ts">
import { inject, computed, ref, shallowRef } from 'vue'
import type { IntentProvider } from './types'

const props = defineProps<{ hub: string; context?: any; label?: string }>()
const emit = defineEmits<{ resolve: [result: any]; cancel: [] }>()
const registry = inject<{ getProviders(hub: string): IntentProvider[] }>('__SS_INTENT_REGISTRY__', { getProviders: () => [] })
const menu = ref<any>()
const activeDialog = shallowRef<IntentProvider | null>(null)
const busy = ref(false), error = ref('')
const availableProviders = computed(() => registry.getProviders(props.hub)
  .filter(provider => !provider.isAvailable || provider.isAvailable(props.context))
  .slice().sort((a, b) => a.order - b.order))
function reason(provider: IntentProvider) {
  return provider.disabledReason?.(props.context) || ''
}
const menuModel = computed(() => availableProviders.value.map(provider => ({
  label: provider.title, icon: provider.icon ? `pi pi-${provider.icon}` : undefined,
  disabled: !!reason(provider), reason: reason(provider), command: () => runProvider(provider),
})))
async function open(event: Event) {
  if (busy.value) return
  error.value = ''
  if (availableProviders.value.length === 1) await runProvider(availableProviders.value[0])
  else menu.value?.toggle(event)
}
async function runProvider(provider: IntentProvider) {
  if (busy.value || reason(provider)) return
  menu.value?.hide()
  error.value = ''
  if (provider.kind === 'ui') { activeDialog.value = provider; return }
  busy.value = true
  try { emit('resolve', await provider.execute!(props.context)) }
  catch (failure: any) { error.value = failure?.message || 'Action failed' }
  finally { busy.value = false }
}
function resolve(result: any) { activeDialog.value = null; emit('resolve', result) }
function cancel() { if (activeDialog.value) { activeDialog.value = null; emit('cancel') } }
</script>

<template>
  <template v-if="availableProviders.length">
    <slot :open="open">
      <span v-tooltip="availableProviders.length === 1 ? reason(availableProviders[0]) : ''">
        <Button class="ss-intent-trigger" :label="label || availableProviders[0].title" :loading="busy"
          :disabled="busy || (availableProviders.length === 1 && !!reason(availableProviders[0]))"
          :icon="availableProviders.length > 1 ? 'pi pi-chevron-down' : availableProviders[0].icon ? `pi pi-${availableProviders[0].icon}` : undefined"
          :iconPos="availableProviders.length > 1 ? 'right' : 'left'" :aria-haspopup="availableProviders.length > 1 ? 'menu' : undefined" @click="open" />
      </span>
    </slot>
    <Menu ref="menu" :model="menuModel" popup>
      <template #item="{ item, props: menuProps }">
        <a v-bind="menuProps.action" v-tooltip="item.reason" class="ss-intent-item">
          <span v-if="item.icon" :class="item.icon" aria-hidden="true"/><span>{{ item.label }}</span>
        </a>
      </template>
    </Menu>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <Dialog :visible="!!activeDialog" :header="activeDialog?.title" modal :style="{ width: 'min(52rem, 95vw)' }"
      @update:visible="visible => { if (!visible) cancel() }" @hide="cancel">
      <component v-if="activeDialog" :is="activeDialog.component" :context="context" @resolve="resolve" @cancel="cancel" />
    </Dialog>
  </template>
</template>

<style scoped>
.ss-intent-item { display: flex; align-items: center; gap: .5rem; pointer-events: auto; }
</style>

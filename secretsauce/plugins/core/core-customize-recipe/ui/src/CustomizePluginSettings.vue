<script setup lang="ts">
import { ref } from 'vue'
import CustomizeSettings from './CustomizeSettings.vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  context?: {
    plugin?: {
      id: string
      name?: string
      state: string
      enabled?: boolean
    }
  }
}>()

const expanded = ref(false)

function toggleExpand() {
  expanded.value = !expanded.value
}
</script>

<template>
  <template v-if="context?.plugin?.id === 'core-customize-recipe'">
    <Button
      :label="expanded ? 'Close Settings' : 'Settings'"
      :icon="expanded ? 'pi pi-chevron-up' : 'pi pi-cog'"
      size="small"
      :outlined="!expanded"
      :disabled="context?.plugin?.state !== 'active'"
      class="btn-customize-settings-toggle"
      @click="toggleExpand"
    />
    <div
      v-if="expanded && context?.plugin?.state === 'active'"
      class="customize-inline-settings"
    >
      <CustomizeSettings />
    </div>
  </template>
</template>

<style scoped>
.customize-inline-settings {
  flex-basis: 100%;
  width: 100%;
  margin-top: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--p-content-border-color);
}
</style>

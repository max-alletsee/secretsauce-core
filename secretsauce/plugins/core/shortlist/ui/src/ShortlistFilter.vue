<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  context?: {
    active?: boolean
    toggle?: () => void
  }
}>()

const emit = defineEmits<{
  toggle: []
}>()

const localActive = ref(false)

function onToggle() {
  emit('toggle')
  if (props.context?.toggle) {
    props.context.toggle()
  } else {
    localActive.value = !localActive.value
  }
}
</script>

<template>
  <button
    type="button"
    class="shortlist-filter-chip"
    :class="{ active: props.context?.active ?? localActive }"
    @click="onToggle"
  >
    ★ Shortlist
  </button>
</template>

<style scoped>
.shortlist-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid #d6d3d1;
  background: white;
  font-size: 0.85rem;
  color: #44403c;
  cursor: pointer;
  transition: all 0.15s;
}
.shortlist-filter-chip.active {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #b45309;
  font-weight: 500;
}
</style>

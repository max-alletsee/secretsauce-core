<script setup lang="ts">
const props = defineProps<{
  context?: {
    entry?: any
  }
}>()
</script>

<template>
  <span v-if="context?.entry?.is_cooked" class="cooked-checkmark" title="Cooked">
    ✓
  </span>
</template>

<style scoped>
.cooked-checkmark {
  color: #16a34a;
  font-weight: bold;
  font-size: 0.9em;
  margin-left: 4px;
}
</style>

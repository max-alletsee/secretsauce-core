<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{ context?: { active?: boolean; toggle?: () => void } }>()
const emit = defineEmits<{ toggle: [] }>()
const localActive = ref(false)
function onToggle() { emit('toggle'); if (props.context?.toggle) props.context.toggle(); else localActive.value = !localActive.value }
</script>
<template>
  <Button class="shortlist-filter-chip" label="Shortlist" icon="pi pi-star" :aria-pressed="props.context?.active ?? localActive" :outlined="!(props.context?.active ?? localActive)" size="small" @click="onToggle" />
</template>

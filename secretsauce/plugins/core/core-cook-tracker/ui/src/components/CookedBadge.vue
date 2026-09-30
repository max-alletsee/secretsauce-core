<script setup lang="ts">
defineProps<{ context?: { entry?: any } }>()
</script>
<template><Tag v-if="context?.entry?.is_cooked" value="Cooked" icon="pi pi-check" severity="success" title="Cooked" /></template>

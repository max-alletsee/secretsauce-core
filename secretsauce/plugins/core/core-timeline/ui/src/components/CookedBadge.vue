<script setup lang="ts">
defineProps<{ context?: { entry?: any } }>()
</script>
<template><Tag v-if="context?.entry?.status === 'cooked'" value="Cooked" icon="pi pi-check" severity="success" title="Cooked" /></template>

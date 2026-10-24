<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'

defineProps<{ showNavigation?: boolean }>()
const emit = defineEmits<{ navigation: [] }>()
const householdStore = useHouseholdStore()
</script>

<template>
  <header class="ss-app-header">
    <div class="header-left">
      <Button v-if="showNavigation" class="navigation-toggle" icon="pi pi-bars" text rounded aria-label="Open navigation" @click="emit('navigation')" />
      <Slot name="shell.header.left" />
      <span class="household-title">{{ householdStore.household.household_name }}</span>
    </div>

    <div class="header-right">
      <Slot name="shell.header.right" />
    </div>
  </header>
</template>

<style scoped>
.ss-app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .5rem 1rem;
  background-color: var(--p-surface-0);
  border-bottom: 1px solid var(--p-content-border-color);
}
.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.household-title {
  font-weight: bold;
  font-size: 1.05rem;
  color: var(--p-text-color);
}
.navigation-toggle { display: none; }
@media (max-width: 767px) {
  .navigation-toggle { display: inline-flex; width: 2rem; height: 2rem; padding: 0; }
  .ss-app-header { padding: .375rem .625rem; gap: .375rem; }
  .household-title { font-size: .95rem; }
}
</style>

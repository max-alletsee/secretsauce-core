<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'

const householdStore = useHouseholdStore()
</script>

<template>
  <header class="ss-app-header">
    <div class="header-left">
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
@media (max-width: 767px) {
  .ss-app-header { padding: .375rem .625rem; gap: .375rem; }
  .household-title { font-size: .95rem; }
}
</style>

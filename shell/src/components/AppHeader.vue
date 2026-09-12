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
  padding: 12px 24px;
  background-color: #faf7f2;
  border-bottom: 1px solid #e7e5e4;
}
.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.household-title {
  font-weight: bold;
  font-size: 1.2em;
  color: #1c1917;
}
</style>

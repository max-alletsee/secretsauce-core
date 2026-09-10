<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
import { useMemberStore } from '../stores/member'
import { useHouseholdStore } from '../stores/household'

const memberStore = useMemberStore()
const householdStore = useHouseholdStore()

function handleMemberChange(e: Event) {
  const target = e.target as HTMLSelectElement
  if (target.value) {
    memberStore.setCurrentMember(target.value)
  }
}
</script>

<template>
  <header class="ss-app-header">
    <div class="header-left">
      <Slot name="shell.header.left" />
      <span class="household-title">{{ householdStore.household.household_name }}</span>
    </div>

    <div class="header-right">
      <select
        v-if="memberStore.members.length > 0"
        :value="memberStore.currentMember?.id"
        class="member-select"
        @change="handleMemberChange"
      >
        <option
          v-for="m in memberStore.members"
          :key="m.id"
          :value="m.id"
        >
          {{ m.name }}
        </option>
      </select>
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
.member-select {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #d6d3d1;
}
</style>

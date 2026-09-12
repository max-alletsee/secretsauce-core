<script setup lang="ts">
import { inject } from 'vue'
import { useMemberStore } from '@/stores/member'

const memberStore = useMemberStore()
const api = inject<any>('__SS_API__')

function onMemberChange(e: Event) {
  const target = e.target as HTMLSelectElement
  const id = target.value
  if (!id) {
    memberStore.setCurrentMember(null)
    localStorage.removeItem('secretsauce:current_member_id')
    if (api && typeof api.setDefaultHeader === 'function') {
      api.setDefaultHeader('x-actor-member', null)
    }
    return
  }
  memberStore.setCurrentMember(id)
  localStorage.setItem('secretsauce:current_member_id', id)
  if (api && typeof api.setDefaultHeader === 'function') {
    api.setDefaultHeader('x-actor-member', id)
  }
}
</script>

<template>
  <div class="ss-member-picker">
    <div
      v-if="memberStore.currentMember"
      class="member-avatar"
      :style="{ backgroundColor: memberStore.currentMember.avatar_color || '#0284c7' }"
    >
      {{ memberStore.currentMember.name ? memberStore.currentMember.name.slice(0, 1).toUpperCase() : '?' }}
    </div>
    <select
      class="member-select"
      :value="memberStore.currentMember?.id || ''"
      @change="onMemberChange"
    >
      <option value="">All Members</option>
      <option
        v-for="m in memberStore.members"
        :key="m.id"
        :value="m.id"
      >
        {{ m.name }}
      </option>
    </select>
  </div>
</template>

<style scoped>
.ss-member-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
}
.member-select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #d6d3d1;
  background: white;
  font-size: 0.9em;
}
</style>

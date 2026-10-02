<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { memberAvatarColor } from './avatar'
const ss = useSecretSauce(), menu = ref()
function selectMember(id: string) {
  ss.store.currentMember.value = ss.store.members.value.find(member => member.id === id) || null
  try { if (id) localStorage.setItem('ss-current-member', id); else localStorage.removeItem('ss-current-member') }
  catch { /* Device storage is optional; the live actor still changes. */ }
}
const items = computed(() => [{ label: 'All members', command: () => selectMember('') }, ...ss.store.members.value.map(member => ({ label: member.name, command: () => selectMember(member.id) }))])
</script>
<template>
  <div class="ss-member-picker">
    <Button class="member-select" aria-label="Current member" text @click="menu.toggle($event)">
      <Avatar v-if="ss.store.currentMember.value" class="member-avatar" :label="ss.store.currentMember.value.name.slice(0, 1).toUpperCase()" shape="circle" :style="{ background: memberAvatarColor(ss.store.currentMember.value.id), color: 'var(--p-surface-0)' }" />
      <span>{{ ss.store.currentMember.value?.name || 'All members' }}</span><i class="pi pi-chevron-down" aria-hidden="true" />
    </Button>
    <Menu ref="menu" :model="items" popup />
  </div>
</template>
<style scoped>
.ss-member-picker { display: flex; align-items: center; }.member-select { gap: .5rem; max-width: 16rem; }
</style>

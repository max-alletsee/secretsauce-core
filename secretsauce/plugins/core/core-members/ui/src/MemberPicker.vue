<script setup lang="ts">
import { computed } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const ss = useSecretSauce()
const options = computed(() => [{ id: '', name: 'All members' }, ...ss.store.members.value])
function selectMember(id: string) {
  ss.store.currentMember.value = ss.store.members.value.find(member => member.id === id) || null
  try { if (id) localStorage.setItem('ss-current-member', id); else localStorage.removeItem('ss-current-member') }
  catch { /* Device storage is optional; the live actor still changes. */ }
}
</script>
<template>
  <div class="ss-member-picker"><Avatar v-if="ss.store.currentMember.value" class="member-avatar" :label="ss.store.currentMember.value.name.slice(0, 1).toUpperCase()" shape="circle" /><Select class="member-select" aria-label="Current member" :modelValue="ss.store.currentMember.value?.id || ''" :options="options" optionLabel="name" optionValue="id" @update:modelValue="selectMember" /></div>
</template>
<style scoped>
.ss-member-picker { display: flex; gap: .5rem; align-items: center; }.member-avatar { background: var(--p-primary-color); color: var(--p-primary-contrast-color); }.member-select { max-width: 12rem; }
</style>

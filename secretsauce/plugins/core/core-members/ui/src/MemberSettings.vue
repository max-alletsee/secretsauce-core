<script setup lang="ts">
import { ref } from 'vue'
import { useSecretSauce, type Member } from '@secretsauce/ui'
import MemberDialog from './MemberDialog.vue'
import { memberAvatarColor } from './avatar'
const ss = useSecretSauce()
const visible = ref(false), editing = ref<Member | null>(null), error = ref(''), pending = ref(new Set<string>())
function open(member: Member | null) { editing.value = member; visible.value = true; error.value = '' }
function saved(member: Member) {
  const index = ss.store.members.value.findIndex(row => row.id === member.id)
  if (index < 0) ss.store.members.value.push(member)
  else ss.store.members.value.splice(index, 1, member)
  if (!ss.store.currentMember.value || ss.store.currentMember.value.id === member.id) ss.store.currentMember.value = member
}
function emptyPreferences(member: Member) { return ![member.dietary_restrictions, member.allergies, member.disliked_ingredients, member.favorite_cuisines].some(items => items.length) }
async function remove(member: Member) {
  if (ss.store.members.value.length <= 1 || pending.value.has(member.id)) return
  pending.value.add(member.id)
  try {
    if (!(await ss.confirm({ header: 'Remove member', message: `Remove ${member.name}?`, acceptLabel: 'Remove', rejectLabel: 'Cancel', severity: 'danger' }))) return
    await ss.api.delete(`/api/members/${member.id}`, { revision: member.revision })
    ss.store.members.value = ss.store.members.value.filter(row => row.id !== member.id)
    if (ss.store.currentMember.value?.id === member.id) {
      ss.store.currentMember.value = ss.store.members.value[0] || null
      try { if (ss.store.currentMember.value) localStorage.setItem('ss-current-member', ss.store.currentMember.value.id); else localStorage.removeItem('ss-current-member') } catch { /* Optional device storage. */ }
    }
  } catch (failure: any) { error.value = failure.message || 'Could not remove member' }
  finally { pending.value.delete(member.id) }
}
</script>
<template>
  <div class="ss-member-settings">
    <div class="header-row"><p>Manage household profiles, preferences and dietary restrictions.</p><Button label="Add Member" icon="pi pi-plus" @click="open(null)" /></div>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div class="members-grid"><Card v-for="member in ss.store.members.value" :key="member.id" :data-member-id="member.id" class="member-card">
      <template #title><div class="member-card-header"><Avatar :label="member.name.slice(0, 1).toUpperCase()" shape="circle" :style="{ background: memberAvatarColor(member.id), color: 'var(--p-surface-0)' }" /><span>{{ member.name }}</span></div></template>
      <template #content><p>{{ member.preferred_language }} · Portion {{ member.serving_ratio }}×</p><div class="tags"><Tag v-for="tag in member.dietary_restrictions" :key="tag" :value="tag" severity="info" /><Tag v-for="tag in member.allergies" :key="tag" :value="`Allergy: ${tag}`" severity="danger" icon="pi pi-exclamation-triangle" /><Tag v-for="tag in member.disliked_ingredients" :key="tag" :value="`Dislikes: ${tag}`" severity="secondary" /></div><Button v-if="emptyPreferences(member)" label="Add dietary preferences" text @click="open(member)" /></template>
      <template #footer><Button icon="pi pi-pencil" :aria-label="`Edit ${member.name}`" rounded text @click="open(member)" /><Button icon="pi pi-trash" :aria-label="`Delete ${member.name}`" severity="danger" rounded text :disabled="ss.store.members.value.length <= 1 || pending.has(member.id)" @click="remove(member)" /></template>
    </Card></div>
    <MemberDialog v-model:visible="visible" :member="editing" @saved="saved" />
  </div>
</template>
<style scoped>
.ss-member-settings { display: grid; gap: 1rem; }.header-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }p { color: var(--p-text-muted-color); }
.members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }.member-card-header, .tags { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
</style>

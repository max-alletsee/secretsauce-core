<script setup lang="ts">
import { ref } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const ss = useSecretSauce()
const showAddModal = ref(false), newName = ref(''), newLanguage = ref('en'), newServingRatio = ref(1), newColor = ref('#0284c7')
const newRestrictions = ref<string[]>([]), newAllergies = ref<string[]>([]), busy = ref(false), error = ref('')
async function createMember() {
  if (!newName.value.trim() || busy.value) return
  busy.value = true; error.value = ''
  try {
    const member = await ss.api.post<any>('/api/members', { name: newName.value.trim(), preferred_language: newLanguage.value, avatar_color: newColor.value, serving_ratio: newServingRatio.value, dietary_restrictions: newRestrictions.value, allergies: newAllergies.value })
    ss.store.members.value.push(member)
    if (!ss.store.currentMember.value) ss.store.currentMember.value = member
    newName.value = ''; newRestrictions.value = []; newAllergies.value = []; showAddModal.value = false
  } catch (failure: any) { error.value = failure?.message || 'Could not add member' }
  finally { busy.value = false }
}
async function deleteMember(member: any) {
  if (!(await ss.confirm({ header: 'Remove member', message: `Remove ${member.name}?`, acceptLabel: 'Remove', rejectLabel: 'Cancel', severity: 'danger' }))) return
  try {
    await ss.api.delete(`/api/members/${member.id}`, { revision: member.revision })
    ss.store.members.value = ss.store.members.value.filter(row => row.id !== member.id)
    if (ss.store.currentMember.value?.id === member.id) ss.store.currentMember.value = ss.store.members.value[0] || null
  } catch (failure: any) { error.value = failure?.message || 'Could not remove member' }
}
</script>
<template>
  <div class="ss-member-settings">
    <div class="header-row"><p>Manage household profiles, preferences and dietary restrictions.</p><Button class="btn-primary" label="Add Member" icon="pi pi-plus" @click="showAddModal = true; error = ''" /></div>
    <Message v-if="error && !showAddModal" severity="error">{{ error }}</Message>
    <div class="members-grid"><Card v-for="member in ss.store.members.value" :key="member.id" class="member-card">
      <template #title><div class="member-card-header"><Avatar :label="member.name.slice(0, 1).toUpperCase()" shape="circle" /><span>{{ member.name }}</span></div></template>
      <template #content><p>{{ member.preferred_language }} · Portion {{ member.serving_ratio }}×</p><div class="tags"><Tag v-for="tag in member.dietary_restrictions" :key="tag" :value="tag" severity="info" /><Tag v-for="tag in member.allergies" :key="tag" :value="`Allergy: ${tag}`" severity="danger" icon="pi pi-exclamation-triangle" /></div></template>
      <template #footer><Button label="Delete" icon="pi pi-trash" severity="danger" text @click="deleteMember(member)" /></template>
    </Card></div>
    <Dialog v-model:visible="showAddModal" header="Add household member" modal :style="{ width: 'min(30rem, 95vw)' }">
      <form class="member-form" @submit.prevent="createMember">
        <Message v-if="error" severity="error">{{ error }}</Message>
        <label for="member-name">Name</label><InputText id="member-name" v-model="newName" required fluid />
        <label for="member-language">Language</label><InputText id="member-language" v-model="newLanguage" fluid />
        <label for="member-serving">Serving ratio</label><InputNumber inputId="member-serving" v-model="newServingRatio" :min=".25" :max="10" :step=".25" :maxFractionDigits="2" fluid />
        <label for="member-color">Avatar color</label><input id="member-color" v-model="newColor" type="color">
        <label for="member-dietary">Dietary restrictions</label><AutoComplete inputId="member-dietary" v-model="newRestrictions" multiple :typeahead="false" fluid />
        <label for="member-allergies">Allergies</label><AutoComplete inputId="member-allergies" v-model="newAllergies" multiple :typeahead="false" fluid />
        <div class="actions"><Button label="Cancel" severity="secondary" :disabled="busy" @click="showAddModal = false" /><Button type="submit" label="Save Member" :loading="busy" :disabled="!newName.trim()" /></div>
      </form>
    </Dialog>
  </div>
</template>
<style scoped>
.ss-member-settings { display: grid; gap: 1rem; }.header-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }p { color: var(--p-text-muted-color); }
.members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }.member-card-header, .tags, .actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }.member-form { display: grid; gap: .75rem; }.actions { justify-content: flex-end; }
</style>

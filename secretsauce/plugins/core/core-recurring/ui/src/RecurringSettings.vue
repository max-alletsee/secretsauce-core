<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import RecurringRuleDialog from './RecurringRuleDialog.vue'
const ss = useSecretSauce()
interface Rule { id: string; weekday: number; meal_type: string; recipe_id: string; recipe_title: string }
const rules = ref<Rule[]>([]), loading = ref(true), busy = ref(false), error = ref(''), adding = ref(false)
function slotLabel(id:string) { return ss.store.household.value.meal_types.find(slot=>slot.id===id)?.label || id }
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
async function loadRules() {
  loading.value = true
  try { rules.value = await ss.api.get<Rule[]>('/api/x/core-recurring/rules') }
  catch (failure: any) { error.value = failure?.message || 'Could not load recurring rules' }
  finally { loading.value = false }
}
async function deleteRule(id: string) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await ss.api.delete(`/api/x/core-recurring/rules/${id}`); await loadRules() }
  catch (failure: any) { error.value = failure?.message || 'Could not delete rule' }
  finally { busy.value = false }
}
onMounted(loadRules)
</script>
<template>
  <div class="recurring-settings">
    <p>A recurring meal is planned automatically on the same weekday every week, 14 days ahead.</p>
    <Button label="Add recurring meal" icon="pi pi-plus" :disabled="busy" @click="adding=true" />
    <Message v-if="error" severity="error">{{ error }}</Message>
    <ProgressSpinner v-if="loading" aria-label="Loading recurring rules" />
    <p v-else-if="!rules.length">No recurring rules configured.</p>
    <ul v-else><li v-for="rule in rules" :key="rule.id"><span>Every {{ weekdays[rule.weekday] || `Day ${rule.weekday}` }} · {{ slotLabel(rule.meal_type) }} · {{ rule.recipe_title }}</span><Button label="Delete" icon="pi pi-trash" text severity="danger" :disabled="busy" @click="deleteRule(rule.id)" /></li></ul>
    <RecurringRuleDialog v-model:visible="adding" @saved="loadRules" />
  </div>
</template>
<style scoped>
.recurring-settings { display: grid; gap: 1rem; }.recurring-settings > .p-button { justify-self: start; }p { color: var(--p-text-muted-color); }ul { list-style: none; padding: 0; display: grid; gap: .75rem; }li { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .75rem; border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); }
</style>

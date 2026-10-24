<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Slot, useSecretSauce } from '@secretsauce/ui'
const ss = useSecretSauce(), entries = ref<any[]>([]), error = ref('')
function dateString(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
onMounted(async () => {
  const end = new Date(), start = new Date(); start.setDate(end.getDate() - 30)
  try { entries.value = await ss.api.get<any[]>('/api/journal', { from: dateString(start), to: dateString(end) }) }
  catch (failure: any) { error.value = failure?.message || 'Could not load cooking journal' }
})
</script>
<template>
  <div class="journal-page">
    <h2>Cooking Journal</h2><Message v-if="error" severity="error">{{ error }}</Message>
    <div class="journal-list"><Card v-for="entry in entries" :key="entry.id" class="journal-entry-card">
      <template #title>{{ entry.recipe?.title || entry.title || 'Cooked meal' }}</template>
      <template #subtitle>{{ entry.date }} · {{ entry.meal_type || 'Meal' }}</template>
      <template #content><Tag v-if="entry.servings_cooked != null" :value="`${entry.servings_cooked} servings`" severity="secondary" /><p v-if="entry.notes">{{ entry.notes }}</p></template>
      <template #footer><Slot name="journal.entry.footer" :context="{ entry }" /></template>
    </Card></div>
    <p v-if="!entries.length && !error" class="empty-hint">No meals recorded in journal yet.</p>
  </div>
</template>
<style scoped>
.journal-page { padding: .75rem 1rem; max-width: 55rem; margin: 0 auto; }h2 { margin: 0 0 .5rem; font-size: 1.25rem; line-height: 1.2; }.journal-list { display: grid; gap: .5rem; }.journal-entry-card :deep(.p-card-body) { padding: .625rem .75rem; gap: .25rem; }.journal-entry-card p { margin: .25rem 0 0; }.empty-hint { color: var(--p-text-muted-color); text-align: center; padding: 1.25rem; }
@media (max-width: 767px) { .journal-page { padding: .5rem .625rem; } }
</style>

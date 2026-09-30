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
.journal-page { padding: 1.5rem; max-width: 55rem; margin: 0 auto; }h2 { margin-top: 0; }.journal-list { display: grid; gap: 1rem; }.empty-hint { color: var(--p-text-muted-color); text-align: center; padding: 2rem; }
</style>

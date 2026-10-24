<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const emit = defineEmits<{ scheduled: [entry: any] }>()
const ss = useSecretSauce()
const days = ref(5), mealType = ref(''), promptText = ref(''), showForm = ref(true)
const loading = ref(false), pending = ref<string | null>(null), errorMessage = ref('')
const suggestions = ref<any[]>([]), scheduleDates = ref<Record<string, string>>({})
const resolvedSlots = ref<Record<string, any[]>>({})
const scheduleMealTypes = ref<Record<string, string>>({})
function availableForDate(date: string) { return (resolvedSlots.value[date] || ss.store.household.value?.meal_types || []).filter(slot => !slot.skipped) }
const mealTypes = computed(() => availableForDate(today()))
let slotRevision = 0, stopped = false
async function loadSlots() {
  const n = ++slotRevision
  const end = new Date(`${today()}T12:00:00`); end.setDate(end.getDate() + 31)
  try {
    const response = await ss.api.get<{ days: Record<string, any[]> }>('/api/x/core-timeline/slots', { from: today(), to: end.toLocaleDateString('en-CA') })
    if (n === slotRevision && !stopped) resolvedSlots.value = { ...resolvedSlots.value, ...response.days }
  } catch { if (n === slotRevision && !stopped) resolvedSlots.value = {} }
}
const pendingDates = new Map<string, Promise<void>>()
async function ensureSlots(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || resolvedSlots.value[date]) return
  if (pendingDates.has(date)) return pendingDates.get(date)
  const request = (async () => {
    try {
      const response = await ss.api.get<{ days: Record<string, any[]> }>('/api/x/core-timeline/slots', { from: date, to: date })
      if (!stopped) resolvedSlots.value = { ...resolvedSlots.value, ...response.days }
    } catch { /* Household defaults remain available when Timeline is disabled. */ }
    finally { pendingDates.delete(date) }
  })()
  pendingDates.set(date, request)
  return request
}
watch(scheduleDates, dates => { for (const date of new Set(Object.values(dates))) ensureSlots(date) }, { deep: true })
watch(() => ss.store.household.value.meal_types, loadSlots, { immediate: true })
const stopSlots = ss.on('core-timeline:slots-changed', () => {
  resolvedSlots.value = {}
  loadSlots()
  for (const date of new Set(Object.values(scheduleDates.value))) ensureSlots(date)
})
onBeforeUnmount(() => { stopped = true; ++slotRevision; if (typeof stopSlots === 'function') stopSlots() })
watch(mealTypes, choices => { if (!choices.some(slot => slot.id === mealType.value)) mealType.value = choices.find(slot => slot.id === 'dinner')?.id || choices[0]?.id || '' }, { immediate: true })
const activeSuggestions = computed(() => suggestions.value.filter(s => s.status === 'suggested'))
function today() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
async function generateCandidates() {
  if (loading.value || !mealType.value) return
  loading.value = true; errorMessage.value = ''
  try {
    const result = await ss.api.post<any>('/api/x/core-meal-planner-ai/generate', { days: days.value, prompt: promptText.value.trim() || undefined, meal_types: [mealType.value] })
    suggestions.value = result.suggestions
    showForm.value = false
    for (const suggestion of result.suggestions) { scheduleDates.value[suggestion.id] = suggestion.suggested_date || today(); scheduleMealTypes.value[suggestion.id] = mealType.value }
  } catch (error: any) { errorMessage.value = error?.message || 'Failed to generate meal suggestions' }
  finally { loading.value = false }
}
async function acceptSuggestion(suggestion: any) {
  if (pending.value) return
  pending.value = suggestion.id; errorMessage.value = ''
  try {
    const date = scheduleDates.value[suggestion.id] || today()
    await ensureSlots(date)
    const choices = availableForDate(date)
    const chosen = scheduleMealTypes.value[suggestion.id] || mealType.value
    const slot = choices.find(slot => slot.id === chosen) || choices[0]
    if (!slot) throw new Error('No available meal slots on this day')
    const result = await ss.api.post<any>(`/api/x/core-meal-planner-ai/suggestions/${suggestion.id}/accept`, { date, meal_type: slot.id })
    Object.assign(suggestion, result)
    ss.notify({ level: 'success', message: `Scheduled ${suggestion.recipe_title} for ${date}` })
    emit('scheduled', result)
  } catch (error: any) { errorMessage.value = error?.message || 'Failed to schedule meal' }
  finally { pending.value = null }
}
async function dismissSuggestion(suggestion: any) {
  if (pending.value) return
  pending.value = suggestion.id; errorMessage.value = ''
  try { Object.assign(suggestion, await ss.api.post(`/api/x/core-meal-planner-ai/suggestions/${suggestion.id}/dismiss`)) }
  catch (error: any) { errorMessage.value = error?.message || 'Failed to dismiss suggestion' }
  finally { pending.value = null }
}
</script>

<template>
  <section class="meal-planner-widget">
    <h3><i class="pi pi-sparkles" aria-hidden="true" /> AI meal suggestions</h3>
    <div v-if="showForm || !suggestions.length" class="planner-form">
      <label for="planner-days">Days to plan</label><InputNumber inputId="planner-days" v-model="days" :min="1" :max="14" fluid />
      <label for="planner-slot">Meal slot</label><Select inputId="planner-slot" aria-label="Meal slot" v-model="mealType" :options="mealTypes" optionLabel="label" optionValue="id" fluid />
      <label for="planner-prompt">Dietary focus / notes</label><InputText id="planner-prompt" v-model="promptText" placeholder="Fast weeknight meals…" fluid />
      <div class="actions"><Button v-if="suggestions.length" label="Cancel" severity="secondary" @click="showForm = false" /><Button label="Generate suggestions" icon="pi pi-sparkles" :loading="loading" :disabled="!mealType" @click="generateCandidates" /></div>
    </div>
    <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>
    <div v-if="suggestions.length" class="suggestions-pool">
      <div class="actions"><span>{{ activeSuggestions.length }} suggestions</span><Button :label="showForm ? 'Close form' : 'Generate more'" text @click="showForm = !showForm" /></div>
      <Card v-for="suggestion in suggestions" :key="suggestion.id" class="sug-card">
        <template #title>{{ suggestion.recipe_title }}</template>
        <template #content>
          <p v-if="suggestion.reasoning">{{ suggestion.reasoning }}</p>
          <Tag v-if="suggestion.status === 'accepted'" value="Scheduled" severity="success" icon="pi pi-check" />
          <Tag v-else-if="suggestion.status === 'dismissed'" value="Dismissed" severity="secondary" />
          <div v-else class="suggestion-actions">
            <Tag v-if="suggestion.confidence" :value="`${Math.round(suggestion.confidence * 100)}% match`" severity="secondary" />
            <label :for="`schedule-${suggestion.id}`">Schedule date</label><InputText :id="`schedule-${suggestion.id}`" v-model="scheduleDates[suggestion.id]" type="date" fluid />
            <Select :inputId="`schedule-slot-${suggestion.id}`" aria-label="Schedule meal slot" v-model="scheduleMealTypes[suggestion.id]" :options="availableForDate(scheduleDates[suggestion.id] || today())" optionLabel="label" optionValue="id" fluid />
            <div class="actions"><Button label="Dismiss" size="small" severity="secondary" :disabled="!!pending" @click="dismissSuggestion(suggestion)" /><Button label="Add to schedule" size="small" :loading="pending === suggestion.id" :disabled="!!pending || !mealType" @click="acceptSuggestion(suggestion)" /></div>
          </div>
        </template>
      </Card>
    </div>
  </section>
</template>
<style scoped>
.meal-planner-widget { padding: .625rem .75rem; background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); display: grid; gap: .5rem; min-width: 0; }
h3 { margin: 0; font-size: .9rem; }
.planner-form, .suggestions-pool, .suggestion-actions { display: grid; gap: .5rem; }
.sug-card :deep(.p-card-body) { padding: .5rem .625rem; gap: .25rem; }
label, p { color: var(--p-text-muted-color); margin: 0; font-size: .85rem; }
.actions { display: flex; gap: .375rem; flex-wrap: wrap; align-items: center; justify-content: flex-end; }
</style>

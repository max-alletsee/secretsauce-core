<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import type { ApiClient, Household } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'

const api = inject<ApiClient>('__SS_API__')!
const store = useHouseholdStore()

const draftDays = ref(String(store.household.event_retention_days ?? 60))
const busy = ref(false)
const error = ref('')
const saved = ref(false)

watch(
  () => store.household.event_retention_days,
  (value) => {
    draftDays.value = String(value ?? 60)
  }
)

const parsedDays = computed(() => {
  const trimmed = String(draftDays.value ?? '').trim()
  if (!trimmed) return Number.NaN
  return Number(trimmed)
})

const isValid = computed(
  () => Number.isInteger(parsedDays.value) && parsedDays.value >= 1 && parsedDays.value <= 3650
)

async function save() {
  if (busy.value) return
  if (!isValid.value) {
    error.value = 'Event log retention must be a whole number between 1 and 3650 days'
    return
  }
  busy.value = true
  error.value = ''
  saved.value = false
  try {
    store.household = await api.patch<Household>('/api/household', {
      event_retention_days: parsedDays.value,
    })
    saved.value = true
  } catch (err: any) {
    error.value = err.message || 'Could not save advanced settings'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="advanced-settings" @submit.prevent="save">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <Message v-if="saved" severity="success">Advanced settings saved</Message>
    <label for="event-retention-days">Event log retention (days)</label>
    <InputText
      id="event-retention-days"
      v-model="draftDays"
      type="number"
      min="1"
      max="3650"
      step="1"
      required
    />
    <p class="field-help">
      Consumed events are kept for at least this many days so disabled plugins can catch up and live clients can replay missed updates. Older events are pruned hourly once every active plugin has processed them.
    </p>
    <Button
      class="save-advanced"
      label="Save advanced"
      type="submit"
      :loading="busy"
      :disabled="!isValid"
    />
  </form>
</template>

<style scoped>
.advanced-settings {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.field-help {
  margin: 0;
  font-size: .875rem;
  color: var(--p-text-muted-color);
}
.save-advanced {
  align-self: flex-start;
}
</style>

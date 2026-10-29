<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { useRecurringState, type RecurringSuggestion } from './state'

const props = defineProps<{
  context?: {
    date?: string
    slot?: { id: string; label?: string; skipped?: boolean }
    onChanged?: () => void
  }
}>()

const ss = useSecretSauce()
const recurringState = useRecurringState(ss)
const busyId = ref<string | null>(null)
const error = ref('')

let unregisterDate: (() => void) | null = null

watch(
  () => props.context?.date,
  (date) => {
    if (unregisterDate) {
      unregisterDate()
      unregisterDate = null
    }
    if (date) {
      unregisterDate = recurringState.registerDate(date)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (unregisterDate) {
    unregisterDate()
    unregisterDate = null
  }
})

const slotSuggestions = computed(() => {
  const date = props.context?.date
  const slot = props.context?.slot
  if (!date || !slot || slot.skipped) return []
  const slotId = (slot.id || '').toLowerCase()
  const slotLabel = (slot.label || '').toLowerCase()
  return recurringState.suggestions.value.filter((s) => {
    if (s.date !== date) return false
    const mt = (s.meal_type || '').toLowerCase()
    return mt === slotId || (slotLabel && mt === slotLabel)
  })
})

async function approve(suggestion: RecurringSuggestion) {
  if (busyId.value) return
  busyId.value = suggestion.rule_id
  error.value = ''
  try {
    await ss.api.post(`/api/x/core-recurring/rules/${suggestion.rule_id}/approve`, {
      date: suggestion.date,
    })
    recurringState.removeSuggestion(suggestion.rule_id, suggestion.date)
    props.context?.onChanged?.()
  } catch (failure: any) {
    error.value = failure?.message || 'Could not approve recurring meal'
  } finally {
    busyId.value = null
  }
}

async function dismiss(suggestion: RecurringSuggestion) {
  if (busyId.value) return
  busyId.value = suggestion.rule_id
  error.value = ''
  try {
    await ss.api.post(`/api/x/core-recurring/rules/${suggestion.rule_id}/dismiss`, {
      date: suggestion.date,
    })
    recurringState.removeSuggestion(suggestion.rule_id, suggestion.date)
  } catch (failure: any) {
    error.value = failure?.message || 'Could not dismiss recurring meal'
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div v-if="slotSuggestions.length || error" class="recurring-slot-suggestions">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div
      v-for="suggestion in slotSuggestions"
      :key="`${suggestion.rule_id}-${suggestion.date}`"
      class="recurring-ghost-card"
      :data-rule-id="suggestion.rule_id"
    >
      <div class="ghost-info">
        <i class="pi pi-replay" aria-hidden="true" />
        <span class="ghost-title">{{ suggestion.title || suggestion.recipe_title || 'Recurring meal' }}</span>
        <span v-if="suggestion.servings" class="ghost-servings">{{ suggestion.servings }} servings</span>
      </div>
      <div class="ghost-actions">
        <Button
          label="Approve"
          icon="pi pi-check"
          size="small"
          text
          severity="success"
          :loading="busyId === suggestion.rule_id"
          :disabled="!!busyId"
          @click="approve(suggestion)"
        />
        <Button
          label="Dismiss"
          icon="pi pi-times"
          size="small"
          text
          severity="secondary"
          :loading="busyId === suggestion.rule_id"
          :disabled="!!busyId"
          @click="dismiss(suggestion)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.recurring-slot-suggestions {
  display: grid;
  gap: 0.2rem;
  margin-bottom: 0.2rem;
}
.recurring-ghost-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.2rem 0.5rem;
  padding: 0.2rem 0.5rem;
  border: 1.5px dashed var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  background: var(--p-surface-50, transparent);
  color: var(--p-text-muted-color);
  min-width: 0;
}
.ghost-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 8rem;
  min-width: 0;
}
.ghost-title {
  font-size: 0.82rem;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.ghost-servings {
  font-size: 0.72rem;
  white-space: nowrap;
}
.ghost-actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}
.ghost-actions :deep(.p-button) {
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
}
</style>

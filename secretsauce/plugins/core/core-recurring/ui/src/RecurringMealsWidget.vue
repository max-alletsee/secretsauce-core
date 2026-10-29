<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import RecurringRuleDialog from './RecurringRuleDialog.vue'
import { useRecurringState, type RecurringRule } from './state'

const ss = useSecretSauce()
const recurringState = useRecurringState(ss)

const rules = ref<RecurringRule[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const dialogVisible = ref(false)
const editingRule = ref<RecurringRule | null>(null)

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function slotLabel(id: string): string {
  return ss.store.household.value?.meal_types?.find((slot: any) => slot.id === id)?.label || id
}

function ruleLabel(rule: RecurringRule): string {
  return rule.title || rule.recipe_title || 'Recurring meal'
}

async function loadRules() {
  loading.value = true
  try {
    rules.value = await ss.api.get<RecurringRule[]>('/api/x/core-recurring/rules')
  } catch (failure: any) {
    error.value = failure?.message || 'Could not load recurring rules'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingRule.value = null
  dialogVisible.value = true
}

function openEdit(rule: RecurringRule) {
  editingRule.value = rule
  dialogVisible.value = true
}

async function deleteRule(id: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await ss.api.delete(`/api/x/core-recurring/rules/${id}`)
    await loadRules()
    await recurringState.refreshSuggestions()
  } catch (failure: any) {
    error.value = failure?.message || 'Could not delete rule'
  } finally {
    busy.value = false
  }
}

const stopChanged = ss.on('core-recurring:changed', () => {
  loadRules()
})

onMounted(loadRules)
onBeforeUnmount(() => {
  if (typeof stopChanged === 'function') stopChanged()
})
</script>

<template>
  <section class="recurring-meals-widget">
    <h3><i class="pi pi-replay" aria-hidden="true" /> Recurring meals</h3>
    <Button
      label="Add recurring meal"
      icon="pi pi-plus"
      size="small"
      :disabled="busy"
      @click="openCreate"
    />
    <Message v-if="error" severity="error">{{ error }}</Message>
    <ProgressSpinner v-if="loading" aria-label="Loading recurring rules" />
    <p v-else-if="!rules.length">No recurring rules configured.</p>
    <ul v-else class="recurring-rule-list">
      <li v-for="rule in rules" :key="rule.id" class="recurring-rule-item">
        <span class="rule-summary">
          Every {{ weekdays[rule.weekday] || `Day ${rule.weekday}` }} · {{ slotLabel(rule.meal_type) }} · {{ ruleLabel(rule) }} ({{ rule.servings }} servings)
        </span>
        <div class="rule-actions">
          <Button
            label="Edit"
            icon="pi pi-pencil"
            text
            size="small"
            :disabled="busy"
            @click="openEdit(rule)"
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            text
            severity="danger"
            size="small"
            :disabled="busy"
            @click="deleteRule(rule.id)"
          />
        </div>
      </li>
    </ul>
    <RecurringRuleDialog
      v-model:visible="dialogVisible"
      :rule="editingRule"
      @saved="loadRules"
    />
  </section>
</template>

<style scoped>
.recurring-meals-widget {
  padding: 0.625rem 0.75rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  display: grid;
  gap: 0.5rem;
  min-width: 0;
}
.recurring-meals-widget > :deep(.p-button) {
  justify-self: start;
}
h3 {
  margin: 0;
  font-size: 0.9rem;
}
p {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}
.recurring-rule-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.375rem;
}
.recurring-rule-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.5rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  min-width: 0;
}
.rule-summary {
  font-size: 0.8125rem;
  line-height: 1.25;
  flex: 1 1 10rem;
  min-width: 0;
  overflow-wrap: anywhere;
}
.rule-actions {
  display: flex;
  gap: 0.125rem;
  align-items: center;
}
</style>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">Recurring Meals</h3>
      <button class="btn btn-secondary" @click="triggerMaterialize">Materialize Now</button>
    </div>
    <div v-if="loading" class="text-surface-500">Loading rules...</div>
    <div v-else-if="rules.length === 0" class="text-surface-500">No recurring rules configured.</div>
    <div v-else class="space-y-2">
      <div
        v-for="rule in rules"
        :key="rule.id"
        class="flex items-center justify-between p-3 border rounded border-surface-200 dark:border-surface-700"
      >
        <div>
          <span class="font-medium text-surface-800 dark:text-surface-100">{{ weekdayName(rule.weekday) }}</span>
          <span class="ml-2 text-sm text-surface-500">{{ rule.meal_type }}:</span>
          <span class="ml-1 text-sm font-semibold">{{ rule.recipe_title }}</span>
        </div>
        <button class="btn btn-danger" @click="deleteRule(rule.id)">Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SecretSauceUI } from '@secretsauce/ui'

const props = defineProps<{ ss: SecretSauceUI }>()

interface Rule {
  id: string
  weekday: number
  meal_type: string
  recipe_id: string
  recipe_title: string
}

const rules = ref<Rule[]>([])
const loading = ref(true)

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
function weekdayName(day: number): string {
  return WEEKDAYS[day] || `Day ${day}`
}

async function loadRules() {
  loading.value = true
  try {
    rules.value = await props.ss.api.get<Rule[]>('/api/x/core-recurring/rules')
  } finally {
    loading.value = false
  }
}

async function deleteRule(id: string) {
  await props.ss.api.delete(`/api/x/core-recurring/rules/${id}`)
  await loadRules()
}

async function triggerMaterialize() {
  props.ss.notify({ level: 'info', message: 'Materializing recurring meals...' })
  await props.ss.api.post('/api/x/core-recurring/materialize', {})
  props.ss.notify({ level: 'success', message: 'Schedule updated.' })
}

onMounted(() => {
  loadRules()
})
</script>

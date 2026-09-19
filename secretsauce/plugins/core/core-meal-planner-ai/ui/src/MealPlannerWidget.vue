<template>
  <div class="meal-planner-widget bg-white border border-stone-200 rounded-lg p-4 space-y-4 shadow-sm">
    <div class="flex items-center justify-between border-b pb-2">
      <div class="flex items-center gap-2">
        <span class="text-base">✨</span>
        <h3 class="font-semibold text-stone-900 text-sm">AI Meal Suggestions</h3>
      </div>
      <button
        v-if="!showForm && !suggestions.length"
        class="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
        @click="showForm = true"
      >
        + New Plan
      </button>
    </div>

    <!-- Generator Form -->
    <div v-if="showForm || !suggestions.length" class="space-y-3 bg-stone-50 p-3 rounded border border-stone-200 text-xs">
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block font-medium text-stone-700 mb-1">Days to plan</label>
          <input
            v-model.number="days"
            type="number"
            min="1"
            max="14"
            class="input-days w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label class="block font-medium text-stone-700 mb-1">Meal Types</label>
          <select
            v-model="mealType"
            class="select-meal-type w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="dinner">Dinner</option>
            <option value="lunch">Lunch</option>
            <option value="breakfast">Breakfast</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block font-medium text-stone-700 mb-1">Dietary Focus / Notes</label>
        <input
          v-model="promptText"
          type="text"
          placeholder="e.g. high-protein, fast weeknight, comfort food"
          class="input-prompt w-full border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div class="flex justify-end gap-2 pt-1">
        <button
          v-if="suggestions.length"
          type="button"
          class="px-2.5 py-1 text-stone-600 hover:text-stone-800"
          @click="showForm = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-generate px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition flex items-center gap-1.5"
          :disabled="loading"
          @click="generateCandidates"
        >
          <span v-if="loading" class="animate-spin text-xs">⏳</span>
          <span>{{ loading ? 'Generating...' : 'Generate Pool' }}</span>
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="text-xs text-red-600 bg-red-50 p-2 rounded">
      {{ errorMessage }}
    </div>

    <!-- Suggestion Pool -->
    <div v-if="suggestions.length" class="suggestions-pool space-y-3">
      <div class="flex items-center justify-between text-xs text-stone-500">
        <span>Candidate Suggestions ({{ activeSuggestions.length }})</span>
        <button class="text-stone-400 hover:text-stone-600 underline" @click="showForm = !showForm">
          {{ showForm ? 'Close form' : 'Generate more' }}
        </button>
      </div>

      <div
        v-for="sug in suggestions"
        :key="sug.id"
        class="sug-card p-3 rounded border transition text-xs space-y-2"
        :class="{
          'border-stone-200 bg-white': sug.status === 'suggested',
          'border-emerald-200 bg-emerald-50/50': sug.status === 'accepted',
          'opacity-40 line-through': sug.status === 'dismissed',
        }"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h4 class="font-bold text-stone-900 text-xs">{{ sug.recipe_title }}</h4>
            <p v-if="sug.reasoning" class="text-stone-600 text-[11px] mt-0.5">{{ sug.reasoning }}</p>
          </div>
          <span
            v-if="sug.status === 'accepted'"
            class="badge-accepted bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
          >
            ✓ Scheduled
          </span>
          <span
            v-else-if="sug.status === 'dismissed'"
            class="text-[10px] text-stone-400 font-medium"
          >
            Dismissed
          </span>
          <span
            v-else-if="sug.confidence"
            class="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0"
          >
            {{ Math.round(sug.confidence * 100) }}% match
          </span>
        </div>

        <!-- Action Controls for unassigned candidates -->
        <div v-if="sug.status === 'suggested'" class="flex items-center justify-between pt-1 gap-2 border-t border-stone-100">
          <div class="flex items-center gap-1.5">
            <input
              v-model="scheduleDates[sug.id]"
              type="date"
              class="input-sched-date border border-stone-300 rounded px-1.5 py-0.5 text-[11px] bg-white focus:outline-none"
            />
          </div>
          <div class="flex items-center gap-1">
            <button
              class="btn-dismiss px-2 py-0.5 border border-stone-200 hover:bg-stone-100 text-stone-600 rounded text-[11px]"
              @click="dismissSuggestion(sug.id)"
            >
              Dismiss
            </button>
            <button
              class="btn-accept px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-[11px] transition"
              @click="acceptSuggestion(sug)"
            >
              Add to Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'

const props = defineProps<{
  ss?: any
}>()

const emit = defineEmits<{
  scheduled: [entry: any]
}>()

const api = props.ss?.api || inject<any>('__SS_API__', null)
const notify = props.ss?.notify || inject<any>('__SS_NOTIFY__', null)

const days = ref(5)
const mealType = ref('dinner')
const promptText = ref('')
const showForm = ref(true)
const loading = ref(false)
const errorMessage = ref('')

const suggestions = ref<any[]>([])
const scheduleDates = ref<Record<string, string>>({})

const activeSuggestions = computed(() => {
  return suggestions.value.filter((s) => s.status === 'suggested')
})

function getTodayString() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

async function generateCandidates() {
  if (!api) return
  loading.value = true
  errorMessage.value = ''

  try {
    const res = await api.post('/api/x/core-meal-planner-ai/generate', {
      days: days.value,
      prompt: promptText.value.trim() || undefined,
      meal_types: [mealType.value],
    })

    const newSuggestions = res?.suggestions || []
    suggestions.value = newSuggestions
    showForm.value = false

    const todayStr = getTodayString()
    for (const s of newSuggestions) {
      scheduleDates.value[s.id] = s.suggested_date || todayStr
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to generate meal plan candidates'
  } finally {
    loading.value = false
  }
}

async function acceptSuggestion(sug: any) {
  if (!api) return
  const targetDate = scheduleDates.value[sug.id] || getTodayString()

  try {
    const res = await api.post(`/api/x/core-meal-planner-ai/suggestions/${sug.id}/accept`, {
      date: targetDate,
      meal_type: sug.meal_type || 'dinner',
    })

    sug.status = 'accepted'
    sug.schedule_entry_id = res?.schedule_entry_id

    if (notify) {
      notify({ level: 'success', message: `Scheduled ${sug.recipe_title} for ${targetDate}` })
    }
    emit('scheduled', res)
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to schedule meal'
  }
}

async function dismissSuggestion(sugId: string) {
  if (!api) return
  try {
    await api.post(`/api/x/core-meal-planner-ai/suggestions/${sugId}/dismiss`)
    const found = suggestions.value.find((s) => s.id === sugId)
    if (found) {
      found.status = 'dismissed'
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to dismiss suggestion'
  }
}
</script>

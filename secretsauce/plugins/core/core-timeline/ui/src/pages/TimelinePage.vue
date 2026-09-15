<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { Slot } from '@secretsauce/ui'
import MealSlot from '../components/MealSlot.vue'
import AddEntryModal from '../components/AddEntryModal.vue'

const api = inject<any>('__SS_API__')
const intentRunner = inject<any>('__SS_INTENT__')

const anchorDate = ref(new Date())
const scheduleEntries = ref<any[]>([])
const activeModal = ref<{ date: string; mealType: string } | null>(null)
const defaultMealTypes = ['Dinner']

function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayStr = computed(() => toDateString(new Date()))

// Generate 9 days: anchor - 2 days to anchor + 6 days
const days = computed(() => {
  const res = []
  const base = new Date(anchorDate.value)
  for (let i = -2; i <= 6; i++) {
    const cur = new Date(base)
    cur.setDate(base.getDate() + i)
    const dateStr = toDateString(cur)
    res.push({
      date: dateStr,
      isPast: i < 0,
      isToday: dateStr === todayStr.value,
      label: cur.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    })
  }
  return res
})

const fromDate = computed(() => days.value[0].date)
const toDate = computed(() => days.value[days.value.length - 1].date)

async function loadEntries() {
  if (!api) return
  try {
    const res = await api.get(`/api/schedule?from=${fromDate.value}&to=${toDate.value}`)
    scheduleEntries.value = Array.isArray(res) ? res : []
  } catch {
    // offline or empty
    scheduleEntries.value = []
  }
}

function entriesFor(date: string, mealType: string) {
  return scheduleEntries.value.filter(
    (e) => e.date === date && String(e.meal_type).toLowerCase() === mealType.toLowerCase()
  )
}

function shiftAnchor(daysOffset: number) {
  const next = new Date(anchorDate.value)
  next.setDate(next.getDate() + daysOffset)
  anchorDate.value = next
  loadEntries()
}

function resetToToday() {
  anchorDate.value = new Date()
  loadEntries()
}

function handleAdd(payload: { date: string; mealType: string }) {
  if (intentRunner) {
    intentRunner('entry:create', payload).catch(() => {
      activeModal.value = payload
    })
  } else {
    activeModal.value = payload
  }
}

function handleInteract(entry: any) {
  if (intentRunner) {
    intentRunner('entry:interact', { entry })
  }
}

onMounted(() => {
  loadEntries()
})
</script>

<template>
  <div class="timeline-page">
    <div class="timeline-toolbar">
      <div class="nav-controls">
        <button class="btn" @click="shiftAnchor(-7)">◀ Prev</button>
        <button class="btn today-btn" @click="resetToToday">Today</button>
        <button class="btn" @click="shiftAnchor(7)">Next ▶</button>
      </div>
      <span class="range-display">{{ fromDate }} — {{ toDate }}</span>
    </div>

    <div class="timeline-container">
      <div class="timeline-grid">
        <div
          v-for="d in days"
          :key="d.date"
          class="timeline-day-column"
          :class="{ 'is-past': d.isPast, 'is-today': d.isToday }"
        >
          <div class="day-header">
            <span class="day-label">{{ d.label }}</span>
            <span v-if="d.isToday" class="today-badge">Today</span>
          </div>

          <div class="day-slots">
            <MealSlot
              v-for="meal in defaultMealTypes"
              :key="meal"
              :meal-type="meal"
              :date="d.date"
              :entries="entriesFor(d.date, meal)"
              :compact="d.isPast"
              @add="handleAdd"
              @interact="handleInteract"
            />
          </div>

          <div class="day-footer">
            <Slot name="timeline.day.footer" :context="{ date: d.date }" />
          </div>
        </div>
      </div>

      <div class="timeline-sidebar-wrapper">
        <Slot name="timeline.sidebar" :context="{ from: fromDate, to: toDate }" />
      </div>
    </div>

    <AddEntryModal
      v-if="activeModal"
      :date="activeModal.date"
      :meal-type="activeModal.mealType"
      @close="activeModal = null"
      @created="loadEntries"
    />
  </div>
</template>

<style scoped>
.timeline-page {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}
.timeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.nav-controls { display: flex; gap: 6px; }
.btn {
  padding: 6px 12px;
  border: 1px solid #e7e5e4;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
}
.today-btn { font-weight: 600; color: #0284c7; }
.range-display { font-weight: 500; color: #57534e; font-size: 0.9em; }

.timeline-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.timeline-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(110px, 1fr));
  gap: 8px;
  flex: 1;
  overflow-x: auto;
}
.timeline-day-column {
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  padding: 8px;
  min-height: 380px;
  display: flex;
  flex-direction: column;
}
.timeline-day-column.is-past {
  opacity: 0.85;
  background: #f5f5f4;
  border-style: dashed;
}
.timeline-day-column.is-today {
  border-color: #0284c7;
  background: #f0f9ff;
  box-shadow: 0 0 0 1px #0284c7;
}
.day-header {
  font-size: 0.85em;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.today-badge {
  background: #0284c7;
  color: white;
  font-size: 0.7em;
  padding: 1px 5px;
  border-radius: 4px;
}
.day-slots { flex: 1; }
.day-footer { margin-top: auto; }
.timeline-sidebar-wrapper {
  width: 260px;
  flex-shrink: 0;
}
</style>

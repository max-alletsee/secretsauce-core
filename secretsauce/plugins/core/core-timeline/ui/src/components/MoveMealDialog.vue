<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { localToday, type ResolvedSlot, type TimelineEntry } from '../days'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ context: { entry: TimelineEntry; mealType?: string } }>()
const emit = defineEmits<{ resolve: [entry: any]; cancel: [] }>()

const ss = useSecretSauce()

function isoToDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultCookedFor(date: string): boolean {
  if (date === props.context.entry.date) return props.context.entry.status === 'cooked'
  return date < localToday()
}

const currentSlotId = computed(() => props.context.mealType || props.context.entry.meal_type)
const selectedDateObj = ref<Date>(isoToDate(props.context.entry.date))
const targetDate = computed(() => dateToIso(selectedDateObj.value || isoToDate(props.context.entry.date)))
const targetSlot = ref<string>(currentSlotId.value)
const markCooked = ref<boolean>(defaultCookedFor(props.context.entry.date))
const loadingDay = ref(false)
const busy = ref(false)
const error = ref('')
const daySlots = ref<ResolvedSlot[]>([])
const dayEntries = ref<TimelineEntry[]>([])

let loadRevision = 0

async function loadTargetDay(date: string) {
  const rev = ++loadRevision
  loadingDay.value = true
  error.value = ''
  try {
    const query = { from: date, to: date }
    const [slotsRes, entriesRes] = await Promise.all([
      ss.api.get<{ days: Record<string, ResolvedSlot[]> }>('/api/x/core-timeline/slots', query),
      ss.api.get<TimelineEntry[]>('/api/timeline', query),
    ])
    if (rev !== loadRevision) return
    const slots = slotsRes?.days?.[date] || []
    daySlots.value = slots
    dayEntries.value = Array.isArray(entriesRes) ? entriesRes : []

    const preferred = targetSlot.value || currentSlotId.value
    const alias = preferred.toLowerCase()
    const match =
      slots.find(s => s.id === preferred) ||
      slots.find(s => s.id.toLowerCase() === alias) ||
      slots.find(s => s.label.toLowerCase() === alias)
    if (match) {
      targetSlot.value = match.id
    } else {
      targetSlot.value = slots.find(s => !s.skipped)?.id || slots[0]?.id || ''
    }
  } catch (failure: any) {
    if (rev === loadRevision) {
      error.value = failure?.message || 'Could not load target day'
      daySlots.value = []
      dayEntries.value = []
    }
  } finally {
    if (rev === loadRevision) loadingDay.value = false
  }
}

watch(
  targetDate,
  (date) => {
    markCooked.value = defaultCookedFor(date)
    loadTargetDay(date)
  },
  { immediate: true },
)

const slotItems = computed(() => {
  const otherEntries = dayEntries.value.filter(e => e.id !== props.context.entry.id)
  const slots = daySlots.value
  const bySlot = new Map<string, TimelineEntry[]>()
  for (const s of slots) bySlot.set(s.id, [])

  for (const entry of otherEntries) {
    const alias = String(entry.meal_type || '').toLowerCase()
    const match =
      slots.find(s => s.id.toLowerCase() === alias) ||
      slots.find(s => s.label.toLowerCase() === alias)
    if (match) {
      bySlot.get(match.id)!.push(entry)
    }
  }

  return slots.map((slot) => {
    const existing = bySlot.get(slot.id) || []
    const nextPosition = existing.length
      ? existing.reduce((max, item) => Math.max(max, Number(item.position ?? 0)), 0) + 1
      : 0
    return {
      ...slot,
      occupied: existing.length > 0,
      nextPosition,
    }
  })
})

const isUnchanged = computed(() => {
  return (
    targetDate.value === props.context.entry.date &&
    targetSlot.value.toLowerCase() === currentSlotId.value.toLowerCase()
  )
})

const mealTitle = computed(() => {
  return props.context.entry.recipe?.title || props.context.entry.title || 'Meal'
})

async function moveMeal() {
  if (busy.value || loadingDay.value || !targetSlot.value || isUnchanged.value) return
  busy.value = true
  error.value = ''
  try {
    const entry = props.context.entry
    const chosenSlot = slotItems.value.find(s => s.id === targetSlot.value)
    const nextStatus = markCooked.value ? 'cooked' : 'planned'
    const cookedBy =
      nextStatus === 'cooked'
        ? (entry.cooked_by_member_id || entry.assigned_cook_id || ss.store.currentMember.value?.id || null)
        : null

    const updated = await ss.api.patch<TimelineEntry>(`/api/timeline/${entry.id}`, {
      revision: entry.revision,
      date: targetDate.value,
      meal_type: targetSlot.value,
      position: chosenSlot?.nextPosition ?? 0,
      status: nextStatus,
      cooked_by_member_id: cookedBy,
    })

    if (chosenSlot?.skipped) {
      try {
        await ss.api.delete(`/api/x/core-timeline/days/${targetDate.value}/slots/${encodeURIComponent(chosenSlot.id)}`)
      } catch (err: any) {
        if (err?.status !== 404) throw err
      }
    }

    const dateLabel = new Date(`${targetDate.value}T12:00:00`).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    ss.notify({
      level: 'success',
      message: `Moved to ${dateLabel} · ${chosenSlot?.label || targetSlot.value}`,
    })
    emit('resolve', updated)
  } catch (failure: any) {
    error.value = failure?.message || 'Could not move meal'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="move-meal-dialog">
    <p class="move-meal-subtitle">{{ mealTitle }}</p>
    <Message v-if="error" severity="error">{{ error }}</Message>

    <div class="move-meal-grid">
      <div class="move-date-col">
        <span class="field-label">Day</span>
        <DatePicker v-model="selectedDateObj" inline />
      </div>

      <div class="move-slot-col">
        <span class="field-label">Meal slot</span>
        <div v-if="loadingDay" class="slot-loading">
          <ProgressSpinner style="width: 1.5rem; height: 1.5rem" />
        </div>
        <div v-else class="slot-list" role="radiogroup" aria-label="Meal slot">
          <button
            v-for="slot in slotItems"
            :key="slot.id"
            type="button"
            class="slot-option"
            :class="{ 'is-selected': targetSlot === slot.id, 'is-skipped': slot.skipped }"
            :data-move-slot="slot.id"
            :data-slot-occupied="String(slot.occupied)"
            role="radio"
            :aria-checked="targetSlot === slot.id"
            @click="targetSlot = slot.id"
          >
            <span class="slot-option-label">
              {{ slot.label }}<span v-if="slot.skipped" class="slot-skipped-note"> (skipped)</span>
            </span>
            <span
              v-if="slot.occupied"
              class="slot-occupied-dot"
              aria-label="Has planned meal"
              title="Already has a meal"
            />
          </button>
        </div>

        <div class="cooked-row">
          <ToggleSwitch inputId="move-cooked-toggle" v-model="markCooked" />
          <label for="move-cooked-toggle">Mark as cooked</label>
        </div>
      </div>
    </div>

    <div class="dialog-actions">
      <Button label="Cancel" severity="secondary" :disabled="busy" @click="emit('cancel')" />
      <Button
        label="Move"
        icon="pi pi-arrow-right-arrow-left"
        :loading="busy"
        :disabled="busy || loadingDay || !targetSlot || isUnchanged"
        @click="moveMeal"
      />
    </div>
  </div>
</template>

<style scoped>
.move-meal-dialog { display: grid; gap: .75rem; }
.move-meal-subtitle { margin: 0; font-weight: 600; font-size: .95rem; }
.move-meal-grid { display: grid; grid-template-columns: auto minmax(12rem, 1fr); gap: 1rem; align-items: start; }
.move-date-col, .move-slot-col { display: grid; gap: .5rem; }
.field-label { font-size: .8rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--p-text-muted-color); }
.slot-loading { display: flex; justify-content: center; padding: 1rem 0; }
.slot-list { display: grid; gap: .375rem; }
.slot-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  background: var(--p-content-background);
  color: var(--p-text-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease;
}
.slot-option:hover { border-color: var(--p-primary-color); }
.slot-option.is-selected {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 10%, var(--p-content-background));
  font-weight: 600;
}
.slot-option.is-skipped .slot-option-label { color: var(--p-text-muted-color); }
.slot-skipped-note { font-weight: 400; font-size: .85em; }
.slot-occupied-dot {
  width: .5rem;
  height: .5rem;
  border-radius: 999px;
  background: var(--p-primary-color);
  flex-shrink: 0;
}
.cooked-row { display: flex; align-items: center; gap: .5rem; margin-top: .25rem; }
.cooked-row label { font-size: .9rem; cursor: pointer; }
.dialog-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .25rem; }
@media (max-width: 640px) {
  .move-meal-grid { grid-template-columns: 1fr; }
}
</style>

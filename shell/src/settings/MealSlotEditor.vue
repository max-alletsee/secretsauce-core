<script setup lang="ts">
import { ref } from 'vue'
import { slugMealType, DEFAULT_PREDEFINED_NOTES } from './mealSlots'
import type { MealSlotType } from '@secretsauce/ui'

type MealSlot = MealSlotType
const props = defineProps<{ modelValue: MealSlot[] }>()
const emit = defineEmits<{ 'update:modelValue': [slots: MealSlot[]] }>()
const adding = ref(false), name = ref('')
const newNoteInputs = ref<Record<string, string>>({})

function getNotes(slot: MealSlot): string[] {
  return slot.predefined_notes ?? DEFAULT_PREDEFINED_NOTES
}

function rename(index: number, label: string) {
  emit('update:modelValue', props.modelValue.map((slot, i) => i === index ? { ...slot, label } : slot))
}

function move(index: number, direction: number) {
  const slots = [...props.modelValue]
  const target = index + direction
  if (target < 0 || target >= slots.length) return
  ;[slots[index], slots[target]] = [slots[target], slots[index]]
  emit('update:modelValue', slots)
}

function remove(index: number) {
  if (props.modelValue.length > 1) emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function add() {
  const label = name.value.trim()
  if (!label || label.length > 64) return
  emit('update:modelValue', [...props.modelValue, { id: slugMealType(label, props.modelValue.map(slot => slot.id)), label }])
  adding.value = false
  name.value = ''
}

function addNote(slotIndex: number) {
  const slot = props.modelValue[slotIndex]
  const text = (newNoteInputs.value[slot.id] || '').trim()
  if (!text || text.length > 64) return
  const current = [...getNotes(slot)]
  if (!current.includes(text)) {
    current.push(text)
  }
  newNoteInputs.value[slot.id] = ''
  emit('update:modelValue', props.modelValue.map((s, i) => i === slotIndex ? { ...s, predefined_notes: current } : s))
}

function removeNote(slotIndex: number, noteIndex: number) {
  const slot = props.modelValue[slotIndex]
  const current = [...getNotes(slot)]
  current.splice(noteIndex, 1)
  emit('update:modelValue', props.modelValue.map((s, i) => i === slotIndex ? { ...s, predefined_notes: current } : s))
}
</script>
<template>
  <div class="meal-slot-editor">
    <h3>Default meal slots</h3>
    <div v-for="(slot, index) in modelValue" :key="slot.id" :data-slot-id="slot.id" class="slot-item">
      <div class="slot-row">
        <InputText :id="`slot-label-${slot.id}`" :aria-label="`Label for ${slot.id}`" :modelValue="slot.label" maxlength="64" @update:modelValue="rename(index, $event ?? '')" />
        <Button icon="pi pi-arrow-up" text rounded :aria-label="`Move ${slot.label} up`" :disabled="index === 0" @click="move(index, -1)" />
        <Button icon="pi pi-arrow-down" text rounded :aria-label="`Move ${slot.label} down`" :disabled="index === modelValue.length - 1" @click="move(index, 1)" />
        <Button icon="pi pi-trash" text rounded severity="danger" :aria-label="`Remove ${slot.label}`" :disabled="modelValue.length === 1" @click="remove(index)" />
      </div>
      <div class="slot-notes" :data-slot-notes="slot.id">
        <span class="slot-notes-title">Pre-defined notes</span>
        <div class="slot-notes-list">
          <span v-for="(noteText, noteIndex) in getNotes(slot)" :key="noteIndex" class="note-pill">
            <span class="note-pill-text">{{ noteText }}</span>
            <button type="button" class="note-pill-remove" :aria-label="`Remove note ${noteText} from ${slot.label}`" @click="removeNote(index, noteIndex)">&times;</button>
          </span>
          <span v-if="!getNotes(slot).length" class="empty-notes-hint">No pre-defined notes</span>
        </div>
        <div class="add-note-row">
          <InputText :id="`new-note-input-${slot.id}`" v-model="newNoteInputs[slot.id]" :aria-label="`New note for ${slot.label}`" placeholder="Add note (e.g. Brotzeit)" maxlength="64" @keydown.enter.prevent="addNote(index)" />
          <Button label="Add note" size="small" text :disabled="!newNoteInputs[slot.id]?.trim()" :aria-label="`Add note to ${slot.label}`" @click="addNote(index)" />
        </div>
      </div>
    </div>
    <Button label="Add slot" icon="pi pi-plus" text @click="adding = true" />
    <Dialog v-model:visible="adding" header="Add meal slot" modal :style="{ width: '26rem', maxWidth: '95vw' }">
      <form @submit.prevent="add">
        <label for="new-slot-name">Slot name</label>
        <InputText id="new-slot-name" v-model="name" maxlength="64" autofocus />
        <div class="dialog-actions"><Button label="Cancel" severity="secondary" text @click="adding = false" /><Button type="submit" label="Add" :disabled="!name.trim()" /></div>
      </form>
    </Dialog>
  </div>
</template>
<style scoped>
.slot-item {
  display: flex;
  flex-direction: column;
  gap: .25rem;
  margin-bottom: .5rem;
  padding: .375rem .5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
}
.slot-row { display: flex; align-items: center; gap: .25rem; }
.slot-row input { min-width: 0; flex: 1; }
.slot-notes {
  display: flex;
  flex-direction: column;
  gap: .375rem;
  padding-left: .25rem;
}
.slot-notes-title {
  font-size: .8rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}
.slot-notes-list {
  display: flex;
  flex-wrap: wrap;
  gap: .375rem;
  align-items: center;
}
.note-pill {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  padding: .2rem .5rem;
  background: var(--p-content-hover-background, #f3f4f6);
  border: 1px solid var(--p-content-border-color, #e5e7eb);
  border-radius: 1rem;
  font-size: .8rem;
}
.note-pill-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: var(--p-text-muted-color);
  display: flex;
  align-items: center;
  justify-content: center;
}
.note-pill-remove:hover {
  color: var(--p-danger-color, #dc2626);
}
.empty-notes-hint {
  font-size: .8rem;
  font-style: italic;
  color: var(--p-text-muted-color);
}
.add-note-row {
  display: flex;
  align-items: center;
  gap: .375rem;
  margin-top: .25rem;
}
.add-note-row input {
  font-size: .8rem;
  padding: .25rem .5rem;
}
form { display: flex; flex-direction: column; gap: .5rem; }
.dialog-actions { display: flex; justify-content: flex-end; gap: .5rem; }
h3 { margin: .25rem 0; font-size: .95rem; }
</style>

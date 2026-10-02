<script setup lang="ts">
import { ref } from 'vue'
import { slugMealType } from './mealSlots'
type MealSlot = { id: string; label: string }
const props = defineProps<{ modelValue: MealSlot[] }>()
const emit = defineEmits<{ 'update:modelValue': [slots: MealSlot[]] }>()
const adding = ref(false), name = ref('')
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
</script>
<template>
  <div class="meal-slot-editor">
    <h3>Default meal slots</h3>
    <div v-for="(slot, index) in modelValue" :key="slot.id" :data-slot-id="slot.id" class="slot-row">
      <InputText :id="`slot-label-${slot.id}`" :aria-label="`Label for ${slot.id}`" :modelValue="slot.label" maxlength="64" @update:modelValue="rename(index, $event ?? '')" />
      <Button icon="pi pi-arrow-up" text rounded :aria-label="`Move ${slot.label} up`" :disabled="index === 0" @click="move(index, -1)" />
      <Button icon="pi pi-arrow-down" text rounded :aria-label="`Move ${slot.label} down`" :disabled="index === modelValue.length - 1" @click="move(index, 1)" />
      <Button icon="pi pi-trash" text rounded severity="danger" :aria-label="`Remove ${slot.label}`" :disabled="modelValue.length === 1" @click="remove(index)" />
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
.slot-row { display: flex; align-items: center; gap: .25rem; margin-bottom: .5rem; }
.slot-row input { min-width: 0; flex: 1; }
form { display: flex; flex-direction: column; gap: .75rem; }
.dialog-actions { display: flex; justify-content: flex-end; gap: .5rem; }
h3 { font-size: 1rem; }
</style>

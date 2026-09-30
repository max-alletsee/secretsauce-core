<script setup lang="ts">
import { ref, watch } from 'vue'
export interface IngredientItem { id: string; quantity: number | null; quantity_max?: number | null; unit: string | null; name: string; notes?: string | null }
const props = defineProps<{ modelValue: IngredientItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [IngredientItem[]] }>()
const rows = ref<IngredientItem[]>(JSON.parse(JSON.stringify(props.modelValue || [])))
watch(() => props.modelValue, value => { rows.value = JSON.parse(JSON.stringify(value || [])) }, { deep: true })
const commonUnits = [null, 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'piece', 'clove', 'pinch', 'can'].map(id => ({ id, label: id || '(none)' }))
function updateRows() { emit('update:modelValue', rows.value) }
function addRow() { rows.value.push({ id: crypto.randomUUID(), quantity: 1, unit: 'g', name: '', notes: '' }); updateRows() }
function removeRow(index: number) { rows.value.splice(index, 1); updateRows() }
function move(index: number, offset: number) { const target = index + offset; if (target < 0 || target >= rows.value.length) return; rows.value.splice(target, 0, rows.value.splice(index, 1)[0]); updateRows() }
</script>
<template>
  <div class="ingredient-row-list">
    <div v-for="(row, index) in rows" :key="row.id" class="ingredient-row">
      <div class="reorder-btns"><Button icon="pi pi-angle-up" aria-label="Move ingredient up" text size="small" :disabled="index === 0" @click="move(index, -1)" /><Button icon="pi pi-angle-down" aria-label="Move ingredient down" text size="small" :disabled="index === rows.length - 1" @click="move(index, 1)" /></div>
      <InputNumber v-model="row.quantity" inputClass="input-qty" :aria-label="`Ingredient ${index + 1} quantity`" :min="0" :maxFractionDigits="3" @update:modelValue="updateRows" />
      <Select v-model="row.unit" :options="commonUnits" optionLabel="label" optionValue="id" class="select-unit" :aria-label="`Ingredient ${index + 1} unit`" @update:modelValue="updateRows" />
      <InputText v-model="row.name" class="input-name" :aria-label="`Ingredient ${index + 1} name`" placeholder="Ingredient name" @input="updateRows" />
      <InputText v-model="row.notes" class="input-notes" :aria-label="`Ingredient ${index + 1} notes`" placeholder="Notes" @input="updateRows" />
      <Button icon="pi pi-times" class="btn-remove" aria-label="Remove ingredient" text severity="danger" @click="removeRow(index)" />
    </div>
    <Button label="Add Ingredient" class="btn-add-ingredient" icon="pi pi-plus" outlined @click="addRow" />
  </div>
</template>
<style scoped>
.ingredient-row-list { display: grid; gap: .75rem; }.ingredient-row { display: grid; grid-template-columns: auto 5rem 6rem minmax(6rem, 2fr) minmax(5rem, 1fr) auto; gap: .5rem; align-items: center; }.reorder-btns { display: flex; flex-direction: column; }
.ingredient-row :deep(input), .ingredient-row :deep(.p-inputnumber) { width: 100%; min-width: 0; }.btn-add-ingredient { justify-self: start; }
@media (max-width: 767px) { .ingredient-row { grid-template-columns: auto 1fr 1fr auto; }.input-name, .input-notes { grid-column: span 2; } }
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'

export interface IngredientItem {
  id: string
  quantity: number | null
  quantity_max?: number | null
  unit: string | null
  name: string
  notes?: string | null
}

const props = defineProps<{
  modelValue: IngredientItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [IngredientItem[]]
}>()

const rows = ref<IngredientItem[]>(props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : [])

watch(
  () => props.modelValue,
  (newVal) => {
    rows.value = newVal ? JSON.parse(JSON.stringify(newVal)) : []
  },
  { deep: true }
)

const commonUnits = [
  { id: '', label: '(none)' },
  { id: 'g', label: 'g' },
  { id: 'kg', label: 'kg' },
  { id: 'ml', label: 'ml' },
  { id: 'l', label: 'l' },
  { id: 'tsp', label: 'tsp' },
  { id: 'tbsp', label: 'tbsp' },
  { id: 'cup', label: 'cup' },
  { id: 'oz', label: 'oz' },
  { id: 'lb', label: 'lb' },
  { id: 'piece', label: 'piece' },
  { id: 'clove', label: 'clove' },
  { id: 'pinch', label: 'pinch' },
  { id: 'can', label: 'can' },
]

function addRow() {
  const newRow: IngredientItem = {
    id: String(Date.now() + Math.random()),
    quantity: 1,
    unit: 'g',
    name: '',
    notes: '',
  }
  rows.value.push(newRow)
  emit('update:modelValue', rows.value)
}

function removeRow(index: number) {
  rows.value.splice(index, 1)
  emit('update:modelValue', rows.value)
}

function updateRow() {
  emit('update:modelValue', rows.value)
}

function moveUp(index: number) {
  if (index <= 0) return
  const item = rows.value.splice(index, 1)[0]
  rows.value.splice(index - 1, 0, item)
  emit('update:modelValue', rows.value)
}

function moveDown(index: number) {
  if (index >= rows.value.length - 1) return
  const item = rows.value.splice(index, 1)[0]
  rows.value.splice(index + 1, 0, item)
  emit('update:modelValue', rows.value)
}
</script>

<template>
  <div class="ingredient-row-list">
    <div class="rows-container">
      <div v-for="(row, idx) in rows" :key="row.id" class="ingredient-row">
        <div class="reorder-btns">
          <button type="button" class="btn-arrow" :disabled="idx === 0" @click="moveUp(idx)">▲</button>
          <button type="button" class="btn-arrow" :disabled="idx === rows.length - 1" @click="moveDown(idx)">▼</button>
        </div>
        <input
          v-model.number="row.quantity"
          type="number"
          step="any"
          min="0"
          placeholder="Qty"
          class="input input-qty"
          @input="updateRow"
        />
        <select v-model="row.unit" class="select-unit" @change="updateRow">
          <option v-for="u in commonUnits" :key="u.id" :value="u.id || null">{{ u.label }}</option>
        </select>
        <input
          v-model="row.name"
          type="text"
          placeholder="Ingredient name (e.g. Flour)"
          class="input input-name"
          @input="updateRow"
        />
        <input
          v-model="row.notes"
          type="text"
          placeholder="Notes (e.g. sifted)"
          class="input input-notes"
          @input="updateRow"
        />
        <button type="button" class="btn-remove" @click="removeRow(idx)" title="Remove ingredient">✕</button>
      </div>
    </div>
    <button type="button" class="btn-add-ingredient" @click="addRow">+ Add Ingredient</button>
  </div>
</template>

<style scoped>
.ingredient-row-list { display: flex; flex-direction: column; gap: 8px; }
.rows-container { display: flex; flex-direction: column; gap: 8px; }
.ingredient-row { display: flex; align-items: center; gap: 8px; }
.reorder-btns { display: flex; flex-direction: column; }
.btn-arrow { background: none; border: none; font-size: 8px; cursor: pointer; padding: 2px 4px; }
.btn-arrow:disabled { opacity: 0.3; cursor: default; }
.input { padding: 6px 8px; border: 1px solid #d6d3d1; border-radius: 4px; font-size: 0.9em; }
.input-qty { width: 70px; }
.select-unit { padding: 6px 8px; border: 1px solid #d6d3d1; border-radius: 4px; background: white; font-size: 0.9em; }
.input-name { flex: 2; }
.input-notes { flex: 1.5; }
.btn-remove { background: transparent; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
.btn-add-ingredient { align-self: flex-start; background: #f5f5f4; border: 1px dashed #a8a29e; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9em; }
.btn-add-ingredient:hover { background: #e7e5e4; }
</style>

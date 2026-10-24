<script setup lang="ts">
import { ref, watch } from 'vue'
export interface StepItem { id: string; instruction: string; timer_minutes: number | null; title?: string }
const props = defineProps<{ modelValue: StepItem[] }>()
const emit = defineEmits<{ 'update:modelValue': [StepItem[]] }>()
const steps = ref<StepItem[]>(JSON.parse(JSON.stringify(props.modelValue || [])))
watch(() => props.modelValue, value => { steps.value = JSON.parse(JSON.stringify(value || [])) }, { deep: true })
function updateSteps() { emit('update:modelValue', steps.value) }
function addStep() { steps.value.push({ id: crypto.randomUUID(), instruction: '', timer_minutes: null }); updateSteps() }
function removeStep(index: number) { steps.value.splice(index, 1); updateSteps() }
</script>
<template>
  <div class="step-list"><div v-for="(step, index) in steps" :key="step.id" class="step-row">
    <Tag :value="String(index + 1)" severity="secondary" />
    <div class="step-inputs"><Textarea v-model="step.instruction" class="textarea-instruction" :aria-label="`Step ${index + 1} instruction`" rows="3" fluid @input="updateSteps" /><div class="timer-row"><label :for="`timer-${step.id}`">Timer (min)</label><InputNumber :inputId="`timer-${step.id}`" v-model="step.timer_minutes" :min="0" inputClass="input-timer" @update:modelValue="updateSteps" /></div></div>
    <Button icon="pi pi-times" class="btn-remove" aria-label="Remove step" severity="danger" text @click="removeStep(index)" />
  </div><Button label="Add Step" class="btn-add-step" icon="pi pi-plus" outlined @click="addStep" /></div>
</template>
<style scoped>
.step-list { display: grid; gap: .5rem; }.step-row { display: flex; gap: .5rem; align-items: flex-start; }.step-inputs { flex: 1; min-width: 0; display: grid; gap: .375rem; }.timer-row { display: flex; gap: .375rem; align-items: center; color: var(--p-text-muted-color); }.timer-row :deep(input) { width: 5rem; }.btn-add-step { justify-self: start; }
</style>

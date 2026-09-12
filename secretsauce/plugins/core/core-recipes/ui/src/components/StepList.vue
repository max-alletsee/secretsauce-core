<script setup lang="ts">
import { ref, watch } from 'vue'

export interface StepItem {
  id: string
  instruction: string
  timer_minutes: number | null
  title?: string
}

const props = defineProps<{
  modelValue: StepItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [StepItem[]]
}>()

const steps = ref<StepItem[]>(props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : [])

watch(
  () => props.modelValue,
  (newVal) => {
    steps.value = newVal ? JSON.parse(JSON.stringify(newVal)) : []
  },
  { deep: true }
)

function addStep() {
  steps.value.push({
    id: String(Date.now() + Math.random()),
    instruction: '',
    timer_minutes: null,
  })
  emit('update:modelValue', steps.value)
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
  emit('update:modelValue', steps.value)
}

function updateSteps() {
  emit('update:modelValue', steps.value)
}
</script>

<template>
  <div class="step-list">
    <div class="steps-container">
      <div v-for="(s, idx) in steps" :key="s.id" class="step-row">
        <div class="step-num">{{ idx + 1 }}</div>
        <div class="step-inputs">
          <textarea
            v-model="s.instruction"
            rows="2"
            placeholder="Instruction details..."
            class="textarea-instruction"
            @input="updateSteps"
          />
          <div class="timer-row">
            <label>Timer (min):</label>
            <input
              v-model.number="s.timer_minutes"
              type="number"
              min="0"
              placeholder="Optional"
              class="input-timer"
              @input="updateSteps"
            />
          </div>
        </div>
        <button type="button" class="btn-remove" @click="removeStep(idx)">✕</button>
      </div>
    </div>
    <button type="button" class="btn-add-step" @click="addStep">+ Add Step</button>
  </div>
</template>

<style scoped>
.step-list { display: flex; flex-direction: column; gap: 8px; }
.steps-container { display: flex; flex-direction: column; gap: 12px; }
.step-row { display: flex; gap: 10px; align-items: flex-start; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: #e7e5e4; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85em; margin-top: 4px; }
.step-inputs { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.textarea-instruction { width: 100%; padding: 8px; border: 1px solid #d6d3d1; border-radius: 4px; font-family: inherit; font-size: 0.9em; box-sizing: border-box; }
.timer-row { display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: #57534e; }
.input-timer { width: 70px; padding: 4px; border: 1px solid #d6d3d1; border-radius: 4px; }
.btn-remove { background: transparent; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
.btn-add-step { align-self: flex-start; background: #f5f5f4; border: 1px dashed #a8a29e; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.9em; }
.btn-add-step:hover { background: #e7e5e4; }
</style>

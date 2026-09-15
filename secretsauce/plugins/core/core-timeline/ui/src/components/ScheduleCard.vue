<script setup lang="ts">
import { Slot } from '@secretsauce/ui'

const props = defineProps<{
  entry: any
}>()

const emit = defineEmits<{
  (e: 'interact', entry: any): void
}>()
</script>

<template>
  <div class="schedule-card" @click="emit('interact', entry)">
    <div class="card-header">
      <span class="card-title">{{ entry.recipe?.title || entry.title || 'Planned Meal' }}</span>
      <Slot name="timeline.entry.badge" :context="{ entry }" />
    </div>
    <div v-if="entry.servings_override" class="card-servings">
      {{ entry.servings_override }} servings
    </div>
    <div v-if="entry.note" class="card-note">
      {{ entry.note }}
    </div>
  </div>
</template>

<style scoped>
.schedule-card {
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: border-color 0.15s;
}
.schedule-card:hover {
  border-color: #0284c7;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-weight: 500;
  font-size: 0.9em;
}
.card-servings {
  font-size: 0.75em;
  color: #78716c;
  margin-top: 2px;
}
.card-note {
  font-size: 0.75em;
  color: #a8a29e;
  margin-top: 2px;
  font-style: italic;
}
</style>

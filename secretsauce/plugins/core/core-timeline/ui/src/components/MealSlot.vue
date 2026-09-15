<script setup lang="ts">
import ScheduleCard from './ScheduleCard.vue'

const props = defineProps<{
  mealType: string
  date: string
  entries: any[]
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', payload: { date: string; mealType: string }): void
  (e: 'interact', entry: any): void
}>()
</script>

<template>
  <div class="meal-slot" :class="{ 'is-compact': compact }">
    <div class="slot-header">
      <span class="slot-name">{{ mealType }}</span>
      <button
        v-if="!compact"
        class="add-btn"
        title="Add meal"
        @click="emit('add', { date, mealType })"
      >
        +
      </button>
    </div>
    <div class="entries-list">
      <ScheduleCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @interact="emit('interact', $event)"
      />
      <div v-if="!entries.length && !compact" class="empty-slot">
        <button class="empty-add-link" @click="emit('add', { date, mealType })">
          + Add
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meal-slot {
  margin-bottom: 8px;
}
.meal-slot.is-compact {
  margin-bottom: 4px;
}
.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.slot-name {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #78716c;
  font-weight: 600;
}
.add-btn {
  border: none;
  background: transparent;
  color: #0284c7;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0 4px;
}
.add-btn:hover {
  color: #0369a1;
}
.empty-slot {
  padding: 4px;
  border: 1px dashed #e7e5e4;
  border-radius: 4px;
  text-align: center;
}
.empty-add-link {
  border: none;
  background: transparent;
  color: #a8a29e;
  font-size: 0.8em;
  cursor: pointer;
}
.empty-add-link:hover {
  color: #0284c7;
}
</style>

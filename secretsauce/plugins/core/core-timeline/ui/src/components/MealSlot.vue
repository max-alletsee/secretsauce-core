<script setup lang="ts">
import { IntentTrigger } from '@secretsauce/ui'
import ScheduleCard from './ScheduleCard.vue'
defineProps<{ mealType: string; date: string; entries: any[]; compact?: boolean }>()
const emit = defineEmits<{ add: [payload: { date: string; mealType: string }]; changed: [] }>()
</script>

<template>
  <div class="meal-slot" :class="{ 'is-compact': compact }">
    <div class="slot-header"><span class="slot-name">{{ mealType }}</span>
      <Button v-if="!compact" class="add-btn" icon="pi pi-plus" aria-label="Add meal" title="Add meal" variant="text" size="small" @click="emit('add', { date, mealType })" />
    </div>
    <div class="entries-list">
      <IntentTrigger v-for="entry in entries" :key="entry.id" hub="entry:interact" :context="{ entry }" @resolve="emit('changed')">
        <template #default="{ open }"><ScheduleCard :entry="entry" @interact="open" /></template>
      </IntentTrigger>
      <div v-if="!entries.length && !compact" class="empty-slot"><Button class="empty-add-link" label="Add" icon="pi pi-plus" variant="text" size="small" @click="emit('add', { date, mealType })" /></div>
    </div>
  </div>
</template>

<style scoped>
.meal-slot { margin-bottom: .5rem; }
.slot-header { display: flex; justify-content: space-between; align-items: center; }
.slot-name { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--p-text-muted-color); font-weight: 600; }
.empty-slot { padding: .25rem; border: 1px dashed var(--p-content-border-color); border-radius: var(--p-border-radius); text-align: center; }
</style>

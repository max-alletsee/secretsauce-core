<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
defineProps<{ entry: any }>()
const emit = defineEmits<{ interact: [event: Event] }>()
</script>

<template>
  <Button class="schedule-card" variant="text" @click="emit('interact', $event)">
    <div class="card-header"><span class="card-title">{{ entry.recipe?.title || entry.title || 'Planned Meal' }}</span><Slot name="timeline.entry.badge" :context="{ entry }" /></div>
    <div v-if="entry.servings_override" class="card-servings">{{ entry.servings_override }} servings</div>
    <div v-if="entry.note" class="card-note">{{ entry.note }}</div>
  </Button>
</template>

<style scoped>
.schedule-card { display: block; text-align: left; width: 100%; padding: .5rem .625rem; background: var(--p-content-background); color: var(--p-text-color); border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); margin-bottom: .375rem; }
.schedule-card:hover { border-color: var(--p-primary-color); }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: .25rem; }
.card-title { font-weight: 500; font-size: .9rem; }
.card-servings, .card-note { color: var(--p-text-muted-color); font-size: .75rem; margin-top: .125rem; }
.card-note { font-style: italic; }
</style>

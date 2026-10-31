<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
function weekday(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en', {weekday:'long'}) }
defineProps<{ entry: any }>()
const emit = defineEmits<{ interact: [event: Event] }>()
</script>

<template>
  <div class="timeline-card" @click="emit('interact', $event)">
    <Button class="timeline-card-main" variant="text">
      <div class="card-header"><span class="card-title">{{ entry.recipe?.title || entry.title || 'Planned Meal' }}</span><i v-if="entry.origin === 'plugin:core-recurring'" class="pi pi-replay" v-tooltip="`Repeats every ${weekday(entry.date)}`" :aria-label="`Repeats every ${weekday(entry.date)}`" /><Slot name="timeline.entry.badge" :context="{ entry }" /></div>
      <div v-if="entry.servings_override" class="card-servings">{{ entry.servings_override }} servings</div>
      <div v-if="entry.note" class="card-note">{{ entry.note }}</div>
    </Button>
    <div v-if="entry.status === 'cooked'" class="card-footer" @click.stop>
      <Slot name="timeline.entry.footer" :context="{ entry }" />
    </div>
  </div>
</template>

<style scoped>
.timeline-card { display: grid; gap: .25rem; width: 100%; padding: .25rem .5rem; background: var(--p-content-background); color: var(--p-text-color); border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); margin-bottom: .2rem; cursor: pointer; }
.timeline-card:last-child { margin-bottom: 0; }
.timeline-card:hover { border-color: var(--p-primary-color); }
.timeline-card-main { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .125rem .5rem; text-align: left; width: 100%; padding: 0; background: transparent !important; color: inherit; border: 0; }
.card-header { display: flex; align-items: center; gap: .35rem; flex: 1; min-width: 0; }
.card-header :deep(.p-tag) { padding: .1rem .35rem; font-size: .7rem; }
.card-title { font-weight: 500; font-size: .85rem; line-height: 1.25; }
.card-servings, .card-note { color: var(--p-text-muted-color); font-size: .72rem; line-height: 1.2; }
.card-servings { white-space: nowrap; }
.card-note { flex-basis: 100%; font-style: italic; }
.card-footer { padding-top: .2rem; border-top: 1px solid var(--p-content-border-color); cursor: default; }
</style>

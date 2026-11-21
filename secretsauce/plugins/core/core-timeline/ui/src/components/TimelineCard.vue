<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
function weekday(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString('en', {weekday:'long'}) }
defineProps<{ entry: any }>()
const emit = defineEmits<{ interact: [event: Event] }>()
</script>

<template>
  <div class="timeline-card" @click="emit('interact', $event)">
    <button type="button" class="timeline-card-main">
      <div class="card-header">
        <span class="card-title"><i v-if="entry.recipe_id" class="pi pi-book recipe-entry-icon" aria-hidden="true" />{{ entry.recipe?.title || entry.title || 'Planned Meal' }}</span>
        <i v-if="entry.origin === 'plugin:core-recurring'" class="pi pi-replay recurring-entry-icon" v-tooltip="`Repeats every ${weekday(entry.date)}`" :aria-label="`Repeats every ${weekday(entry.date)}`" />
        <Slot name="timeline.entry.badge" :context="{ entry }" />
      </div>
      <div v-if="entry.servings_override" class="card-servings">{{ entry.servings_override }} servings</div>
      <div v-if="entry.note" class="card-note">{{ entry.note }}</div>
    </button>
    <div v-if="entry.status === 'cooked'" class="card-footer" @click.stop>
      <Slot name="timeline.entry.footer" :context="{ entry }" />
    </div>
  </div>
</template>

<style scoped>
.timeline-card { display: flex; flex-wrap: wrap; align-items: center; gap: .15rem .5rem; width: 100%; min-width: 0; padding: .175rem .45rem; background: var(--p-content-background); color: var(--p-text-color); border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); cursor: pointer; transition: border-color .15s ease, background-color .15s ease; }
.timeline-card:hover { border-color: var(--p-primary-color); background: color-mix(in srgb, var(--p-primary-color) 4%, var(--p-content-background)); }
.timeline-card-main { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .125rem .45rem; flex: 1 1 11rem; min-width: 0; text-align: left; padding: 0; margin: 0; background: transparent; color: inherit; border: 0; font: inherit; cursor: pointer; }
.timeline-card-main:focus-visible { outline: 2px solid var(--p-primary-color); outline-offset: 1px; border-radius: 2px; }
.card-header { display: flex; flex-wrap: wrap; align-items: center; gap: .2rem .35rem; flex: 1 1 8rem; min-width: 0; }
.card-header :deep(.p-tag) { padding: .075rem .325rem; font-size: .68rem; }
.recipe-entry-icon { font-size: .74rem; color: var(--p-text-muted-color); margin-right: .3rem; vertical-align: -.04em; }
.recurring-entry-icon { font-size: .75rem; color: var(--p-text-muted-color); flex-shrink: 0; }
.card-title { font-weight: 500; font-size: .85rem; line-height: 1.25; min-width: 0; overflow-wrap: anywhere; }
.card-servings, .card-note { color: var(--p-text-muted-color); font-size: .72rem; line-height: 1.2; }
.card-servings { white-space: nowrap; }
.card-note { flex-basis: 100%; min-width: 0; overflow-wrap: anywhere; font-style: italic; }
.card-footer { display: flex; align-items: center; flex: 0 0 auto; margin-left: auto; cursor: default; }
</style>

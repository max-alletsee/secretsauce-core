<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { Slot } from '@secretsauce/ui'

const api = inject<any>('__SS_API__', null)
const entries = ref<any[]>([])

function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function loadJournal() {
  if (!api) return
  try {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    const res = await api.get(`/api/journal?from=${toDateString(start)}&to=${toDateString(end)}`)
    entries.value = Array.isArray(res) ? res : []
  } catch {
    entries.value = []
  }
}

onMounted(() => {
  loadJournal()
})
</script>

<template>
  <div class="journal-page">
    <h2>Cooking Journal</h2>
    <div v-if="entries.length" class="journal-list">
      <div v-for="e in entries" :key="e.id" class="journal-entry-card">
        <div class="entry-header">
          <span class="entry-date">{{ e.date }} ({{ e.meal_type || 'meal' }})</span>
          <span class="entry-servings">{{ e.servings }} servings</span>
        </div>
        <div class="entry-body">
          <h4 class="recipe-title">{{ e.recipe?.title || e.title || 'Cooked meal' }}</h4>
          <p v-if="e.notes" class="entry-notes">{{ e.notes }}</p>
        </div>
        <div class="entry-footer">
          <Slot name="journal.entry.footer" :context="{ entry: e }" />
        </div>
      </div>
    </div>
    <p v-else class="empty-hint">No meals recorded in journal yet.</p>
  </div>
</template>

<style scoped>
.journal-page {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}
.journal-page h2 { margin-top: 0; }
.journal-list { display: flex; flex-direction: column; gap: 12px; }
.journal-entry-card {
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  padding: 12px;
  background: white;
}
.entry-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: #78716c;
}
.recipe-title { margin: 6px 0; font-size: 1.05em; }
.entry-notes { margin: 4px 0; color: #57534e; font-size: 0.9em; }
.entry-footer { margin-top: 8px; border-top: 1px solid #f5f5f4; padding-top: 6px; }
.empty-hint { color: #a8a29e; text-align: center; margin-top: 40px; }
</style>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'

const props = defineProps<{
  context?: unknown
}>()

const api = inject<any>('__SS_API__')
const entries = ref<any[]>([])

onMounted(async () => {
  if (api) {
    try {
      entries.value = await api.get('/api/x/shortlist')
    } catch {
      // offline fallback
    }
  }
})
</script>

<template>
  <div class="shortlist-sidebar">
    <h4>Shortlist ({{ entries.length }})</h4>
    <ul v-if="entries.length" class="sidebar-list">
      <li v-for="e in entries" :key="e.id">
        <a :href="`#/recipes/${e.recipe_id}`">{{ e.recipe_title || 'Recipe' }}</a>
      </li>
    </ul>
    <p v-else class="empty-hint">No shortlisted recipes.</p>
  </div>
</template>

<style scoped>
.shortlist-sidebar {
  padding: 12px;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  background: #fafaf9;
}
.shortlist-sidebar h4 { margin: 0 0 8px 0; font-size: 0.95em; }
.sidebar-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.sidebar-list a { color: #0284c7; text-decoration: none; font-size: 0.85em; }
.sidebar-list a:hover { text-decoration: underline; }
.empty-hint { color: #a8a29e; font-size: 0.8em; margin: 0; }
</style>

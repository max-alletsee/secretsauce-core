<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { Slot, IntentTrigger } from '@secretsauce/ui'
import RecipeCard from '../components/RecipeCard.vue'

const emit = defineEmits<{
  openRecipe: [string]
}>()

const navigate = inject<(path: string) => void>('__SS_NAVIGATE__', (path: string) => {
  window.location.href = path
})
const api = inject<any>('__SS_API__')
const recipes = ref<any[]>([])
const search = ref('')
const activeTag = ref<string | null>(null)
const sortBy = ref('title')

function openRecipe(id: string) {
  emit('openRecipe', id)
  navigate(`/recipes/${id}`)
}

const shortlistOnly = ref(false)
const shortlistedIds = ref<Set<string>>(new Set())

async function loadShortlist() {
  if (!api) return
  try {
    const res = await api.get('/api/x/core-shortlist')
    const ids = new Set<string>()
    if (Array.isArray(res)) {
      for (const item of res) {
        if (item.recipe_id) ids.add(item.recipe_id)
      }
    }
    shortlistedIds.value = ids
  } catch {
    // offline or shortlist not enabled
  }
}

async function toggleShortlistFilter() {
  shortlistOnly.value = !shortlistOnly.value
  if (shortlistOnly.value) {
    await loadShortlist()
  }
}

async function loadRecipes() {
  if (!api) return
  try {
    const res = await api.get('/api/recipes', { params: { q: search.value || undefined } })
    recipes.value = res.items || []
  } catch {
    // offline fallback
  }
}

onMounted(() => {
  loadRecipes()
  loadShortlist()
})

const allTags = computed(() => {
  const set = new Set<string>()
  for (const r of recipes.value) {
    for (const t of r.tags || []) set.add(t)
  }
  return Array.from(set)
})

const filteredRecipes = computed(() => {
  let list = recipes.value.map((r) => ({
    ...r,
    is_shortlisted: shortlistedIds.value.has(r.id),
  }))
  if (shortlistOnly.value) {
    list = list.filter((r) => shortlistedIds.value.has(r.id))
  }
  if (activeTag.value) {
    list = list.filter((r) => r.tags?.includes(activeTag.value))
  }
  if (sortBy.value === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title))
  } else if (sortBy.value === 'prep') {
    list.sort((a, b) => (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0))
  }
  return list
})
</script>

<template>
  <div class="recipe-list-page">
    <h1 class="page-title">Recipes</h1>
    <div class="intent-header-bar">
      <div class="search-box">
        <input
          v-model="search"
          type="search"
          placeholder="Search recipes (trigram FTS)..."
          class="input-search"
          @input="loadRecipes"
        />
      </div>
      <div class="intent-area">
        <IntentTrigger hub="recipe:create" label="+ Add / Import Recipe" />
      </div>
    </div>

    <div class="filter-sort-bar">
      <Slot name="recipe.list.filters" :context="{ active: shortlistOnly, toggle: toggleShortlistFilter }" />
      <div v-if="allTags.length" class="tag-chips">
        <button
          v-for="t in allTags"
          :key="t"
          class="tag-chip"
          :class="{ active: activeTag === t }"
          @click="activeTag = activeTag === t ? null : t"
        >
          {{ t }}
        </button>
      </div>
      <select v-model="sortBy" class="select-sort">
        <option value="title">Title (A-Z)</option>
        <option value="prep">Prep time</option>
      </select>
    </div>

    <div v-if="filteredRecipes.length" class="recipes-grid">
      <RecipeCard
        v-for="r in filteredRecipes"
        :key="r.id"
        :recipe="r"
        @select="openRecipe"
      />
    </div>

    <div v-else class="empty-banner">
      <h3>No recipes found</h3>
      <p>Start your household cookbook by adding your first recipe!</p>
      <IntentTrigger hub="recipe:create" label="+ Add / Import Recipe" />
    </div>
  </div>
</template>

<style scoped>
.recipe-list-page { padding: 24px; max-width: 1200px; margin: 0 auto; }
.intent-header-bar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.search-box { flex: 1; }
.input-search { width: 100%; padding: 10px 14px; border: 1px solid #d6d3d1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
.filter-sort-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.tag-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.tag-chip { padding: 4px 10px; border-radius: 9999px; border: 1px solid #d6d3d1; background: white; font-size: 0.85em; cursor: pointer; }
.tag-chip.active { background: #0284c7; color: white; border-color: #0284c7; }
.select-sort { padding: 6px 12px; border: 1px solid #d6d3d1; border-radius: 6px; background: white; margin-left: auto; }
.recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
.empty-banner { text-align: center; padding: 48px; border: 2px dashed #e7e5e4; border-radius: 12px; background: #fafaf9; }
</style>

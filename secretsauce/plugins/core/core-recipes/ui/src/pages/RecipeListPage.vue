<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Slot, IntentTrigger, useSecretSauce } from '@secretsauce/ui'
import RecipeCard from '../components/RecipeCard.vue'
const emit = defineEmits<{ openRecipe: [string] }>()
const ss = useSecretSauce()
const recipes = ref<any[]>([]), search = ref(''), activeTag = ref<string | null>(null), sortBy = ref('title'), error = ref('')
const shortlistOnly = ref(false), shortlistedIds = ref(new Set<string>())
let request = 0
async function loadShortlist() {
  try { const rows = await ss.api.get<any[]>('/api/x/core-shortlist'); shortlistedIds.value = new Set(rows.map(row => row.recipe_id)) }
  catch { /* Optional shortlist plugin may be disabled. */ }
}
async function toggleShortlistFilter() { shortlistOnly.value = !shortlistOnly.value; if (shortlistOnly.value) await loadShortlist() }
async function loadRecipes() {
  const sequence = ++request
  error.value = ''
  try { const result = await ss.api.get<any>('/api/recipes', { q: search.value.trim() }); if (sequence === request) recipes.value = result.items }
  catch (failure: any) { if (sequence === request) error.value = failure?.message || 'Could not load recipes' }
}
function openRecipe(id: string) { emit('openRecipe', id); ss.navigate?.(`/recipes/${id}`) }
onMounted(() => { loadRecipes(); loadShortlist() })
watch(search, loadRecipes)
const allTags = computed(() => [...new Set<string>(recipes.value.flatMap(recipe => recipe.tags || []))])
const filteredRecipes = computed(() => {
  let list = recipes.value.map(recipe => ({ ...recipe, is_shortlisted: shortlistedIds.value.has(recipe.id) }))
  if (shortlistOnly.value) list = list.filter(recipe => shortlistedIds.value.has(recipe.id))
  if (activeTag.value) list = list.filter(recipe => recipe.tags?.includes(activeTag.value))
  return list.sort(sortBy.value === 'title' ? (a, b) => a.title.localeCompare(b.title) : (a, b) => (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0))
})
</script>
<template>
  <div class="recipe-list-page">
    <h1>Recipes</h1>
    <div class="intent-header-bar"><IconField class="search-box"><InputIcon class="pi pi-search" /><InputText v-model="search" aria-label="Search recipes" type="search" placeholder="Search recipes…" class="input-search" fluid /></IconField><IntentTrigger hub="recipe:create" label="New recipe" /></div>
    <div class="filter-sort-bar">
      <Slot name="recipe.list.filters" :context="{ active: shortlistOnly, toggle: toggleShortlistFilter }" />
      <Button v-for="tag in allTags" :key="tag" :label="tag" size="small" :outlined="activeTag !== tag" :aria-pressed="activeTag === tag" @click="activeTag = activeTag === tag ? null : tag" />
      <Select v-model="sortBy" aria-label="Sort recipes" :options="[{ id: 'title', label: 'Title (A–Z)' }, { id: 'prep', label: 'Prep time' }]" optionLabel="label" optionValue="id" />
    </div>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div v-if="filteredRecipes.length" class="recipes-grid"><RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" @select="openRecipe" /></div>
    <div v-else class="empty-state"><p>No recipes found.</p><IntentTrigger hub="recipe:create" label="Add your first recipe" /></div>
  </div>
</template>
<style scoped>
.recipe-list-page { padding: 1.5rem; max-width: 75rem; margin: 0 auto; }
h1 { margin-top: 0; }
.intent-header-bar, .filter-sort-bar { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
.search-box { flex: 1; min-width: 12rem; }
.recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 1rem; }
.empty-state { display: grid; justify-items: center; gap: 1rem; padding: 3rem 1rem; color: var(--p-text-muted-color); }
</style>

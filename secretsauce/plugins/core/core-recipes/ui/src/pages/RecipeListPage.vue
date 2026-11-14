<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { Slot, IntentTrigger, useSecretSauce } from '@secretsauce/ui'
import RecipeCard from '../components/RecipeCard.vue'
import { fetchCoverId } from '../cover'
import { pendingSourceFilter, type SourceSummary } from '../sourceFilter'
const emit = defineEmits<{ openRecipe: [string] }>()
const ss = useSecretSauce()
export interface TagSummary {
  name: string
  count: number
}
const recipes = ref<any[]>([]), search = ref(''), activeTag = ref<string | null>(null), sortBy = ref('title'), error = ref('')
const selectedSources = ref<string[]>([]), householdSources = ref<SourceSummary[]>([])
const householdTags = ref<TagSummary[]>([])
const shortlistOnly = ref(false), shortlistedIds = ref(new Set<string>())
function readShowImages(): boolean {
  try { return localStorage.getItem('secretsauce:show_recipe_images') !== 'false' }
  catch { return true }
}
const showImages = ref(readShowImages())
let request = 0
async function loadShortlist() {
  try { const rows = await ss.api.get<any[]>('/api/x/core-shortlist'); shortlistedIds.value = new Set(rows.map(row => row.recipe_id)) }
  catch { /* Optional shortlist plugin may be disabled. */ }
}
async function loadSources() {
  try {
    const res = await ss.api.get<{ items?: SourceSummary[] } | SourceSummary[]>('/api/recipes/sources')
    if (Array.isArray(res)) householdSources.value = res
    else if (res && Array.isArray(res.items)) householdSources.value = res.items
  } catch { /* Sources endpoint optional offline. */ }
}
async function loadTags() {
  try {
    const res = await ss.api.get<{ items?: TagSummary[] } | TagSummary[]>('/api/recipes/tags')
    const items = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : [])
    householdTags.value = items
    if (activeTag.value && !items.some(t => t.name === activeTag.value)) {
      activeTag.value = null
    }
  } catch { /* Tags endpoint optional offline. */ }
}
async function toggleShortlistFilter() { shortlistOnly.value = !shortlistOnly.value; if (shortlistOnly.value) await loadShortlist() }
async function loadRecipes() {
  const sequence = ++request
  error.value = ''
  try {
    const query: Record<string, any> = { q: search.value.trim() }
    if (selectedSources.value.length > 0) {
      query.source = selectedSources.value
    }
    if (activeTag.value) {
      query.tag = activeTag.value
    }
    const result = await ss.api.get<any>('/api/recipes', query)
    if (sequence !== request) return
    recipes.value = result.items
    if (!showImages.value) return
    const covered = await Promise.all(result.items.map(async (recipe: any) => {
      const id = await fetchCoverId(ss.api, recipe.group_id)
      return { ...recipe, cover_asset_id: id, cover_url: id ? ss.url(`/api/assets/${id}/file`) : null }
    }))
    if (sequence === request) recipes.value = covered
  }
  catch (failure: any) { if (sequence === request) error.value = failure?.message || 'Could not load recipes' }
}
function openRecipe(id: string) { emit('openRecipe', id); ss.navigate?.(`/recipes/${id}`) }
function refreshAll() {
  loadRecipes()
  loadSources()
  loadTags()
}
const stopCreated = ss.on('recipe:created', refreshAll)
const stopUpdated = ss.on('recipe:updated', refreshAll)
const stopDeleted = ss.on('recipe:deleted', refreshAll)
onBeforeUnmount(() => {
  if (typeof stopCreated === 'function') stopCreated()
  if (typeof stopUpdated === 'function') stopUpdated()
  if (typeof stopDeleted === 'function') stopDeleted()
})
onMounted(() => {
  showImages.value = readShowImages()
  if (pendingSourceFilter.value) {
    selectedSources.value = [...pendingSourceFilter.value]
    pendingSourceFilter.value = null
  }
  loadRecipes()
  loadShortlist()
  loadSources()
  loadTags()
})
watch([search, selectedSources, activeTag], loadRecipes)
const sourceOptions = computed(() => {
  const options: { value: string; label: string }[] = [
    { value: 'none', label: 'No source' },
  ]
  const seen = new Set<string>(['none'])
  for (const s of householdSources.value) {
    if (!s.name || seen.has(s.name)) continue
    seen.add(s.name)
    options.push({
      value: s.name,
      label: s.author ? `${s.name} (${s.author})` : s.name,
    })
  }
  for (const active of selectedSources.value) {
    if (!seen.has(active)) {
      seen.add(active)
      options.push({ value: active, label: active })
    }
  }
  return options
})
const filteredRecipes = computed(() => {
  let list = recipes.value.map(recipe => ({ ...recipe, is_shortlisted: shortlistedIds.value.has(recipe.id) }))
  if (shortlistOnly.value) list = list.filter(recipe => shortlistedIds.value.has(recipe.id))
  return list.sort(sortBy.value === 'title' ? (a, b) => a.title.localeCompare(b.title) : (a, b) => (a.prep_time_minutes || 0) - (b.prep_time_minutes || 0))
})
</script>
<template>
  <div class="recipe-list-page">
    <h1>Recipes</h1>
    <div class="intent-header-bar"><IconField class="search-box"><InputIcon class="pi pi-search" /><InputText v-model="search" aria-label="Search recipes" type="search" placeholder="Search recipes…" class="input-search" fluid /></IconField><IntentTrigger hub="recipe:create" label="New recipe" /></div>
    <div class="filter-sort-bar">
      <Slot name="recipe.list.filters" :context="{ active: shortlistOnly, toggle: toggleShortlistFilter }" />
      <MultiSelect
        v-model="selectedSources"
        class="source-filter-select"
        aria-label="Filter by source"
        :options="sourceOptions"
        optionLabel="label"
        optionValue="value"
        filter
        placeholder="All sources"
        selectedItemsLabel="{0} sources"
        :maxSelectedLabels="1"
        :showToggleAll="false"
      />
      <Button
        v-for="tag in householdTags"
        :key="tag.name"
        class="tag-filter-btn"
        :label="`${tag.name} (${tag.count})`"
        size="small"
        :outlined="activeTag !== tag.name"
        :aria-pressed="activeTag === tag.name"
        @click="activeTag = activeTag === tag.name ? null : tag.name"
      />
      <Select v-model="sortBy" aria-label="Sort recipes" :options="[{ id: 'title', label: 'Title (A–Z)' }, { id: 'prep', label: 'Prep time' }]" optionLabel="label" optionValue="id" />
    </div>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div v-if="filteredRecipes.length" class="recipes-grid"><RecipeCard v-for="recipe in filteredRecipes" :key="recipe.id" :recipe="recipe" :show-cover="showImages" @select="openRecipe" /></div>
    <div v-else class="empty-state"><p>No recipes found.</p><IntentTrigger hub="recipe:create" label="Add your first recipe" /></div>
  </div>
</template>
<style scoped>
.recipe-list-page { padding: .75rem 1rem; max-width: 75rem; margin: 0 auto; }
h1 { margin: 0 0 .5rem; font-size: 1.25rem; line-height: 1.2; }
.intent-header-bar, .filter-sort-bar { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin-bottom: .625rem; }
.search-box { flex: 1; min-width: 12rem; }
.source-filter-select { min-width: 11rem; max-width: 16rem; }
.recipes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); gap: .625rem; }
.empty-state { display: grid; justify-items: center; gap: .625rem; padding: 1.5rem 1rem; color: var(--p-text-muted-color); }
@media (max-width: 767px) { .recipe-list-page { padding: .5rem .625rem; } }
</style>

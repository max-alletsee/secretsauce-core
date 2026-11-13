<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Slot, useSecretSauce } from '@secretsauce/ui'
import IngredientRowList from '../components/IngredientRowList.vue'
import StepList from '../components/StepList.vue'
import SourceEditor from '../components/SourceEditor.vue'
import { fetchCoverId } from '../cover'
import type { RecipeSource } from '../sourceFilter'
const props = defineProps<{ recipeId?: string; id?: string }>()
const emit = defineEmits<{ saved: [any] }>()
const ss = useSecretSauce(), targetId = computed(() => props.id || props.recipeId || '')
const title = ref(''), description = ref(''), language = ref(ss.store.household.value?.languages.primary || 'en'), servings = ref(2)
const groupId = ref('')
const prepTime = ref<number | null>(null), cookTime = ref<number | null>(null), tags = ref<string[]>([]), coverAssetId = ref<string | null>(null)
const source = ref<RecipeSource | null>(null)
const ingredients = ref<any[]>([]), steps = ref<any[]>([]), revision = ref(1), busy = ref(false), error = ref('')
watch(targetId, async id => {
  if (!id) return
  try {
    const existing = await ss.api.get<any>(`/api/recipes/${id}`)
    title.value = existing.title; description.value = existing.description || ''; language.value = existing.language; servings.value = existing.servings
    prepTime.value = existing.prep_time_minutes; cookTime.value = existing.cook_time_minutes; tags.value = [...existing.tags]
    source.value = existing.source || null
    ingredients.value = existing.ingredients; steps.value = existing.steps; revision.value = existing.revision
    coverAssetId.value = await fetchCoverId(ss.api, existing.group_id)
    groupId.value = existing.group_id
  } catch (failure: any) { error.value = failure?.message || 'Could not load recipe' }
}, { immediate: true })
async function onImageUpload(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || busy.value || !groupId.value) return
  busy.value = true; error.value = ''
  try {
    const form = new FormData(); form.append('file', file); form.append('entity_type', 'recipe'); form.append('entity_id', groupId.value); form.append('slot', 'cover')
    coverAssetId.value = (await ss.api.upload<any>('/api/assets', form)).id
    ss.notify({ level: 'success', message: 'Cover image saved' })
  }
  catch (failure: any) { error.value = failure?.message || 'Could not upload image' }
  finally { busy.value = false }
}
async function save() {
  if (!title.value.trim() || busy.value) return
  busy.value = true; error.value = ''
  const payload: Record<string, any> = {
    title: title.value.trim(),
    description: description.value.trim(),
    language: language.value,
    servings: servings.value,
    prep_time_minutes: prepTime.value,
    cook_time_minutes: cookTime.value,
    tags: tags.value,
    ingredients: ingredients.value,
    steps: steps.value,
  }
  if (source.value !== null || targetId.value) {
    payload.source = source.value
  }
  try {
    const result = targetId.value ? await ss.api.patch<any>(`/api/recipes/${targetId.value}`, { ...payload, revision: revision.value }) : await ss.api.post<any>('/api/recipes', payload)
    emit('saved', result); ss.notify({ level: 'success', message: 'Recipe saved' }); ss.navigate?.(`/recipes/${result.id}`)
  } catch (failure: any) { error.value = failure?.message || 'Could not save recipe' }
  finally { busy.value = false }
}
function applyAdaptation(adapted: any) {
  if (adapted.title) title.value = adapted.title
  if (adapted.description !== undefined) description.value = adapted.description || ''
  if (adapted.servings) servings.value = adapted.servings
  if (adapted.prep_time_minutes !== undefined) prepTime.value = adapted.prep_time_minutes
  if (adapted.cook_time_minutes !== undefined) cookTime.value = adapted.cook_time_minutes
  if (adapted.tags) tags.value = [...adapted.tags]
  if (adapted.source !== undefined) source.value = adapted.source || null
  if (adapted.ingredients) ingredients.value = [...adapted.ingredients]
  if (adapted.steps) steps.value = [...adapted.steps]
}
const editContext = computed(() => ({
  targetId: targetId.value,
  recipe: {
    id: targetId.value,
    title: title.value,
    description: description.value,
    language: language.value,
    servings: servings.value,
    prep_time_minutes: prepTime.value,
    cook_time_minutes: cookTime.value,
    tags: tags.value,
    source: source.value,
    ingredients: ingredients.value,
    steps: steps.value,
  },
  applyAdaptation,
}))
</script>
<template>
  <form class="recipe-edit-page" @submit.prevent="save">
    <div class="edit-top-bar">
      <h2>{{ targetId ? 'Edit Recipe' : 'New Recipe' }}</h2>
      <div class="edit-top-actions">
        <Slot name="recipe.edit.actions" :context="editContext" />
        <Button label="Cancel" class="btn-cancel" severity="secondary" :disabled="busy" @click="ss.navigate?.(targetId ? `/recipes/${targetId}` : '/recipes')" />
      </div>
    </div>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <div class="form-group"><label for="recipe-title">Title</label><InputText id="recipe-title" v-model="title" class="input-title" required fluid /></div>
    <div class="form-group"><label for="recipe-description">Description</label><Textarea id="recipe-description" v-model="description" class="textarea" rows="3" fluid /></div>
    <div class="form-row">
      <div class="form-group"><label for="recipe-language">Language</label><InputText id="recipe-language" v-model="language" fluid /></div>
      <div class="form-group"><label for="recipe-servings">Servings</label><InputNumber inputId="recipe-servings" v-model="servings" :min="1" fluid /></div>
      <div class="form-group"><label for="recipe-prep">Prep time (min)</label><InputNumber inputId="recipe-prep" v-model="prepTime" :min="0" fluid /></div>
      <div class="form-group"><label for="recipe-cook">Cook time (min)</label><InputNumber inputId="recipe-cook" v-model="cookTime" :min="0" fluid /></div>
    </div>
    <div class="form-group"><label for="recipe-tags">Tags</label><AutoComplete inputId="recipe-tags" v-model="tags" multiple :typeahead="false" fluid /></div>
    <SourceEditor v-model="source" />
    <div class="form-group"><label for="recipe-cover">Cover image</label><input id="recipe-cover" type="file" accept="image/*" :disabled="busy || !groupId" @change="onImageUpload"><small v-if="!targetId">Save your recipe first to add a cover image.</small><small v-else>Cover uploads are saved immediately, separately from recipe edits.</small><img v-if="coverAssetId" :src="ss.url(`/api/assets/${coverAssetId}/file`)" alt="Recipe cover" class="cover-preview"></div>
    <section><h3>Ingredients</h3><IngredientRowList v-model="ingredients" /></section>
    <section><h3>Instructions</h3><StepList v-model="steps" /></section>
    <div class="actions-row"><Button type="submit" label="Save Recipe" class="btn-primary" icon="pi pi-check" :loading="busy" :disabled="!title.trim()" /></div>
  </form>
</template>
<style scoped>
.recipe-edit-page { padding: .75rem 1rem; max-width: 60rem; margin: 0 auto; display: grid; gap: .625rem; }
.edit-top-bar, .actions-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.edit-top-actions { display: flex; align-items: center; gap: .375rem; }
h2 { margin: 0; font-size: 1.25rem; line-height: 1.2; }
h3 { margin: 0 0 .375rem; font-size: 1rem; }
.form-group { display: grid; gap: .25rem; }label { color: var(--p-text-muted-color); font-size: .875rem; }
.form-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; }.cover-preview { max-width: 15rem; max-height: 10rem; }
.actions-row { justify-content: flex-end; }
@media (max-width: 767px) { .recipe-edit-page { padding: .5rem .625rem; gap: .5rem; } .form-row { grid-template-columns: 1fr 1fr; } }
</style>

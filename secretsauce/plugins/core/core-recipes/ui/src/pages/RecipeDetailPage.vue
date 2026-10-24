<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Slot, IntentTrigger, useSecretSauce } from '@secretsauce/ui'
import { fetchCoverId } from '../cover'
const props = defineProps<{ recipeId?: string; id?: string }>()
const emit = defineEmits<{ switchLanguage: [string] }>()
const ss = useSecretSauce(), recipe = ref<any>(null), currentServings = ref(2), checkedIngredients = ref<Record<string, boolean>>({}), error = ref(''), isShortlisted = ref(false)
const effectiveId = computed(() => props.id || props.recipeId || '')
const coverId = ref<string | null>(null)
let request = 0
watch(effectiveId, async id => {
  if (!id) return
  const sequence = ++request
  error.value = ''; coverId.value = null
  try {
    const result = await ss.api.get<any>(`/api/recipes/${id}`)
    if (sequence !== request) return
    recipe.value = result; currentServings.value = result.servings || 2; checkedIngredients.value = {}; isShortlisted.value = false
    const cover = await fetchCoverId(ss.api, result.group_id)
    if (sequence !== request) return
    coverId.value = cover
    try { const rows = await ss.api.get<any[]>('/api/x/core-shortlist'); if (sequence === request) isShortlisted.value = rows.some(row => row.recipe_id === id) } catch { /* Optional plugin. */ }
  } catch (failure: any) { if (sequence === request) { recipe.value = null; error.value = failure?.message || 'Could not load recipe' } }
}, { immediate: true })
function switchLanguage(id: string) { emit('switchLanguage', id); ss.navigate?.(`/recipes/${id}`) }
function scaledQuantity(quantity: number | null | undefined): string {
  if (quantity == null) return ''
  const value = quantity * currentServings.value / (recipe.value?.servings || 1)
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
</script>
<template>
  <div class="recipe-detail-page">
    <Button label="All recipes" class="btn-back" icon="pi pi-arrow-left" text @click="ss.navigate?.('/recipes')" />
    <Message v-if="error" severity="error">{{ error }}</Message>
    <template v-if="recipe">
      <div v-if="recipe.languages?.length > 1" class="lang-bar"><span>Languages:</span><Button v-for="language in recipe.languages" :key="language" :label="language.toUpperCase()" size="small" :outlined="language !== recipe.language" @click="switchLanguage(`${recipe.group_id}_${language}`)" /></div>
      <div class="detail-header"><div><h1>{{ recipe.title }}</h1><p v-if="recipe.description">{{ recipe.description }}</p></div><div class="detail-actions"><Slot name="recipe.card.actions" :context="{ recipe, isShortlisted }" /><IntentTrigger hub="recipe:actions" :context="{ recipe }" label="Actions" /></div></div>
      <img v-if="coverId" :src="ss.url(`/api/assets/${coverId}/file`)" :alt="recipe.title" class="recipe-cover" />
      <div class="scaler-card"><span>Servings:</span><Button class="btn-scaler-minus" icon="pi pi-minus" aria-label="Decrease servings" rounded outlined :disabled="currentServings <= 1" @click="currentServings--" /><span class="servings-value">{{ currentServings }}</span><Button class="btn-scaler-plus" icon="pi pi-plus" aria-label="Increase servings" rounded outlined @click="currentServings++" /></div>
      <div class="content-grid">
        <section><h3>Ingredients</h3><ul class="ingredient-checklist"><li v-for="(ingredient, index) in recipe.ingredients" :key="index" class="ingredient-item"><Checkbox :inputId="`ingredient-${index}`" v-model="checkedIngredients[index]" binary /><label :for="`ingredient-${index}`" :class="{ struck: checkedIngredients[index] }"><strong>{{ scaledQuantity(ingredient.quantity) }}</strong> {{ ingredient.unit }} {{ ingredient.name }}<span v-if="ingredient.notes" class="notes"> ({{ ingredient.notes }})</span></label></li></ul></section>
        <section><h3>Instructions</h3><ol class="steps-list"><li v-for="step in recipe.steps" :key="step.id"><p>{{ step.instruction }}</p><Tag v-if="step.timer_minutes" :value="`${step.timer_minutes} min`" icon="pi pi-clock" severity="info" /></li></ol></section>
      </div>
      <Slot name="recipe.detail.sidebar" :context="{ recipe }" /><Slot name="recipe.detail.footer" :context="{ recipe }" />
    </template>
  </div>
</template>
<style scoped>
.recipe-cover { display: block; width: 100%; max-height: 15rem; object-fit: cover; margin-bottom: .625rem; border-radius: var(--p-border-radius); }
.recipe-detail-page { padding: .75rem 1rem; max-width: 60rem; margin: 0 auto; }
.btn-back { padding: .25rem .5rem; font-size: .85rem; }
.lang-bar, .detail-actions, .scaler-card { display: flex; align-items: center; gap: .375rem; flex-wrap: wrap; }
.detail-header { display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; margin: .375rem 0; }
h1 { margin: 0; font-size: 1.35rem; line-height: 1.2; }
h3 { margin: 0 0 .375rem; font-size: 1rem; }
p, .notes { color: var(--p-text-muted-color); margin: .25rem 0 0; }
.scaler-card { background: var(--p-surface-100); padding: .375rem .625rem; border-radius: var(--p-border-radius); margin-bottom: .625rem; }
.servings-value { font-weight: 600; min-width: 1.5rem; text-align: center; }
.content-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.25rem; }
.ingredient-checklist { list-style: none; padding: 0; margin: 0; display: grid; gap: .375rem; }
.ingredient-item { display: flex; gap: .5rem; align-items: center; }.ingredient-item label { cursor: pointer; }
.struck { text-decoration: line-through; color: var(--p-text-muted-color); }
.steps-list { display: grid; gap: .5rem; padding-left: 1.25rem; margin: 0; }.steps-list p { color: var(--p-text-color); margin: 0 0 .25rem; }
@media (max-width: 767px) { .recipe-detail-page { padding: .5rem .625rem; } .content-grid { grid-template-columns: 1fr; gap: .75rem; } }
</style>

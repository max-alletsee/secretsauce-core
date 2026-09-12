<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { Slot, IntentTrigger } from '@secretsauce/ui'

const props = defineProps<{
  recipeId?: string
}>()

const emit = defineEmits<{
  switchLanguage: [string]
  addTranslation: [any]
}>()

const api = inject<any>('__SS_API__')
const recipe = ref<any>(null)
const currentServings = ref(2)
const checkedIngredients = ref<Record<string, boolean>>({})

async function loadRecipe() {
  if (!api || !props.recipeId) return
  recipe.value = await api.get(`/api/recipes/${props.recipeId}`)
  currentServings.value = recipe.value?.servings || 2
}

onMounted(loadRecipe)

const scaleMultiplier = computed(() => {
  if (!recipe.value || !recipe.value.servings) return 1
  return currentServings.value / recipe.value.servings
})

function scaledQuantity(qty: number | null | undefined): string {
  if (qty == null) return ''
  const val = qty * scaleMultiplier.value
  return Number.isInteger(val) ? String(val) : val.toFixed(1)
}

function scaleDown() {
  if (currentServings.value > 1) currentServings.value -= 1
}

function scaleUp() {
  currentServings.value += 1
}
</script>

<template>
  <div v-if="recipe" class="recipe-detail-page">
    <div class="lang-bar" v-if="recipe.languages?.length > 1">
      <span class="lang-label">Languages:</span>
      <button
        v-for="l in recipe.languages"
        :key="l"
        class="lang-tab"
        :class="{ active: l === recipe.language }"
        @click="emit('switchLanguage', `${recipe.group_id}_${l}`)"
      >
        {{ l.toUpperCase() }}
      </button>
      <button class="btn-add-translation" @click="emit('addTranslation', recipe)">+ Add Translation</button>
    </div>

    <div class="detail-header">
      <div>
        <h1 class="recipe-title">{{ recipe.title }}</h1>
        <p v-if="recipe.description" class="description">{{ recipe.description }}</p>
      </div>
      <div class="detail-actions">
        <IntentTrigger hub="recipe:actions" :context="{ recipe }" label="Actions" />
      </div>
    </div>

    <div class="scaler-card">
      <span class="scaler-label">Servings:</span>
      <button type="button" class="btn-scaler btn-scaler-minus" @click="scaleDown">−</button>
      <span class="servings-value">{{ currentServings }}</span>
      <button type="button" class="btn-scaler btn-scaler-plus" @click="scaleUp">+</button>
    </div>

    <div class="content-grid">
      <div class="ingredients-section">
        <h3>Ingredients</h3>
        <ul class="ingredient-checklist">
          <li v-for="ing in recipe.ingredients" :key="ing.id" class="ingredient-item">
            <label>
              <input type="checkbox" v-model="checkedIngredients[ing.id]" />
              <span :class="{ struck: checkedIngredients[ing.id] }">
                <strong>{{ scaledQuantity(ing.quantity) }}</strong>
                <span v-if="ing.unit"> {{ ing.unit }}</span>
                <span> {{ ing.name }}</span>
                <span v-if="ing.notes" class="notes"> ({{ ing.notes }})</span>
              </span>
            </label>
          </li>
        </ul>
      </div>

      <div class="steps-section">
        <h3>Instructions</h3>
        <ol class="steps-list">
          <li v-for="s in recipe.steps" :key="s.id" class="step-item">
            <div class="step-text">{{ s.instruction }}</div>
            <div v-if="s.timer_minutes" class="timer-badge">⏱ {{ s.timer_minutes }} min</div>
          </li>
        </ol>
      </div>
    </div>

    <Slot name="recipe.detail.sidebar" :context="{ recipe }" />
    <Slot name="recipe.detail.footer" :context="{ recipe }" />
  </div>
</template>

<style scoped>
.recipe-detail-page { padding: 24px; max-width: 900px; margin: 0 auto; }
.lang-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.lang-label { font-size: 0.85em; color: #78716c; }
.lang-tab { padding: 4px 10px; border: 1px solid #d6d3d1; background: white; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
.lang-tab.active { background: #0284c7; color: white; border-color: #0284c7; }
.btn-add-translation { background: transparent; border: 1px dashed #0284c7; color: #0284c7; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.recipe-title { margin: 0; font-size: 2em; }
.description { color: #57534e; margin-top: 6px; }
.scaler-card { display: inline-flex; align-items: center; gap: 8px; background: #f5f5f4; padding: 8px 16px; border-radius: 8px; margin-bottom: 24px; }
.btn-scaler { width: 28px; height: 28px; border-radius: 50%; border: 1px solid #d6d3d1; background: white; font-weight: bold; cursor: pointer; }
.servings-value { font-size: 1.1em; font-weight: bold; width: 20px; text-align: center; }
.content-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 32px; }
.ingredient-checklist { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.ingredient-item label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.struck { text-decoration: line-through; opacity: 0.6; }
.notes { color: #78716c; font-size: 0.9em; }
.steps-list { padding-left: 20px; display: flex; flex-direction: column; gap: 16px; }
.step-item { line-height: 1.5; }
.timer-badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 0.8em; padding: 2px 6px; border-radius: 4px; margin-top: 4px; }
</style>

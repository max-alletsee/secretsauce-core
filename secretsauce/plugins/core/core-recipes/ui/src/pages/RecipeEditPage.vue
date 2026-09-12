<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import IngredientRowList from '../components/IngredientRowList.vue'
import StepList from '../components/StepList.vue'

const props = defineProps<{
  recipeId?: string
}>()

const emit = defineEmits<{
  saved: [any]
}>()

const api = inject<any>('__SS_API__')

const title = ref('')
const description = ref('')
const language = ref('en')
const servings = ref(2)
const prepTime = ref<number | null>(null)
const cookTime = ref<number | null>(null)
const tags = ref('')
const coverAssetId = ref<string | null>(null)
const ingredients = ref<any[]>([])
const steps = ref<any[]>([])
const revision = ref(1)

onMounted(async () => {
  if (props.recipeId && api) {
    try {
      const existing = await api.get(`/api/recipes/${props.recipeId}`)
      title.value = existing.title || ''
      description.value = existing.description || ''
      language.value = existing.language || 'en'
      servings.value = existing.servings || 2
      prepTime.value = existing.prep_time_minutes || null
      cookTime.value = existing.cook_time_minutes || null
      tags.value = (existing.tags || []).join(', ')
      coverAssetId.value = existing.cover_asset_id || null
      ingredients.value = existing.ingredients || []
      steps.value = existing.steps || []
      revision.value = existing.revision || 1
    } catch {
      // offline or not found
    }
  }
})

async function onImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !api) return
  const form = new FormData()
  form.append('file', file)
  form.append('entity_type', 'recipe')
  form.append('slot', 'cover')
  const res = await api.upload('/api/assets', form)
  coverAssetId.value = res.id
}

async function save() {
  if (!title.value.trim() || !api) return
  const payload = {
    title: title.value.trim(),
    description: description.value.trim(),
    language: language.value,
    servings: Number(servings.value) || 2,
    prep_time_minutes: prepTime.value ? Number(prepTime.value) : null,
    cook_time_minutes: cookTime.value ? Number(cookTime.value) : null,
    tags: tags.value.split(',').map((t) => t.trim()).filter(Boolean),
    cover_asset_id: coverAssetId.value,
    ingredients: ingredients.value,
    steps: steps.value,
  }

  let res: any
  if (props.recipeId) {
    res = await api.patch(`/api/recipes/${props.recipeId}`, { ...payload, revision: revision.value })
  } else {
    res = await api.post('/api/recipes', payload)
  }
  emit('saved', res)
}
</script>

<template>
  <div class="recipe-edit-page">
    <h2>{{ props.recipeId ? 'Edit Recipe' : 'New Recipe' }}</h2>
    <div class="form-section">
      <div class="form-group">
        <label>Title</label>
        <input v-model="title" type="text" placeholder="Recipe Title" class="input input-title" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="description" rows="2" placeholder="Brief description..." class="textarea" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Language</label>
          <input v-model="language" type="text" class="input" />
        </div>
        <div class="form-group">
          <label>Servings</label>
          <input v-model.number="servings" type="number" min="1" class="input" />
        </div>
        <div class="form-group">
          <label>Prep Time (m)</label>
          <input v-model.number="prepTime" type="number" min="0" class="input" />
        </div>
        <div class="form-group">
          <label>Cook Time (m)</label>
          <input v-model.number="cookTime" type="number" min="0" class="input" />
        </div>
      </div>
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input v-model="tags" type="text" placeholder="dinner, quick, italian" class="input" />
      </div>
      <div class="form-group">
        <label>Cover Image</label>
        <input type="file" accept="image/*" @change="onImageUpload" />
      </div>
    </div>

    <div class="editor-section">
      <h3>Ingredients</h3>
      <IngredientRowList v-model="ingredients" />
    </div>

    <div class="editor-section">
      <h3>Instructions</h3>
      <StepList v-model="steps" />
    </div>

    <div class="actions-row">
      <button class="btn-primary" @click="save">Save Recipe</button>
    </div>
  </div>
</template>

<style scoped>
.recipe-edit-page { padding: 24px; max-width: 800px; margin: 0 auto; }
.form-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.form-group label { display: block; font-size: 0.85em; font-weight: 500; margin-bottom: 4px; }
.input, .textarea { width: 100%; padding: 8px; border: 1px solid #d6d3d1; border-radius: 4px; box-sizing: border-box; }
.form-row { display: flex; gap: 12px; }
.editor-section { margin-bottom: 24px; }
.actions-row { display: flex; justify-content: flex-end; margin-top: 24px; }
.btn-primary { background: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 500; cursor: pointer; }
</style>

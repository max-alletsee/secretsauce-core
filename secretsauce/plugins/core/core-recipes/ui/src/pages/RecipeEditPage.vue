<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import IngredientRowList from '../components/IngredientRowList.vue'
import StepList from '../components/StepList.vue'

const props = defineProps<{
  recipeId?: string
  id?: string
}>()

const emit = defineEmits<{
  saved: [any]
}>()

const navigate = inject<(path: string) => void>('__SS_NAVIGATE__', (path: string) => {
  window.location.href = path
})
const api = inject<any>('__SS_API__')

const targetId = computed(() => {
  if (props.id) return props.id
  if (props.recipeId) return props.recipeId
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/recipes/')) {
    const parts = window.location.pathname.split('/')
    if (parts.length >= 3 && parts[parts.length - 1] === 'edit') {
      return parts[parts.length - 2]
    }
  }
  return ''
})

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
  if (targetId.value && api) {
    try {
      const existing = await api.get(`/api/recipes/${targetId.value}`)
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
  if (targetId.value) {
    res = await api.patch(`/api/recipes/${targetId.value}`, { ...payload, revision: revision.value })
  } else {
    res = await api.post('/api/recipes', payload)
  }
  emit('saved', res)
  if (res?.id) {
    navigate(`/recipes/${res.id}`)
  }
}

function cancel() {
  navigate(targetId.value ? `/recipes/${targetId.value}` : '/recipes')
}
</script>

<template>
  <div class="recipe-edit-page">
    <div class="edit-top-bar">
      <h2>{{ targetId ? 'Edit Recipe' : 'New Recipe' }}</h2>
      <button type="button" class="btn-cancel" @click="cancel">Cancel</button>
    </div>
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

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { computeIngredientDiff } from './diff'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  visible: boolean
  context: {
    recipe: any
    applyAdaptation: (data: any) => void
  }
}>()

const emit = defineEmits<{
  'update:visible': [boolean]
  resolved: [any]
}>()

const ss = useSecretSauce()
const actions = ref<any[]>([])
const selectedActionId = ref<string>('')
const loading = ref(false)
const error = ref('')
const unavailable = ref(false)
const adaptedRecipe = ref<any>(null)

watch(
  () => props.visible,
  async isVisible => {
    if (!isVisible) return
    error.value = ''
    unavailable.value = false
    adaptedRecipe.value = null
    selectedActionId.value = ''
    try {
      actions.value = await ss.api.get<any[]>('/api/x/core-recipe-magic/actions')
    } catch (e: any) {
      error.value = e?.message || 'Failed to load actions'
    }
  },
  { immediate: true },
)

const ingredientDiff = computed(() => {
  if (!adaptedRecipe.value) return { added: [], removed: [], modified: [], unchanged: [] }
  return computeIngredientDiff(
    props.context.recipe?.ingredients || [],
    adaptedRecipe.value?.ingredients || [],
  )
})

async function selectAction(action: any) {
  selectedActionId.value = action.id
  loading.value = true
  error.value = ''
  unavailable.value = false
  adaptedRecipe.value = null

  try {
    const payload = {
      action_id: action.id,
      recipe: props.context.recipe,
    }
    const result = await ss.api.post<any>('/api/x/core-recipe-magic/adapt', payload)
    adaptedRecipe.value = result
  } catch (failure: any) {
    if (failure?.code === 'unavailable' || failure?.status === 503) {
      unavailable.value = true
    } else {
      error.value = failure?.message || 'Adaptation failed'
    }
  } finally {
    loading.value = false
  }
}

function openSettings() {
  close()
  ss.navigate?.('/settings?section=core-ai-provider')
}

function close() {
  emit('update:visible', false)
}

function applyToEditor() {
  if (!adaptedRecipe.value) return
  props.context.applyAdaptation(adaptedRecipe.value)
  ss.notify({ level: 'success', message: 'Recipe adapted' })
  emit('resolved', adaptedRecipe.value)
  close()
}

async function saveAsNewRecipe() {
  if (!adaptedRecipe.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const payload = {
      ...adaptedRecipe.value,
      language: props.context.recipe?.language || 'en',
    }
    delete payload.id
    delete payload.adaptation_summary

    const created = await ss.api.post<any>('/api/recipes', payload)
    ss.notify({ level: 'success', message: 'Saved as new recipe variation' })
    emit('resolved', created)
    close()
    ss.navigate?.(`/recipes/${created.id}`)
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to save new recipe'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    append-to="self"
    class="magic-wand-dialog"
    :style="{ width: 'min(54rem, 95vw)' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="wand-icon" aria-hidden="true">
          <path d="m19 2 2 2-2 2-2-2Z"/>
          <path d="m5 17 2 2-2 2-2-2Z"/>
          <path d="m15 4 5 5L7 22l-5-5Z"/>
        </svg>
        <span>Make it Magic: Adapt Recipe</span>
      </div>
    </template>

    <div class="dialog-content">
      <!-- Action Selection -->
      <div class="action-picker">
        <label>Select Transformation</label>
        <div class="action-grid">
          <button
            v-for="act in actions"
            :key="act.id"
            type="button"
            class="action-chip"
            :class="{ active: selectedActionId === act.id }"
            :disabled="loading"
            @click="selectAction(act)"
          >
            <strong>{{ act.title }}</strong>
            <small v-if="act.description">{{ act.description }}</small>
          </button>
        </div>
      </div>

      <Message v-if="unavailable" severity="warn">
        AI isn’t set up yet. <Button label="Open AI settings" severity="secondary" size="small" @click="openSettings" />
      </Message>
      <Message v-else-if="error" severity="error">{{ error }}</Message>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <ProgressSpinner style="width: 2.5rem; height: 2.5rem;" />
        <p>Adapting recipe with AI…</p>
      </div>

      <!-- Transformed Result & Diff -->
      <div v-else-if="adaptedRecipe" class="preview-area">
        <div class="adaptation-summary">
          <i class="pi pi-sparkles" aria-hidden="true" />
          <div>
            <strong>AI Adaptation Summary:</strong>
            <p>{{ adaptedRecipe.adaptation_summary }}</p>
          </div>
        </div>

        <div class="meta-row">
          <div class="form-group">
            <label>Title</label>
            <InputText v-model="adaptedRecipe.title" fluid />
          </div>
          <div class="form-group">
            <label>Servings</label>
            <InputNumber v-model="adaptedRecipe.servings" :min="1" fluid />
          </div>
          <div class="form-group">
            <label>Prep (min)</label>
            <InputNumber v-model="adaptedRecipe.prep_time_minutes" :min="0" fluid />
          </div>
          <div class="form-group">
            <label>Cook (min)</label>
            <InputNumber v-model="adaptedRecipe.cook_time_minutes" :min="0" fluid />
          </div>
        </div>

        <!-- Diff Split -->
        <div class="diff-grid">
          <div class="diff-pane original-pane">
            <h4>Original Ingredients</h4>
            <ul>
              <li
                v-for="(ing, idx) in props.context.recipe?.ingredients || []"
                :key="idx"
                :class="{ removed: ingredientDiff.removed.some(r => r.name === ing.name) }"
              >
                <span>{{ ing.quantity }} {{ ing.unit }} {{ ing.name }}</span>
              </li>
            </ul>
          </div>
          <div class="diff-pane adapted-pane">
            <h4>Adapted Ingredients</h4>
            <ul>
              <li
                v-for="(ing, idx) in adaptedRecipe.ingredients || []"
                :key="idx"
                :class="{
                  added: ingredientDiff.added.some(a => a.name === ing.name),
                  modified: ingredientDiff.modified.some(m => m.name === ing.name)
                }"
              >
                <div class="ing-edit-row">
                  <InputNumber v-model="ing.quantity" :min="0" class="ing-qty" />
                  <InputText v-model="ing.unit" class="ing-unit" placeholder="unit" />
                  <InputText v-model="ing.name" class="ing-name" placeholder="ingredient" fluid />
                </div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Steps preview -->
        <div class="steps-preview">
          <h4>Adapted Steps</h4>
          <ol>
            <li v-for="(step, sIdx) in adaptedRecipe.steps || []" :key="sIdx">
              <Textarea v-model="step.instruction" rows="2" fluid />
            </li>
          </ol>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-actions">
        <Button label="Cancel" severity="secondary" :disabled="loading" @click="close" />
        <div v-if="adaptedRecipe" class="commit-actions">
          <Button
            label="Save as New Recipe"
            icon="pi pi-copy"
            class="btn-save-fork"
            outlined
            :loading="loading"
            @click="saveAsNewRecipe"
          />
          <Button
            label="Apply to Editor"
            icon="pi pi-check"
            class="btn-apply-editor"
            :loading="loading"
            @click="applyToEditor"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.dialog-header { display: flex; align-items: center; gap: .6rem; font-weight: 600; font-size: 1.15rem; }
.wand-icon { color: var(--p-primary-color); }
.dialog-content { display: grid; gap: 1.25rem; }
.action-picker { display: grid; gap: .5rem; }
.action-picker label { font-size: .85rem; color: var(--p-text-muted-color); font-weight: 500; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .5rem; }
.action-chip {
  padding: .65rem .85rem;
  border: 1px solid var(--p-content-border-color);
  background: var(--p-surface-50);
  color: var(--p-text-color);
  border-radius: var(--p-border-radius);
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: .25rem;
  transition: all 0.15s ease;
}
.action-chip:hover:not(:disabled) {
  border-color: var(--p-primary-color);
  background: var(--p-surface-100);
}
.action-chip.active {
  border-color: var(--p-primary-color);
  background: var(--p-highlight-background, rgba(16, 185, 129, 0.12));
}
.action-chip strong { font-size: .85rem; color: var(--p-text-color); }
.action-chip small { font-size: .75rem; color: var(--p-text-muted-color); }
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem; gap: .75rem; color: var(--p-text-muted-color); }
.preview-area { display: grid; gap: 1.25rem; }
.adaptation-summary {
  display: flex;
  gap: .75rem;
  align-items: flex-start;
  padding: .85rem 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-content-border-color);
  border-left: 4px solid var(--p-primary-color);
  border-radius: var(--p-border-radius);
}
.adaptation-summary i { color: var(--p-primary-color); margin-top: .2rem; }
.adaptation-summary p { margin: .25rem 0 0 0; color: var(--p-text-color); font-size: .9rem; line-height: 1.4; }
.meta-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: .75rem; }
.form-group { display: grid; gap: .35rem; }
.form-group label { font-size: .75rem; color: var(--p-text-muted-color); }
.diff-grid { display: grid; grid-template-columns: 1fr 1.2fr; gap: 1rem; }
.diff-pane {
  background: var(--p-surface-50);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  padding: 1rem;
}
.diff-pane h4 { margin: 0 0 .75rem 0; font-size: .85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--p-text-muted-color); }
.diff-pane ul { list-style: none; padding: 0; margin: 0; display: grid; gap: .4rem; }
.diff-pane li { font-size: .85rem; padding: .25rem 0; color: var(--p-text-color); }
.original-pane li.removed { text-decoration: line-through; color: var(--p-red-600, #dc2626); opacity: 0.85; }
.adapted-pane li.added { border-left: 3px solid var(--p-green-600, #16a34a); padding-left: .4rem; }
.adapted-pane li.modified { border-left: 3px solid var(--p-amber-600, #d97706); padding-left: .4rem; }
.ing-edit-row { display: flex; gap: .35rem; align-items: center; }
.ing-qty { max-width: 5rem; }
.ing-unit { max-width: 5.5rem; }
.steps-preview { display: grid; gap: .5rem; }
.steps-preview h4 { margin: 0; font-size: .85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--p-text-muted-color); }
.steps-preview ol { padding-left: 1.25rem; margin: 0; display: grid; gap: .5rem; }
.dialog-actions { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.commit-actions { display: flex; gap: .5rem; }
@media (max-width: 767px) {
  .meta-row { grid-template-columns: 1fr 1fr; }
  .diff-grid { grid-template-columns: 1fr; }
}
</style>

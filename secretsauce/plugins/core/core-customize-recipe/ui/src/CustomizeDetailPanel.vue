<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import CustomizeChatPanel from './CustomizeChatPanel.vue'
import CustomizedRecipePreview from './CustomizedRecipePreview.vue'

const props = defineProps<{
  context: {
    recipe: any
    customizedRecipe: any
    customizeOpen: boolean
    currentServings: number
    checkedIngredients: Record<string, boolean>
    setCustomizeOpen: (val: boolean) => void
    applyCustomization: (adapted: any) => void
    resetCustomization: () => void
    onRecipeUpdated: (updated: any) => void
    setCheckedIngredients?: (next: Record<string, boolean>) => void
  }
}>()

const ss = useSecretSauce()
const saving = ref(false)
const saveError = ref('')
const chatRef = ref<InstanceType<typeof CustomizeChatPanel> | null>(null)

const activeRecipeForChat = computed(() => props.context?.customizedRecipe || props.context?.recipe)

function onCustomized(result: any) {
  saveError.value = ''
  props.context.applyCustomization(result)
}

function resetToOriginal() {
  saveError.value = ''
  chatRef.value?.clearHistory()
  props.context.resetCustomization()
}

function openSettings() {
  props.context.setCustomizeOpen(false)
  ss.navigate?.('/settings?section=core-ai-provider')
}

async function updateCurrentRecipe() {
  if (!props.context?.customizedRecipe || !props.context?.recipe?.id || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const updated = await ss.api.post<any>('/api/x/core-customize-recipe/save', {
      recipe_id: props.context.recipe.id,
      revision: props.context.recipe.revision,
      recipe: {
        ...props.context.customizedRecipe,
        language: props.context.recipe.language || 'en',
      },
    })
    ss.notify({ level: 'success', message: 'Recipe updated with customization' })
    chatRef.value?.clearHistory()
    props.context.onRecipeUpdated(updated)
  } catch (failure: any) {
    saveError.value = failure?.message || 'Failed to update recipe'
  } finally {
    saving.value = false
  }
}

async function saveAsNewRecipe() {
  if (!props.context?.customizedRecipe || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const created = await ss.api.post<any>('/api/x/core-customize-recipe/save', {
      recipe: {
        ...props.context.customizedRecipe,
        language: props.context.recipe?.language || 'en',
      },
    })
    ss.notify({ level: 'success', message: 'Saved as new recipe variation' })
    chatRef.value?.clearHistory()
    props.context.resetCustomization()
    props.context.setCustomizeOpen(false)
    ss.navigate?.(`/recipes/${created.id}`)
  } catch (failure: any) {
    saveError.value = failure?.message || 'Failed to save new recipe'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="context?.customizeOpen || context?.customizedRecipe" class="customize-detail-panel">
    <div v-if="context.customizeOpen" class="chat-drawer-card">
      <div class="chat-drawer-header">
        <span>Customize Recipe</span>
        <Button
          icon="pi pi-times"
          text
          rounded
          size="small"
          aria-label="Close customize panel"
          @click="context.setCustomizeOpen(false)"
        />
      </div>
      <CustomizeChatPanel
        ref="chatRef"
        :recipe="activeRecipeForChat"
        :active="context.customizeOpen"
        @customized="onCustomized"
        @openSettings="openSettings"
      />
    </div>

    <Message v-if="saveError" severity="error">{{ saveError }}</Message>

    <template v-if="context.customizedRecipe">
      <div class="customized-version-bar">
        <span class="version-badge">Viewing customized version (changes highlighted)</span>
        <div class="version-actions">
          <Button
            label="Reset to Original"
            icon="pi pi-undo"
            severity="secondary"
            size="small"
            outlined
            class="btn-reset-customization"
            :disabled="saving"
            @click="resetToOriginal"
          />
          <Button
            label="Save as New Recipe"
            icon="pi pi-copy"
            size="small"
            outlined
            class="btn-save-fork"
            :loading="saving"
            @click="saveAsNewRecipe"
          />
          <Button
            label="Update Recipe"
            icon="pi pi-check"
            size="small"
            class="btn-update-recipe"
            :loading="saving"
            @click="updateCurrentRecipe"
          />
        </div>
      </div>

      <CustomizedRecipePreview
        :originalRecipe="context.recipe"
        :customizedRecipe="context.customizedRecipe"
        :currentServings="context.currentServings"
        :interactiveCheckboxes="true"
        :checkedIngredients="context.checkedIngredients"
        @update:checkedIngredients="context.setCheckedIngredients?.($event)"
      />
    </template>
  </div>
</template>

<style scoped>
.customize-detail-panel {
  display: grid;
  gap: 0.85rem;
  margin-bottom: 1rem;
}
.chat-drawer-card {
  padding: 0.85rem 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  display: grid;
  gap: 0.75rem;
}
.chat-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-text-color);
}
.customized-version-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
  border: 1px solid var(--p-primary-color);
  border-radius: var(--p-border-radius);
}
.version-badge {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--p-primary-color);
}
.version-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
</style>

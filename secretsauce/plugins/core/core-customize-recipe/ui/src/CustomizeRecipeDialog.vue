<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import CustomizeChatPanel from './CustomizeChatPanel.vue'
import CustomizedRecipePreview from './CustomizedRecipePreview.vue'

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
const adaptedRecipe = ref<any>(null)
const saving = ref(false)
const saveError = ref('')
const chatRef = ref<InstanceType<typeof CustomizeChatPanel> | null>(null)

const currentRecipeForChat = computed(() => adaptedRecipe.value || props.context?.recipe)

watch(
  () => props.visible,
  isVisible => {
    if (!isVisible) return
    saveError.value = ''
    adaptedRecipe.value = null
    chatRef.value?.clearHistory()
  },
)

function onCustomized(result: any) {
  adaptedRecipe.value = result
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
  ss.notify({ level: 'success', message: 'Recipe customized' })
  emit('resolved', adaptedRecipe.value)
  close()
}

async function saveAsNewRecipe() {
  if (!adaptedRecipe.value || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const created = await ss.api.post<any>('/api/x/core-customize-recipe/save', {
      recipe: {
        ...adaptedRecipe.value,
        language: props.context.recipe?.language || 'en',
      },
    })
    ss.notify({ level: 'success', message: 'Saved as new recipe variation' })
    emit('resolved', created)
    close()
    ss.navigate?.(`/recipes/${created.id}`)
  } catch (failure: any) {
    saveError.value = failure?.message || 'Failed to save new recipe'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    append-to="self"
    class="customize-recipe-dialog"
    :style="{ width: 'min(56rem, 95vw)' }"
    @update:visible="emit('update:visible', $event)"
  >
    <template #header>
      <div class="dialog-header">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="wand-icon"
          aria-hidden="true"
        >
          <path d="m19 2 2 2-2 2-2-2Z" />
          <path d="m5 17 2 2-2 2-2-2Z" />
          <path d="m15 4 5 5L7 22l-5-5Z" />
        </svg>
        <span>Customize Recipe</span>
      </div>
    </template>

    <div class="dialog-content">
      <CustomizeChatPanel
        ref="chatRef"
        :recipe="currentRecipeForChat"
        :active="props.visible"
        @customized="onCustomized"
        @openSettings="openSettings"
      />

      <Message v-if="saveError" severity="error">{{ saveError }}</Message>

      <CustomizedRecipePreview
        v-if="adaptedRecipe"
        :originalRecipe="props.context.recipe"
        :customizedRecipe="adaptedRecipe"
      />
    </div>

    <template #footer>
      <div class="dialog-actions">
        <Button label="Cancel" severity="secondary" :disabled="saving" @click="close" />
        <div v-if="adaptedRecipe" class="commit-actions">
          <Button
            label="Save as New Recipe"
            icon="pi pi-copy"
            class="btn-save-fork"
            outlined
            :loading="saving"
            @click="saveAsNewRecipe"
          />
          <Button
            label="Apply to Editor"
            icon="pi pi-check"
            class="btn-apply-editor"
            :loading="saving"
            @click="applyToEditor"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  font-size: 1.15rem;
}
.wand-icon {
  color: var(--p-primary-color);
}
.dialog-content {
  display: grid;
  gap: 1.25rem;
}
.dialog-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.commit-actions {
  display: flex;
  gap: 0.5rem;
}
</style>

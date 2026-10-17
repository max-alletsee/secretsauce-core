<script setup lang="ts">
import { ref, computed } from 'vue'
import MagicWandDialog from './MagicWandDialog.vue'

const props = defineProps<{
  context: {
    recipe: any
    applyAdaptation: (data: any) => void
  }
}>()

const visible = ref(false)

const canMagic = computed(() => {
  const r = props.context?.recipe
  return Boolean(r && (r.title?.trim() || (r.ingredients && r.ingredients.length > 0)))
})
</script>

<template>
  <div class="magic-wand-trigger-container">
    <Button
      label="Make it Magic"
      class="btn-make-it-magic"
      outlined
      :disabled="!canMagic"
      @click="visible = true"
    >
      <template #icon>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="wand-icon" aria-hidden="true">
          <path d="m19 2 2 2-2 2-2-2Z"/>
          <path d="m5 17 2 2-2 2-2-2Z"/>
          <path d="m15 4 5 5L7 22l-5-5Z"/>
        </svg>
      </template>
    </Button>

    <MagicWandDialog
      v-model:visible="visible"
      :context="props.context"
    />
  </div>
</template>

<style scoped>
.magic-wand-trigger-container { display: inline-flex; }
.wand-icon { margin-right: 0.4rem; color: var(--p-primary-color); }
</style>

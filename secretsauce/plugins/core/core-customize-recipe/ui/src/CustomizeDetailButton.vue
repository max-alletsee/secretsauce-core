<script setup lang="ts">
defineProps<{
  context?: {
    recipe?: any
    customizeOpen?: boolean
    customizedRecipe?: any
    setCustomizeOpen?: (open: boolean) => void
  }
}>()
</script>

<template>
  <Button
    v-if="context?.recipe"
    :label="context.customizeOpen ? 'Close Customize' : 'Customize Recipe'"
    class="btn-customize-recipe"
    :outlined="!context.customizeOpen && !context.customizedRecipe"
    size="small"
    @click="context.setCustomizeOpen?.(!context.customizeOpen)"
  >
    <template #icon>
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="customize-icon"
        aria-hidden="true"
      >
        <path d="m19 2 2 2-2 2-2-2Z" />
        <path d="m5 17 2 2-2 2-2-2Z" />
        <path d="m15 4 5 5L7 22l-5-5Z" />
      </svg>
    </template>
  </Button>
</template>

<style scoped>
.customize-icon {
  margin-right: 0.35rem;
  color: var(--p-primary-color);
}
</style>

<script setup lang="ts">
import { ref, inject, watch } from 'vue'

const props = defineProps<{
  context?: {
    recipe: { id: string; title: string }
    isShortlisted?: boolean
  }
}>()

const emit = defineEmits<{
  change: [boolean]
}>()

const api = inject<any>('__SS_API__')
const favorited = ref(Boolean(props.context?.isShortlisted || (props.context?.recipe as any)?.is_shortlisted))

watch(() => props.context?.isShortlisted ?? (props.context?.recipe as any)?.is_shortlisted, (val) => {
  if (val !== undefined) {
    favorited.value = Boolean(val)
  }
})

async function toggle(e: Event) {
  e.stopPropagation()
  if (!props.context?.recipe || !api) return

  const next = !favorited.value
  favorited.value = next

  try {
    if (next) {
      await api.post('/api/x/shortlist', { recipe_id: props.context.recipe.id })
    } else {
      await api.delete(`/api/x/shortlist/${props.context.recipe.id}`)
    }
    emit('change', next)
  } catch (err) {
    favorited.value = !next
  }
}
</script>

<template>
  <button
    type="button"
    class="btn-shortlist"
    :class="{ active: favorited }"
    :title="favorited ? 'Remove from shortlist' : 'Add to shortlist'"
    @click="toggle"
  >
    ★
  </button>
</template>

<style scoped>
.btn-shortlist {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  color: #d6d3d1;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color 0.15s, transform 0.1s;
}
.btn-shortlist:hover {
  transform: scale(1.15);
}
.btn-shortlist.active {
  color: #f59e0b;
}
</style>

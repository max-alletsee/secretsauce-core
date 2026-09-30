<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const props = defineProps<{ context?: { recipe: { id: string; title: string; is_shortlisted?: boolean }; isShortlisted?: boolean } }>()
const emit = defineEmits<{ change: [boolean] }>()
const ss = useSecretSauce(), busy = ref(false)
const favorited = ref(Boolean(props.context?.isShortlisted ?? props.context?.recipe.is_shortlisted))
watch(() => props.context?.isShortlisted ?? props.context?.recipe.is_shortlisted, value => { if (value !== undefined) favorited.value = !!value })
async function toggle(event: Event) {
  event.stopPropagation()
  const recipe = props.context?.recipe
  if (!recipe || busy.value) return
  busy.value = true
  try {
    if (favorited.value) await ss.api.delete(`/api/x/core-shortlist/${recipe.id}`)
    else await ss.api.post('/api/x/core-shortlist', { recipe_id: recipe.id })
    favorited.value = !favorited.value
    emit('change', favorited.value)
  } catch (error: any) { ss.notify({ level: 'error', message: error?.message || 'Could not update shortlist' }) }
  finally { busy.value = false }
}
</script>
<template>
  <Button class="btn-shortlist" :class="{ active: favorited }" :icon="favorited ? 'pi pi-star-fill' : 'pi pi-star'" :aria-label="favorited ? 'Remove from shortlist' : 'Add to shortlist'" :title="favorited ? 'Remove from shortlist' : 'Add to shortlist'" :aria-pressed="favorited" text rounded :loading="busy" @click="toggle" />
</template>

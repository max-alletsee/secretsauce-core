<script setup lang="ts">
import { ref } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ context: { recipe: any } }>()
const emit = defineEmits<{ resolve: [recipe: any]; cancel: [] }>()
const ss = useSecretSauce()
const preferred = ss.store.currentMember.value?.preferred_language
const target = ref(preferred && preferred !== props.context.recipe.language ? preferred : ss.store.household.value?.languages.translations?.[0] || 'de')
const languages = [{ id: 'en', label: 'English' }, { id: 'de', label: 'German' }, { id: 'es', label: 'Spanish' }, { id: 'fr', label: 'French' }, { id: 'it', label: 'Italian' }, { id: 'pt', label: 'Portuguese' }, { id: 'nl', label: 'Dutch' }, { id: 'ja', label: 'Japanese' }, { id: 'zh', label: 'Chinese' }]
const busy = ref(false), error = ref(''), unavailable = ref(false)
async function translate() {
  busy.value = true; error.value = ''; unavailable.value = false
  try {
    const recipe = await ss.api.post<any>('/api/x/core-translator/translate', { recipe_id: props.context.recipe.id, target_language: target.value })
    ss.notify({ level: 'success', message: 'Recipe translated' })
    emit('resolve', recipe)
    ss.navigate(`/recipes/${recipe.id}`)
  } catch (failure: any) { unavailable.value = failure?.code === 'unavailable'; error.value = failure?.message || 'Translation failed' }
  finally { busy.value = false }
}
function openSettings() { emit('cancel'); ss.navigate('/settings?section=core-ai-provider') }
</script>

<template>
  <div class="translate-dialog">
    <p>{{ context.recipe.title }}</p>
    <label for="target-language">Target language</label><Select aria-label="Target language" inputId="target-language" v-model="target" :options="languages" optionLabel="label" optionValue="id" fluid />
    <Message v-if="unavailable" severity="warn">AI isn’t set up yet. <Button label="Open AI settings" severity="secondary" @click="openSettings" /></Message>
    <Message v-else-if="error" severity="error">{{ error }}</Message>
    <div class="dialog-actions"><Button label="Cancel" severity="secondary" :disabled="busy" @click="emit('cancel')" /><Button label="Translate recipe" icon="pi pi-language" :loading="busy" :disabled="!target" @click="translate" /></div>
  </div>
</template>

<style scoped>
.translate-dialog { display: grid; gap: .75rem; }
.dialog-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .5rem; }
label { color: var(--p-text-muted-color); }
</style>

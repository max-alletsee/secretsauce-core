<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'

defineOptions({ inheritAttrs: false })
defineProps<{ context?: unknown }>()
const emit = defineEmits<{ resolve: [recipe: any]; cancel: [] }>()
const ss = useSecretSauce()
const mode = ref('url'), url = ref(''), text = ref(''), photo = ref(''), mime = ref('image/jpeg'), preview = ref('')
const draft = ref<any>(null), extracting = ref(false), saving = ref(false), error = ref(''), unavailable = ref(false)
const ready = computed(() => mode.value === 'url' ? !!url.value.trim() : mode.value === 'text' ? !!text.value.trim() : !!photo.value)
watch(mode, () => { draft.value = null; error.value = ''; unavailable.value = false })
function readPhoto(event: Event) {
  photo.value = ''; preview.value = ''; draft.value = null; error.value = ''; unavailable.value = false
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { error.value = 'Choose an image file'; return }
  mime.value = file.type
  const reader = new FileReader()
  reader.onload = () => { preview.value = String(reader.result); photo.value = preview.value.split(',')[1] }
  reader.onerror = () => { error.value = 'Could not read the photo' }
  reader.readAsDataURL(file)
}
function showFailure(failure: any) {
  unavailable.value = failure?.code === 'unavailable' || failure?.status === 503
  error.value = failure?.message || 'Could not import the recipe'
}
async function extract() {
  if (!ready.value || extracting.value) return
  extracting.value = true; draft.value = null; error.value = ''; unavailable.value = false
  try {
    const source = mode.value === 'photo' ? 'image' : mode.value
    const body = source === 'url' ? { url: url.value.trim() } : source === 'text' ? { text: text.value.trim() } : { image_base64: photo.value, mime_type: mime.value }
    draft.value = await ss.api.post(`/api/x/core-recipe-importer/parse-${source}`, { ...body, auto_save: false })
  } catch (failure) { showFailure(failure) }
  finally { extracting.value = false }
}
async function save() {
  if (!draft.value || saving.value) return
  saving.value = true; error.value = ''
  try {
    const recipe = await ss.api.post<any>('/api/recipes', { ...draft.value, language: draft.value.language || ss.store.household.value?.languages.primary || 'en' })
    ss.notify({ level: 'success', message: 'Recipe imported' })
    emit('resolve', recipe)
    ss.navigate(`/recipes/${recipe.id}`)
  } catch (failure) { showFailure(failure) }
  finally { saving.value = false }
}
function openSettings() { emit('cancel'); ss.navigate('/settings?section=core-ai-provider') }
</script>

<template>
  <div class="import-recipe-dialog">
    <Tabs v-model:value="mode">
      <TabList><Tab value="url">URL</Tab><Tab value="text">Paste text</Tab><Tab value="photo">Photo</Tab></TabList>
      <TabPanels>
        <TabPanel value="url"><label for="import-url">Recipe URL</label><InputText id="import-url" v-model="url" type="url" fluid placeholder="https://…" /></TabPanel>
        <TabPanel value="text"><label for="import-text">Recipe text</label><Textarea id="import-text" v-model="text" rows="6" fluid /></TabPanel>
        <TabPanel value="photo"><label for="import-photo">Recipe photo</label><input id="import-photo" type="file" accept="image/*" @change="readPhoto"><img v-if="preview" :src="preview" alt="Selected recipe photo" class="photo-preview"></TabPanel>
      </TabPanels>
    </Tabs>
    <Message v-if="unavailable" severity="warn">AI isn’t set up yet. <Button label="Open AI settings" severity="secondary" @click="openSettings" /></Message>
    <Message v-else-if="error" severity="error">{{ error }}</Message>
    <Button label="Extract recipe" icon="pi pi-sparkles" :loading="extracting" :disabled="!ready || saving" @click="extract" />
    <Card v-if="draft" class="draft-preview">
      <template #title>{{ draft.title }}</template>
      <template #content>
        <p v-if="draft.description">{{ draft.description }}</p><p>Serves {{ draft.servings }}</p>
        <h3>Ingredients</h3><ul><li v-for="(ingredient, index) in draft.ingredients" :key="index">{{ ingredient.quantity }} {{ ingredient.unit }} {{ ingredient.name }}</li></ul>
        <h3>Instructions</h3><ol><li v-for="(step, index) in draft.steps" :key="index">{{ step.instruction || step.text }}</li></ol>
      </template>
    </Card>
    <div class="dialog-actions"><Button label="Cancel" severity="secondary" :disabled="saving" @click="emit('cancel')" /><Button v-if="draft" label="Save recipe" icon="pi pi-check" :loading="saving" @click="save" /></div>
  </div>
</template>

<style scoped>
.import-recipe-dialog { display: grid; gap: 1rem; }
label { display: block; margin-bottom: .5rem; color: var(--p-text-muted-color); }
.dialog-actions { display: flex; justify-content: flex-end; gap: .5rem; }
.photo-preview { display: block; max-width: 100%; max-height: 16rem; margin-top: .75rem; border-radius: var(--p-border-radius); }
</style>

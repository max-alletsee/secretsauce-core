<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { type RecipeSource, type RecipeSourceType, type SourceSummary, sourceTypeLabel } from '../sourceFilter'

const props = defineProps<{
  modelValue: RecipeSource | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [RecipeSource | null]
}>()

const ss = useSecretSauce()

const typeOptions: { value: RecipeSourceType; label: string }[] = [
  { value: 'cookbook', label: 'Cookbook' },
  { value: 'website', label: 'Website' },
  { value: 'person', label: 'Person' },
  { value: 'other', label: 'Other' },
]

const sourceType = ref<RecipeSourceType>('cookbook')
const sourceName = ref('')
const sourceAuthor = ref('')
const sourcePage = ref('')
const sourceUrl = ref('')
const sourceNotes = ref('')

const householdSources = ref<SourceSummary[]>([])
const suggestions = ref<SourceSummary[]>([])
let syncingFromProp = false

function applyFromProp(val: RecipeSource | null | undefined) {
  syncingFromProp = true
  if (val && val.name) {
    sourceType.value = (val.type || 'other') as RecipeSourceType
    sourceName.value = val.name || ''
    sourceAuthor.value = val.author || ''
    sourcePage.value = val.page || ''
    sourceUrl.value = val.url || ''
    sourceNotes.value = val.notes || ''
  } else {
    sourceName.value = ''
    sourceAuthor.value = ''
    sourcePage.value = ''
    sourceUrl.value = ''
    sourceNotes.value = ''
  }
  syncingFromProp = false
}

watch(() => props.modelValue, applyFromProp, { immediate: true, deep: true })

function emitCurrent() {
  if (syncingFromProp) return
  const name = sourceName.value.trim()
  if (!name) {
    emit('update:modelValue', null)
    return
  }
  const next: RecipeSource = {
    type: sourceType.value,
    name,
  }
  const author = sourceAuthor.value.trim()
  const page = sourcePage.value.trim()
  const url = sourceUrl.value.trim()
  const notes = sourceNotes.value.trim()
  if (author) next.author = author
  if (sourceType.value === 'cookbook' && page) next.page = page
  if ((sourceType.value === 'website' || sourceType.value === 'other') && url) next.url = url
  if (notes) next.notes = notes
  emit('update:modelValue', next)
}

watch([sourceType, sourceName, sourceAuthor, sourcePage, sourceUrl, sourceNotes], emitCurrent)

onMounted(async () => {
  try {
    const res = await ss.api?.get?.<{ items?: SourceSummary[] } | SourceSummary[]>('/api/recipes/sources')
    if (Array.isArray(res)) {
      householdSources.value = res
    } else if (res && Array.isArray(res.items)) {
      householdSources.value = res.items
    }
  } catch {
    // Autocomplete is optional offline or when no sources exist yet.
  }
})

function searchSources(event: { query: string }) {
  const q = (event.query || '').trim().toLowerCase()
  if (!q) {
    suggestions.value = [...householdSources.value]
    return
  }
  suggestions.value = householdSources.value.filter(
    s => s.name.toLowerCase().includes(q) || (s.author && s.author.toLowerCase().includes(q))
  )
}

function onNameModelUpdate(val: string | SourceSummary | null) {
  if (val && typeof val === 'object') {
    sourceName.value = val.name || ''
    if (val.type) sourceType.value = val.type
    if (val.author && !sourceAuthor.value.trim()) {
      sourceAuthor.value = val.author
    } else if (val.author) {
      sourceAuthor.value = val.author
    }
  } else {
    sourceName.value = typeof val === 'string' ? val : ''
  }
}

function onSourceSelect(event: { value: SourceSummary }) {
  const picked = event?.value
  if (!picked) return
  sourceName.value = picked.name
  if (picked.type) sourceType.value = picked.type
  if (picked.author) sourceAuthor.value = picked.author
}

function clearSource() {
  sourceName.value = ''
  sourceAuthor.value = ''
  sourcePage.value = ''
  sourceUrl.value = ''
  sourceNotes.value = ''
  emit('update:modelValue', null)
}

const hasContent = computed(() =>
  Boolean(
    sourceName.value.trim() ||
    sourceAuthor.value.trim() ||
    sourcePage.value.trim() ||
    sourceUrl.value.trim() ||
    sourceNotes.value.trim()
  )
)

const namePlaceholder = computed(() => {
  switch (sourceType.value) {
    case 'cookbook':
      return 'e.g. Simple'
    case 'website':
      return 'e.g. Smitten Kitchen'
    case 'person':
      return 'e.g. Grandma Rose'
    default:
      return 'Source name'
  }
})
</script>

<template>
  <fieldset class="source-editor">
    <div class="source-header">
      <legend>Source</legend>
      <Button
        v-if="hasContent"
        type="button"
        label="Clear"
        size="small"
        text
        severity="secondary"
        @click="clearSource"
      />
    </div>
    <div class="source-grid">
      <div class="form-group">
        <label for="recipe-source-type">Source type</label>
        <Select
          inputId="recipe-source-type"
          v-model="sourceType"
          :options="typeOptions"
          optionLabel="label"
          optionValue="value"
          fluid
        />
      </div>
      <div class="form-group source-name-field">
        <label for="recipe-source-name">Source name</label>
        <AutoComplete
          inputId="recipe-source-name"
          :modelValue="sourceName"
          :suggestions="suggestions"
          optionLabel="name"
          :completeOnFocus="true"
          :placeholder="namePlaceholder"
          fluid
          @update:modelValue="onNameModelUpdate"
          @complete="searchSources"
          @item-select="onSourceSelect"
        >
          <template #option="{ option }">
            <div class="source-suggestion">
              <span class="suggestion-name">{{ option.name }}</span>
              <small class="suggestion-meta">
                {{ sourceTypeLabel(option.type) }}<template v-if="option.author"> · {{ option.author }}</template>
              </small>
            </div>
          </template>
        </AutoComplete>
      </div>
      <div v-if="sourceType !== 'person'" class="form-group">
        <label for="recipe-source-author">Author</label>
        <InputText
          id="recipe-source-author"
          v-model="sourceAuthor"
          placeholder="e.g. Yotam Ottolenghi"
          fluid
        />
      </div>
      <div v-if="sourceType === 'cookbook'" class="form-group">
        <label for="recipe-source-page">Page #</label>
        <InputText
          id="recipe-source-page"
          v-model="sourcePage"
          placeholder="e.g. 142"
          fluid
        />
      </div>
      <div v-if="sourceType === 'website' || sourceType === 'other'" class="form-group source-url-field">
        <label for="recipe-source-url">URL</label>
        <InputText
          id="recipe-source-url"
          v-model="sourceUrl"
          type="url"
          placeholder="https://…"
          fluid
        />
      </div>
      <div v-if="sourceType === 'person' || sourceType === 'other'" class="form-group source-notes-field">
        <label for="recipe-source-notes">Source notes</label>
        <InputText
          id="recipe-source-notes"
          v-model="sourceNotes"
          placeholder="Optional context or adaptation notes"
          fluid
        />
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.source-editor {
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  padding: .625rem .75rem;
  margin: 0;
  display: grid;
  gap: .5rem;
}
.source-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
legend {
  font-size: .875rem;
  font-weight: 600;
  padding: 0 .25rem;
  color: var(--p-text-muted-color);
}
.source-grid {
  display: grid;
  grid-template-columns: 10rem 1fr 1fr;
  gap: .5rem;
}
.form-group {
  display: grid;
  gap: .25rem;
}
label {
  color: var(--p-text-muted-color);
  font-size: .875rem;
}
.source-url-field,
.source-notes-field {
  grid-column: 1 / -1;
}
.source-suggestion {
  display: flex;
  flex-direction: column;
}
.suggestion-meta {
  color: var(--p-text-muted-color);
}
@media (max-width: 767px) {
  .source-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSecretSauce, type Member } from '@secretsauce/ui'
const ss = useSecretSauce()
const props = defineProps<{ visible: boolean; member?: Member | null }>()
const emit = defineEmits<{ 'update:visible': [visible: boolean]; saved: [member: Member] }>()
const busy = ref(false), error = ref('')
function values(member?: Member | null) {
  return { name: member?.name || '', preferred_language: member?.preferred_language || ss.store.household.value.languages.primary,
    serving_ratio: member?.serving_ratio ?? 1, dietary_restrictions: [...(member?.dietary_restrictions || [])], allergies: [...(member?.allergies || [])],
    disliked_ingredients: [...(member?.disliked_ingredients || [])], favorite_cuisines: [...(member?.favorite_cuisines || [])] }
}
const draft = ref(values()), revision = ref(1)
watch(() => [props.visible, props.member] as const, () => {
  if (props.visible) { draft.value = values(props.member); revision.value = props.member?.revision || 1; error.value = '' }
}, { immediate: true })
const languages = computed(() => [...new Set([ss.store.household.value.languages.primary, ...(ss.store.household.value.languages.translations || []), ...(props.member?.preferred_language ? [props.member.preferred_language] : []), 'en', 'de', 'fr', 'es', 'it', 'nl'])])
const fields = [
  { key: 'dietary_restrictions', id: 'dietary', label: 'Dietary restrictions', suggestions: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'] },
  { key: 'allergies', id: 'allergies', label: 'Allergies', suggestions: ['peanut', 'tree nut', 'milk', 'egg', 'shellfish'] },
  { key: 'disliked_ingredients', id: 'dislikes', label: 'Disliked ingredients', suggestions: ['mushroom', 'olive', 'coriander'] },
  { key: 'favorite_cuisines', id: 'cuisines', label: 'Favourite cuisines', suggestions: ['Italian', 'Indian', 'Mexican', 'Thai'] },
] as const
const suggestions = ref<Record<string, string[]>>({})
function suggest(field: typeof fields[number], query: string) { suggestions.value[field.key] = field.suggestions.filter(value => value.toLowerCase().includes(query.toLowerCase())) }
async function save() {
  if (busy.value || !draft.value.name.trim() || draft.value.serving_ratio == null || draft.value.serving_ratio < .25 || draft.value.serving_ratio > 10) return
  busy.value = true; error.value = ''
  try {
    const body = { ...draft.value, name: draft.value.name.trim() }
    const member = props.member
      ? await ss.api.patch<Member>(`/api/members/${props.member.id}`, { ...body, revision: revision.value })
      : await ss.api.post<Member>('/api/members', body)
    emit('saved', member); emit('update:visible', false)
  } catch (failure: any) {
    const current = failure.details?.current || failure.current
    if (failure.status === 409 && props.member && current) {
      draft.value = values(current); revision.value = current.revision
      error.value = 'Someone else changed this member. The latest profile has been reloaded.'
    } else error.value = failure.message || 'Could not save member'
  } finally { busy.value = false }
}
</script>
<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible', $event)" :header="member ? 'Edit household member' : 'Add household member'" modal :style="{ width: '32rem', maxWidth: '95vw' }">
    <form class="member-form" @submit.prevent="save">
      <Message v-if="error" severity="error">{{ error }}</Message>
      <label for="member-name">Name</label><InputText id="member-name" v-model="draft.name" required fluid />
      <label for="member-language">Language</label><Select inputId="member-language" aria-label="Language" v-model="draft.preferred_language" :options="languages" fluid />
      <label for="member-serving">Portion size</label><InputNumber inputId="member-serving" v-model="draft.serving_ratio" :min=".25" :max="10" :step=".25" :maxFractionDigits="2" showButtons fluid />
      <small>Relative to one adult portion</small>
      <template v-for="field in fields" :key="field.key">
        <label :for="`member-${field.id}`">{{ field.label }}</label><AutoComplete :inputId="`member-${field.id}`" :aria-label="field.label" v-model="draft[field.key]" multiple :typeahead="false" dropdown :suggestions="suggestions[field.key] || []" @complete="suggest(field, $event.query)" fluid />
      </template>
      <div class="actions"><Button label="Cancel" severity="secondary" text :disabled="busy" @click="emit('update:visible', false)" /><Button type="submit" label="Save Member" :loading="busy" :disabled="!draft.name.trim()" /></div>
    </form>
  </Dialog>
</template>
<style scoped>
.member-form { display: grid; gap: .75rem; }.actions { display: flex; justify-content: flex-end; gap: .5rem; }small { color: var(--p-text-muted-color); }
</style>

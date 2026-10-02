<script setup lang="ts">
import { inject, ref, watch } from 'vue'
import type { ApiClient, Household } from '@secretsauce/ui'
import { useHouseholdStore } from '../stores/household'
import MealSlotEditor from './MealSlotEditor.vue'
const api = inject<ApiClient>('__SS_API__')!
const store = useHouseholdStore()
function copy(h: Household): Household { return { ...h, languages: { ...h.languages, ...(h.languages.translations ? { translations: [...h.languages.translations] } : {}) }, meal_types: h.meal_types.map(slot => ({ ...slot })) } }
const draft = ref(copy(store.household)), busy = ref(false), error = ref(''), saved = ref(false)
watch(() => store.household, h => { draft.value = copy(h) })
const units = [{ label: 'Metric', value: 'metric' }, { label: 'US customary', value: 'us_customary' }]
const languages = ['en', 'de', 'fr', 'es', 'it', 'nl']
async function save() {
  if (busy.value) return
  busy.value = true; error.value = ''; saved.value = false
  try {
    const { household_name, units, languages, meal_types } = draft.value
    store.household = await api.patch<Household>('/api/household', { household_name, units, languages, meal_types })
    saved.value = true
  } catch (err: any) { error.value = err.message || 'Could not save household' }
  finally { busy.value = false }
}
</script>
<template>
  <form class="household-settings" @submit.prevent="save">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <Message v-if="saved" severity="success">Household saved</Message>
    <label for="household-name">Household name</label><InputText id="household-name" v-model="draft.household_name" required maxlength="200" />
    <label for="household-units">Units</label><SelectButton inputId="household-units" aria-label="Units" v-model="draft.units" :options="units" optionLabel="label" optionValue="value" :allowEmpty="false" />
    <label for="household-language">Primary language</label><Select inputId="household-language" aria-label="Primary language" v-model="draft.languages.primary" :options="[...new Set([draft.languages.primary, ...languages])]" />
    <MealSlotEditor v-model="draft.meal_types" />
    <Button class="save-household" label="Save household" type="submit" :loading="busy" :disabled="!draft.household_name.trim() || !draft.meal_types.length || draft.meal_types.some(slot => !slot.label.trim())" />
  </form>
</template>
<style scoped>
.household-settings { display: flex; flex-direction: column; gap: .75rem; }
.save-household { align-self: flex-start; }
</style>

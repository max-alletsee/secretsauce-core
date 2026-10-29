<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { defaultHouseholdServings, useRecurringState, type RecurringRule } from './state'

const DEFAULT_PREDEFINED_NOTES = ['Dining out', 'Leftovers', 'Takeout', 'Quick meal']

const props = defineProps<{
  visible: boolean
  rule?: RecurringRule | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  saved: [rule: RecurringRule]
}>()

const ss = useSecretSauce()
const recurringState = useRecurringState(ss)

const weekday = ref(0)
const mealType = ref('')
const servings = ref(2)
const tab = ref<'recipes' | 'shortlist' | 'note'>('recipes')
const query = ref('')
const results = ref<any[]>([])
const shortlist = ref<any[]>([])
const selectedRecipe = ref<{ id: string; title: string } | null>(null)
const note = ref('')
const busy = ref(false)
const error = ref('')

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
  (label, value) => ({ label, value })
)
const slots = computed(() => ss.store.household.value?.meal_types || [])

const quickNotes = computed<string[]>(() => {
  const mealTypes = ss.store.household.value?.meal_types || []
  const slot = mealTypes.find(
    (s: any) =>
      s.id === mealType.value ||
      s.id?.toLowerCase() === mealType.value?.toLowerCase() ||
      s.label?.toLowerCase() === mealType.value?.toLowerCase()
  )
  if (slot && Array.isArray(slot.predefined_notes)) {
    return slot.predefined_notes
  }
  const householdNotes = ss.store.household.value?.predefined_notes
  if (Array.isArray(householdNotes)) {
    return householdNotes
  }
  return DEFAULT_PREDEFINED_NOTES
})

const canSave = computed(() => {
  if (busy.value || !mealType.value || !servings.value || servings.value <= 0) return false
  if (tab.value === 'note') return !!note.value.trim()
  return !!selectedRecipe.value?.id
})

let searchRevision = 0

async function search() {
  const n = ++searchRevision
  try {
    const response = await ss.api.get<any>('/api/recipes', { q: query.value })
    if (n === searchRevision && props.visible) {
      results.value = response?.items || []
    }
  } catch (failure: any) {
    if (n === searchRevision && props.visible) {
      error.value = failure?.message || 'Could not search recipes'
    }
  }
}

watch(
  () => props.visible,
  async (visible) => {
    ++searchRevision
    if (!visible) return
    error.value = ''
    query.value = ''
    results.value = []
    const defaultSlot =
      slots.value.find((slot: any) => slot.id === 'dinner')?.id || slots.value[0]?.id || ''
    if (props.rule) {
      weekday.value = props.rule.weekday
      mealType.value = props.rule.meal_type || defaultSlot
      servings.value = props.rule.servings || defaultHouseholdServings(ss)
      if (props.rule.entry_type === 'note') {
        tab.value = 'note'
        note.value = props.rule.title || ''
        selectedRecipe.value = null
      } else {
        tab.value = 'recipes'
        note.value = ''
        selectedRecipe.value = props.rule.recipe_id
          ? { id: props.rule.recipe_id, title: props.rule.recipe_title || props.rule.title || '' }
          : null
      }
    } else {
      weekday.value = 0
      mealType.value = defaultSlot
      servings.value = defaultHouseholdServings(ss)
      tab.value = 'recipes'
      selectedRecipe.value = null
      note.value = ''
    }
    await search()
    try {
      shortlist.value = await ss.api.get<any[]>('/api/x/core-shortlist')
    } catch {
      shortlist.value = []
    }
  }
)

function selectRecipe(item: { id: string; title: string }) {
  selectedRecipe.value = { id: item.id, title: item.title }
}

async function save() {
  if (!canSave.value) return
  busy.value = true
  error.value = ''
  const isNote = tab.value === 'note'
  const payload = {
    weekday: weekday.value,
    meal_type: mealType.value,
    entry_type: isNote ? 'note' : 'recipe',
    ...(isNote ? { title: note.value.trim() } : { recipe_id: selectedRecipe.value!.id }),
    servings: servings.value,
  }
  try {
    const saved = props.rule
      ? await ss.api.put<RecurringRule>(`/api/x/core-recurring/rules/${props.rule.id}`, payload)
      : await ss.api.post<RecurringRule>('/api/x/core-recurring/rules', payload)
    await recurringState.refreshSuggestions()
    emit('saved', saved)
    emit('update:visible', false)
  } catch (failure: any) {
    error.value = failure?.message || 'Could not save recurring meal'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :header="rule ? 'Edit recurring meal' : 'Add recurring meal'"
    modal
    :style="{ width: '34rem', maxWidth: '95vw' }"
  >
    <form class="recurring-rule-form" @submit.prevent="save">
      <Message v-if="error" severity="error">{{ error }}</Message>

      <label for="recurring-weekday">Weekday</label>
      <Select
        inputId="recurring-weekday"
        aria-label="Weekday"
        v-model="weekday"
        :options="weekdays"
        optionLabel="label"
        optionValue="value"
        fluid
      />

      <label for="recurring-slot">Meal slot</label>
      <Select
        inputId="recurring-slot"
        aria-label="Meal slot"
        v-model="mealType"
        :options="slots"
        optionLabel="label"
        optionValue="id"
        fluid
      />

      <label for="recurring-servings">Servings</label>
      <InputNumber
        inputId="recurring-servings"
        aria-label="Servings"
        v-model="servings"
        :min="0.25"
        :maxFractionDigits="2"
        fluid
      />

      <Tabs v-model:value="tab">
        <TabList>
          <Tab value="recipes">Recipes</Tab>
          <Tab value="shortlist">Shortlist</Tab>
          <Tab value="note">Note</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="recipes">
            <label for="recurring-recipe">Search recipes</label>
            <InputText id="recurring-recipe" v-model="query" @input="search" fluid />
            <div v-if="selectedRecipe" class="selected-recipe">
              <span>Selected: <strong>{{ selectedRecipe.title }}</strong></span>
            </div>
            <div v-for="item in results" :key="item.id" class="recipe-result">
              <span>{{ item.title }}</span>
              <Button
                :label="selectedRecipe?.id === item.id ? 'Selected' : 'Select'"
                :severity="selectedRecipe?.id === item.id ? 'success' : 'secondary'"
                size="small"
                type="button"
                @click="selectRecipe({ id: item.id, title: item.title })"
              />
            </div>
          </TabPanel>

          <TabPanel value="shortlist">
            <p v-if="!shortlist.length">No recipes in shortlist</p>
            <div v-for="item in shortlist" :key="item.recipe_id" class="recipe-result">
              <span>{{ item.recipe_title }}</span>
              <Button
                :label="selectedRecipe?.id === item.recipe_id ? 'Selected' : 'Select'"
                :severity="selectedRecipe?.id === item.recipe_id ? 'success' : 'secondary'"
                size="small"
                type="button"
                @click="selectRecipe({ id: item.recipe_id, title: item.recipe_title })"
              />
            </div>
          </TabPanel>

          <TabPanel value="note">
            <label for="recurring-note">Note title</label>
            <InputText id="recurring-note" v-model="note" fluid />
            <div class="quick-notes">
              <Button
                v-for="preset in quickNotes"
                :key="preset"
                :label="preset"
                outlined
                size="small"
                type="button"
                @click="note = preset"
              />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Button
        :label="rule ? 'Save recurring meal' : 'Add recurring meal'"
        type="submit"
        :loading="busy"
        :disabled="!canSave"
      />
    </form>
  </Dialog>
</template>

<style scoped>
.recurring-rule-form {
  display: grid;
  gap: 0.5rem;
}
.selected-recipe {
  font-size: 0.85rem;
  padding: 0.25rem 0;
  color: var(--p-text-color);
}
.recipe-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0;
}
.quick-notes {
  display: flex;
  gap: 0.375rem;
  flex-wrap: wrap;
  margin: 0.5rem 0;
}
</style>

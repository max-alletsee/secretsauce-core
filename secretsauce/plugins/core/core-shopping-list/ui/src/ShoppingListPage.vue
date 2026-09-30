<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const ss = useSecretSauce()
const activeTab = ref('list'), loading = ref(false), busy = ref(false), error = ref('')
function formatDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const end = new Date(); end.setDate(end.getDate() + 7)
const fromDate = ref(formatDate(new Date())), toDate = ref(formatDate(end))
const items = ref<any[]>([]), staples = ref<any[]>([])
const newItemName = ref(''), newItemQty = ref<number | null>(null), newItemUnit = ref('')
const newStapleName = ref(''), newStapleQty = ref<number | null>(1), newStapleUnit = ref(''), newStapleAlways = ref(true)
const groupedItems = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const item of items.value) (groups[item.category || 'Other'] ||= []).push(item)
  return groups
})
let request = 0
async function loadShoppingList() {
  const sequence = ++request
  loading.value = true; error.value = ''
  try {
    const result = await ss.api.get<any>('/api/x/core-shopping-list', { from_date: fromDate.value, to_date: toDate.value })
    if (sequence === request) items.value = result.items
  } catch (failure: any) { if (sequence === request) error.value = failure?.message || 'Failed to load shopping list' }
  finally { if (sequence === request) loading.value = false }
}
async function loadStaples() {
  try { staples.value = await ss.api.get<any[]>('/api/x/core-shopping-list/staples') }
  catch (failure: any) { error.value = failure?.message || 'Failed to load staples' }
}
watch(activeTab, tab => { if (tab === 'staples') loadStaples() })
async function write(action: () => Promise<unknown>, refresh: () => Promise<void>) {
  if (busy.value) return false
  busy.value = true; error.value = ''
  try { await action(); await refresh(); return true }
  catch (failure: any) { error.value = failure?.message || 'Could not update shopping list'; return false }
  finally { busy.value = false }
}
async function toggleItem(item: any) {
  if (busy.value) return
  const previous = item.checked
  item.checked = !previous
  // PrimeVue's internal checked state needs a changed model before rollback.
  await nextTick()
  const saved = await write(() => ss.api.post('/api/x/core-shopping-list/toggle', { key: item.key, checked: !previous }), loadShoppingList)
  if (!saved) item.checked = previous
}
async function addManualItem() {
  if (!newItemName.value.trim()) return
  await write(async () => {
    await ss.api.post('/api/x/core-shopping-list/items', { name: newItemName.value.trim(), quantity: newItemQty.value, unit: newItemUnit.value.trim() || undefined, category: 'Other' })
    newItemName.value = ''; newItemQty.value = null; newItemUnit.value = ''
  }, loadShoppingList)
}
async function addStaple() {
  if (!newStapleName.value.trim()) return
  await write(async () => {
    await ss.api.post('/api/x/core-shopping-list/staples', { name: newStapleName.value.trim(), default_quantity: newStapleQty.value ?? 1, unit: newStapleUnit.value.trim() || undefined, always_include: newStapleAlways.value })
    newStapleName.value = ''; newStapleQty.value = 1; newStapleUnit.value = ''
  }, loadStaples)
}
onMounted(loadShoppingList)
</script>
<template>
  <div class="shopping-list-page">
    <h1>Shopping list</h1>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <Tabs v-model:value="activeTab"><TabList><Tab value="list">Shopping list</Tab><Tab value="staples">Pantry staples</Tab></TabList>
      <TabPanels><TabPanel value="list">
        <div class="date-controls"><label for="shopping-from">Meals from</label><InputText id="shopping-from" v-model="fromDate" type="date" @change="loadShoppingList" /><label for="shopping-to">To</label><InputText id="shopping-to" v-model="toDate" type="date" @change="loadShoppingList" /><Button label="Refresh" icon="pi pi-refresh" outlined :loading="loading" @click="loadShoppingList" /></div>
        <form class="add-form" @submit.prevent="addManualItem">
          <div><label for="extra-name">Extra item name</label><InputText id="extra-name" v-model="newItemName" fluid /></div>
          <div><label for="extra-quantity">Quantity</label><InputNumber inputId="extra-quantity" v-model="newItemQty" :min="0" fluid /></div>
          <div><label for="extra-unit">Unit</label><InputText id="extra-unit" v-model="newItemUnit" fluid /></div>
          <Button type="submit" label="Add item" icon="pi pi-plus" :disabled="!newItemName.trim()" :loading="busy" />
        </form>
        <ProgressSpinner v-if="loading" aria-label="Loading shopping list" />
        <Message v-else-if="!items.length" severity="secondary">Shopping list is empty. Schedule meals or add pantry staples to generate your list.</Message>
        <section v-for="(categoryItems, category) in groupedItems" :key="category" class="category-card">
          <h3>{{ category }} <Tag :value="`${categoryItems.filter(item => item.checked).length}/${categoryItems.length}`" severity="secondary" /></h3>
          <ul><li v-for="item in categoryItems" :key="item.key" class="shopping-item" :class="{ checked: item.checked }">
            <Checkbox :inputId="`item-${item.key}`" :modelValue="item.checked" binary :disabled="busy" @update:modelValue="toggleItem(item)" />
            <label :for="`item-${item.key}`"><span>{{ item.name }}</span><small v-if="item.sources?.length">{{ item.sources.map(source => source.recipe_title || 'Meal').join(', ') }}</small></label>
            <span v-if="item.quantity != null">{{ item.quantity }} {{ item.unit || '' }}</span>
            <Button v-if="item.source_type === 'manual'" icon="pi pi-times" aria-label="Remove manual item" text severity="danger" :disabled="busy" @click="write(() => ss.api.delete(`/api/x/core-shopping-list/items/${item.id}`), loadShoppingList)" />
          </li></ul>
        </section>
      </TabPanel><TabPanel value="staples">
        <h3>Add pantry staple</h3><form class="add-form" @submit.prevent="addStaple">
          <div><label for="staple-name">Staple name</label><InputText id="staple-name" v-model="newStapleName" fluid /></div>
          <div><label for="staple-quantity">Default quantity</label><InputNumber inputId="staple-quantity" v-model="newStapleQty" :min="0" fluid /></div>
          <div><label for="staple-unit">Staple unit</label><InputText id="staple-unit" v-model="newStapleUnit" fluid /></div>
          <div class="checkbox-label"><Checkbox inputId="staple-always" v-model="newStapleAlways" binary /><label for="staple-always">Always include in every shopping list</label></div>
          <Button type="submit" label="Save staple" :disabled="!newStapleName.trim()" :loading="busy" />
        </form>
        <ul class="staple-list"><li v-for="staple in staples" :key="staple.id" class="staple-row"><span>{{ staple.name }} · {{ staple.default_quantity }} {{ staple.unit }}</span><Tag v-if="staple.always_include" value="Always included" severity="info" /><Button label="Delete" text severity="danger" :disabled="busy" @click="write(() => ss.api.delete(`/api/x/core-shopping-list/staples/${staple.id}`), loadStaples)" /></li></ul>
      </TabPanel></TabPanels>
    </Tabs>
  </div>
</template>
<style scoped>
.shopping-list-page { max-width: 60rem; margin: 0 auto; padding: 1rem; display: grid; gap: 1rem; }
h1 { margin: 0; } h3 { display: flex; align-items: center; gap: .5rem; }
.date-controls, .checkbox-label, .staple-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.add-form { display: grid; grid-template-columns: minmax(8rem, 2fr) minmax(5rem, 1fr) minmax(5rem, 1fr) auto; gap: .75rem; align-items: end; margin: 1rem 0; }
label { color: var(--p-text-muted-color); } .add-form label { display: block; margin-bottom: .5rem; }
.category-card { border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); padding: 1rem; margin-top: 1rem; background: var(--p-content-background); }
ul { list-style: none; padding: 0; }
.shopping-item { display: flex; gap: .75rem; align-items: center; padding: .75rem 0; border-top: 1px solid var(--p-content-border-color); }
.shopping-item label { flex: 1; cursor: pointer; color: var(--p-text-color); }.shopping-item small { display: block; color: var(--p-text-muted-color); }
.checked label span { text-decoration: line-through; color: var(--p-text-muted-color); }
.staple-list { display: grid; gap: .75rem; }
@media (max-width: 767px) { .add-form { grid-template-columns: 1fr 1fr; } .add-form > :first-child { grid-column: 1 / -1; } }
</style>

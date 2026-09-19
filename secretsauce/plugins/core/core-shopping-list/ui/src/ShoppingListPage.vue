<template>
  <div class="shopping-list-page p-4 max-w-3xl mx-auto space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between border-b pb-3">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🛒</span>
        <h1 class="text-xl font-bold text-stone-900">Shopping List</h1>
      </div>
      <!-- Tabs -->
      <div class="flex gap-1 bg-stone-100 p-1 rounded-lg text-xs font-medium">
        <button
          class="px-3 py-1.5 rounded transition tab-list"
          :class="activeTab === 'list' ? 'bg-white shadow text-emerald-700' : 'text-stone-600 hover:text-stone-900'"
          @click="activeTab = 'list'"
        >
          Shopping List
        </button>
        <button
          class="px-3 py-1.5 rounded transition tab-staples"
          :class="activeTab === 'staples' ? 'bg-white shadow text-emerald-700' : 'text-stone-600 hover:text-stone-900'"
          @click="openStaplesTab"
        >
          Pantry Staples
        </button>
      </div>
    </div>

    <!-- MAIN SHOPPING LIST TAB -->
    <div v-if="activeTab === 'list'" class="space-y-4">
      <!-- Date Range Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs">
        <div class="flex items-center gap-2">
          <span class="font-medium text-stone-700">Meals from:</span>
          <input
            v-model="fromDate"
            type="date"
            class="input-from-date border border-stone-300 rounded px-2 py-1 bg-white focus:outline-none"
            @change="loadShoppingList"
          />
          <span class="text-stone-400">to</span>
          <input
            v-model="toDate"
            type="date"
            class="input-to-date border border-stone-300 rounded px-2 py-1 bg-white focus:outline-none"
            @change="loadShoppingList"
          />
        </div>
        <button
          class="btn-refresh text-xs text-stone-600 hover:text-stone-900 border border-stone-300 px-2.5 py-1 rounded bg-white"
          @click="loadShoppingList"
        >
          🔄 Refresh
        </button>
      </div>

      <!-- Quick Add Item Bar -->
      <form class="flex items-center gap-2" @submit.prevent="addManualItem">
        <input
          v-model="newItemName"
          type="text"
          placeholder="Add extra item (e.g. coffee beans)..."
          class="input-new-item flex-1 border border-stone-300 rounded px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
        />
        <input
          v-model.number="newItemQty"
          type="number"
          step="any"
          placeholder="Qty"
          class="input-new-qty w-16 border border-stone-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
        />
        <input
          v-model="newItemUnit"
          type="text"
          placeholder="Unit"
          class="input-new-unit w-16 border border-stone-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          class="btn-add-item px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition"
          :disabled="!newItemName.trim()"
        >
          + Add
        </button>
      </form>

      <!-- Loading / Empty States -->
      <div v-if="loading" class="py-8 text-center text-xs text-stone-500">
        Loading shopping list...
      </div>

      <div v-else-if="!items.length" class="empty-state py-8 text-center space-y-1 bg-stone-50 rounded-lg border border-dashed border-stone-200">
        <p class="text-sm font-medium text-stone-700">Shopping list is empty</p>
        <p class="text-xs text-stone-400">Schedule meals or add pantry staples to generate your list.</p>
      </div>

      <!-- Categorized Items -->
      <div v-else class="space-y-4">
        <div
          v-for="(catItems, category) in groupedItems"
          :key="category"
          class="category-card bg-white border border-stone-200 rounded-lg overflow-hidden shadow-sm"
        >
          <div class="bg-stone-50 px-3 py-2 border-b border-stone-200 flex items-center justify-between">
            <h3 class="text-xs font-bold text-stone-800 uppercase tracking-wider">{{ category }}</h3>
            <span class="text-[11px] text-stone-500">
              {{ catItems.filter((i: any) => i.checked).length }}/{{ catItems.length }}
            </span>
          </div>

          <ul class="divide-y divide-stone-100 text-xs">
            <li
              v-for="item in catItems"
              :key="item.key"
              class="shopping-item px-3 py-2 flex items-center justify-between hover:bg-stone-50/50 transition"
              :class="{ 'bg-stone-50/30 opacity-50': item.checked }"
            >
              <label class="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                <input
                  type="checkbox"
                  :checked="item.checked"
                  class="item-checkbox rounded border-stone-300 text-emerald-600 focus:ring-0 cursor-pointer"
                  @change="toggleItem(item)"
                />
                <div class="flex flex-col">
                  <span
                    class="item-name font-medium"
                    :class="{ 'line-through text-stone-400': item.checked, 'text-stone-800': !item.checked }"
                  >
                    {{ item.name }}
                  </span>
                  <span v-if="item.sources?.length" class="text-[10px] text-stone-400">
                    {{ item.sources.map((s: any) => s.recipe_title || 'Meal').join(', ') }}
                  </span>
                </div>
              </label>

              <div class="flex items-center gap-2 text-stone-600">
                <span v-if="item.quantity != null" class="item-qty font-semibold">
                  {{ item.quantity }} {{ item.unit || '' }}
                </span>
                <button
                  v-if="item.source_type === 'manual'"
                  class="btn-delete-item text-stone-300 hover:text-red-600 font-bold px-1"
                  title="Remove manual item"
                  @click="deleteManualItem(item.id)"
                >
                  ✕
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- PANTRY STAPLES TAB -->
    <div v-if="activeTab === 'staples'" class="space-y-4">
      <div class="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs space-y-3">
        <h3 class="font-bold text-stone-800">Add Pantry Staple</h3>
        <form class="grid grid-cols-2 gap-2" @submit.prevent="addStaple">
          <input
            v-model="newStapleName"
            type="text"
            placeholder="Staple name (e.g. Olive oil)"
            class="input-staple-name border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
          />
          <div class="flex gap-1">
            <input
              v-model.number="newStapleQty"
              type="number"
              step="any"
              placeholder="Qty"
              class="w-16 border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
            />
            <input
              v-model="newStapleUnit"
              type="text"
              placeholder="Unit"
              class="w-16 border border-stone-300 rounded px-2 py-1 text-xs bg-white focus:outline-none"
            />
          </div>
          <label class="col-span-2 flex items-center gap-2 cursor-pointer pt-1">
            <input v-model="newStapleAlways" type="checkbox" class="rounded text-emerald-600" />
            <span class="text-stone-700">Always include in every shopping list</span>
          </label>
          <div class="col-span-2 flex justify-end">
            <button
              type="submit"
              class="btn-save-staple px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"
              :disabled="!newStapleName.trim()"
            >
              Save Staple
            </button>
          </div>
        </form>
      </div>

      <!-- Staples List -->
      <div class="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <div class="px-3 py-2 bg-stone-50 border-b font-bold text-xs text-stone-800">
          Configured Staples ({{ staples.length }})
        </div>
        <ul class="divide-y divide-stone-100 text-xs">
          <li v-for="st in staples" :key="st.id" class="staple-row p-3 flex items-center justify-between">
            <div>
              <span class="font-medium text-stone-900">{{ st.name }}</span>
              <span v-if="st.default_quantity" class="text-stone-500 ml-1">
                ({{ st.default_quantity }} {{ st.unit || '' }})
              </span>
              <span v-if="st.always_include" class="ml-2 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                Always included
              </span>
            </div>
            <button
              class="btn-delete-staple text-stone-300 hover:text-red-600 text-xs px-2"
              @click="deleteStaple(st.id)"
            >
              Delete
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'

const props = defineProps<{
  ss?: any
}>()

const api = props.ss?.api || inject<any>('__SS_API__', null)
const notify = props.ss?.notify || inject<any>('__SS_NOTIFY__', null)

const activeTab = ref<'list' | 'staples'>('list')
const loading = ref(false)

// Dates
function formatDate(d: Date) {
  return d.toISOString().split('T')[0]
}
const now = new Date()
const nextWeek = new Date()
nextWeek.setDate(now.getDate() + 7)

const fromDate = ref(formatDate(now))
const toDate = ref(formatDate(nextWeek))

// Items & Staples
const items = ref<any[]>([])
const staples = ref<any[]>([])

// New manual item
const newItemName = ref('')
const newItemQty = ref<number | null>(null)
const newItemUnit = ref('')

// New staple
const newStapleName = ref('')
const newStapleQty = ref<number | null>(1)
const newStapleUnit = ref('')
const newStapleAlways = ref(true)

const groupedItems = computed(() => {
  const groups: Record<string, any[]> = {}
  for (const item of items.value) {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  return groups
})

async function loadShoppingList() {
  if (!api) return
  loading.value = true
  try {
    const res = await api.get('/api/x/core-shopping-list', {
      params: { from_date: fromDate.value, to_date: toDate.value },
    })
    items.value = res?.items || []
  } catch (err: any) {
    if (notify) notify({ level: 'error', message: 'Failed to load shopping list' })
  } finally {
    loading.value = false
  }
}

async function toggleItem(item: any) {
  item.checked = !item.checked
  if (!api) return
  try {
    await api.post('/api/x/core-shopping-list/toggle', {
      key: item.key,
      checked: item.checked,
    })
  } catch (err: any) {
    item.checked = !item.checked // rollback on error
  }
}

async function addManualItem() {
  if (!api || !newItemName.value.trim()) return
  try {
    await api.post('/api/x/core-shopping-list/items', {
      name: newItemName.value.trim(),
      quantity: newItemQty.value,
      unit: newItemUnit.value.trim() || undefined,
      category: 'Other',
    })
    newItemName.value = ''
    newItemQty.value = null
    newItemUnit.value = ''
    await loadShoppingList()
  } catch (err: any) {
    if (notify) notify({ level: 'error', message: 'Failed to add manual item' })
  }
}

async function deleteManualItem(id: string) {
  if (!api || !id) return
  try {
    await api.delete(`/api/x/core-shopping-list/items/${id}`)
    await loadShoppingList()
  } catch (err: any) {
    if (notify) notify({ level: 'error', message: 'Failed to delete item' })
  }
}

async function openStaplesTab() {
  activeTab.value = 'staples'
  await loadStaples()
}

async function loadStaples() {
  if (!api) return
  try {
    const res = await api.get('/api/x/core-shopping-list/staples')
    staples.value = res || []
  } catch (err: any) {
    if (notify) notify({ level: 'error', message: 'Failed to load staples' })
  }
}

async function addStaple() {
  if (!api || !newStapleName.value.trim()) return
  try {
    await api.post('/api/x/core-shopping-list/staples', {
      name: newStapleName.value.trim(),
      default_quantity: newStapleQty.value || 1,
      unit: newStapleUnit.value.trim() || undefined,
      always_include: newStapleAlways.value,
    })
    newStapleName.value = ''
    newStapleQty.value = 1
    newStapleUnit.value = ''
    await loadStaples()
  } catch (err: any) {
    if (notify) notify({ level: 'error', message: 'Failed to save staple' })
  }
}

async function deleteStaple(id: string) {
  if (!api || !id) return
  try {
    await api.delete(`/api/x/core-shopping-list/staples/${id}`)
    await loadStaples()
  } catch (err: any) {
    if (notify) notify({ level: 'error', message: 'Failed to delete staple' })
  }
}

onMounted(() => {
  loadShoppingList()
})
</script>

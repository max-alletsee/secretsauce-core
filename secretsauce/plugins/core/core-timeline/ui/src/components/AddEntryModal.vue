<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'

const props = defineProps<{
  date: string
  mealType: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const api = inject<any>('__SS_API__')

const activeTab = ref<'search' | 'shortlist' | 'ai' | 'custom'>('search')
const searchQuery = ref('')
const searchResults = ref<any[]>([])
const shortlistEntries = ref<any[]>([])
const noteText = ref('')
const noteCategory = ref('Dinner')
const servings = ref(2)

async function searchRecipes() {
  if (!api || !searchQuery.value.trim()) {
    searchResults.value = []
    return
  }
  try {
    const res = await api.get(`/api/recipes?q=${encodeURIComponent(searchQuery.value.trim())}`)
    searchResults.value = res.items || res || []
  } catch (err) {
    searchResults.value = []
  }
}

async function loadShortlist() {
  if (!api) return
  try {
    shortlistEntries.value = await api.get('/api/x/shortlist')
  } catch {
    shortlistEntries.value = []
  }
}

async function scheduleRecipe(recipe: any) {
  if (!api) return
  const id = crypto.randomUUID()
  await api.post('/api/schedule', {
    id,
    date: props.date,
    meal_type: props.mealType || 'dinner',
    entry_type: 'recipe',
    recipe_id: recipe.id,
    servings_override: servings.value,
  })
  emit('created')
  emit('close')
}

async function scheduleCustomNote() {
  if (!api || !noteText.value.trim()) return
  const id = crypto.randomUUID()
  await api.post('/api/schedule', {
    id,
    date: props.date,
    meal_type: props.mealType || 'dinner',
    entry_type: 'note',
    title: `[${noteCategory.value}] ${noteText.value.trim()}`,
    servings_override: servings.value,
  })
  emit('created')
  emit('close')
}

onMounted(() => {
  loadShortlist()
})
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Add Meal — {{ date }} ({{ mealType }})</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <div class="modal-tabs">
        <button :class="{ active: activeTab === 'search' }" @click="activeTab = 'search'">
          Recipe Search
        </button>
        <button :class="{ active: activeTab === 'shortlist' }" @click="activeTab = 'shortlist'">
          Shortlist
        </button>
        <button :class="{ active: activeTab === 'ai' }" @click="activeTab = 'ai'">
          AI Suggestions
        </button>
        <button :class="{ active: activeTab === 'custom' }" @click="activeTab = 'custom'">
          Custom Note
        </button>
      </div>

      <div class="modal-body">
        <!-- 1. Search Tab -->
        <div v-if="activeTab === 'search'" class="tab-pane">
          <div class="search-box">
            <input
              v-model="searchQuery"
              placeholder="Search recipes..."
              @input="searchRecipes"
            />
          </div>
          <ul v-if="searchResults.length" class="recipe-results">
            <li v-for="r in searchResults" :key="r.id">
              <span>{{ r.title }}</span>
              <button class="select-btn" @click="scheduleRecipe(r)">Schedule</button>
            </li>
          </ul>
          <p v-else-if="searchQuery.trim()" class="empty-hint">No recipes found.</p>
        </div>

        <!-- 2. Shortlist Tab -->
        <div v-else-if="activeTab === 'shortlist'" class="tab-pane">
          <ul v-if="shortlistEntries.length" class="recipe-results">
            <li v-for="s in shortlistEntries" :key="s.id">
              <span>{{ s.recipe_title || 'Recipe' }}</span>
              <button class="select-btn" @click="scheduleRecipe({ id: s.recipe_id, title: s.recipe_title })">
                Schedule
              </button>
            </li>
          </ul>
          <p v-else class="empty-hint">No favorites in shortlist.</p>
        </div>

        <!-- 3. AI Suggestions Tab -->
        <div v-else-if="activeTab === 'ai'" class="tab-pane">
          <div class="ai-info-card">
            <h4>AI Meal Planner</h4>
            <p>Automated suggestions become active when the <code>meal-planner</code> plugin is enabled.</p>
          </div>
        </div>

        <!-- 4. Custom Note Tab -->
        <div v-else-if="activeTab === 'custom'" class="tab-pane">
          <div class="category-chips">
            <button
              v-for="cat in ['Dining Out', 'Leftovers', 'Takeout', 'Quick Meal']"
              :key="cat"
              :class="{ active: noteCategory === cat }"
              @click="noteCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <textarea
            v-model="noteText"
            placeholder="Enter meal details or notes..."
            rows="3"
          />
          <button class="primary-btn" :disabled="!noteText.trim()" @click="scheduleCustomNote">
            Save Note
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 520px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.modal-header h3 { margin: 0; font-size: 1.1em; }
.close-btn { border: none; background: transparent; font-size: 1.4em; cursor: pointer; }
.modal-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e7e5e4;
  margin-bottom: 12px;
}
.modal-tabs button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-size: 0.85em;
}
.modal-tabs button.active {
  border-bottom-color: #0284c7;
  color: #0284c7;
  font-weight: 600;
}
.tab-pane { min-height: 180px; }
.search-box input, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  box-sizing: border-box;
}
.category-chips { display: flex; gap: 6px; margin-bottom: 8px; }
.category-chips button {
  padding: 4px 8px;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  font-size: 0.8em;
}
.category-chips button.active { background: #0284c7; color: white; border-color: #0284c7; }
.recipe-results { list-style: none; padding: 0; margin: 8px 0; }
.recipe-results li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f4;
}
.select-btn {
  padding: 4px 10px;
  border: none;
  background: #0284c7;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}
.primary-btn {
  margin-top: 8px;
  padding: 8px 16px;
  background: #0284c7;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}
.empty-hint { color: #a8a29e; font-size: 0.85em; text-align: center; margin-top: 20px; }
.ai-info-card { padding: 16px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
</style>

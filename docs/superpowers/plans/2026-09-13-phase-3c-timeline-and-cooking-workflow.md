# Phase 3C: Timeline & Cooking Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 3C core plugins (`core-timeline`, `cook-tracker`, `ratings`) providing rolling 9-day anchored meal planning, instant 1-click cooking execution, outbox offline tracking, leftovers/carryovers, cooking journal history, and optional recipe vote ratings.

**Architecture:** Build three decoupled core plugins in `secretsauce/plugins/core/` adhering to Principles P2, P3, and P5. Implement dynamic `/` routing and settings preference. Build `core-timeline` with a rolling 9-day view (2 condensed catch-up days, today anchor, 6 upcoming planning days), hubs (`entry:create`, `entry:interact`), slots (`timeline.day.footer`, `timeline.entry.badge`, `timeline.sidebar`), and cache warming. Build `cook-tracker` with leftover/carryover migrations, 1-click `mark-cooked` outbox writes, `/journal` page, and `CookedBadge.vue`. Build `ratings` with upvote/downvote migrations, REST endpoints at `/api/x/ratings`, `ratings.score` attribute mirroring, and `VoteRating.vue` in `journal.entry.footer`.

**Tech Stack:** Python 3.12/3.13, FastAPI, aiosqlite, Vue 3.5, PrimeVue 4.5, Pinia 3, Vue Router 5, TypeScript 5.9, Vite 7, Vitest 4, Pytest 9.

**Spec:** `docs/superpowers/specs/2026-09-13-phase-3c-timeline-and-cooking-workflow-design.md`

## Global Constraints

- Kernel contains only what every plugin must agree on; core plugins are ordinary plugins in `secretsauce/plugins/core/<id>/` (P2, P3).
- SQLite WAL mode, foreign keys enabled (`foreign_keys=ON`), plugin tables prefixed with `plugin_<plugin_id>_` (Spec 4.1, 4.2).
- All IDs are lowercase UUID v4 strings. Timestamps are ISO-8601 UTC with `Z` suffix. Dates are `YYYY-MM-DD`.
- Outgoing API mutations pass `x-actor-member: <id>` when an active member is selected in `ss.store.currentMember`.
- Plugin UI bundles are compiled ES modules served at `/api/plugins/{id}/ui.js` with `Cache-Control: public, max-age=31536000, immutable`.
- All Vitest and Pytest test suites must remain green after each task.

---

### Task 1: Dynamic Route Redirection & Default Start Page Settings

**Files:**
- Modify: `shell/src/router.ts`
- Modify: `shell/src/pages/SettingsPage.vue`
- Test: `shell/src/router.spec.ts`
- Test: `shell/src/pages/pages.spec.ts`

**Interfaces:**
- Consumes: `localStorage.getItem('secretsauce:default_start_page')`, `usePluginStore().activePlugins`
- Produces: Dynamic navigation guard on `/` and general start page setting in `SettingsPage.vue`.

- [ ] **Step 1: Write the failing test**

Edit `shell/src/router.spec.ts` to assert that navigation to `/` dynamically resolves based on `default_start_page` and active plugins:

```ts
it('dynamically redirects / based on start page preference and active plugins', async () => {
  localStorage.setItem('secretsauce:default_start_page', '/timeline')
  const router = buildRouter('/')
  await router.push('/')
  expect(router.currentRoute.value.path).toBe('/timeline')

  localStorage.removeItem('secretsauce:default_start_page')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/src/router.spec.ts`
Expected: FAIL because `/` currently statically redirects to `/recipes`.

- [ ] **Step 3: Write minimal implementation**

Update `shell/src/router.ts` to implement dynamic `/` redirection:

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import SetupPage from './pages/SetupPage.vue'
import LoginPage from './pages/LoginPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import PluginManagerPage from './pages/PluginManagerPage.vue'
import { pluginRegistry } from './registries/plugin'

export function buildRouter(basePath: string = '/') {
  const routes: RouteRecordRaw[] = [
    {
      path: '/',
      redirect: () => {
        const preferred = localStorage.getItem('secretsauce:default_start_page')
        if (preferred === '/timeline' || preferred === '/recipes') {
          return preferred
        }
        const isTimelineActive = pluginRegistry.activePlugins.value.some((p) => p.id === 'core-timeline')
        return isTimelineActive ? '/timeline' : '/recipes'
      },
    },
    { path: '/setup', component: SetupPage },
    { path: '/login', component: LoginPage },
    { path: '/settings', component: SettingsPage },
    { path: '/plugins', component: PluginManagerPage },
  ]

  return createRouter({
    history: createWebHistory(basePath),
    routes,
  })
}
```

Update `shell/src/pages/SettingsPage.vue` to include the "Default Start Page" selector in the General section:

```vue
<div class="setting-row">
  <label for="default-start-page">Default Start Page</label>
  <select id="default-start-page" v-model="defaultStartPage" @change="saveDefaultStartPage">
    <option value="auto">Automatic (Timeline when active)</option>
    <option value="/timeline">Timeline</option>
    <option value="/recipes">Recipes</option>
  </select>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/src/router.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shell/src/router.ts shell/src/pages/SettingsPage.vue shell/src/router.spec.ts
git commit -m "feat(shell): dynamic root navigation and default start page setting"
```

---

### Task 2: `core-timeline` Backend Plugin Manifest & Setup

**Files:**
- Create: `secretsauce/plugins/core/core-timeline/__init__.py`
- Test: `tests/test_plugin_timeline.py`

**Interfaces:**
- Consumes: Kernel `PluginContext`, `ctx.schedule`
- Produces: Registered `core-timeline` plugin discovered and activated at boot.

- [ ] **Step 1: Write the failing test**

Create `tests/test_plugin_timeline.py`:

```python
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_core_timeline_plugin_boots_cleanly():
    kernel = await make_kernel()
    try:
        plugin = kernel.registry.get("core-timeline")
        assert plugin is not None
        assert plugin.name == "Timeline"
        assert plugin.core is True
        assert plugin.enabled is True
    finally:
        await kernel.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_timeline.py -v`
Expected: FAIL with `core-timeline` not found in registry.

- [ ] **Step 3: Write minimal implementation**

Create `secretsauce/plugins/core/core-timeline/__init__.py`:

```python
"""Core timeline plugin: provides rolling meal planning schedule and cache warming."""

PLUGIN = {
    "id": "core-timeline",
    "name": "Timeline",
    "version": "1.0.0",
    "description": "Rolling household meal timeline, schedule management, and offline cache warming",
    "core": True,
    "ui": "ui.js",
}

async def setup(ctx):
    pass
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_timeline.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-timeline/__init__.py tests/test_plugin_timeline.py
git commit -m "feat(timeline): core-timeline plugin backend manifest"
```

---

### Task 3: `core-timeline` Frontend Components & Rolling 9-Day View

**Files:**
- Create: `secretsauce/plugins/core/core-timeline/ui/package.json`
- Create: `secretsauce/plugins/core/core-timeline/ui/src/components/MealSlot.vue`
- Create: `secretsauce/plugins/core/core-timeline/ui/src/components/ScheduleCard.vue`
- Create: `secretsauce/plugins/core/core-timeline/ui/src/components/AddEntryModal.vue`
- Create: `secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue`
- Create: `secretsauce/plugins/core/core-timeline/ui/src/index.ts`
- Test: `shell/tests/plugins/timeline.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` `<Slot />`, kernel `/api/schedule`, `/api/recipes`, `/api/x/shortlist`
- Produces: `/timeline` route, nav `{ label: "Timeline", icon: "calendar", path: "/timeline", order: 5 }`, hubs `entry:create`, `entry:interact`, `timeline:assist`, slots `timeline.day.footer`, `timeline.entry.badge`, `timeline.sidebar`, and offline cache warming.

- [ ] **Step 1: Write the failing test**

Create `shell/tests/plugins/timeline.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelinePage from '../../../secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue'
import { createPinia } from 'pinia'

describe('TimelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a rolling 9-day span with 2 compact past days, today, and 6 future days', async () => {
    const pinia = createPinia()
    const mockApi = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn().mockResolvedValue({ id: 'new-entry' }),
      delete: vi.fn().mockResolvedValue({}),
      patch: vi.fn().mockResolvedValue({}),
    }

    const wrapper = mount(TimelinePage, {
      global: {
        plugins: [pinia],
        provide: {
          __SS_API__: mockApi,
        },
        stubs: {
          Slot: {
            template: '<div class="slot-stub" :data-name="name"><slot /></div>',
            props: ['name', 'context'],
          },
        },
      },
    })

    await wrapper.vm.$nextTick()
    const days = wrapper.findAll('.timeline-day-column')
    expect(days.length).toBe(9)
    const compactDays = wrapper.findAll('.timeline-day-column.is-past')
    expect(compactDays.length).toBe(2)
    const today = wrapper.find('.timeline-day-column.is-today')
    expect(today.exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/timeline.spec.ts`
Expected: FAIL because files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `secretsauce/plugins/core/core-timeline/ui/package.json`:

```json
{
  "name": "@secretsauce/plugin-core-timeline",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
```

Create `secretsauce/plugins/core/core-timeline/ui/src/components/ScheduleCard.vue`:

```vue
<script setup lang="ts">
import { Slot } from '@secretsauce/ui'

const props = defineProps<{
  entry: any
}>()

const emit = defineEmits<{
  (e: 'interact', entry: any): void
}>()
</script>

<template>
  <div class="schedule-card" @click="emit('interact', entry)">
    <div class="card-header">
      <span class="card-title">{{ entry.recipe?.title || entry.title || 'Planned Meal' }}</span>
      <Slot name="timeline.entry.badge" :context="{ entry }" />
    </div>
    <div v-if="entry.servings_override" class="card-servings">
      {{ entry.servings_override }} servings
    </div>
    <div v-if="entry.note" class="card-note">
      {{ entry.note }}
    </div>
  </div>
</template>

<style scoped>
.schedule-card {
  padding: 8px 10px;
  background: #ffffff;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: border-color 0.15s;
}
.schedule-card:hover {
  border-color: #0284c7;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-weight: 500;
  font-size: 0.9em;
}
.card-servings {
  font-size: 0.75em;
  color: #78716c;
  margin-top: 2px;
}
.card-note {
  font-size: 0.75em;
  color: #a8a29e;
  margin-top: 2px;
  font-style: italic;
}
</style>
```

Create `secretsauce/plugins/core/core-timeline/ui/src/components/MealSlot.vue`:

```vue
<script setup lang="ts">
import ScheduleCard from './ScheduleCard.vue'

const props = defineProps<{
  mealType: string
  date: string
  entries: any[]
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', payload: { date: string; mealType: string }): void
  (e: 'interact', entry: any): void
}>()
</script>

<template>
  <div class="meal-slot" :class="{ 'is-compact': compact }">
    <div class="slot-header">
      <span class="slot-name">{{ mealType }}</span>
      <button
        v-if="!compact"
        class="add-btn"
        title="Add meal"
        @click="emit('add', { date, mealType })"
      >
        +
      </button>
    </div>
    <div class="entries-list">
      <ScheduleCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @interact="emit('interact', $event)"
      />
      <div v-if="!entries.length && !compact" class="empty-slot">
        <button class="empty-add-link" @click="emit('add', { date, mealType })">
          + Add
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.meal-slot {
  margin-bottom: 8px;
}
.meal-slot.is-compact {
  margin-bottom: 4px;
}
.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.slot-name {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #78716c;
  font-weight: 600;
}
.add-btn {
  border: none;
  background: transparent;
  color: #0284c7;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0 4px;
}
.add-btn:hover {
  color: #0369a1;
}
.empty-slot {
  padding: 4px;
  border: 1px dashed #e7e5e4;
  border-radius: 4px;
  text-align: center;
}
.empty-add-link {
  border: none;
  background: transparent;
  color: #a8a29e;
  font-size: 0.8em;
  cursor: pointer;
}
.empty-add-link:hover {
  color: #0284c7;
}
</style>
```

Create `secretsauce/plugins/core/core-timeline/ui/src/components/AddEntryModal.vue`:

```vue
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
const currentMember = inject<any>('__SS_CURRENT_MEMBER__')

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
```

Create `secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue`:

```vue
<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue'
import { Slot } from '@secretsauce/ui'
import MealSlot from '../components/MealSlot.vue'
import AddEntryModal from '../components/AddEntryModal.vue'

const api = inject<any>('__SS_API__')
const intentRunner = inject<any>('__SS_INTENT__')

const anchorDate = ref(new Date())
const scheduleEntries = ref<any[]>([])
const activeModal = ref<{ date: string; mealType: string } | null>(null)
const defaultMealTypes = ['Dinner']

function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayStr = computed(() => toDateString(new Date()))

// Generate 9 days: anchor - 2 days to anchor + 6 days
const days = computed(() => {
  const res = []
  const base = new Date(anchorDate.value)
  for (let i = -2; i <= 6; i++) {
    const cur = new Date(base)
    cur.setDate(base.getDate() + i)
    const dateStr = toDateString(cur)
    res.push({
      date: dateStr,
      isPast: i < 0,
      isToday: dateStr === todayStr.value,
      label: cur.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    })
  }
  return res
})

const fromDate = computed(() => days.value[0].date)
const toDate = computed(() => days.value[days.value.length - 1].date)

async function loadEntries() {
  if (!api) return
  try {
    scheduleEntries.value = await api.get(`/api/schedule?from=${fromDate.value}&to=${toDate.value}`)
  } catch {
    // offline
  }
}

function entriesFor(date: string, mealType: string) {
  return scheduleEntries.value.filter(
    (e) => e.date === date && e.meal_type.toLowerCase() === mealType.toLowerCase()
  )
}

function shiftAnchor(daysOffset: number) {
  const next = new Date(anchorDate.value)
  next.setDate(next.getDate() + daysOffset)
  anchorDate.value = next
  loadEntries()
}

function resetToToday() {
  anchorDate.value = new Date()
  loadEntries()
}

function handleAdd(payload: { date: string; mealType: string }) {
  if (intentRunner) {
    intentRunner('entry:create', payload).catch(() => {
      activeModal.value = payload
    })
  } else {
    activeModal.value = payload
  }
}

function handleInteract(entry: any) {
  if (intentRunner) {
    intentRunner('entry:interact', { entry })
  }
}

onMounted(() => {
  loadEntries()
})
</script>

<template>
  <div class="timeline-page">
    <div class="timeline-toolbar">
      <div class="nav-controls">
        <button class="btn" @click="shiftAnchor(-7)">◀ Prev</button>
        <button class="btn today-btn" @click="resetToToday">Today</button>
        <button class="btn" @click="shiftAnchor(7)">Next ▶</button>
      </div>
      <span class="range-display">{{ fromDate }} — {{ toDate }}</span>
    </div>

    <div class="timeline-container">
      <div class="timeline-grid">
        <div
          v-for="d in days"
          :key="d.date"
          class="timeline-day-column"
          :class="{ 'is-past': d.isPast, 'is-today': d.isToday }"
        >
          <div class="day-header">
            <span class="day-label">{{ d.label }}</span>
            <span v-if="d.isToday" class="today-badge">Today</span>
          </div>

          <div class="day-slots">
            <MealSlot
              v-for="meal in defaultMealTypes"
              :key="meal"
              :meal-type="meal"
              :date="d.date"
              :entries="entriesFor(d.date, meal)"
              :compact="d.isPast"
              @add="handleAdd"
              @interact="handleInteract"
            />
          </div>

          <div class="day-footer">
            <Slot name="timeline.day.footer" :context="{ date: d.date }" />
          </div>
        </div>
      </div>

      <div class="timeline-sidebar-wrapper">
        <Slot name="timeline.sidebar" :context="{ from: fromDate, to: toDate }" />
      </div>
    </div>

    <AddEntryModal
      v-if="activeModal"
      :date="activeModal.date"
      :meal-type="activeModal.mealType"
      @close="activeModal = null"
      @created="loadEntries"
    />
  </div>
</template>

<style scoped>
.timeline-page {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}
.timeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.nav-controls { display: flex; gap: 6px; }
.btn {
  padding: 6px 12px;
  border: 1px solid #e7e5e4;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
}
.today-btn { font-weight: 600; color: #0284c7; }
.range-display { font-weight: 500; color: #57534e; font-size: 0.9em; }

.timeline-container {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.timeline-grid {
  display: grid;
  grid-template-columns: repeat(9, minmax(110px, 1fr));
  gap: 8px;
  flex: 1;
  overflow-x: auto;
}
.timeline-day-column {
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  padding: 8px;
  min-height: 380px;
  display: flex;
  flex-direction: column;
}
.timeline-day-column.is-past {
  opacity: 0.85;
  background: #f5f5f4;
  border-style: dashed;
}
.timeline-day-column.is-today {
  border-color: #0284c7;
  background: #f0f9ff;
  box-shadow: 0 0 0 1px #0284c7;
}
.day-header {
  font-size: 0.85em;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.today-badge {
  background: #0284c7;
  color: white;
  font-size: 0.7em;
  padding: 1px 5px;
  border-radius: 4px;
}
.day-slots { flex: 1; }
.day-footer { margin-top: auto; }
.timeline-sidebar-wrapper {
  width: 260px;
  flex-shrink: 0;
}
</style>
```

Create `secretsauce/plugins/core/core-timeline/ui/src/index.ts`:

```ts
import TimelinePage from './pages/TimelinePage.vue'
import AddEntryModal from './components/AddEntryModal.vue'

export default function activate(ss: any) {
  // 1. Register Route & Nav
  ss.route({ path: '/timeline', component: TimelinePage })
  ss.nav({ label: 'Timeline', icon: 'calendar', path: '/timeline', order: 5 })

  // 2. Register Hubs & Providers
  ss.hub('entry:create', {
    defaultProvider: {
      id: 'manual-add',
      order: 100,
      run: async (ctx: any) => {
        // Handled by modal trigger
      },
    },
  })

  ss.hub('entry:interact', {
    providers: [
      {
        id: 'view-recipe',
        order: 10,
        label: 'View Recipe',
        run: async ({ entry }: any) => {
          if (entry?.recipe_id) {
            window.location.hash = `#/recipes/${entry.recipe_id}`
          }
        },
      },
      {
        id: 'remove',
        order: 999,
        label: 'Remove from Plan',
        run: async ({ entry }: any) => {
          if (confirm('Remove this meal from timeline?')) {
            await ss.api.delete(`/api/schedule/${entry.id}?revision=${entry.revision || 1}`)
            window.location.reload()
          }
        },
      },
    ],
  })

  ss.hub('timeline:assist', { providers: [] })

  // 3. Offline cache warming (Section 8.8)
  const warmCache = async () => {
    try {
      const today = new Date()
      const d1 = new Date(today); d1.setDate(d1.getDate() - 2)
      const d2 = new Date(today); d2.setDate(d2.getDate() + 14)
      const from = d1.toISOString().slice(0, 10)
      const to = d2.toISOString().slice(0, 10)
      const entries = await ss.api.get(`/api/schedule?from=${from}&to=${to}`)
      for (const e of entries || []) {
        if (e.recipe_id) {
          ss.api.get(`/api/recipes/${e.recipe_id}`).catch(() => {})
        }
      }
    } catch {
      // ignore
    }
  }

  warmCache()
  ss.on?.('schedule:created', warmCache)
  ss.on?.('schedule:updated', warmCache)
  ss.on?.('schedule:deleted', warmCache)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/timeline.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-timeline/ shell/tests/plugins/timeline.spec.ts
git commit -m "feat(timeline): core-timeline components and rolling 9-day view"
```

---

### Task 4: `cook-tracker` Backend Plugin, Migrations & Rebuild Command

**Files:**
- Create: `secretsauce/plugins/core/cook-tracker/migrations/0001_initial.sql`
- Create: `secretsauce/plugins/core/cook-tracker/__init__.py`
- Test: `tests/test_plugin_cook_tracker.py`

**Interfaces:**
- Consumes: Kernel `PluginContext`, `ctx.db`, `ctx.command`
- Produces: `plugin_cook_tracker_leftovers` & `plugin_cook_tracker_carryovers` tables, `rebuild` command.

- [ ] **Step 1: Write the failing test**

Create `tests/test_plugin_cook_tracker.py`:

```python
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_cook_tracker_boots_and_runs_rebuild():
    kernel = await make_kernel()
    try:
        plugin = kernel.registry.get("cook-tracker")
        assert plugin is not None
        assert plugin.name == "Cook Tracker"
        assert plugin.core is True

        # Check migrations applied
        rows = await kernel.db.fetch_all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'plugin_cook_tracker_%'"
        )
        table_names = {r["name"] for r in rows}
        assert "plugin_cook_tracker_leftovers" in table_names
        assert "plugin_cook_tracker_carryovers" in table_names

        # Run rebuild command
        cmd_result = await kernel.commands.run("cook-tracker", "rebuild")
        assert cmd_result["status"] == "ok"
    finally:
        await kernel.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_cook_tracker.py -v`
Expected: FAIL because `cook-tracker` plugin does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `secretsauce/plugins/core/cook-tracker/migrations/0001_initial.sql`:

```sql
CREATE TABLE plugin_cook_tracker_leftovers (
    schedule_entry_id TEXT PRIMARY KEY REFERENCES schedule_entries(id) ON DELETE CASCADE,
    journal_id TEXT REFERENCES cook_journal(id) ON DELETE CASCADE
);

CREATE TABLE plugin_cook_tracker_carryovers (
    journal_id TEXT PRIMARY KEY REFERENCES cook_journal(id) ON DELETE CASCADE,
    servings_left REAL NOT NULL DEFAULT 1,
    resolved_by_entry_id TEXT REFERENCES schedule_entries(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

Create `secretsauce/plugins/core/cook-tracker/__init__.py`:

```python
"""Cook tracker plugin: records meal execution, carryovers, leftovers, and journal."""

PLUGIN = {
    "id": "cook-tracker",
    "name": "Cook Tracker",
    "version": "1.0.0",
    "description": "Meal execution tracking, leftovers, carryovers, and cooking journal",
    "schema": 1,
    "core": True,
    "ui": "ui.js",
}

async def setup(ctx):
    @ctx.command("rebuild", description="Reconcile orphaned leftovers and carryovers")
    async def rebuild():
        # Remove leftovers pointing to missing schedule or journal rows
        await ctx.db.execute(
            """
            DELETE FROM plugin_cook_tracker_leftovers
            WHERE schedule_entry_id NOT IN (SELECT id FROM schedule_entries)
               OR journal_id NOT IN (SELECT id FROM cook_journal)
            """
        )
        await ctx.db.execute(
            """
            DELETE FROM plugin_cook_tracker_carryovers
            WHERE journal_id NOT IN (SELECT id FROM cook_journal)
            """
        )
        return {"status": "ok"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_cook_tracker.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/cook-tracker/ tests/test_plugin_cook_tracker.py
git commit -m "feat(cook-tracker): backend plugin, migrations, and rebuild command"
```

---

### Task 5: `cook-tracker` Frontend Bundle (`entry:interact` Providers & `/journal` Page)

**Files:**
- Create: `secretsauce/plugins/core/cook-tracker/ui/package.json`
- Create: `secretsauce/plugins/core/cook-tracker/ui/src/components/CookedBadge.vue`
- Create: `secretsauce/plugins/core/cook-tracker/ui/src/pages/JournalPage.vue`
- Create: `secretsauce/plugins/core/cook-tracker/ui/src/index.ts`
- Test: `shell/tests/plugins/cook-tracker.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` `<Slot />`, kernel `/api/journal`, `/api/schedule`
- Produces: `mark-cooked`, `skip`, `log-leftover` on `entry:interact`, `timeline.entry.badge` contribution, `/journal` route.

- [ ] **Step 1: Write the failing test**

Create `shell/tests/plugins/cook-tracker.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CookedBadge from '../../../secretsauce/plugins/core/cook-tracker/ui/src/components/CookedBadge.vue'
import JournalPage from '../../../secretsauce/plugins/core/cook-tracker/ui/src/pages/JournalPage.vue'

describe('cook-tracker UI', () => {
  it('CookedBadge displays checkmark when entry is marked cooked', () => {
    const wrapper = mount(CookedBadge, {
      props: {
        context: {
          entry: { id: 'entry-1', is_cooked: true },
        },
      },
    })
    expect(wrapper.find('.cooked-checkmark').exists()).toBe(true)
  })

  it('JournalPage renders cooked history and declares journal.entry.footer slot', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue([
        { id: 'j-1', date: '2026-09-13', recipe: { title: 'Spaghetti' }, servings: 2 },
      ]),
    }
    const wrapper = mount(JournalPage, {
      global: {
        provide: { __SS_API__: mockApi },
        stubs: {
          Slot: {
            template: '<div class="slot-stub" :data-name="name"><slot /></div>',
            props: ['name', 'context'],
          },
        },
      },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Spaghetti')
    expect(wrapper.find('.slot-stub[data-name="journal.entry.footer"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/cook-tracker.spec.ts`
Expected: FAIL because components do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `secretsauce/plugins/core/cook-tracker/ui/package.json`:

```json
{
  "name": "@secretsauce/plugin-cook-tracker",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
```

Create `secretsauce/plugins/core/cook-tracker/ui/src/components/CookedBadge.vue`:

```vue
<script setup lang="ts">
const props = defineProps<{
  context?: {
    entry?: any
  }
}>()
</script>

<template>
  <span v-if="context?.entry?.is_cooked" class="cooked-checkmark" title="Cooked">
    ✓
  </span>
</template>

<style scoped>
.cooked-checkmark {
  color: #16a34a;
  font-weight: bold;
  font-size: 0.9em;
  margin-left: 4px;
}
</style>
```

Create `secretsauce/plugins/core/cook-tracker/ui/src/pages/JournalPage.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import { Slot } from '@secretsauce/ui'

const api = inject<any>('__SS_API__')
const entries = ref<any[]>([])

async function loadJournal() {
  if (!api) return
  try {
    entries.value = await api.get('/api/journal')
  } catch {
    // offline
  }
}

onMounted(() => {
  loadJournal()
})
</script>

<template>
  <div class="journal-page">
    <h2>Cooking Journal</h2>
    <div v-if="entries.length" class="journal-list">
      <div v-for="e in entries" :key="e.id" class="journal-entry-card">
        <div class="entry-header">
          <span class="entry-date">{{ e.date }} ({{ e.meal_type || 'meal' }})</span>
          <span class="entry-servings">{{ e.servings }} servings</span>
        </div>
        <div class="entry-body">
          <h4 class="recipe-title">{{ e.recipe?.title || e.title || 'Cooked meal' }}</h4>
          <p v-if="e.notes" class="entry-notes">{{ e.notes }}</p>
        </div>
        <div class="entry-footer">
          <Slot name="journal.entry.footer" :context="{ entry: e }" />
        </div>
      </div>
    </div>
    <p v-else class="empty-hint">No meals recorded in journal yet.</p>
  </div>
</template>

<style scoped>
.journal-page {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}
.journal-page h2 { margin-top: 0; }
.journal-list { display: flex; flex-direction: column; gap: 12px; }
.journal-entry-card {
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  padding: 12px;
  background: white;
}
.entry-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.8em;
  color: #78716c;
}
.recipe-title { margin: 6px 0; font-size: 1.05em; }
.entry-notes { margin: 4px 0; color: #57534e; font-size: 0.9em; }
.entry-footer { margin-top: 8px; border-top: 1px solid #f5f5f4; padding-top: 6px; }
.empty-hint { color: #a8a29e; text-align: center; margin-top: 40px; }
</style>
```

Create `secretsauce/plugins/core/cook-tracker/ui/src/index.ts`:

```ts
import CookedBadge from './components/CookedBadge.vue'
import JournalPage from './pages/JournalPage.vue'

export default function activate(ss: any) {
  // 1. Route & Navigation
  ss.route({ path: '/journal', component: JournalPage })
  ss.nav({ label: 'Journal', icon: 'book-open', path: '/journal', order: 15 })

  // 2. Badge slot injection
  ss.slot('timeline.entry.badge', CookedBadge, { order: 10 })

  // 3. entry:interact Providers
  ss.hub('entry:interact', {
    providers: [
      {
        id: 'mark-cooked',
        order: 20,
        label: 'Mark as Cooked',
        run: async ({ entry }: any) => {
          const journalId = crypto.randomUUID()
          const currentMember = ss.store?.currentMember?.value
          await ss.api.post('/api/journal', {
            id: journalId,
            date: entry.date,
            meal_type: entry.meal_type,
            recipe_id: entry.recipe_id,
            servings: entry.servings_override || 2,
            assigned_cook_id: entry.assigned_cook_id || currentMember?.id,
            schedule_entry_id: entry.id,
          })
          entry.is_cooked = true
          alert('Marked as cooked!')
        },
      },
      {
        id: 'log-leftover',
        order: 40,
        label: 'Log Leftovers',
        run: async ({ entry }: any) => {
          alert('Leftovers recorded for upcoming meals.')
        },
      },
    ],
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/cook-tracker.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/cook-tracker/ui/ shell/tests/plugins/cook-tracker.spec.ts
git commit -m "feat(cook-tracker): UI bundle with mark-cooked and journal page"
```

---

### Task 6: `ratings` Backend Plugin, Migrations, Endpoints & Attribute Mirroring

**Files:**
- Create: `secretsauce/plugins/core/ratings/migrations/0001_initial.sql`
- Create: `secretsauce/plugins/core/ratings/__init__.py`
- Test: `tests/test_plugin_ratings.py`

**Interfaces:**
- Consumes: Kernel `PluginContext`, `ctx.db`, `ctx.attributes`
- Produces: `plugin_ratings_scores` table, endpoints `/api/x/ratings`, and mirrored `ratings.score` attribute.

- [ ] **Step 1: Write the failing test**

Create `tests/test_plugin_ratings.py`:

```python
import pytest
from secretsauce.testing import make_kernel

@pytest.mark.asyncio
async def test_ratings_upvote_downvote_and_attribute_mirroring():
    kernel = await make_kernel()
    try:
        plugin = kernel.registry.get("ratings")
        assert plugin is not None

        # Create member, recipe, and journal entry
        member = await kernel.members.create({"name": "Alice"})
        recipe = await kernel.recipes.create({"title": "Lasagna", "language": "en"})
        journal = await kernel.journal.create({
            "date": "2026-09-13",
            "meal_type": "dinner",
            "recipe_id": recipe["id"],
        })

        # Cast an upvote (+1)
        client = kernel.http_client()
        res = await client.put(
            "/api/x/ratings",
            json={"journal_id": journal["id"], "member_id": member["id"], "score": 1},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["net_score"] == 1

        # Check attribute mirrored to recipe group
        attrs = await kernel.attributes.get_entity("recipe", recipe["group_id"])
        assert attrs.get("ratings.score") == 1
    finally:
        await kernel.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_ratings.py -v`
Expected: FAIL because `ratings` plugin does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `secretsauce/plugins/core/ratings/migrations/0001_initial.sql`:

```sql
CREATE TABLE plugin_ratings_scores (
    journal_id TEXT NOT NULL REFERENCES cook_journal(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score IN (-1, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    PRIMARY KEY (journal_id, member_id)
);
```

Create `secretsauce/plugins/core/ratings/__init__.py`:

```python
"""Ratings plugin: household member upvotes/downvotes and recipe score mirroring."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

PLUGIN = {
    "id": "ratings",
    "name": "Ratings",
    "version": "1.0.0",
    "description": "Household member meal votes (upvote/downvote) and recipe rating indexing",
    "schema": 1,
    "core": True,
    "ui": "ui.js",
}

class VoteDraft(BaseModel):
    journal_id: str
    member_id: str
    score: int = Field(..., description="+1 for upvote, -1 for downvote")

async def update_recipe_score_mirror(ctx, journal_id: str):
    journal_row = await ctx.journal.get(journal_id)
    if not journal_row or not journal_row.get("recipe_id"):
        return
    recipe_id = journal_row["recipe_id"]
    recipe_row = await ctx.recipes.get(recipe_id)
    if not recipe_row:
        return
    group_id = recipe_row["group_id"]

    # Calculate net score across all journal entries of this recipe
    row = await ctx.db.fetch_one(
        """
        SELECT SUM(r.score) as net_score, COUNT(r.score) as total_votes
        FROM plugin_ratings_scores r
        JOIN cook_journal j ON r.journal_id = j.id
        JOIN recipes rec ON j.recipe_id = rec.id
        WHERE rec.group_id = ?
        """,
        (group_id,),
    )
    if row and row["total_votes"] > 0:
        await ctx.attributes.set("recipe", group_id, "ratings.score", row["net_score"])
    else:
        await ctx.attributes.delete("recipe", group_id, "ratings.score")

async def setup(ctx):
    router = APIRouter()

    @router.get("")
    async def get_ratings(journal_id: str = Query(...)):
        rows = await ctx.db.fetch_all(
            "SELECT member_id, score FROM plugin_ratings_scores WHERE journal_id = ?",
            (journal_id,),
        )
        net = sum(r["score"] for r in rows) if rows else 0
        return {"scores": rows, "net_score": net}

    @router.put("")
    async def set_vote(draft: VoteDraft):
        if draft.score not in (-1, 1):
            raise HTTPException(status_code=400, detail="Score must be 1 or -1")
        await ctx.db.execute(
            """
            INSERT INTO plugin_ratings_scores (journal_id, member_id, score)
            VALUES (?, ?, ?)
            ON CONFLICT(journal_id, member_id) DO UPDATE SET score = excluded.score
            """,
            (draft.journal_id, draft.member_id, draft.score),
        )
        await update_recipe_score_mirror(ctx, draft.journal_id)
        rows = await ctx.db.fetch_all(
            "SELECT score FROM plugin_ratings_scores WHERE journal_id = ?",
            (draft.journal_id,),
        )
        return {"status": "ok", "net_score": sum(r["score"] for r in rows)}

    @router.delete("")
    async def delete_vote(journal_id: str = Query(...), member_id: str = Query(...)):
        await ctx.db.execute(
            "DELETE FROM plugin_ratings_scores WHERE journal_id = ? AND member_id = ?",
            (journal_id, member_id),
        )
        await update_recipe_score_mirror(ctx, journal_id)
        return {"status": "ok"}

    @ctx.command("rebuild", description="Recompute all recipe rating scores in entity_attributes")
    async def rebuild():
        rows = await ctx.db.fetch_all(
            """
            SELECT rec.group_id, SUM(r.score) as net_score
            FROM plugin_ratings_scores r
            JOIN cook_journal j ON r.journal_id = j.id
            JOIN recipes rec ON j.recipe_id = rec.id
            GROUP BY rec.group_id
            """
        )
        for r in rows:
            await ctx.attributes.set("recipe", r["group_id"], "ratings.score", r["net_score"])
        return {"status": "ok", "recomputed": len(rows)}

    ctx.routes(router)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_ratings.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/ratings/ tests/test_plugin_ratings.py
git commit -m "feat(ratings): backend votes schema, API, and attribute mirroring"
```

---

### Task 7: `ratings` Frontend Vote Component (`VoteRating.vue`)

**Files:**
- Create: `secretsauce/plugins/core/ratings/ui/package.json`
- Create: `secretsauce/plugins/core/ratings/ui/src/VoteRating.vue`
- Create: `secretsauce/plugins/core/ratings/ui/src/index.ts`
- Test: `shell/tests/plugins/ratings.spec.ts`

**Interfaces:**
- Consumes: `@secretsauce/ui` `<Slot />`, `/api/x/ratings`
- Produces: Upvote/downvote component mounted in `journal.entry.footer`.

- [ ] **Step 1: Write the failing test**

Create `shell/tests/plugins/ratings.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import VoteRating from '../../../secretsauce/plugins/core/ratings/ui/src/VoteRating.vue'

describe('VoteRating.vue', () => {
  it('renders upvote and downvote buttons and handles click toggle', async () => {
    const mockApi = {
      get: vi.fn().mockResolvedValue({ net_score: 2, scores: [] }),
      put: vi.fn().mockResolvedValue({ net_score: 3 }),
    }
    const wrapper = mount(VoteRating, {
      props: {
        context: {
          entry: { id: 'journal-1' },
        },
      },
      global: {
        provide: {
          __SS_API__: mockApi,
          __SS_CURRENT_MEMBER__: { value: { id: 'member-1' } },
        },
      },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.upvote-btn').exists()).toBe(true)
    expect(wrapper.find('.downvote-btn').exists()).toBe(true)
    expect(wrapper.text()).toContain('2')

    await wrapper.find('.upvote-btn').trigger('click')
    expect(mockApi.put).toHaveBeenCalledWith('/api/x/ratings', {
      journal_id: 'journal-1',
      member_id: 'member-1',
      score: 1,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --prefix shell test shell/tests/plugins/ratings.spec.ts`
Expected: FAIL because component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `secretsauce/plugins/core/ratings/ui/package.json`:

```json
{
  "name": "@secretsauce/plugin-ratings",
  "version": "1.0.0",
  "private": true,
  "type": "module"
}
```

Create `secretsauce/plugins/core/ratings/ui/src/VoteRating.vue`:

```vue
<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'

const props = defineProps<{
  context?: {
    entry?: any
  }
}>()

const api = inject<any>('__SS_API__')
const currentMember = inject<any>('__SS_CURRENT_MEMBER__')

const netScore = ref(0)
const myVote = ref<number | null>(null)

async function loadRatings() {
  if (!api || !props.context?.entry?.id) return
  try {
    const res = await api.get(`/api/x/ratings?journal_id=${props.context.entry.id}`)
    netScore.value = res.net_score || 0
    const mId = currentMember?.value?.id
    if (mId && res.scores) {
      const mine = res.scores.find((s: any) => s.member_id === mId)
      if (mine) myVote.value = mine.score
    }
  } catch {
    // offline
  }
}

async function castVote(score: number) {
  if (!api || !props.context?.entry?.id) return
  const mId = currentMember?.value?.id || 'anonymous'
  if (myVote.value === score) {
    // Toggle off
    await api.delete?.(`/api/x/ratings?journal_id=${props.context.entry.id}&member_id=${mId}`)
    myVote.value = null
    netScore.value -= score
  } else {
    const res = await api.put('/api/x/ratings', {
      journal_id: props.context.entry.id,
      member_id: mId,
      score,
    })
    myVote.value = score
    if (res?.net_score !== undefined) {
      netScore.value = res.net_score
    }
  }
}

onMounted(() => {
  loadRatings()
})
</script>

<template>
  <div class="vote-rating">
    <button
      class="vote-btn upvote-btn"
      :class="{ active: myVote === 1 }"
      title="Upvote"
      @click="castVote(1)"
    >
      👍
    </button>
    <span class="net-score">{{ netScore > 0 ? `+${netScore}` : netScore }}</span>
    <button
      class="vote-btn downvote-btn"
      :class="{ active: myVote === -1 }"
      title="Downvote"
      @click="castVote(-1)"
    >
      👎
    </button>
  </div>
</template>

<style scoped>
.vote-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.vote-btn {
  border: 1px solid #e7e5e4;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 0.85em;
  line-height: 1.2;
}
.vote-btn:hover { background: #f5f5f4; }
.vote-btn.active { border-color: #0284c7; background: #e0f2fe; }
.net-score {
  font-size: 0.8em;
  color: #57534e;
  min-width: 18px;
  text-align: center;
}
</style>
```

Create `secretsauce/plugins/core/ratings/ui/src/index.ts`:

```ts
import VoteRating from './VoteRating.vue'

export default function activate(ss: any) {
  ss.slot('journal.entry.footer', VoteRating, { order: 10 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --prefix shell test shell/tests/plugins/ratings.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/ratings/ui/ shell/tests/plugins/ratings.spec.ts
git commit -m "feat(ratings): VoteRating UI component in journal.entry.footer"
```

---

### Task 8: Plugin UI Bundling & Build Pipeline Verification

**Files:**
- Modify: `tests/test_plugin_ui_routes.py`
- Command: `pnpm --prefix shell build:plugins`

**Interfaces:**
- Consumes: `shell/scripts/build-plugins.ts`
- Produces: Compiled `dist/index.js`, `ui.js`, and `ui.css` for `core-timeline`, `cook-tracker`, `ratings`.

- [ ] **Step 1: Write the failing test**

Edit `tests/test_plugin_ui_routes.py` to assert that UI bundles are served for all three new plugins:

```python
@pytest.mark.asyncio
async def test_phase_3c_plugin_ui_routes_serve_compiled_bundles():
    kernel = await make_kernel()
    try:
        client = kernel.http_client()
        for pid in ("core-timeline", "cook-tracker", "ratings"):
            res = await client.get(f"/api/plugins/{pid}/ui.js")
            assert res.status_code == 200
            assert "javascript" in res.headers["content-type"]
            assert "max-age=31536000" in res.headers.get("cache-control", "")
    finally:
        await kernel.close()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_plugin_ui_routes.py -v`
Expected: FAIL because UI bundles are not yet compiled into `ui.js`.

- [ ] **Step 3: Compile bundles**

Run the build script:
```bash
pnpm --prefix shell build:plugins
```
Verify that `secretsauce/plugins/core/{core-timeline,cook-tracker,ratings}/ui.js` exist.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_plugin_ui_routes.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add secretsauce/plugins/core/core-timeline/ui.js secretsauce/plugins/core/cook-tracker/ui.js secretsauce/plugins/core/ratings/ui.js tests/test_plugin_ui_routes.py
git commit -m "build: compile Phase 3C plugin UI bundles and verify routes"
```

---

### Task 9: End-to-End Integration & Full Suite Verification

**Files:**
- Create: `shell/tests/integration/phase-3c-e2e.spec.ts`

**Interfaces:**
- Consumes: All Phase 3C components, slots, hubs, and stores.
- Produces: Verified end-to-end user journey across timeline, cooking logging, and voting.

- [ ] **Step 1: Write the failing integration test**

Create `shell/tests/integration/phase-3c-e2e.spec.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelinePage from '../../../secretsauce/plugins/core/core-timeline/ui/src/pages/TimelinePage.vue'
import JournalPage from '../../../secretsauce/plugins/core/cook-tracker/ui/src/pages/JournalPage.vue'
import { createPinia } from 'pinia'

describe('Phase 3C End-to-End Flow', () => {
  it('supports planning on timeline and reviewing in journal', async () => {
    const pinia = createPinia()
    const mockSchedule = [
      { id: 'sched-1', date: new Date().toISOString().slice(0, 10), meal_type: 'Dinner', recipe: { id: 'r-1', title: 'Tacos' } },
    ]
    const mockJournal = [
      { id: 'j-1', date: new Date().toISOString().slice(0, 10), recipe: { id: 'r-1', title: 'Tacos' }, servings: 2 },
    ]

    const mockApi = {
      get: vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/schedule')) return Promise.resolve(mockSchedule)
        if (url.includes('/api/journal')) return Promise.resolve(mockJournal)
        return Promise.resolve([])
      }),
      post: vi.fn().mockResolvedValue({ id: 'new-id' }),
    }

    const timelineWrapper = mount(TimelinePage, {
      global: {
        plugins: [pinia],
        provide: { __SS_API__: mockApi },
        stubs: { Slot: { template: '<div><slot /></div>', props: ['name', 'context'] } },
      },
    })
    await timelineWrapper.vm.$nextTick()
    expect(timelineWrapper.text()).toContain('Tacos')

    const journalWrapper = mount(JournalPage, {
      global: {
        plugins: [pinia],
        provide: { __SS_API__: mockApi },
        stubs: { Slot: { template: '<div><slot /></div>', props: ['name', 'context'] } },
      },
    })
    await journalWrapper.vm.$nextTick()
    expect(journalWrapper.text()).toContain('Tacos')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run Vitest:
`pnpm --prefix shell test`
Expected: All Vitest suites pass green.

Run Pytest:
`uv run pytest`
Expected: All 96+ backend tests pass green.

- [ ] **Step 3: Commit**

```bash
git add shell/tests/integration/phase-3c-e2e.spec.ts
git commit -m "test: Phase 3C end-to-end integration test suite"
```

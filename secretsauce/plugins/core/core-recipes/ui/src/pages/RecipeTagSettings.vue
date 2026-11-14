<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import {
  readTagPrefs,
  writeTagPrefs,
  type RecipeTagPrefs,
  type TagSummary,
} from '../tagPreferences'

const ss = useSecretSauce()

const prefs = ref<RecipeTagPrefs>(readTagPrefs())
const draftVisibleCount = ref(String(prefs.value.visibleCount))
const householdTags = ref<TagSummary[]>([])
const loading = ref(false)
const error = ref('')

const pinnedSet = computed(() => new Set(prefs.value.pinnedTags))
const tagCounts = computed(() => new Map(householdTags.value.map(t => [t.name, t.count])))

function persistPrefs(next: RecipeTagPrefs) {
  prefs.value = writeTagPrefs(next)
  draftVisibleCount.value = String(prefs.value.visibleCount)
}

function onShowAllChange(showAll: boolean) {
  persistPrefs({ ...prefs.value, showAll })
}

function onVisibleCountChange() {
  const raw = String(draftVisibleCount.value ?? '').trim()
  const parsed = raw === '' ? Number.NaN : Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) {
    draftVisibleCount.value = String(prefs.value.visibleCount)
    return
  }
  persistPrefs({ ...prefs.value, visibleCount: parsed })
}

function togglePin(name: string) {
  const next = pinnedSet.value.has(name)
    ? prefs.value.pinnedTags.filter(t => t !== name)
    : [...prefs.value.pinnedTags, name]
  persistPrefs({ ...prefs.value, pinnedTags: next })
}

function movePin(index: number, delta: -1 | 1) {
  const next = [...prefs.value.pinnedTags]
  const target = index + delta
  if (target < 0 || target >= next.length) return
  ;[next[index], next[target]] = [next[target], next[index]]
  persistPrefs({ ...prefs.value, pinnedTags: next })
}

async function loadTags() {
  loading.value = true
  error.value = ''
  try {
    const res = await ss.api.get<{ items?: TagSummary[] } | TagSummary[]>('/api/recipes/tags')
    householdTags.value = Array.isArray(res) ? res : (res && Array.isArray(res.items) ? res.items : [])
  } catch (err: any) {
    error.value = err?.message || 'Could not load recipe tags'
  } finally {
    loading.value = false
  }
}

const stopCreated = ss.on?.('recipe:created', loadTags)
const stopUpdated = ss.on?.('recipe:updated', loadTags)
const stopDeleted = ss.on?.('recipe:deleted', loadTags)

onBeforeUnmount(() => {
  if (typeof stopCreated === 'function') stopCreated()
  if (typeof stopUpdated === 'function') stopUpdated()
  if (typeof stopDeleted === 'function') stopDeleted()
})

onMounted(() => {
  prefs.value = readTagPrefs()
  draftVisibleCount.value = String(prefs.value.visibleCount)
  loadTags()
})
</script>

<template>
  <div class="ss-recipe-tag-settings">
    <section class="tag-settings-group">
      <h3>Display on this device</h3>
      <p class="section-help">
        These display preferences apply only to this device. Pinned tags always appear first on the Recipes overview, followed by your top unpinned tags.
      </p>
      <div class="device-toggle">
        <ToggleSwitch
          inputId="tag-show-all"
          aria-label="Show all tags"
          :modelValue="prefs.showAll"
          @update:modelValue="onShowAllChange"
        />
        <label for="tag-show-all">Show all tags</label>
      </div>
      <div class="limit-field">
        <label for="tag-visible-count">Top tags to show</label>
        <InputText
          id="tag-visible-count"
          v-model="draftVisibleCount"
          type="number"
          min="0"
          step="1"
          :disabled="prefs.showAll"
          @change="onVisibleCountChange"
        />
        <small class="field-help">Set to 0 to show only pinned tags until you click More.</small>
      </div>

      <div v-if="prefs.pinnedTags.length" class="pinned-list">
        <h4>Pinned order (this device)</h4>
        <ul class="tag-list">
          <li v-for="(tagName, idx) in prefs.pinnedTags" :key="tagName" class="tag-row" :data-pinned-tag="tagName">
            <span class="tag-row-label">
              {{ tagName }}
              <template v-if="tagCounts.has(tagName)"> ({{ tagCounts.get(tagName) }})</template>
              <small v-else class="muted"> (0 recipes — hidden on overview)</small>
            </span>
            <div class="tag-row-actions">
              <Button
                icon="pi pi-arrow-up"
                size="small"
                text
                :aria-label="`Move ${tagName} up`"
                :disabled="idx === 0"
                @click="movePin(idx, -1)"
              />
              <Button
                icon="pi pi-arrow-down"
                size="small"
                text
                :aria-label="`Move ${tagName} down`"
                :disabled="idx === prefs.pinnedTags.length - 1"
                @click="movePin(idx, 1)"
              />
              <Button
                label="Unpin"
                size="small"
                text
                :aria-label="`Unpin ${tagName}`"
                @click="togglePin(tagName)"
              />
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section class="tag-settings-group">
      <h3>Household tags</h3>
      <p class="section-help">
        Tags aggregated across all Recipes in your household. Pinning affects only this device.
      </p>
      <Message v-if="error" severity="error">{{ error }}</Message>
      <p v-else-if="!loading && !householdTags.length" class="muted">No tags in your household recipes yet.</p>
      <ul v-else class="tag-list">
        <li v-for="tag in householdTags" :key="tag.name" class="tag-row" :data-tag-name="tag.name">
          <span class="tag-row-label">{{ tag.name }} ({{ tag.count }})</span>
          <div class="tag-row-actions">
            <Button
              :label="pinnedSet.has(tag.name) ? 'Unpin' : 'Pin'"
              size="small"
              :outlined="!pinnedSet.has(tag.name)"
              :aria-label="`${pinnedSet.has(tag.name) ? 'Unpin' : 'Pin'} ${tag.name}`"
              @click="togglePin(tag.name)"
            />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.ss-recipe-tag-settings { display: grid; gap: 1rem; }
.tag-settings-group { display: grid; gap: .5rem; }
h3 { margin: 0; font-size: .95rem; }
h4 { margin: .25rem 0 0; font-size: .875rem; color: var(--p-text-muted-color); }
.section-help, .field-help, .muted { margin: 0; font-size: .85rem; color: var(--p-text-muted-color); }
.device-toggle { display: flex; align-items: center; gap: .75rem; }
.device-toggle label { cursor: pointer; }
.limit-field { display: grid; gap: .25rem; max-width: 14rem; }
.tag-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .375rem; }
.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  padding: .375rem .5rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
}
.tag-row-label { font-weight: 500; }
.tag-row-actions { display: flex; align-items: center; gap: .25rem; flex-wrap: wrap; }
</style>

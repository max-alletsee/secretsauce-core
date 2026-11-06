<script setup lang="ts">
import { computed } from 'vue'
import {
  computeIngredientDiffRows,
  diffText,
  formatFullIngredient,
  formatQtyUnit,
  type IngredientDiffRow,
} from './diff'

const props = defineProps<{
  originalRecipe: any
  customizedRecipe: any
  currentServings?: number
  interactiveCheckboxes?: boolean
  checkedIngredients?: Record<string, boolean>
}>()

const emit = defineEmits<{
  'update:checkedIngredients': [Record<string, boolean>]
}>()

const origScale = computed(() => {
  if (!props.currentServings) return 1
  return props.currentServings / (props.originalRecipe?.servings || 1)
})

const custScale = computed(() => {
  if (!props.currentServings) return 1
  return props.currentServings / (props.customizedRecipe?.servings || 1)
})

const titleSegments = computed(() =>
  diffText(props.originalRecipe?.title || '', props.customizedRecipe?.title || ''),
)

const descriptionSegments = computed(() =>
  diffText(props.originalRecipe?.description || '', props.customizedRecipe?.description || ''),
)

const ingredientRows = computed<IngredientDiffRow[]>(() =>
  computeIngredientDiffRows(
    props.originalRecipe?.ingredients || [],
    props.customizedRecipe?.ingredients || [],
  ),
)

const stepRows = computed(() => {
  const origSteps: any[] = props.originalRecipe?.steps || []
  const custSteps: any[] = props.customizedRecipe?.steps || []
  const count = Math.max(origSteps.length, custSteps.length)
  const rows: {
    kind: 'normal' | 'removed' | 'added'
    segments: ReturnType<typeof diffText>
    origTimer?: number | null
    custTimer?: number | null
  }[] = []
  for (let i = 0; i < count; i++) {
    const o = origSteps[i]
    const c = custSteps[i]
    if (o && c) {
      rows.push({
        kind: 'normal',
        segments: diffText(o.instruction || '', c.instruction || ''),
        origTimer: o.timer_minutes ?? null,
        custTimer: c.timer_minutes ?? null,
      })
    } else if (o && !c) {
      rows.push({
        kind: 'removed',
        segments: [{ type: 'removed', text: o.instruction || '' }],
        origTimer: o.timer_minutes ?? null,
        custTimer: null,
      })
    } else if (!o && c) {
      rows.push({
        kind: 'added',
        segments: [{ type: 'added', text: c.instruction || '' }],
        origTimer: null,
        custTimer: c.timer_minutes ?? null,
      })
    }
  }
  return rows
})

function toggleCheck(idx: number, val: boolean) {
  const next = { ...(props.checkedIngredients || {}), [idx]: val }
  emit('update:checkedIngredients', next)
}
</script>

<template>
  <div class="customized-recipe-preview">
    <div v-if="customizedRecipe?.adaptation_summary" class="adaptation-summary">
      <i class="pi pi-sparkles" aria-hidden="true" />
      <div>
        <strong>Customization Summary:</strong>
        <p>{{ customizedRecipe.adaptation_summary }}</p>
      </div>
    </div>

    <div class="preview-header">
      <h2 class="preview-title">
        <template v-for="(seg, idx) in titleSegments" :key="idx">
          <s v-if="seg.type === 'removed'" class="diff-removed">{{ seg.text }}</s>
          <span v-else-if="seg.type === 'added'" class="diff-added">{{ seg.text }}</span>
          <span v-else>{{ seg.text }}</span>
          <template v-if="idx < titleSegments.length - 1">{{ ' ' }}</template>
        </template>
      </h2>

      <p v-if="descriptionSegments.length" class="preview-description">
        <template v-for="(seg, idx) in descriptionSegments" :key="idx">
          <s v-if="seg.type === 'removed'" class="diff-removed">{{ seg.text }}</s>
          <span v-else-if="seg.type === 'added'" class="diff-added">{{ seg.text }}</span>
          <span v-else>{{ seg.text }}</span>
          <template v-if="idx < descriptionSegments.length - 1">{{ ' ' }}</template>
        </template>
      </p>

      <div class="meta-badges">
        <span class="meta-badge">
          <strong>Servings:</strong>
          <template v-if="originalRecipe?.servings != null && customizedRecipe?.servings != null && originalRecipe.servings !== customizedRecipe.servings">
            <s class="diff-removed">{{ originalRecipe.servings }}</s>
            <span class="diff-added">{{ customizedRecipe.servings }}</span>
          </template>
          <span v-else>{{ customizedRecipe?.servings ?? originalRecipe?.servings ?? 2 }}</span>
        </span>

        <span v-if="originalRecipe?.prep_time_minutes != null || customizedRecipe?.prep_time_minutes != null" class="meta-badge">
          <strong>Prep:</strong>
          <template v-if="originalRecipe?.prep_time_minutes !== customizedRecipe?.prep_time_minutes">
            <s v-if="originalRecipe?.prep_time_minutes != null" class="diff-removed">{{ originalRecipe.prep_time_minutes }} min</s>
            <span v-if="customizedRecipe?.prep_time_minutes != null" class="diff-added">{{ customizedRecipe.prep_time_minutes }} min</span>
          </template>
          <span v-else>{{ customizedRecipe?.prep_time_minutes }} min</span>
        </span>

        <span v-if="originalRecipe?.cook_time_minutes != null || customizedRecipe?.cook_time_minutes != null" class="meta-badge">
          <strong>Cook:</strong>
          <template v-if="originalRecipe?.cook_time_minutes !== customizedRecipe?.cook_time_minutes">
            <s v-if="originalRecipe?.cook_time_minutes != null" class="diff-removed">{{ originalRecipe.cook_time_minutes }} min</s>
            <span v-if="customizedRecipe?.cook_time_minutes != null" class="diff-added">{{ customizedRecipe.cook_time_minutes }} min</span>
          </template>
          <span v-else>{{ customizedRecipe?.cook_time_minutes }} min</span>
        </span>
      </div>
    </div>

    <div class="content-grid">
      <section class="ingredients-section">
        <h3>Ingredients</h3>
        <ul class="ingredient-checklist">
          <li
            v-for="(row, idx) in ingredientRows"
            :key="idx"
            class="ingredient-item"
            :class="`ingredient-row-${row.kind}`"
          >
            <Checkbox
              v-if="interactiveCheckboxes"
              :inputId="`cust-ingredient-${idx}`"
              :modelValue="Boolean(checkedIngredients?.[idx])"
              :disabled="row.kind === 'removed'"
              binary
              @update:modelValue="toggleCheck(idx, $event)"
            />
            <label
              :for="interactiveCheckboxes ? `cust-ingredient-${idx}` : undefined"
              :class="{ struck: interactiveCheckboxes && checkedIngredients?.[idx] }"
            >
              <template v-if="row.kind === 'unchanged'">
                <strong>{{ formatQtyUnit(row.customized, custScale) }}</strong>
                {{ row.customized?.name }}
                <span v-if="row.customized?.notes" class="notes"> ({{ row.customized.notes }})</span>
              </template>

              <template v-else-if="row.kind === 'modified'">
                <template v-if="row.qtyUnitChanged">
                  <s v-if="formatQtyUnit(row.original, origScale)" class="diff-removed">{{ formatQtyUnit(row.original, origScale) }}</s>
                  <span v-if="formatQtyUnit(row.customized, custScale)" class="diff-added">{{ formatQtyUnit(row.customized, custScale) }}</span>
                </template>
                <strong v-else>{{ formatQtyUnit(row.customized, custScale) }}</strong>
                {{ ' ' }}{{ row.customized?.name }}
                <template v-if="row.notesChanged">
                  <s v-if="row.original?.notes" class="diff-removed"> ({{ row.original.notes }})</s>
                  <span v-if="row.customized?.notes" class="diff-added"> ({{ row.customized.notes }})</span>
                </template>
                <span v-else-if="row.customized?.notes" class="notes"> ({{ row.customized.notes }})</span>
              </template>

              <template v-else-if="row.kind === 'substituted'">
                <s class="diff-removed">{{ formatFullIngredient(row.original, origScale) }}</s>
                {{ ' ' }}
                <span class="diff-added">{{ formatFullIngredient(row.customized, custScale) }}</span>
              </template>

              <template v-else-if="row.kind === 'removed'">
                <s class="diff-removed">{{ formatFullIngredient(row.original, origScale) }}</s>
              </template>

              <template v-else-if="row.kind === 'added'">
                <span class="diff-added">{{ formatFullIngredient(row.customized, custScale) }}</span>
              </template>
            </label>
          </li>
        </ul>
      </section>

      <section class="steps-section">
        <h3>Instructions</h3>
        <ol class="steps-list">
          <li v-for="(stepRow, sIdx) in stepRows" :key="sIdx" :class="`step-row-${stepRow.kind}`">
            <p>
              <template v-for="(seg, segIdx) in stepRow.segments" :key="segIdx">
                <s v-if="seg.type === 'removed'" class="diff-removed">{{ seg.text }}</s>
                <span v-else-if="seg.type === 'added'" class="diff-added">{{ seg.text }}</span>
                <span v-else>{{ seg.text }}</span>
                <template v-if="segIdx < stepRow.segments.length - 1">{{ ' ' }}</template>
              </template>
            </p>
            <div v-if="stepRow.origTimer != null || stepRow.custTimer != null" class="step-timers">
              <template v-if="stepRow.origTimer !== stepRow.custTimer">
                <s v-if="stepRow.origTimer != null" class="diff-removed">{{ stepRow.origTimer }} min</s>
                <span v-if="stepRow.custTimer != null" class="diff-added">{{ stepRow.custTimer }} min</span>
              </template>
              <Tag v-else-if="stepRow.custTimer" :value="`${stepRow.custTimer} min`" icon="pi pi-clock" severity="info" />
            </div>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<style scoped>
.customized-recipe-preview {
  display: grid;
  gap: 1rem;
}
.adaptation-summary {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-content-border-color);
  border-left: 4px solid var(--p-primary-color);
  border-radius: var(--p-border-radius);
}
.adaptation-summary i {
  color: var(--p-primary-color);
  margin-top: 0.2rem;
}
.adaptation-summary p {
  margin: 0.2rem 0 0 0;
  color: var(--p-text-color);
  font-size: 0.9rem;
  line-height: 1.4;
}
.preview-header {
  display: grid;
  gap: 0.35rem;
}
.preview-title {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.25;
}
.preview-description {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}
.meta-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--p-text-color);
}
.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 1.25rem;
}
h3 {
  margin: 0 0 0.45rem;
  font-size: 1rem;
}
.ingredient-checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.4rem;
}
.ingredient-item {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  font-size: 0.9rem;
}
.ingredient-item label {
  cursor: pointer;
  line-height: 1.35;
}
.struck {
  text-decoration: line-through;
  color: var(--p-text-muted-color);
}
.notes {
  color: var(--p-text-muted-color);
}
.steps-list {
  display: grid;
  gap: 0.6rem;
  padding-left: 1.25rem;
  margin: 0;
}
.steps-list p {
  color: var(--p-text-color);
  margin: 0 0 0.25rem;
  line-height: 1.45;
}
.step-timers {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.82rem;
}
.diff-removed {
  color: var(--p-primary-color);
  text-decoration: line-through;
  opacity: 0.78;
  margin-right: 0.25rem;
}
.diff-added {
  color: var(--p-primary-color);
  font-weight: 600;
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  padding: 0.05rem 0.28rem;
  border-radius: 0.25rem;
}
@media (max-width: 767px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}
</style>

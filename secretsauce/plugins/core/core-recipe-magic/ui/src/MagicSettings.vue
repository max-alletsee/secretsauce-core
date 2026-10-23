<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'

const ss = useSecretSauce()
const actions = ref<any[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')

async function loadActions() {
  loading.value = true
  error.value = ''
  try {
    actions.value = await ss.api.get<any[]>('/api/x/core-recipe-magic/actions')
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to load actions'
  } finally {
    loading.value = false
  }
}

function move(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= actions.value.length) return
  const item = actions.value.splice(index, 1)[0]
  actions.value.splice(target, 0, item)
}

function remove(index: number) {
  actions.value.splice(index, 1)
}

function addAction() {
  const newId = `custom_${Date.now()}`
  actions.value.push({
    id: newId,
    title: 'New Custom Action',
    description: 'Custom adaptation rule',
    prompt: 'Adapt this recipe to...',
  })
}

async function saveSettings() {
  saving.value = true
  error.value = ''
  try {
    actions.value = await ss.api.put<any[]>('/api/x/core-recipe-magic/actions', actions.value)
    ss.notify({ level: 'success', message: 'Magic actions saved' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to save actions'
  } finally {
    saving.value = false
  }
}

async function resetActions() {
  saving.value = true
  error.value = ''
  try {
    actions.value = await ss.api.post<any[]>('/api/x/core-recipe-magic/actions/reset')
    ss.notify({ level: 'success', message: 'Reset actions to Ottolenghi SIMPLE defaults' })
  } catch (failure: any) {
    error.value = failure?.message || 'Failed to reset actions'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadActions()
})
</script>

<template>
  <div class="magic-settings">
    <div class="settings-header">
      <div>
        <h4 class="settings-title">Magic Actions & Prompts</h4>
        <p class="subtitle">Configure Ottolenghi SIMPLE actions or create custom recipe transformation prompts.</p>
      </div>
      <div class="header-actions">
        <Button
          label="Reset to Defaults"
          icon="pi pi-refresh"
          severity="secondary"
          size="small"
          outlined
          class="btn-reset-actions"
          :disabled="loading || saving"
          @click="resetActions"
        />
        <Button
          label="Add Action"
          icon="pi pi-plus"
          size="small"
          class="btn-add-action"
          :disabled="loading || saving"
          @click="addAction"
        />
      </div>
    </div>

    <Message v-if="error" severity="error">{{ error }}</Message>

    <div v-if="loading" class="loading-state">
      <ProgressSpinner style="width: 2rem; height: 2rem;" />
    </div>

    <div v-else class="actions-list">
      <div
        v-for="(act, idx) in actions"
        :key="act.id"
        class="action-card"
      >
        <div class="card-header">
          <div class="card-title-group">
            <span class="index-badge">#{{ idx + 1 }}</span>
            <InputText v-model="act.title" placeholder="Action Title" class="title-input" size="small" fluid />
          </div>
          <div class="card-tools">
            <Button
              icon="pi pi-arrow-up"
              text
              rounded
              size="small"
              class="btn-move-up"
              aria-label="Move up"
              :disabled="idx === 0"
              @click="move(idx, -1)"
            />
            <Button
              icon="pi pi-arrow-down"
              text
              rounded
              size="small"
              class="btn-move-down"
              aria-label="Move down"
              :disabled="idx === actions.length - 1"
              @click="move(idx, 1)"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              class="btn-remove-action"
              aria-label="Remove action"
              :disabled="actions.length <= 1"
              @click="remove(idx)"
            />
          </div>
        </div>

        <div class="card-body">
          <div class="form-group">
            <label>Description</label>
            <InputText v-model="act.description" placeholder="Brief explanation shown on card" fluid size="small" />
          </div>
          <div class="form-group">
            <label>AI Prompt Instructions</label>
            <Textarea v-model="act.prompt" placeholder="Instruction given to AI..." rows="3" fluid autoResize />
          </div>
        </div>
      </div>
    </div>

    <div class="footer-actions">
      <Button
        label="Save Actions"
        icon="pi pi-check"
        size="small"
        class="btn-save-settings"
        :loading="saving"
        :disabled="loading || !actions.length"
        @click="saveSettings"
      />
    </div>
  </div>
</template>

<style scoped>
.magic-settings { display: grid; gap: 1rem; }
.settings-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.settings-title { margin: 0; font-size: 1rem; font-weight: 600; color: var(--p-text-color); }
.subtitle { margin: .25rem 0 0 0; color: var(--p-text-muted-color); font-size: .85rem; }
.header-actions { display: flex; gap: .5rem; }
.loading-state { display: flex; justify-content: center; padding: 2rem; }
.actions-list { display: grid; gap: .75rem; }
.action-card {
  background: var(--p-surface-50);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  padding: .85rem 1rem;
  display: grid;
  gap: .75rem;
}
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.card-title-group { display: flex; align-items: center; gap: .5rem; flex: 1; min-width: 0; }
.index-badge {
  font-size: .75rem;
  font-weight: 600;
  color: var(--p-text-muted-color);
  background: var(--p-surface-200);
  padding: .15rem .4rem;
  border-radius: var(--p-border-radius-sm);
  flex-shrink: 0;
}
.title-input { font-weight: 600; max-width: 18rem; }
.card-tools { display: flex; gap: .25rem; align-items: center; flex-shrink: 0; }
.card-body { display: grid; gap: .6rem; }
.form-group { display: grid; gap: .25rem; }
.form-group label { font-size: .75rem; color: var(--p-text-muted-color); font-weight: 500; }
.footer-actions { display: flex; justify-content: flex-end; margin-top: .25rem; }
</style>

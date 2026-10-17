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
        <h3>Magic Actions & Prompts</h3>
        <p class="subtitle">Configure Ottolenghi SIMPLE actions or create custom recipe transformation prompts.</p>
      </div>
      <div class="header-actions">
        <Button
          label="Reset to Defaults"
          icon="pi pi-refresh"
          severity="secondary"
          class="btn-reset-actions"
          :disabled="loading || saving"
          @click="resetActions"
        />
        <Button
          label="Add Action"
          icon="pi pi-plus"
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
            <InputText v-model="act.title" placeholder="Action Title" class="title-input" />
          </div>
          <div class="card-tools">
            <Button
              icon="pi pi-arrow-up"
              text
              size="small"
              class="btn-move-up"
              :disabled="idx === 0"
              @click="move(idx, -1)"
            />
            <Button
              icon="pi pi-arrow-down"
              text
              size="small"
              class="btn-move-down"
              :disabled="idx === actions.length - 1"
              @click="move(idx, 1)"
            />
            <Button
              icon="pi pi-trash"
              text
              size="small"
              severity="danger"
              class="btn-remove-action"
              :disabled="actions.length <= 1"
              @click="remove(idx)"
            />
          </div>
        </div>

        <div class="card-body">
          <div class="form-group">
            <label>Description</label>
            <InputText v-model="act.description" placeholder="Brief explanation shown on card" fluid />
          </div>
          <div class="form-group">
            <label>AI Prompt Instructions</label>
            <Textarea v-model="act.prompt" placeholder="Instruction given to AI..." rows="3" fluid />
          </div>
        </div>
      </div>
    </div>

    <div class="footer-actions">
      <Button
        label="Save Actions"
        icon="pi pi-check"
        class="btn-save-settings"
        :loading="saving"
        :disabled="loading || !actions.length"
        @click="saveSettings"
      />
    </div>
  </div>
</template>

<style scoped>
.magic-settings { display: grid; gap: 1.25rem; }
.settings-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.settings-header h3 { margin: 0; font-size: 1.15rem; font-weight: 600; }
.subtitle { margin: .25rem 0 0 0; color: var(--p-text-muted-color); font-size: .85rem; }
.header-actions { display: flex; gap: .5rem; }
.actions-list { display: grid; gap: .85rem; }
.action-card {
  background: var(--p-surface-900, #18181b);
  border: 1px solid var(--p-surface-700, #3f3f46);
  border-radius: var(--p-border-radius, 6px);
  padding: 1rem;
  display: grid;
  gap: .75rem;
}
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.card-title-group { display: flex; align-items: center; gap: .5rem; flex: 1; }
.index-badge { font-size: .75rem; color: var(--p-text-muted-color); font-weight: 600; }
.title-input { font-weight: 600; max-width: 20rem; }
.card-tools { display: flex; gap: .25rem; align-items: center; }
.card-body { display: grid; gap: .6rem; }
.form-group { display: grid; gap: .25rem; }
.form-group label { font-size: .75rem; color: var(--p-text-muted-color); font-weight: 500; }
.footer-actions { display: flex; justify-content: flex-end; margin-top: .5rem; }
</style>

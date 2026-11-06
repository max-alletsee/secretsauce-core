<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

const props = defineProps<{
  recipe: any
  active?: boolean
}>()

const emit = defineEmits<{
  customized: [any]
  openSettings: []
}>()

const ss = useSecretSauce()
const actions = ref<any[]>([])
const selectedActionId = ref<string>('')
const promptInput = ref<string>('')
const chatInputEl = ref<HTMLTextAreaElement | null>(null)
const messages = ref<ChatTurn[]>([])
const loading = ref(false)
const error = ref('')
const unavailable = ref(false)

async function loadActions() {
  error.value = ''
  try {
    actions.value = await ss.api.get<any[]>('/api/x/core-customize-recipe/actions')
  } catch (e: any) {
    error.value = e?.message || 'Failed to load actions'
  }
}

watch(
  () => props.active,
  isActive => {
    if (isActive !== false && !actions.value.length) {
      loadActions()
    }
  },
  { immediate: true },
)

async function selectShorthand(action: any) {
  selectedActionId.value = action.id
  promptInput.value = action.prompt || action.title || ''
  await nextTick()
  chatInputEl.value?.focus()
}

async function sendPrompt() {
  const text = promptInput.value.trim()
  if (!text || loading.value) return

  loading.value = true
  error.value = ''
  unavailable.value = false

  const matchedAction = actions.value.find(a => a.id === selectedActionId.value)
  const actionIdToSend =
    matchedAction && (matchedAction.prompt === text || matchedAction.title === text)
      ? matchedAction.id
      : selectedActionId.value || 'custom'

  const priorMessages = [...messages.value]

  try {
    const payload = {
      action_id: actionIdToSend,
      custom_prompt: text,
      messages: priorMessages,
      recipe: props.recipe,
    }
    const result = await ss.api.post<any>('/api/x/core-customize-recipe/customize', payload)
    messages.value.push({ role: 'user', content: text })
    if (result?.adaptation_summary) {
      messages.value.push({ role: 'assistant', content: result.adaptation_summary })
    }
    promptInput.value = ''
    selectedActionId.value = ''
    emit('customized', result)
  } catch (failure: any) {
    if (failure?.code === 'unavailable' || failure?.status === 503) {
      unavailable.value = true
    } else {
      error.value = failure?.message || 'Customization failed'
    }
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendPrompt()
  }
}

function clearHistory() {
  messages.value = []
  promptInput.value = ''
  selectedActionId.value = ''
  error.value = ''
  unavailable.value = false
}

defineExpose({ clearHistory, selectShorthand, sendPrompt })
</script>

<template>
  <div class="customize-chat-panel">
    <div class="shorthand-picker">
      <label class="shorthand-label">Quick Shorthands</label>
      <div class="action-grid">
        <button
          v-for="act in actions"
          :key="act.id"
          type="button"
          class="action-chip"
          :data-action-id="act.id"
          :class="{ active: selectedActionId === act.id }"
          :disabled="loading"
          @click="selectShorthand(act)"
        >
          <strong>{{ act.title }}</strong>
          <small v-if="act.description">{{ act.description }}</small>
        </button>
      </div>
    </div>

    <div v-if="messages.length" class="chat-log" aria-live="polite">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="chat-bubble"
        :class="`chat-bubble-${msg.role}`"
      >
        <span class="chat-role">{{ msg.role === 'user' ? 'You' : 'Chef AI' }}</span>
        <p>{{ msg.content }}</p>
      </div>
    </div>

    <div class="chat-composer">
      <textarea
        ref="chatInputEl"
        v-model="promptInput"
        class="chat-input"
        rows="2"
        placeholder="Describe how to customize this recipe, or click a shorthand above…"
        :disabled="loading"
        @keydown="onKeydown"
      />
      <Button
        label="Customize"
        icon="pi pi-send"
        class="btn-send-customize"
        :loading="loading"
        :disabled="loading || !promptInput.trim()"
        @click="sendPrompt"
      />
    </div>

    <Message v-if="unavailable" severity="warn">
      AI isn’t set up yet.
      <Button label="Open AI settings" severity="secondary" size="small" @click="emit('openSettings')" />
    </Message>
    <Message v-else-if="error" severity="error">{{ error }}</Message>

    <div v-if="loading" class="loading-state">
      <ProgressSpinner style="width: 2rem; height: 2rem;" />
      <p>Customizing recipe…</p>
    </div>
  </div>
</template>

<style scoped>
.customize-chat-panel {
  display: grid;
  gap: 0.85rem;
}
.shorthand-picker {
  display: grid;
  gap: 0.45rem;
}
.shorthand-label {
  font-size: 0.8rem;
  color: var(--p-text-muted-color);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
  gap: 0.45rem;
}
.action-chip {
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  background: var(--p-surface-50);
  color: var(--p-text-color);
  border-radius: var(--p-border-radius);
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  transition: all 0.15s ease;
}
.action-chip:hover:not(:disabled) {
  border-color: var(--p-primary-color);
  background: var(--p-surface-100);
}
.action-chip.active {
  border-color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
}
.action-chip strong {
  font-size: 0.82rem;
  color: var(--p-text-color);
}
.action-chip small {
  font-size: 0.72rem;
  color: var(--p-text-muted-color);
}
.chat-log {
  display: grid;
  gap: 0.5rem;
  max-height: 12rem;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
}
.chat-bubble {
  padding: 0.45rem 0.65rem;
  border-radius: var(--p-border-radius);
  font-size: 0.85rem;
}
.chat-bubble-user {
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
  border-left: 3px solid var(--p-primary-color);
}
.chat-bubble-assistant {
  background: var(--p-surface-100);
  border-left: 3px solid var(--p-content-border-color);
}
.chat-role {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--p-text-muted-color);
  margin-bottom: 0.15rem;
}
.chat-bubble p {
  margin: 0;
  color: var(--p-text-color);
  line-height: 1.35;
}
.chat-composer {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
.chat-input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: var(--p-border-radius);
  background: var(--p-content-background, var(--p-surface-0));
  color: var(--p-text-color);
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}
.chat-input:focus {
  outline: none;
  border-color: var(--p-primary-color);
}
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--p-text-muted-color);
}
</style>

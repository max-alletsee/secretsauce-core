<script setup lang="ts">
import { reactive } from 'vue'

const props = defineProps<{
  pluginId: string
  schema: Record<string, any>
  config?: Record<string, any>
}>()

const emit = defineEmits<{
  (e: 'save', config: Record<string, any>): void
}>()

const formValues = reactive<Record<string, any>>({ ...(props.config || {}) })

function handleSubmit() {
  emit('save', { ...formValues })
}
</script>

<template>
  <form class="ss-config-form" @submit.prevent="handleSubmit">
    <div
      v-for="(propDef, propName) in props.schema.properties || {}"
      :key="propName"
      class="form-field"
    >
      <label :for="String(propName)">{{ propDef.title || propName }}</label>
      <p v-if="propDef.description" class="field-desc">{{ propDef.description }}</p>

      <!-- Boolean -->
      <input
        v-if="propDef.type === 'boolean'"
        :id="String(propName)"
        v-model="formValues[propName]"
        type="checkbox"
      />

      <!-- String (Secret) -->
      <input
        v-else-if="propDef.type === 'string' && propDef.secret"
        :id="String(propName)"
        v-model="formValues[propName]"
        type="password"
      />

      <!-- String Enum -->
      <select
        v-else-if="propDef.type === 'string' && propDef.enum"
        :id="String(propName)"
        v-model="formValues[propName]"
      >
        <option v-for="opt in propDef.enum" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <!-- Number / Integer -->
      <input
        v-else-if="propDef.type === 'number' || propDef.type === 'integer'"
        :id="String(propName)"
        v-model.number="formValues[propName]"
        type="number"
        :min="propDef.minimum"
        :max="propDef.maximum"
      />

      <!-- General String -->
      <input
        v-else
        :id="String(propName)"
        v-model="formValues[propName]"
        type="text"
      />
    </div>

    <Button type="submit" label="Save Settings" @click="handleSubmit" />
  </form>
</template>

<style scoped>
.ss-config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 600px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-field label {
  font-weight: bold;
  font-size: 0.9em;
}
.field-desc {
  font-size: 0.8em;
  color: var(--p-text-muted-color);
  margin: 0;
}
.form-field input,
.form-field select {
  padding: 8px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 4px;
}
button[type="submit"] {
  align-self: flex-start;
  padding: 8px 16px;
  background: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>

<script setup lang="ts">
import { ref, inject } from 'vue'
import type { ApiClient } from '@secretsauce/ui'

const api = inject<ApiClient>('__SS_API__')!
const householdName = ref('')
const passphrase = ref('')
const memberName = ref('')
const language = ref('en')
const errorMsg = ref('')

async function submitSetup() {
  errorMsg.value = ''
  try {
    await api.post('/api/setup', {
      household_name: householdName.value,
      passphrase: passphrase.value,
      first_member: {
        name: memberName.value,
        preferred_language: language.value,
      },
    })
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  } catch (err: any) {
    errorMsg.value = err?.message || 'Setup failed'
  }
}
</script>

<template>
  <div class="ss-setup-page">
    <h2>Welcome to SecretSauce</h2>
    <p>Set up your household and first member to get started.</p>

    <form @submit.prevent="submitSetup">
      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

      <div class="field">
        <label for="setup-household">Household Name</label>
        <InputText id="setup-household" name="household_name" v-model="householdName" required placeholder="e.g. Familie Müller" fluid />
      </div>

      <div class="field">
        <label for="setup-passphrase">Household Passphrase</label>
        <InputText id="setup-passphrase" name="passphrase" v-model="passphrase" type="password" minlength="8" required fluid />
        <small>At least 8 characters.</small>
      </div>

      <div class="field">
        <label for="setup-member">Your Name</label>
        <InputText id="setup-member" name="first_member_name" v-model="memberName" required fluid />
      </div>

      <div class="field">
        <label for="setup-language">Language</label>
        <Select inputId="setup-language" aria-label="Language" v-model="language" :options="[{id:'en',label:'English'},{id:'de',label:'Deutsch'},{id:'fr',label:'Français'}]" optionLabel="label" optionValue="id" fluid />
      </div>

      <Button type="submit" label="Complete Setup" class="complete-setup" />
    </form>
  </div>
</template>

<style scoped>
.ss-setup-page {
  max-width: 450px;
  margin: 50px auto;
  padding: 24px;
  border: 1px solid var(--p-content-border-color);
  border-radius: 8px;
}
.field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.complete-setup { width: 100%; }
.error-banner {
  color: var(--p-red-600);
  margin-bottom: 12px;
}
</style>

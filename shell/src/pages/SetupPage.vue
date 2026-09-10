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
        <label>Household Name</label>
        <input
          name="household_name"
          v-model="householdName"
          required
          placeholder="e.g. Familie Müller"
        />
      </div>

      <div class="field">
        <label>Household Passphrase</label>
        <input
          name="passphrase"
          v-model="passphrase"
          type="password"
          required
        />
      </div>

      <div class="field">
        <label>Your Name</label>
        <input
          name="first_member_name"
          v-model="memberName"
          required
        />
      </div>

      <div class="field">
        <label>Language</label>
        <select v-model="language">
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
        </select>
      </div>

      <button type="submit">Complete Setup</button>
    </form>
  </div>
</template>

<style scoped>
.ss-setup-page {
  max-width: 450px;
  margin: 50px auto;
  padding: 24px;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
}
.field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.field input,
.field select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  padding: 10px 20px;
  background: #c2410c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}
.error-banner {
  color: #dc2626;
  margin-bottom: 12px;
}
</style>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { Slot, type ApiClient } from '@secretsauce/ui'

const api = inject<ApiClient>('__SS_API__')!
const basePath = inject<string>('__SS_BASE_PATH__', '/')
const passphrase = ref('')
const errorMsg = ref('')

async function submitLogin() {
  errorMsg.value = ''
  try {
    await api.post('/api/auth/login', { passphrase: passphrase.value })
    if (typeof window !== 'undefined') {
      window.location.href = basePath
    }
  } catch (err: any) {
    errorMsg.value = err?.message || 'Login failed'
  }
}
</script>

<template>
  <div class="ss-login-page">
    <h2>SecretSauce Login</h2>
    <form @submit.prevent="submitLogin">
      <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>
      <div class="field">
        <label>Passphrase</label>
        <input v-model="passphrase" type="password" required autofocus />
      </div>
      <button type="submit">Log In</button>
    </form>

    <div class="login-footer">
      <Slot name="login.footer" />
    </div>
  </div>
</template>

<style scoped>
.ss-login-page {
  max-width: 400px;
  margin: 80px auto;
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
.field input {
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
.login-footer {
  margin-top: 24px;
}
</style>

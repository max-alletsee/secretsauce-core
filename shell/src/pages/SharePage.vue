<script setup lang="ts">
import { IntentTrigger } from '@secretsauce/ui'

const urlParams =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams('')

const shareContext = {
  title: urlParams.get('title'),
  text: urlParams.get('text'),
  url: urlParams.get('url'),
}

function handleResolve(result: any) {
  if (result?.path && typeof window !== 'undefined') {
    window.location.href = result.path
  }
}
</script>

<template>
  <div class="ss-share-page">
    <h2>Received Shared Content</h2>
    <p v-if="shareContext.title"><strong>{{ shareContext.title }}</strong></p>
    <p v-if="shareContext.text">{{ shareContext.text }}</p>
    <p v-if="shareContext.url">
      <a :href="shareContext.url" target="_blank">{{ shareContext.url }}</a>
    </p>

    <div class="share-trigger">
      <IntentTrigger
        hub="share:receive"
        :context="shareContext"
        label="Handle Shared Content"
        @resolve="handleResolve"
      />
    </div>
  </div>
</template>

<style scoped>
.ss-share-page {
  max-width: 500px;
  margin: 40px auto;
  padding: 24px;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
}
.share-trigger {
  margin-top: 20px;
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const props = defineProps<{ context?: { entry?: any } }>()
const ss = useSecretSauce()
const netScore = ref(0), myVote = ref<number | null>(null), busy = ref(false), error = ref('')
let request = 0
async function loadRatings() {
  const id = props.context?.entry?.id, memberId = ss.store.currentMember.value?.id, sequence = ++request
  myVote.value = null
  if (!id) return
  try {
    const result = await ss.api.get<any>('/api/x/core-ratings', { journal_id: id })
    if (sequence !== request) return
    netScore.value = result.net_score
    myVote.value = result.scores.find((score: any) => score.member_id === memberId)?.score ?? null
  } catch (failure: any) { if (sequence === request) error.value = failure?.message || 'Could not load ratings' }
}
watch(() => [props.context?.entry?.id, ss.store.currentMember.value?.id], loadRatings, { immediate: true })
async function castVote(score: number) {
  const id = props.context?.entry?.id, memberId = ss.store.currentMember.value?.id
  if (!id || !memberId || busy.value) return
  busy.value = true; error.value = ''
  try {
    if (myVote.value === score) await ss.api.delete('/api/x/core-ratings', { journal_id: id, member_id: memberId })
    else await ss.api.put('/api/x/core-ratings', { journal_id: id, member_id: memberId, score })
    await loadRatings()
  } catch (failure: any) { error.value = failure?.message || 'Could not save rating' }
  finally { busy.value = false }
}
</script>
<template>
  <div class="vote-rating">
    <span v-tooltip="ss.store.currentMember.value ? '' : 'Choose a member to rate this meal'">
      <Button class="upvote-btn" icon="pi pi-thumbs-up" aria-label="Upvote" :aria-pressed="myVote === 1" :outlined="myVote !== 1" size="small" :disabled="busy || !ss.store.currentMember.value" @click="castVote(1)" />
    </span>
    <span class="net-score" aria-live="polite">{{ netScore > 0 ? `+${netScore}` : netScore }}</span>
    <span v-tooltip="ss.store.currentMember.value ? '' : 'Choose a member to rate this meal'">
      <Button class="downvote-btn" icon="pi pi-thumbs-down" aria-label="Downvote" :aria-pressed="myVote === -1" :outlined="myVote !== -1" severity="secondary" size="small" :disabled="busy || !ss.store.currentMember.value" @click="castVote(-1)" />
    </span>
    <Message v-if="error" severity="error">{{ error }}</Message>
  </div>
</template>
<style scoped>
.vote-rating { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
.net-score { color: var(--p-text-muted-color); min-width: 1.5rem; text-align: center; }
</style>

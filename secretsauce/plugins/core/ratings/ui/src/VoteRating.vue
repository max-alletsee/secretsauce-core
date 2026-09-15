<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'

const props = defineProps<{
  context?: {
    entry?: any
  }
}>()

const api = inject<any>('__SS_API__')
const currentMember = inject<any>('__SS_CURRENT_MEMBER__')

const netScore = ref(0)
const myVote = ref<number | null>(null)

async function loadRatings() {
  if (!api || !props.context?.entry?.id) return
  try {
    const res = await api.get(`/api/x/ratings?journal_id=${props.context.entry.id}`)
    netScore.value = res.net_score ?? 0
    const mId = currentMember?.value?.id
    if (mId && Array.isArray(res.scores)) {
      const mine = res.scores.find((s: any) => s.member_id === mId)
      if (mine) myVote.value = mine.score
    }
  } catch {
    // offline
  }
}

async function castVote(score: number) {
  if (!api || !props.context?.entry?.id) return
  const mId = currentMember?.value?.id || 'anonymous'
  if (myVote.value === score) {
    // Toggle off
    if (api.delete) {
      await api.delete(`/api/x/ratings?journal_id=${props.context.entry.id}&member_id=${mId}`)
    }
    myVote.value = null
    netScore.value -= score
  } else {
    const prevVote = myVote.value
    const res = await api.put('/api/x/ratings', {
      journal_id: props.context.entry.id,
      member_id: mId,
      score,
    })
    myVote.value = score
    if (res && res.net_score !== undefined) {
      netScore.value = res.net_score
    } else {
      netScore.value += prevVote ? score * 2 : score
    }
  }
}

onMounted(() => {
  loadRatings()
})
</script>

<template>
  <div class="vote-rating">
    <button
      class="vote-btn upvote-btn"
      :class="{ active: myVote === 1 }"
      title="Upvote"
      @click="castVote(1)"
    >
      👍
    </button>
    <span class="net-score">{{ netScore > 0 ? `+${netScore}` : netScore }}</span>
    <button
      class="vote-btn downvote-btn"
      :class="{ active: myVote === -1 }"
      title="Downvote"
      @click="castVote(-1)"
    >
      👎
    </button>
  </div>
</template>

<style scoped>
.vote-rating {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.vote-btn {
  border: 1px solid #e7e5e4;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 0.85em;
  line-height: 1.2;
}
.vote-btn:hover { background: #f5f5f4; }
.vote-btn.active { border-color: #0284c7; background: #e0f2fe; }
.net-score {
  font-size: 0.8em;
  color: #57534e;
  min-width: 18px;
  text-align: center;
}
</style>

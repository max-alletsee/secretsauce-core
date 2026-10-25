<script setup lang="ts">
import { ref } from 'vue'
import type { OutboxEntry } from '@secretsauce/ui'

const props = defineProps<{
  online: boolean
  isSlow?: boolean
  pendingCount: number
  failedCount: number
  failedEntries: OutboxEntry[]
}>()

const emit = defineEmits<{
  (e: 'discard', entryId: string): void
}>()

const showDialog = ref(false)
</script>

<template>
  <div
    v-if="!props.online || props.isSlow || props.failedCount > 0"
    class="ss-offline-bar"
    @click="showDialog = true"
  >
    <span v-if="!props.online">Offline, showing saved data</span>
    <span v-else-if="props.isSlow">Slow connection, showing saved data</span>
    <span v-else>Outbox updates</span>

    <div class="ss-offline-counts">
      <span v-if="props.pendingCount > 0" class="badge badge-pending">
        {{ props.pendingCount }} pending
      </span>
      <span v-if="props.failedCount > 0" class="badge badge-failed">
        {{ props.failedCount }} failed
      </span>
    </div>
  </div>

  <div v-if="showDialog" class="ss-modal-overlay">
    <div class="ss-modal">
      <h3>Queued & Failed Actions</h3>
      <p v-if="props.failedEntries.length === 0">No failed actions.</p>
      <ul v-else class="failed-list">
        <li v-for="item in props.failedEntries" :key="item.id">
          <strong>{{ item.tag || item.path }}</strong> ({{ item.plugin_id }})
          <div class="error-text">{{ item.last_error }}</div>
          <Button type="button" label="Discard" severity="danger" outlined @click="emit('discard', item.id)" />
        </li>
      </ul>
      <Button type="button" label="Close" text @click="showDialog = false" />
    </div>
  </div>
</template>

<style scoped>
.ss-offline-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--p-primary-color);
  color: var(--p-primary-contrast-color);
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  z-index: 1000;
  cursor: pointer;
}
@media (max-width: 767px) {
  .ss-offline-bar {
    bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px));
  }
}
.ss-offline-counts .badge {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85em;
}
.badge-pending {
  background-color: rgba(255, 255, 255, 0.25);
}
.badge-failed {
  background-color: var(--p-red-800);
}
.ss-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.ss-modal {
  background: var(--p-surface-0);
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
  color: var(--p-text-color);
}
.failed-list {
  list-style: none;
  padding: 0;
  margin: 10px 0;
}
.failed-list li {
  border-bottom: 1px solid var(--p-content-border-color);
  padding: 8px 0;
}
.error-text {
  color: var(--p-red-600);
  font-size: 0.85em;
}
</style>

<script setup lang="ts">
import { inject, computed } from 'vue'
import { routeLocationKey } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppNav from './components/AppNav.vue'
import OfflineBar from './components/OfflineBar.vue'
import Toast from 'primevue/toast'
import { useAppStore } from './stores/app'

const appStore = useAppStore()
const routeRegistry = inject<any>('__SS_ROUTE_REGISTRY__')
const outbox = inject<any>('__SS_OUTBOX__')
const route = inject<any>(routeLocationKey, null)

const isAuthPage = computed(() => {
  const path = route?.path
  return path === '/login' || path === '/setup'
})

const routes = computed(() => (routeRegistry ? routeRegistry.getRoutes() : []))
</script>

<template>
  <div class="ss-layout">
    <AppHeader />
    <div class="ss-main-container">
      <AppNav v-if="!isAuthPage" :routes="routes" />
      <main class="ss-content">
        <router-view />
      </main>
    </div>
    <Toast />
    <OfflineBar
      :online="appStore.online"
      :pending-count="outbox?.pending?.value || 0"
      :failed-count="outbox?.failed?.value?.length || 0"
      :failed-entries="outbox?.failed?.value || []"
      @discard="(id: string) => outbox?.discard(id)"
    />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #faf7f2;
}
.ss-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.ss-main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.ss-content {
  flex: 1;
  overflow-y: auto;
}
</style>

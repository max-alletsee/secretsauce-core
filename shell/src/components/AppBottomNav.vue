<script setup lang="ts">
import { computed } from 'vue'
import { type RouteDef } from '@secretsauce/ui'

const props = defineProps<{ routes: RouteDef[] }>()
const navRoutes = computed(() =>
  props.routes
    .filter(r => r.nav && !['/settings', '/plugins'].includes(r.path))
    .sort((a, b) => a.nav!.order - b.nav!.order),
)
</script>

<template>
  <nav class="ss-bottom-nav" aria-label="Mobile navigation">
    <router-link
      v-for="r in navRoutes"
      :key="r.path"
      :to="r.path"
      class="ss-bottom-nav-item"
    >
      <i v-if="r.nav?.icon" :class="`pi pi-${r.nav.icon}`" aria-hidden="true" />
      <span class="nav-label">{{ r.nav?.label }}</span>
    </router-link>
    <router-link to="/settings" class="ss-bottom-nav-item">
      <i class="pi pi-cog" aria-hidden="true" />
      <span class="nav-label">Settings</span>
    </router-link>
  </nav>
</template>

<style scoped>
.ss-bottom-nav {
  display: none;
  align-items: stretch;
  justify-content: space-around;
  background-color: var(--p-surface-0);
  border-top: 1px solid var(--p-content-border-color);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  min-height: calc(3.5rem + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

@media (max-width: 767px) {
  .ss-bottom-nav {
    display: flex;
  }
}

.ss-bottom-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0.375rem 0.25rem;
  color: var(--p-text-muted-color);
  text-decoration: none;
  gap: 0.25rem;
  transition: color 0.15s ease-in-out;
}

.ss-bottom-nav-item i {
  font-size: 1.25rem;
  line-height: 1;
}

.nav-label {
  font-size: 0.6875rem;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.ss-bottom-nav-item.router-link-active {
  color: var(--p-primary-color);
  font-weight: 600;
}
</style>

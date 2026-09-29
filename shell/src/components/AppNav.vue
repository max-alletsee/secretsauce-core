<script setup lang="ts">
import { computed } from 'vue'
import { Slot, type RouteDef } from '@secretsauce/ui'
const props = defineProps<{ routes: RouteDef[] }>()
const navRoutes = computed(() => props.routes.filter(r => r.nav && !['/settings', '/plugins'].includes(r.path))
  .sort((a, b) => a.nav!.order - b.nav!.order))
</script>

<template>
  <nav class="ss-app-nav" aria-label="Main navigation">
    <ul class="nav-list">
      <li v-for="r in navRoutes" :key="r.path">
        <router-link :to="r.path" class="nav-link">
          <i v-if="r.nav?.icon" :class="`pi pi-${r.nav.icon}`" aria-hidden="true" />
          <span>{{ r.nav?.label }}</span>
        </router-link>
      </li>
    </ul>
    <div class="nav-footer">
      <Divider />
      <router-link to="/settings" class="nav-link"><i class="pi pi-cog" aria-hidden="true" />Settings</router-link>
      <Slot name="shell.nav.footer" />
    </div>
  </nav>
</template>

<style scoped>
.ss-app-nav { display:flex; flex-direction:column; width:220px; min-height:100%; border-right:1px solid var(--p-content-border-color); }
.nav-list { list-style:none; padding:12px; margin:0; display:flex; flex-direction:column; gap:8px; }
.nav-footer { margin-top:auto; padding:12px; }
.nav-link { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:var(--p-border-radius-md); text-decoration:none; color:var(--p-text-color); }
.nav-link.router-link-active { background:var(--p-highlight-background); color:var(--p-highlight-color); font-weight:600; }
</style>

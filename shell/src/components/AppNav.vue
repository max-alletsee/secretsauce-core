<script setup lang="ts">
import { Slot, type RouteDef } from '@secretsauce/ui'

const props = defineProps<{
  routes: RouteDef[]
}>()
</script>

<template>
  <nav class="ss-app-nav">
    <ul class="nav-list">
      <li v-for="r in props.routes.filter((item) => !!item.nav)" :key="r.path">
        <router-link :to="r.path" class="nav-link">
          <i v-if="r.nav?.icon" :class="`pi pi-${r.nav.icon}`"></i>
          <span>{{ r.nav?.label }}</span>
        </router-link>
      </li>
    </ul>
    <div class="nav-footer">
      <Slot name="shell.nav.footer" />
    </div>
  </nav>
</template>

<style scoped>
.ss-app-nav {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 220px;
  border-right: 1px solid #e7e5e4;
  height: 100%;
}
.nav-list {
  list-style: none;
  padding: 12px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: #44403c;
}
.nav-link.router-link-active {
  background-color: #ffedd5;
  color: #c2410c;
  font-weight: 600;
}
.nav-footer {
  padding: 12px;
}
</style>

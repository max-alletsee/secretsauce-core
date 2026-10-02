<script setup lang="ts">
import { computed, inject, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { createSettingsRegistry } from '../registries/settings'
const registry = inject<ReturnType<typeof createSettingsRegistry>>('__SS_SETTINGS_REGISTRY__')!
const route = useRoute()
const sections = computed(() => registry.getSections())
function savedPanels(): string[] {
  try { const saved = JSON.parse(localStorage.getItem('ss-settings-open') || 'null'); if (Array.isArray(saved)) return saved.filter(id => typeof id === 'string') }
  catch { /* Device storage is optional. */ }
  return ['household']
}
const open = ref(savedPanels())
watch([sections, () => route.query.section], async () => {
  const ids = new Set(sections.value.map(section => section.id))
  let valid = open.value.filter(id => ids.has(id))
  const requested = route.query.section
  if (typeof requested === 'string' && ids.has(requested) && !valid.includes(requested)) valid.push(requested)
  open.value = valid
  await nextTick()
  if (typeof requested === 'string' && ids.has(requested)) document.getElementById(`settings-${requested}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
}, { immediate: true })
watch(open, value => { try { localStorage.setItem('ss-settings-open', JSON.stringify(value)) } catch { /* Device storage is optional. */ } }, { deep: true, immediate: true })
</script>
<template>
  <div class="ss-settings-page">
    <h2>Settings</h2>
    <Accordion v-model:value="open" multiple>
      <AccordionPanel v-for="section in sections" :key="section.id" :id="`settings-${section.id}`" :value="section.id">
        <AccordionHeader>{{ section.title }}</AccordionHeader>
        <AccordionContent><component :is="section.component" :plugin-id="section.pluginId" /></AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>
<style scoped>
.ss-settings-page { padding: 1.5rem; max-width: 56rem; width: 100%; box-sizing: border-box; }
@media (max-width: 767px) { .ss-settings-page { padding: .75rem; } }
</style>

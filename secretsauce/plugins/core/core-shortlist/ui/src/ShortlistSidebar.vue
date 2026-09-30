<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const ss = useSecretSauce(), entries = ref<any[]>([]), error = ref('')
onMounted(async () => {
  try { entries.value = await ss.api.get<any[]>('/api/x/core-shortlist') }
  catch (failure: any) { error.value = failure?.message || 'Could not load shortlist' }
})
</script>
<template>
  <section class="shortlist-sidebar">
    <h3>Shortlist ({{ entries.length }})</h3>
    <Message v-if="error" severity="error">{{ error }}</Message>
    <ul v-if="entries.length"><li v-for="entry in entries" :key="entry.id"><a :href="ss.url(`/recipes/${entry.recipe_id}`)" @click.prevent="ss.navigate?.(`/recipes/${entry.recipe_id}`)">{{ entry.recipe_title || 'Recipe' }}</a></li></ul>
    <p v-else>No shortlisted recipes.</p>
  </section>
</template>
<style scoped>
.shortlist-sidebar { padding: 1rem; border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); background: var(--p-content-background); }
h3 { margin: 0 0 .75rem; font-size: 1rem; }
ul { list-style: none; padding: 0; display: grid; gap: .5rem; }
a { color: var(--p-primary-color); } p { color: var(--p-text-muted-color); }
</style>

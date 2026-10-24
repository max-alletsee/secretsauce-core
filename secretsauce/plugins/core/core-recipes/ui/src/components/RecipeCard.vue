<script setup lang="ts">
import { Slot } from '@secretsauce/ui'
const props = defineProps<{ recipe: { id: string; title: string; prep_time_minutes?: number | null; cook_time_minutes?: number | null; tags?: string[]; cover_asset_id?: string | null; cover_url?: string | null } }>()
const emit = defineEmits<{ select: [string] }>()
</script>
<template>
  <article class="recipe-card" @click="emit('select', props.recipe.id)">
    <div class="cover-image"><img v-if="props.recipe.cover_asset_id" :src="props.recipe.cover_url || `/api/assets/${props.recipe.cover_asset_id}/file`" :alt="props.recipe.title"><i v-else class="pi pi-book placeholder-cover" aria-hidden="true" /></div>
    <div class="card-body">
      <div class="card-header"><h3><Button :label="props.recipe.title" text class="recipe-title" @click.stop="emit('select', props.recipe.id)" /></h3><div class="actions" @click.stop><Slot name="recipe.card.actions" :context="{ recipe: props.recipe }" /></div></div>
      <div class="meta"><span v-if="props.recipe.prep_time_minutes"><i class="pi pi-clock" /> {{ props.recipe.prep_time_minutes }}m prep</span><span v-if="props.recipe.cook_time_minutes">{{ props.recipe.cook_time_minutes }}m cook</span></div>
      <div class="tags"><Tag v-for="tag in props.recipe.tags" :key="tag" :value="tag" class="tag" severity="secondary" /></div>
    </div>
  </article>
</template>
<style scoped>
.recipe-card { border: 1px solid var(--p-content-border-color); border-radius: var(--p-border-radius); background: var(--p-content-background); overflow: hidden; cursor: pointer; display: flex; flex-direction: column; }
.cover-image { height: 6rem; background: var(--p-surface-100); display: flex; align-items: center; justify-content: center; }.cover-image img { width: 100%; height: 100%; object-fit: cover; }.placeholder-cover { font-size: 2rem; color: var(--p-text-muted-color); }
.card-body { padding: .5rem .625rem; display: grid; gap: .25rem; }.card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .375rem; }h3 { margin: 0; }.recipe-title { padding: 0; text-align: left; font-size: .925rem; }
.meta { display: flex; gap: .375rem; flex-wrap: wrap; font-size: .78rem; color: var(--p-text-muted-color); }.tags { display: flex; flex-wrap: wrap; gap: .25rem; }
</style>

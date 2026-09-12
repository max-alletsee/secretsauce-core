<script setup lang="ts">
import { Slot } from '@secretsauce/ui'

const props = defineProps<{
  recipe: {
    id: string
    title: string
    prep_time_minutes?: number | null
    cook_time_minutes?: number | null
    tags?: string[]
    cover_asset_id?: string | null
  }
}>()

const emit = defineEmits<{
  select: [string]
}>()
</script>

<template>
  <div class="recipe-card" @click="emit('select', props.recipe.id)">
    <div class="cover-image">
      <img
        v-if="props.recipe.cover_asset_id"
        :src="`/api/assets/${props.recipe.cover_asset_id}/file`"
        alt="Cover"
      />
      <div v-else class="placeholder-cover">🍲</div>
    </div>
    <div class="card-body">
      <div class="card-header">
        <h3 class="title">{{ props.recipe.title }}</h3>
        <div class="actions" @click.stop>
          <Slot name="recipe.card.actions" :context="{ recipe: props.recipe }" />
        </div>
      </div>
      <div class="meta">
        <span v-if="props.recipe.prep_time_minutes" class="meta-item">⏱ {{ props.recipe.prep_time_minutes }}m prep</span>
        <span v-if="props.recipe.cook_time_minutes" class="meta-item">🍳 {{ props.recipe.cook_time_minutes }}m cook</span>
      </div>
      <div v-if="props.recipe.tags?.length" class="tags">
        <span v-for="tag in props.recipe.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipe-card {
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}
.recipe-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
.cover-image {
  width: 100%;
  height: 140px;
  background: #f5f5f4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-image img { width: 100%; height: 100%; object-fit: cover; }
.placeholder-cover { font-size: 3rem; }
.card-body { padding: 12px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.title { margin: 0; font-size: 1.1em; color: #1c1917; }
.meta { display: flex; gap: 8px; font-size: 0.85em; color: #78716c; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: auto; padding-top: 6px; }
.tag { font-size: 0.75em; background: #f5f5f4; color: #57534e; padding: 2px 6px; border-radius: 4px; }
</style>

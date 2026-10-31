<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { localToday } from '../days'
const props=defineProps<{visible:boolean;date:string;mealType:string}>()
const emit=defineEmits<{'update:visible':[value:boolean];created:[entry:any]}>()
const DEFAULT_PREDEFINED_NOTES = ['Dining out', 'Leftovers', 'Takeout', 'Quick meal']
const ss=useSecretSauce(), tab=ref('recipes'), query=ref(''), results=ref<any[]>([]), shortlist=ref<any[]>([]), note=ref(''), servings=ref(2), busy=ref(false), error=ref('')
const quickNotes = computed<string[]>(() => {
  const mealTypes = ss.store.household.value?.meal_types || []
  const slot = mealTypes.find(
    (s: any) => s.id === props.mealType || s.id?.toLowerCase() === props.mealType?.toLowerCase() || s.label?.toLowerCase() === props.mealType?.toLowerCase()
  )
  if (slot && Array.isArray(slot.predefined_notes)) {
    return slot.predefined_notes
  }
  const householdNotes = ss.store.household.value?.predefined_notes
  if (Array.isArray(householdNotes)) {
    return householdNotes
  }
  return DEFAULT_PREDEFINED_NOTES
})
let searchRevision=0
async function search(){const n=++searchRevision;try{const response=await ss.api.get<any>('/api/recipes',{q:query.value});if(n===searchRevision)results.value=response.items}catch(failure:any){if(n===searchRevision)error.value=failure.message}}
watch(()=>props.visible, async visible=>{if(!visible){++searchRevision;return}tab.value='recipes';query.value='';note.value='';servings.value=2;error.value='';results.value=[];await search();try{shortlist.value=await ss.api.get<any[]>('/api/x/core-shortlist')}catch{shortlist.value=[]}})
async function add(recipeId?:string){if(busy.value || (!recipeId && !note.value.trim()))return;busy.value=true;error.value=''
  const isPast=props.date<localToday(),status=isPast?'cooked':'planned'
  try{const entry=await ss.api.post('/api/timeline',{date:props.date,meal_type:props.mealType,entry_type:recipeId?'recipe':'note',...(recipeId?{recipe_id:recipeId}:{title:note.value}),servings_override:servings.value,status,...(isPast&&ss.store.currentMember.value?.id?{cooked_by_member_id:ss.store.currentMember.value.id}:{})});emit('created',entry);emit('update:visible',false)}catch(failure:any){error.value=failure.message||'Could not add meal'}finally{busy.value=false}}
</script>
<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible',$event)" :header="`Add meal · ${date}`" modal :style="{width:'36rem',maxWidth:'95vw'}">
    <div class="add-entry"><Message v-if="error" severity="error">{{error}}</Message>
      <label for="entry-servings">Servings</label><InputNumber inputId="entry-servings" v-model="servings" :min=".25" :maxFractionDigits="2" />
      <Tabs v-model:value="tab"><TabList><Tab value="recipes">Recipes</Tab><Tab value="shortlist">Shortlist</Tab><Tab value="note">Note</Tab></TabList><TabPanels>
        <TabPanel value="recipes"><label for="entry-recipe-search">Search recipes</label><InputText id="entry-recipe-search" v-model="query" @input="search" fluid /><div v-for="recipe in results" :key="recipe.id" class="recipe-result"><span>{{recipe.title}}</span><Button label="Schedule" :loading="busy" @click="add(recipe.id)" /></div></TabPanel>
        <TabPanel value="shortlist"><p v-if="!shortlist.length">No recipes in shortlist</p><div v-for="recipe in shortlist" :key="recipe.recipe_id" class="recipe-result"><span>{{recipe.recipe_title}}</span><Button label="Schedule" :loading="busy" @click="add(recipe.recipe_id)" /></div></TabPanel>
        <TabPanel value="note"><label for="entry-note">Note title</label><InputText id="entry-note" v-model="note" fluid /><div class="quick-notes"><Button v-for="title in quickNotes" :key="title" :label="title" outlined size="small" @click="note=title" /></div><Button label="Add meal" :loading="busy" :disabled="!note.trim()" @click="add()" /></TabPanel>
      </TabPanels></Tabs>
    </div>
  </Dialog>
</template>
<style scoped>.add-entry{display:grid;gap:.5rem}.recipe-result{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.35rem 0}.quick-notes{display:flex;gap:.375rem;flex-wrap:wrap;margin:.5rem 0}</style>

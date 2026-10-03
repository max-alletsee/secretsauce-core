<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
const props = defineProps<{visible:boolean}>()
const emit = defineEmits<{'update:visible':[value:boolean];saved:[rule:any]}>()
const ss = useSecretSauce()
const weekday = ref(0), mealType = ref(''), recipe = ref<any>(null), choices = ref<any[]>([]), busy = ref(false), error = ref('')
const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((label,value)=>({label,value}))
const slots = computed(()=>ss.store.household.value.meal_types)
let searchRevision = 0
watch(()=>props.visible, visible=>{
  ++searchRevision
  if(visible){weekday.value=0;mealType.value=slots.value.find(slot=>slot.id==='dinner')?.id||slots.value[0]?.id||'';recipe.value=null;choices.value=[];error.value=''}
})
async function search(event:{query:string}) {
  const n=++searchRevision
  try {
    const response=await ss.api.get<any>('/api/recipes',{q:event.query})
    if(n===searchRevision&&props.visible)choices.value=response.items
  } catch(failure:any){if(n===searchRevision&&props.visible)error.value=failure.message||'Could not search recipes'}
}
async function save(){
  if(busy.value||!recipe.value?.id||!mealType.value)return
  busy.value=true;error.value=''
  try {
    const rule=await ss.api.post('/api/x/core-recurring/rules',{weekday:weekday.value,meal_type:mealType.value,recipe_id:recipe.value.id})
    emit('saved',rule);emit('update:visible',false)
  }catch(failure:any){error.value=failure.message||'Could not save recurring meal'}finally{busy.value=false}
}
</script>
<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible',$event)" header="Add recurring meal" modal :style="{width:'30rem',maxWidth:'95vw'}">
    <form class="recurring-rule-form" @submit.prevent="save">
      <Message v-if="error" severity="error">{{error}}</Message>
      <label for="recurring-weekday">Weekday</label><Select inputId="recurring-weekday" aria-label="Weekday" v-model="weekday" :options="weekdays" optionLabel="label" optionValue="value" fluid />
      <label for="recurring-slot">Meal slot</label><Select inputId="recurring-slot" aria-label="Meal slot" v-model="mealType" :options="slots" optionLabel="label" optionValue="id" fluid />
      <label for="recurring-recipe">Recipe</label><AutoComplete inputId="recurring-recipe" v-model="recipe" :suggestions="choices" optionLabel="title" forceSelection @complete="search" fluid />
      <Button label="Add recurring meal" type="submit" :loading="busy" :disabled="!recipe?.id||!mealType" />
    </form>
  </Dialog>
</template>
<style scoped>.recurring-rule-form{display:grid;gap:.75rem}</style>

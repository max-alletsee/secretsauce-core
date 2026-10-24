<script setup lang="ts">
import { computed, ref } from 'vue'
import { IntentTrigger, useSecretSauce } from '@secretsauce/ui'
import ScheduleCard from './ScheduleCard.vue'
import type { SlotVM } from '../days'
const props=defineProps<{slot:SlotVM;date:string}>()
const emit=defineEmits<{add:[payload:{date:string;mealType:string}];changed:[]}>()
const ss=useSecretSauce(),menu=ref(),error=ref(''),busy=ref(false)
function add(){emit('add',{date:props.date,mealType:props.slot.id})}
async function write(action:'skip'|'undo'|'remove'){
  if(busy.value)return;busy.value=true;error.value=''
  try{
    if(action==='remove' && props.slot.entries.length && !await ss.confirm({header:'Remove slot',message:`Remove ${props.slot.label} and its ${props.slot.entries.length} planned meal${props.slot.entries.length===1?'':'s'}?`,acceptLabel:'Remove',rejectLabel:'Cancel',severity:'danger'}))return
    const path=`/api/x/core-timeline/days/${props.date}/slots/${encodeURIComponent(props.slot.id)}`
    if(action==='skip')await ss.api.put(path,{kind:'skip'})
    else await ss.api.delete(path,action==='remove'?{with_entries:'true'}:undefined)
    emit('changed')
  }catch(failure:any){error.value=failure.message||'Could not change slot'}finally{busy.value=false}
}
const actions=computed(()=>[{label:'Add another meal',icon:'pi pi-plus',command:add}, ...(props.slot.kind==='default'&&!props.slot.entries.length?[{label:'Skip on this day',command:()=>write('skip')}]:[]),...(props.slot.kind==='extra'&&!props.slot.synthetic?[{label:'Remove slot',icon:'pi pi-trash',command:()=>write('remove')}]:[])])
</script>
<template>
  <div class="meal-slot" :data-slot-id="slot.id">
    <div class="slot-header"><span class="slot-name" :class="{skipped:slot.skipped}">{{slot.label}} <i v-if="slot.kind==='extra'" class="pi pi-calendar-plus" v-tooltip="'Only on this day'" aria-label="Only on this day" /></span><Button v-if="!slot.skipped" icon="pi pi-ellipsis-h" size="small" text rounded aria-label="Slot actions" :disabled="busy" @click="menu.toggle($event)" /><Menu ref="menu" :model="actions" popup /></div>
    <Message v-if="error" severity="error">{{error}}</Message>
    <div v-if="slot.skipped" class="skipped-row"><span>Skipped this day</span><Button label="Undo" size="small" text :loading="busy" @click="write('undo')" /></div>
    <template v-else>
      <IntentTrigger v-for="entry in slot.entries" :key="entry.id" hub="entry:interact" :context="{entry,mealType:slot.id}" @resolve="emit('changed')"><template #default="{open}"><ScheduleCard :entry="entry" @interact="open" /></template></IntentTrigger>
      <Button v-if="!slot.entries.length" class="empty-slot-btn" icon="pi pi-plus" size="small" text aria-label="Add meal" @click="add" />
    </template>
  </div>
</template>
<style scoped>.meal-slot{padding:.25rem 0;border-top:1px solid var(--p-content-border-color)}.meal-slot:last-of-type{padding-bottom:0}.slot-header{display:flex;align-items:center;justify-content:space-between;min-height:1.25rem;margin-bottom:.125rem}.slot-header :deep(.p-button){width:1.375rem;height:1.375rem;padding:0}.slot-name{text-transform:uppercase;letter-spacing:.04em;color:var(--p-text-muted-color);font-size:.72rem;font-weight:600;line-height:1.2}.skipped{text-decoration:line-through}.skipped-row{display:flex;align-items:center;gap:.375rem;font-size:.8rem;color:var(--p-text-muted-color)}.skipped-row :deep(.p-button){padding:.1rem .375rem;font-size:.75rem}.empty-slot-btn{width:100%;border:1.5px dashed var(--p-content-border-color)!important;background:transparent!important;border-radius:var(--p-border-radius);padding:.175rem .375rem;min-height:1.5rem;font-size:.78rem;color:var(--p-text-muted-color)!important;justify-content:center;transition:border-color .15s ease,color .15s ease}.empty-slot-btn:hover{border-color:var(--p-primary-color)!important;color:var(--p-primary-color)!important}</style>

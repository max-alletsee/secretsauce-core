<script setup lang="ts">
import { computed, ref } from 'vue'
import { IntentTrigger, Slot, useSecretSauce } from '@secretsauce/ui'
import TimelineCard from './TimelineCard.vue'
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
    <span class="slot-name" :class="{skipped:slot.skipped}">{{slot.label}}<i v-if="slot.kind==='extra'" class="pi pi-calendar-plus extra-slot-icon" v-tooltip="'Only on this day'" aria-label="Only on this day" /></span>
    <div class="slot-body">
      <div v-if="slot.skipped" class="skipped-row"><span>Skipped this day</span><Button label="Undo" size="small" text :loading="busy" @click="write('undo')" /></div>
      <template v-else>
        <IntentTrigger v-for="entry in slot.entries" :key="entry.id" hub="entry:interact" :context="{entry,mealType:slot.id}" @resolve="emit('changed')"><template #default="{open}"><TimelineCard :entry="entry" @interact="open" /></template></IntentTrigger>
        <Slot name="timeline.slot.suggestions" :context="{date,slot,onChanged:()=>emit('changed')}" />
        <Button v-if="!slot.entries.length" class="empty-slot-btn" icon="pi pi-plus" size="small" text aria-label="Add meal" @click="add" />
      </template>
    </div>
    <div class="slot-actions"><Button v-if="!slot.skipped" icon="pi pi-ellipsis-h" size="small" text rounded aria-label="Slot actions" :disabled="busy" @click="menu.toggle($event)" /><Menu ref="menu" :model="actions" popup /></div>
    <Message v-if="error" class="slot-error" severity="error">{{error}}</Message>
  </div>
</template>
<style scoped>
.meal-slot{display:grid;grid-template-columns:6.25rem minmax(0,1fr) auto;align-items:start;column-gap:.5rem;row-gap:.2rem;padding:.225rem 0;border-top:1px solid var(--p-content-border-color);min-width:0}
.meal-slot:last-of-type{padding-bottom:0}
.slot-name{display:flex;align-items:center;flex-wrap:wrap;gap:.25rem;min-height:1.5rem;min-width:0;overflow-wrap:break-word;color:var(--p-text-muted-color);font-size:.85rem;font-weight:600;line-height:1.25}
.extra-slot-icon{font-size:.75rem}
.skipped{text-decoration:line-through}
.slot-body{display:grid;grid-template-columns:minmax(0,1fr);gap:.2rem;min-width:0;align-items:center}
.skipped-row{display:flex;align-items:center;flex-wrap:wrap;gap:.35rem;min-height:1.5rem;font-size:.8rem;color:var(--p-text-muted-color)}
.skipped-row :deep(.p-button){padding:.1rem .375rem;font-size:.75rem;min-height:0}
.slot-actions{display:flex;align-items:center;min-height:1.5rem}
.slot-actions :deep(.p-button){width:1.5rem;height:1.5rem;padding:0}
.slot-error{grid-column:1/-1}
.empty-slot-btn{justify-self:start;width:2rem;height:1.5rem;min-height:1.5rem;padding:0!important;border:1px dashed var(--p-content-border-color)!important;background:transparent!important;border-radius:var(--p-border-radius);font-size:.75rem;color:var(--p-text-muted-color)!important;justify-content:center;transition:border-color .15s ease,color .15s ease,background-color .15s ease}
.empty-slot-btn:not(:disabled):hover{border:1px dashed var(--p-primary-color)!important;color:var(--p-primary-color)!important;background:color-mix(in srgb,var(--p-primary-color) 6%,transparent)!important}
@media(max-width:480px){.meal-slot{grid-template-columns:5.25rem minmax(0,1fr) auto;column-gap:.375rem}.slot-name{font-size:.825rem}}
</style>

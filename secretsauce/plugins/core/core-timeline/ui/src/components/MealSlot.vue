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
    <div class="slot-header"><span class="slot-name" :class="{skipped:slot.skipped}">{{slot.label}} <i v-if="slot.kind==='extra'" class="pi pi-calendar-plus" v-tooltip="'Only on this day'" aria-label="Only on this day" /></span><Button v-if="!slot.skipped" icon="pi pi-ellipsis-h" text rounded aria-label="Slot actions" :disabled="busy" @click="menu.toggle($event)" /><Menu ref="menu" :model="actions" popup /></div>
    <Message v-if="error" severity="error">{{error}}</Message>
    <div v-if="slot.skipped" class="skipped-row"><span>Skipped this day</span><Button label="Undo" text :loading="busy" @click="write('undo')" /></div>
    <template v-else>
      <IntentTrigger v-for="entry in slot.entries" :key="entry.id" hub="entry:interact" :context="{entry}" @resolve="emit('changed')"><template #default="{open}"><ScheduleCard :entry="entry" @interact="open" /></template></IntentTrigger>
      <Button v-if="!slot.entries.length" label="Add meal" icon="pi pi-plus" text @click="add" />
    </template>
  </div>
</template>
<style scoped>.meal-slot{padding:.5rem 0;border-top:1px solid var(--p-content-border-color)}.slot-header{display:flex;align-items:center;justify-content:space-between}.slot-name{text-transform:uppercase;letter-spacing:.05em;color:var(--p-text-muted-color);font-size:.8rem;font-weight:600}.skipped{text-decoration:line-through}.skipped-row{display:flex;align-items:center;gap:.5rem;color:var(--p-text-muted-color)}</style>

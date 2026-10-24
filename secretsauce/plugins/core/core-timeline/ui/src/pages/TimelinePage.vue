<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Slot, useSecretSauce } from '@secretsauce/ui'
import DayCard from '../components/DayCard.vue'
import AddEntryDialog from '../components/AddEntryDialog.vue'
import { buildDays, shiftDate, type DateWindow, type ResolvedSlot, type ScheduleEntry } from '../days'
const ss=useSecretSauce()
function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const today=ref(localToday()),windowDates=ref<DateWindow>({from:shiftDate(today.value,-2),to:shiftDate(today.value,6)})
const entries=ref<ScheduleEntry[]>([]),slots=ref<Record<string,ResolvedSlot[]>>({}),error=ref(''),expanded=ref(new Set<string>()),active=ref<{date:string;mealType:string}|null>(null)
const phone=ref(window.innerWidth<768),widgetsOpen=ref<string[]>([])
const registry=inject<any>('__SS_SLOT_REGISTRY__')
const widgets=computed(()=>registry?.getContributions('timeline.sidebar')||[])
const days=computed(()=>buildDays(windowDates.value,slots.value,entries.value,today.value))
const past=computed(()=>days.value.filter(day=>day.isPast)),future=computed(()=>days.value.filter(day=>!day.isPast))
let revision=0,timer:ReturnType<typeof setTimeout>|undefined,disposed=false
async function load(){const n=++revision;const {from,to}=windowDates.value;error.value=''
  try{
    const schedule:ScheduleEntry[]=[],journal:any[]=[],resolved:Record<string,ResolvedSlot[]>={}
    // Bound all three APIs: schedule allows a 62-day difference (63 inclusive), slots 92 inclusive.
    for(let start=from;start<=to;){
      const end=shiftDate(start,62)<to?shiftDate(start,62):to
      const query={from:start,to:end}
      const [meals,history,daySlots]=await Promise.all([ss.api.get<ScheduleEntry[]>('/api/schedule',query),ss.api.get<any[]>('/api/journal',query),ss.api.get<{days:Record<string,ResolvedSlot[]>}>('/api/x/core-timeline/slots',query)])
      if(n!==revision||disposed)return
      schedule.push(...meals);journal.push(...history);Object.assign(resolved,daySlots.days)
      start=shiftDate(end,1)
    }
    const cooked=new Set(journal.filter(row=>row.status==='cooked').map(row=>row.schedule_entry_id));entries.value=schedule.map(entry=>({...entry,is_cooked:cooked.has(entry.id)}));slots.value=resolved
  }catch(failure:any){if(n===revision&&!disposed)error.value=failure.message||'Could not load Timeline'}
}
function refresh(){clearTimeout(timer);timer=setTimeout(load,300)}
const stops=['schedule:created','schedule:updated','schedule:deleted','journal:created','journal:updated','journal:deleted','core-timeline:slots-changed'].map(name=>ss.on(name,refresh))
function resize(){phone.value=window.innerWidth<768}
function earlier(){windowDates.value={...windowDates.value,from:shiftDate(windowDates.value.from,-2)};load()}
function more(){windowDates.value={...windowDates.value,to:shiftDate(windowDates.value.to,5)};load()}
async function reset(){today.value=localToday();windowDates.value={from:shiftDate(today.value,-2),to:shiftDate(today.value,6)};expanded.value.clear();await load();await nextTick();document.querySelector('.day-card.is-today')?.scrollIntoView?.({block:'start',behavior:'smooth'})}
function toggle(date:string){if(expanded.value.has(date))expanded.value.delete(date);else expanded.value.add(date)}
function pastLabel(date:string){return new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'})}
function summary(day:any){return day.slots.flatMap((slot:any)=>slot.entries.map((entry:any)=>`${slot.label.toUpperCase()} ${entry.recipe?.title||entry.title||'Planned meal'}`)).join(' · ')||'—'}
onMounted(()=>{load();window.addEventListener('resize',resize)})
onBeforeUnmount(()=>{disposed=true;++revision;clearTimeout(timer);stops.forEach(stop=>{if(typeof stop==='function')stop()});window.removeEventListener('resize',resize)})
</script>
<template>
  <div class="timeline-page">
    <div class="timeline-toolbar"><h2>Timeline</h2><Button label="Today" icon="pi pi-calendar" size="small" outlined @click="reset" /></div><Message v-if="error" severity="error">{{error}}</Message>
    <div class="timeline-container">
      <aside class="timeline-sidebar-wrapper">
        <Accordion v-if="phone" v-model:value="widgetsOpen" multiple><AccordionPanel v-for="widget in widgets" :key="widget.id" :value="widget.id"><AccordionHeader>{{widget.pluginId==='core-shortlist'?'Shortlist':widget.pluginId==='core-meal-planner-ai'?'AI meal suggestions':widget.pluginId}}</AccordionHeader><AccordionContent><component :is="widget.component" :context="windowDates" /></AccordionContent></AccordionPanel></Accordion>
        <Slot v-else name="timeline.sidebar" :context="windowDates" />
      </aside>
      <div class="timeline-feed"><Button label="Show 2 earlier days" size="small" text @click="earlier" />
        <div class="past-days"><div v-for="day in past" :key="day.date" :data-timeline-date="expanded.has(day.date)?undefined:day.date"><Button class="past-day-line" :label="`${pastLabel(day.date)} · ${summary(day)}`" size="small" text :aria-expanded="expanded.has(day.date)" @click="toggle(day.date)" /><DayCard v-if="expanded.has(day.date)" :day="day" @add="active=$event" @changed="load" /></div></div>
        <DayCard v-for="day in future" :key="day.date" :day="day" @add="active=$event" @changed="load" />
        <Button label="Show 5 more days" size="small" outlined @click="more" />
      </div>
    </div>
    <AddEntryDialog :visible="!!active" :date="active?.date||today" :mealType="active?.mealType||''" @update:visible="value=>{if(!value)active=null}" @created="load" />
  </div>
</template>
<style scoped>
.timeline-page{padding:.625rem .75rem;max-width:75rem;margin:auto;display:grid;gap:.5rem}.timeline-toolbar{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.timeline-toolbar h2{margin:0;font-size:1.15rem;line-height:1.2}.timeline-toolbar :deep(.p-button){padding:.25rem .5rem;font-size:.8125rem}.timeline-container{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:.625rem;align-items:start}.timeline-sidebar-wrapper{grid-column:2;grid-row:1;display:grid;gap:.5rem;min-width:0}.timeline-sidebar-wrapper :deep(.p-accordion){display:grid;grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr));gap:.375rem}.timeline-sidebar-wrapper :deep(.p-accordionpanel){border:1px solid var(--p-content-border-color);border-radius:var(--p-border-radius);overflow:hidden}.timeline-sidebar-wrapper :deep(.p-accordionpanel:has([aria-expanded="true"])){grid-column:1/-1}.timeline-sidebar-wrapper :deep(.p-accordionheader){padding:.3rem .5rem;font-size:.78rem}.timeline-sidebar-wrapper :deep(.p-accordioncontent-content){padding:.375rem .5rem}.timeline-feed{grid-column:1;grid-row:1;display:grid;gap:.5rem;min-width:0}.timeline-feed > :deep(.p-button){padding:.2rem .5rem;font-size:.8rem}.past-days{padding:.2rem .375rem;border:1px solid var(--p-content-border-color);border-radius:var(--p-content-border-radius);background:var(--p-surface-50);display:grid;gap:.125rem}.past-day-line{width:100%;justify-content:flex-start;text-align:left;padding:.15rem .375rem;font-size:.78rem;line-height:1.2;min-height:0}.past-day-line :deep(.p-button-label){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.past-days .day-card{margin:.25rem 0}
@media(max-width:1023px){.timeline-container{display:flex;flex-direction:column;gap:.375rem}.timeline-sidebar-wrapper,.timeline-feed{width:100%}}
@media(max-width:767px){.timeline-page{padding:.375rem .5rem;gap:.375rem}.timeline-feed{gap:.375rem}}
</style>

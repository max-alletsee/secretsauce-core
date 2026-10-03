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
function summary(day:any){return day.slots.flatMap((slot:any)=>slot.entries.map((entry:any)=>`${slot.label.toUpperCase()} ${entry.recipe?.title||entry.title||'Planned meal'}`)).join(' · ')||'Nothing planned'}
onMounted(()=>{load();window.addEventListener('resize',resize)})
onBeforeUnmount(()=>{disposed=true;++revision;clearTimeout(timer);stops.forEach(stop=>{if(typeof stop==='function')stop()});window.removeEventListener('resize',resize)})
</script>
<template>
  <div class="timeline-page">
    <div class="timeline-toolbar"><h2>Timeline</h2><Button label="Today" icon="pi pi-calendar" outlined @click="reset" /></div><Message v-if="error" severity="error">{{error}}</Message>
    <div class="timeline-container">
      <aside class="timeline-sidebar-wrapper">
        <Accordion v-if="phone" v-model:value="widgetsOpen" multiple><AccordionPanel v-for="widget in widgets" :key="widget.id" :value="widget.id"><AccordionHeader>{{widget.pluginId==='core-shortlist'?'Shortlist':widget.pluginId==='core-meal-planner-ai'?'AI meal suggestions':widget.pluginId}}</AccordionHeader><AccordionContent><component :is="widget.component" :context="windowDates" /></AccordionContent></AccordionPanel></Accordion>
        <Slot v-else name="timeline.sidebar" :context="windowDates" />
      </aside>
      <div class="timeline-feed"><Button label="Show 2 earlier days" text @click="earlier" />
        <div class="past-days"><div v-for="day in past" :key="day.date" :data-timeline-date="expanded.has(day.date)?undefined:day.date"><Button class="past-day-line" :label="`${pastLabel(day.date)} · ${summary(day)}`" text :aria-expanded="expanded.has(day.date)" @click="toggle(day.date)" /><DayCard v-if="expanded.has(day.date)" :day="day" @add="active=$event" @changed="load" /></div></div>
        <DayCard v-for="day in future" :key="day.date" :day="day" @add="active=$event" @changed="load" />
        <Button label="Show 5 more days" outlined @click="more" />
      </div>
    </div>
    <AddEntryDialog :visible="!!active" :date="active?.date||today" :mealType="active?.mealType||''" @update:visible="value=>{if(!value)active=null}" @created="load" />
  </div>
</template>
<style scoped>
.timeline-page{padding:1rem;max-width:75rem;margin:auto}.timeline-toolbar{display:flex;align-items:center;justify-content:space-between;gap:1rem}.timeline-container{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:1rem;align-items:start}.timeline-sidebar-wrapper{grid-column:2;grid-row:1;display:grid;gap:1rem;min-width:0}.timeline-feed{grid-column:1;grid-row:1;display:grid;gap:1rem;min-width:0}.past-days{padding:.5rem;border:1px solid var(--p-content-border-color);border-radius:var(--p-content-border-radius);background:var(--p-surface-50)}.past-day-line{width:100%;justify-content:flex-start;text-align:left}.past-days .day-card{margin-bottom:.5rem}
@media(max-width:1023px){.timeline-container{display:flex;flex-direction:column}.timeline-sidebar-wrapper,.timeline-feed{width:100%}}
@media(max-width:767px){.timeline-page{padding:.75rem}}
</style>

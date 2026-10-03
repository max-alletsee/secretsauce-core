<script setup lang="ts">
import { ref } from 'vue'
import { Slot } from '@secretsauce/ui'
import MealSlot from './MealSlot.vue'
import AddSlotDialog from './AddSlotDialog.vue'
import type { DayVM } from '../days'
defineProps<{day:DayVM}>()
const emit=defineEmits<{add:[payload:{date:string;mealType:string}];changed:[]}>()
const menu=ref(),adding=ref(false)
const actions=[{label:'Add slot for this day',icon:'pi pi-calendar-plus',command:()=>{adding.value=true}}]
function label(date:string){return new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'})}
</script>
<template>
  <section class="day-card" :class="{'is-today':day.isToday}" :data-timeline-date="day.date">
    <header><h3>{{label(day.date)}}</h3><Tag v-if="day.isToday" value="Today" /><Button icon="pi pi-ellipsis-v" text rounded aria-label="Day actions" @click="menu.toggle($event)" /><Menu ref="menu" :model="actions" popup /></header>
    <MealSlot v-for="slot in day.slots" :key="slot.id" :slot="slot" :date="day.date" @add="emit('add',$event)" @changed="emit('changed')" />
    <Slot name="timeline.day.footer" :context="{date:day.date}" />
    <AddSlotDialog v-model:visible="adding" :date="day.date" :slots="day.slots" @changed="emit('changed')" />
  </section>
</template>
<style scoped>.day-card{padding:1rem;background:var(--p-content-background);border:1px solid var(--p-content-border-color);border-radius:var(--p-content-border-radius)}.is-today{border:2px solid var(--p-primary-color)}header{display:flex;gap:.75rem;align-items:center;margin-bottom:.5rem}h3{margin:0;flex:1;font-size:1rem}</style>

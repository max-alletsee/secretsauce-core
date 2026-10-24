<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSecretSauce } from '@secretsauce/ui'
import { slugMealType } from '../../../../../../../shell/src/settings/mealSlots'
import type { ResolvedSlot } from '../days'
const props = defineProps<{ visible: boolean; date: string; slots: ResolvedSlot[] }>()
const emit = defineEmits<{ 'update:visible': [value: boolean]; changed: [] }>()
const ss = useSecretSauce(), name = ref(''), before = ref<string | null>(null), busy = ref(false), error = ref('')
const positions = computed(() => [{label:'At the end',value:null}, ...props.slots.filter(slot=>slot.kind==='default').map(slot=>({label:`Before ${slot.label}`,value:slot.id}))])
watch(()=>props.visible, visible=>{if(visible){name.value=''; before.value=null; error.value=''}})
async function add() {
  if(!name.value.trim() || busy.value) return
  busy.value=true; error.value=''
  try { const id=slugMealType(name.value, [...props.slots.map(slot=>slot.id), ...ss.store.household.value.meal_types.map(slot=>slot.id)])
    await ss.api.put(`/api/x/core-timeline/days/${props.date}/slots/${id}`, {kind:'extra',label:name.value.trim(),before:before.value})
    emit('changed'); emit('update:visible',false)
  } catch(failure:any){error.value=failure.message || 'Could not add slot'} finally{busy.value=false}
}
</script>
<template>
  <Dialog :visible="visible" @update:visible="emit('update:visible',$event)" header="Add slot for this day" modal :style="{width:'28rem',maxWidth:'95vw'}">
    <form @submit.prevent="add"><Message v-if="error" severity="error">{{error}}</Message>
      <label for="extra-slot-name">Slot name</label><InputText id="extra-slot-name" v-model="name" maxlength="64" required />
      <label for="extra-slot-position">Position</label><Select inputId="extra-slot-position" aria-label="Position" v-model="before" :options="positions" optionLabel="label" optionValue="value" />
      <Button label="Add slot" type="submit" :loading="busy" :disabled="!name.trim()" />
    </form>
  </Dialog>
</template>
<style scoped>form{display:grid;gap:.5rem}</style>

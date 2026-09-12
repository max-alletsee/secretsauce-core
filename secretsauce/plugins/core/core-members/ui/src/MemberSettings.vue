<script setup lang="ts">
import { ref, inject } from 'vue'
import { useMemberStore } from '@/stores/member'

const memberStore = useMemberStore()
const api = inject<any>('__SS_API__')

const showAddModal = ref(false)
const newName = ref('')
const newLanguage = ref('en')
const newColor = ref('#0284c7')
const newServingRatio = ref(1.0)
const newRestrictions = ref('')
const newAllergies = ref('')

async function createMember() {
  if (!newName.value.trim() || !api) return
  const payload = {
    name: newName.value.trim(),
    preferred_language: newLanguage.value,
    avatar_color: newColor.value,
    serving_ratio: Number(newServingRatio.value) || 1.0,
    dietary_restrictions: newRestrictions.value.split(',').map(s => s.trim()).filter(Boolean),
    allergies: newAllergies.value.split(',').map(s => s.trim()).filter(Boolean),
  }
  const created = await api.post('/api/members', payload)
  memberStore.addMember(created)
  newName.value = ''
  newRestrictions.value = ''
  newAllergies.value = ''
  showAddModal.value = false
}

async function deleteMember(id: string, revision: number) {
  if (!confirm('Are you sure you want to remove this member?') || !api) return
  await api.delete(`/api/members/${id}?revision=${revision}`)
  memberStore.removeMember(id)
}
</script>

<template>
  <div class="ss-member-settings">
    <div class="header-row">
      <p class="description">Manage profiles, preferences, and dietary restrictions for household members.</p>
      <button class="btn-primary" @click="showAddModal = true">+ Add Member</button>
    </div>

    <div class="members-grid">
      <div v-for="m in memberStore.members" :key="m.id" class="member-card">
        <div class="member-card-header">
          <div class="avatar" :style="{ backgroundColor: m.avatar_color || '#0284c7' }">
            {{ m.name ? m.name.slice(0, 1).toUpperCase() : '?' }}
          </div>
          <div>
            <strong>{{ m.name }}</strong>
            <div class="subtext">Lang: {{ m.preferred_language }} · Ratio: {{ m.serving_ratio }}x</div>
          </div>
          <button class="btn-danger" @click="deleteMember(m.id, m.revision)">Delete</button>
        </div>
        <div class="tags" v-if="m.dietary_restrictions?.length || m.allergies?.length">
          <span v-for="tag in m.dietary_restrictions" :key="tag" class="tag tag-dietary">{{ tag }}</span>
          <span v-for="tag in m.allergies" :key="tag" class="tag tag-allergy">Allergy: {{ tag }}</span>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-backdrop">
      <div class="modal">
        <h3>Add Household Member</h3>
        <div class="form-group">
          <label>Name</label>
          <input v-model="newName" type="text" placeholder="Name" class="input" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Language</label>
            <input v-model="newLanguage" type="text" placeholder="en, de, etc." class="input" />
          </div>
          <div class="form-group">
            <label>Serving Ratio</label>
            <input v-model="newServingRatio" type="number" step="0.1" min="0.1" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>Avatar Color</label>
          <input v-model="newColor" type="color" class="color-picker" />
        </div>
        <div class="form-group">
          <label>Dietary Restrictions (comma-separated)</label>
          <input v-model="newRestrictions" type="text" placeholder="vegetarian, gluten-free" class="input" />
        </div>
        <div class="form-group">
          <label>Allergies (comma-separated)</label>
          <input v-model="newAllergies" type="text" placeholder="nuts, dairy" class="input" />
        </div>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showAddModal = false">Cancel</button>
          <button class="btn-primary" @click="createMember">Save Member</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss-member-settings { margin-top: 12px; }
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.description { color: #57534e; margin: 0; }
.members-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.member-card { border: 1px solid #e7e5e4; border-radius: 8px; padding: 16px; background: white; }
.member-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.subtext { font-size: 0.85em; color: #78716c; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag { font-size: 0.75em; padding: 2px 6px; border-radius: 4px; }
.tag-dietary { background: #e0f2fe; color: #0369a1; }
.tag-allergy { background: #fee2e2; color: #b91c1c; }
.btn-primary { background: #0284c7; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: #f5f5f4; border: 1px solid #d6d3d1; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.btn-danger { background: transparent; border: 1px solid #fca5a5; color: #b91c1c; padding: 4px 8px; border-radius: 4px; margin-left: auto; cursor: pointer; font-size: 0.8em; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: white; padding: 24px; border-radius: 8px; width: 420px; max-width: 90vw; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 0.85em; font-weight: 500; margin-bottom: 4px; }
.form-row { display: flex; gap: 12px; }
.input { width: 100%; padding: 8px; border: 1px solid #d6d3d1; border-radius: 4px; box-sizing: border-box; }
.color-picker { width: 100%; height: 36px; border: 1px solid #d6d3d1; border-radius: 4px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
</style>

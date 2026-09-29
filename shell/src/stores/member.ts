import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Member, ApiClient } from '@secretsauce/ui'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])
  const currentMember = ref<Member | null>(null)

  function setMembers(list: Member[]) {
    members.value = list
    let storedId: string | null = null
    try { storedId = localStorage.getItem('ss-current-member') } catch { /* optional storage */ }
    if (storedId) {
      currentMember.value = list.find((m) => m.id === storedId) || list[0] || null
    } else if (list.length > 0) {
      currentMember.value = list[0]
      try { localStorage.setItem('ss-current-member', list[0].id) } catch { /* optional storage */ }
    }
  }

  function setCurrentMember(id: string) {
    const target = members.value.find((m) => m.id === id)
    if (target) {
      currentMember.value = target
      try { localStorage.setItem('ss-current-member', id) } catch { /* optional storage */ }
    }
  }

  async function fetchMembers(api: ApiClient) {
    try {
      const res = await api.get<any>('/api/members')
      const list = Array.isArray(res) ? res : res?.items || []
      setMembers(list)
    } catch {
      // offline fallback
    }
  }

  function addMember(m: Member) {
    members.value.push(m)
    if (!currentMember.value) {
      currentMember.value = m
    }
  }

  function removeMember(id: string) {
    members.value = members.value.filter((m) => m.id !== id)
    if (currentMember.value?.id === id) {
      currentMember.value = members.value[0] || null
    }
  }

  return { members, currentMember, setMembers, setCurrentMember, addMember, removeMember, fetchMembers }
})

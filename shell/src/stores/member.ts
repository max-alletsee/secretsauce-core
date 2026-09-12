import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Member, ApiClient } from '@secretsauce/ui'

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([])
  const currentMember = ref<Member | null>(null)

  function setMembers(list: Member[]) {
    members.value = list
    const storedId = localStorage.getItem('ss-current-member')
    if (storedId) {
      currentMember.value = list.find((m) => m.id === storedId) || list[0] || null
    } else if (list.length > 0) {
      currentMember.value = list[0]
      localStorage.setItem('ss-current-member', list[0].id)
    }
  }

  function setCurrentMember(id: string) {
    const target = members.value.find((m) => m.id === id)
    if (target) {
      currentMember.value = target
      localStorage.setItem('ss-current-member', id)
    }
  }

  async function fetchMembers(api: ApiClient) {
    try {
      const res = await api.get<{ items: Member[] }>('/api/members')
      setMembers(res.items || [])
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

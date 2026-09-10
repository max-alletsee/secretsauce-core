import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Household, ApiClient } from '@secretsauce/ui'

export const useHouseholdStore = defineStore('household', () => {
  const household = ref<Household>({
    household_name: 'SecretSauce',
    meal_types: [],
    languages: { primary: 'en' },
    units: 'metric',
  })

  async function fetchHousehold(api: ApiClient) {
    try {
      const res = await api.get<Household>('/api/household')
      household.value = res
    } catch {
      // offline fallback
    }
  }

  return { household, fetchHousehold }
})

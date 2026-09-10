import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const online = ref(true)
  const bootId = ref(
    typeof window !== 'undefined' ? (window as any).__SS__?.boot_id || 'dev' : 'dev'
  )
  const basePath = ref(
    typeof window !== 'undefined' ? (window as any).__SS__?.base_path || '/' : '/'
  )
  const version = ref(
    typeof window !== 'undefined' ? (window as any).__SS__?.version || '1.0.0' : '1.0.0'
  )

  return { online, bootId, basePath, version }
})

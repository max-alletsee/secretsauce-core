import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMemberStore } from './member'
import { createThemeRegistry } from '../theme'
import type { ApiClient } from '@secretsauce/ui'

describe('Shell Stores & Theming', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('persists selected currentMember in localStorage', () => {
    const store = useMemberStore()
    store.setMembers([
      { id: 'm1', name: 'Alice' } as any,
      { id: 'm2', name: 'Bob' } as any,
    ])
    store.setCurrentMember('m2')
    expect(store.currentMember?.name).toBe('Bob')
    expect(localStorage.getItem('ss-current-member')).toBe('m2')
  })

  it('registers and applies themes', () => {
    const reg = createThemeRegistry()
    reg.register({ id: 'dark-orange', label: 'Dark Orange', preset: {} })
    expect(reg.getThemes()).toHaveLength(2) // Aura + dark-orange
    reg.setTheme('dark-orange')
    expect(reg.currentTheme.value).toBe('dark-orange')
    expect(localStorage.getItem('ss-theme')).toBe('dark-orange')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createThemeRegistry } from '../src/theme'

afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })

describe('live device themes', () => {
  it('applies the stored preset and permits switching to plugin themes', () => {
    localStorage.setItem('ss-theme', 'material-indigo')
    const apply = vi.fn(), registry = createThemeRegistry(apply)
    expect(registry.currentTheme.value).toBe('material-indigo')
    expect(apply).toHaveBeenCalledWith(registry.getThemes().find(t => t.id === 'material-indigo')!.preset)
    const custom = { id: 'custom', label: 'Custom', preset: { semantic: { primary: { 500: '#123456' } } } }
    registry.register(custom)
    registry.setTheme('custom')
    expect(registry.currentTheme.value).toBe('custom')
    expect(localStorage.getItem('ss-theme')).toBe('custom')
    expect(apply).toHaveBeenLastCalledWith(custom.preset)
  })

  it('falls back from an unknown stored theme to a working preset', () => {
    localStorage.setItem('ss-theme', 'removed')
    const apply = vi.fn(), registry = createThemeRegistry(apply)
    expect(registry.currentTheme.value).toBe('aura-tomato')
    expect(apply).toHaveBeenCalledWith(registry.getThemes()[0].preset)
  })

  it('can boot and apply a theme when device storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    const apply = vi.fn(), registry = createThemeRegistry(apply)
    registry.setTheme('lara-amber')
    expect(registry.currentTheme.value).toBe('lara-amber')
    expect(apply).toHaveBeenLastCalledWith(registry.getThemes().find(t => t.id === 'lara-amber')!.preset)
  })
})

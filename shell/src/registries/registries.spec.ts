import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { createRouteRegistry } from './routes'
import { createSlotRegistry } from './slots'
import { createIntentRegistry } from './intents'
import { createI18nRegistry } from './i18n'

describe('Shell Registries', () => {
  it('replaces route with same path when registered with lower order', () => {
    const reg = createRouteRegistry()
    const CompCore = defineComponent({ render: () => h('div', 'Core') })
    const CompCustom = defineComponent({ render: () => h('div', 'Custom') })

    reg.register('core-recipes', { path: '/recipes', component: CompCore, order: 100 })
    expect(reg.getRoutes()[0].component).toBe(CompCore)

    // Higher priority (lower order number) replaces it
    reg.register('my-plugin', { path: '/recipes', component: CompCustom, order: 50 })
    expect(reg.getRoutes()).toHaveLength(1)
    expect(reg.getRoutes()[0].component).toBe(CompCustom)

    // Unregistering my-plugin restores core-recipes
    reg.unregister('my-plugin')
    expect(reg.getRoutes()).toHaveLength(1)
    expect(reg.getRoutes()[0].component).toBe(CompCore)
  })

  it('dynamically adds routes to bound router', () => {
    const added: any[] = []
    const removed: string[] = []
    const mockRouter: any = {
      hasRoute: (name: string) => added.some((r) => r.name === name),
      addRoute: (r: any) => added.push(r),
      removeRoute: (name: string) => {
        removed.push(name)
        const idx = added.findIndex((r) => r.name === name)
        if (idx !== -1) added.splice(idx, 1)
      },
    }

    const reg = createRouteRegistry()
    reg.bindRouter(mockRouter)

    const Comp = defineComponent({ render: () => h('div', 'Test') })
    reg.register('core-recipes', { path: '/recipes', component: Comp })

    expect(added).toHaveLength(1)
    expect(added[0].path).toBe('/recipes')

    reg.unregister('core-recipes')
    expect(removed).toContain('/recipes')
    expect(added).toHaveLength(0)
  })

  it('holds intent providers until hub is registered', () => {
    const reg = createIntentRegistry()
    reg.registerProvider('plugin-a', {
      hub: 'recipe:create',
      id: 'import-url',
      title: 'Import',
      order: 10,
      kind: 'headless',
    })
    expect(reg.getProviders('recipe:create')).toHaveLength(0)

    reg.registerHub({ id: 'recipe:create', title: 'Create Recipe' })
    expect(reg.getProviders('recipe:create')).toHaveLength(1)
  })

  it('translates messages with {param} placeholders', () => {
    const i18n = createI18nRegistry()
    i18n.add('de', { welcome: 'Willkommen, {name}!' })
    expect(i18n.t('welcome', { name: 'Alice' }, 'de')).toBe('Willkommen, Alice!')
  })
})

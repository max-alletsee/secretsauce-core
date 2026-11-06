import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pluginHarness } from '../helpers/pluginHarness'

const modules = import.meta.glob('../../../secretsauce/plugins/core/*/ui/src/index.ts', { eager: true }) as Record<string, { default: Function }>
const icons = readFileSync(resolve(process.cwd(), 'node_modules/primeicons/primeicons.css'), 'utf8')
const sources: Record<string, string> = {}
function scan(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) scan(path)
    else if (/\.(ts|vue)$/.test(entry.name)) sources[path] = readFileSync(path, 'utf8')
  }
}
const core = resolve(process.cwd(), '../secretsauce/plugins/core')
for (const plugin of readdirSync(core)) {
  const source = join(core, plugin, 'ui/src')
  if (plugin.startsWith('core-') && existsSync(source)) scan(source)
}
const api = { get: async () => [], post: async () => ({}), put: async () => ({}), delete: async () => {}, patch: async () => ({}) }

describe('all core activation contracts', () => {
  it('all_core_plugin_registrations_have_rendered_consumers', () => {
    const harness = pluginHarness(api as any)
    const registrationErrors: unknown[] = []
    const diagnostic = vi.spyOn(console, 'error').mockImplementation((...args) => registrationErrors.push(args))
    try {
      expect(Object.keys(modules).length).toBeGreaterThan(10)
      for (const [path, module] of Object.entries(modules)) {
        const id = path.match(/core\/([^/]+)\/ui/)![1]
        module.default(harness.ss(id))
      }
      expect(registrationErrors).toEqual([])
      const slots = ['shell.header.right', 'recipe.card.actions', 'recipe.list.filters', 'recipe.detail.sidebar',
        'recipe.detail.actions', 'recipe.detail.customize', 'recipe.edit.actions', 'plugin_manager.plugin.actions',
        'timeline.sidebar', 'timeline.slot.suggestions', 'timeline.entry.badge', 'timeline.entry.footer']
      for (const contribution of harness.slots.slots.value) expect(slots, contribution.pluginId).toContain(contribution.slotName)
      for (const provider of harness.intents.providers.value) {
        expect(['recipe:create', 'recipe:actions', 'entry:interact'], provider.id).toContain(provider.hub)
        expect(harness.intents.hubs.value.has(provider.hub)).toBe(true)
        expect(provider.kind === 'ui' ? provider.component : provider.execute).toBeTruthy()
      }
      for (const { def } of harness.routes.entries.value) {
        expect((def as any).meta?.nav, def.path).toBeUndefined()
        if (!def.nav) continue
        expect(def.nav.label).toBeTruthy()
        expect(Number.isFinite(def.nav.order)).toBe(true)
        expect(icons, def.path).toContain(`.pi-${def.nav.icon}:before`)
      }
      expect(harness.routes.getRoutes().find(route => route.path === '/shopping-list')?.nav).toEqual({ label: 'Shopping list', icon: 'shopping-cart', order: 30 })
    } finally { diagnostic.mockRestore() }
  })
  it('plugins consume globals rather than bundling private PrimeVue copies', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30)
    for (const [path, source] of Object.entries(sources)) {
      expect(source, path).not.toMatch(/(?:from\s*|import\s*\()\s*['"](?:primevue|@primevue|@primeuix)(?:\/|['"])/)
    }
  })
})

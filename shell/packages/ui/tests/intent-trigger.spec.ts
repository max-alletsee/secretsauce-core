import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import IntentTrigger from '../src/IntentTrigger.vue'
import { mountWithUi } from '../../../tests/helpers/mountWithUi'
import { pluginHarness } from '../../../tests/helpers/pluginHarness'
import type { IntentProvider } from '../src/types'

const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); document.body.innerHTML = '' })
function render(providers: Partial<IntentProvider>[], options: Record<string, any> = {}) {
  const harness = pluginHarness({} as any)
  const ss = harness.ss('intent-test')
  ss.intent.hub({ id: 'recipe:create', title: 'Create' })
  providers.forEach((provider, index) => ss.intent.provider({ id: String(index), hub: 'recipe:create', title: 'Create', order: index, kind: 'headless', execute: () => 'done', ...provider } as IntentProvider))
  const wrapper = mountWithUi(IntentTrigger, { props: { hub: 'recipe:create', context: { item: 1 }, ...options.props },
    slots: options.slots, attachTo: document.body, global: { provide: harness.provide } })
  wrappers.push(wrapper)
  return wrapper
}
const ui = defineComponent({ props: ['context'], emits: ['resolve', 'cancel'], template: `<div><Button label="Finish" @click="$emit('resolve', context.item)"/><Button label="Cancel draft" @click="$emit('cancel')"/></div>` })

describe('IntentTrigger through production registration and controls', () => {
  it('renders nothing when unavailable providers are filtered out', () => {
    expect(render([{ isAvailable: () => false }]).find('button').exists()).toBe(false)
  })
  it('runs a single headless provider and resolves its actual result', async () => {
    const execute = vi.fn().mockResolvedValue('done')
    const wrapper = render([{ execute }])
    await wrapper.find('button').trigger('click'); await flushPromises()
    expect(execute).toHaveBeenCalledWith({ item: 1 })
    expect(wrapper.emitted('resolve')).toEqual([['done']])
  })
  it('anchors a popup Menu to a scoped trigger and executes the selected provider', async () => {
    const execute = vi.fn().mockResolvedValue('chosen')
    const wrapper = render([{ title: 'First' }, { title: 'Second', execute }], { slots: { default: ({ open }: any) => h('button', { id: 'anchor', onClick: open }, 'Open card') } })
    await wrapper.find('#anchor').trigger('click'); await flushPromises()
    expect(document.querySelector('.p-menu-overlay')).not.toBeNull()
    const choices = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]'))
    choices.find(choice => choice.textContent?.includes('Second'))!.querySelector<HTMLElement>('a')!.click(); await flushPromises()
    expect(execute).toHaveBeenCalledOnce()
    expect(wrapper.emitted('resolve')).toEqual([['chosen']])
  })
  it('disabled_provider_explains_why_without_running', async () => {
    const execute = vi.fn()
    const wrapper = render([{ title: 'Available' }, { title: 'Disabled', execute, disabledReason: () => 'Needs an API key' }])
    await wrapper.find('button').trigger('click'); await flushPromises()
    const disabled = Array.from(document.querySelectorAll<HTMLElement>('[role=menuitem]')).find(item => item.textContent?.includes('Disabled'))!
    const link = disabled.querySelector<HTMLElement>('a')!
    link.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(document.querySelector('.p-tooltip-text')?.textContent).toBe('Needs an API key')
    link.click(); await flushPromises()
    expect(execute).not.toHaveBeenCalled()
    expect(wrapper.emitted('resolve')).toBeUndefined()
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })
  it.each(['Finish', 'Cancel draft', 'Close'])('UI provider settles exactly once through %s', async label => {
    const wrapper = render([{ kind: 'ui', component: ui, title: 'Draft' }])
    await wrapper.find('button').trigger('click'); await flushPromises()
    const dialog = document.querySelector('[role=dialog]')!
    expect(dialog.textContent).toContain('Draft')
    const button = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent === label || button.getAttribute('aria-label') === label)!
    button.click(); await flushPromises()
    if (label === 'Finish') {
      expect(wrapper.emitted('resolve')).toEqual([[1]])
      expect(wrapper.emitted('cancel')).toBeUndefined()
    } else expect(wrapper.emitted('cancel')).toEqual([[]])
    expect(document.querySelector('[role=dialog]')).toBeNull()
  })
  it('surfaces failed headless work without emitting a successful resolution', async () => {
    const wrapper = render([{ execute: async () => { throw new Error('Write failed') } }])
    await wrapper.find('button').trigger('click'); await flushPromises()
    expect(wrapper.text()).toContain('Write failed')
    expect(wrapper.emitted('resolve')).toBeUndefined()
  })
})

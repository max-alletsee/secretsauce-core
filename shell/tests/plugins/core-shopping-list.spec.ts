import { describe, it, expect, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-shopping-list/ui/src/index'
import { registeredRoute, clickButton } from '../helpers/registeredPlugin'
const wrappers: VueWrapper[] = []
afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); document.body.innerHTML = '' })
const ingredient = { key: 'carrots_g', name: 'Carrots', quantity: 400, unit: 'g', category: 'Produce', checked: false, source_type: 'scheduled_recipe', sources: [{ recipe_title: 'Soup', scaled_qty: 400, date: '2026-09-28' }] }
describe('registered shopping page (API boundary double)', () => {
  it('sends real date query, toggles an aggregate and adds an extra item', async () => {
    const items = [{ ...ingredient }]
    const { wrapper } = await registeredRoute(activate, 'core-shopping-list', {
      get: async (path: string, query: any) => { expect(path).toBe('/api/x/core-shopping-list'); expect(query.from_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(query.to_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); return { items: items.map(i => ({ ...i })), from_date: query.from_date, to_date: query.to_date } },
      post: async (path: string, body: any) => {
        if (path === '/api/x/core-shopping-list/toggle') { expect(body).toEqual({ key: 'carrots_g', checked: true }); items[0].checked = true; return body }
        if (path === '/api/x/core-shopping-list/items') { expect(body).toEqual({ name: 'Coffee', quantity: null, unit: undefined, category: 'Other' }); items.push({ ...ingredient, key: 'coffee_', name: 'Coffee' }); return { id: 'manual-1', ...body, checked: false, created_at: '2026-09-28T12:00:00Z', updated_at: '2026-09-28T12:00:00Z' } }
        throw new Error(`Unexpected POST ${path}`)
      },
    } as any, '/shopping-list')
    wrappers.push(wrapper)
    expect(wrapper.text()).toContain('400 g')
    await wrapper.find('input[type=checkbox]').setValue(true); await flushPromises()
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(true)
    await wrapper.find('#extra-name').setValue('Coffee'); await clickButton('Add item')
    expect(wrapper.text()).toContain('Coffee')
  })
  it('does not keep a checked item when the write fails', async () => {
    const { wrapper } = await registeredRoute(activate, 'core-shopping-list', { get: async () => ({ items: [{ ...ingredient }] }), post: async () => { throw new Error('Could not save checked state') } } as any, '/shopping-list')
    wrappers.push(wrapper)
    await wrapper.find('input[type=checkbox]').setValue(true); await flushPromises()
    expect(wrapper.text()).toContain('Could not save checked state')
    expect((wrapper.find('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false)
  })
})

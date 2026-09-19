import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ShoppingListPage from '../../../secretsauce/plugins/core/core-shopping-list/ui/src/ShoppingListPage.vue'
import activate from '../../../secretsauce/plugins/core/core-shopping-list/ui/src/index'

describe('core-shopping-list UI', () => {
  it('loads items, toggles checkbox, and adds manual item', async () => {
    const mockItems = [
      {
        key: 'pasta_g',
        name: 'Pasta',
        quantity: 500,
        unit: 'g',
        category: 'Pantry',
        checked: false,
        source_type: 'scheduled_recipe',
        sources: [{ recipe_title: 'Bolognese' }],
      },
      {
        key: 'milk_l',
        name: 'Milk',
        quantity: 1,
        unit: 'L',
        category: 'Dairy & Eggs',
        checked: true,
        source_type: 'staple',
      },
    ]

    const mockApi = {
      get: vi.fn((url: string) => {
        if (url.includes('/staples')) {
          return Promise.resolve([
            { id: 'st-1', name: 'Salt', default_quantity: 1, unit: 'kg', always_include: true },
          ])
        }
        return Promise.resolve({ items: mockItems })
      }),
      post: vi.fn((url: string, payload: any) => {
        if (url.includes('/toggle')) {
          return Promise.resolve({ key: payload.key, checked: payload.checked })
        }
        if (url.includes('/items')) {
          return Promise.resolve({ id: 'item-new', ...payload })
        }
        return Promise.resolve({})
      }),
      delete: vi.fn().mockResolvedValue({ status: 'deleted' }),
    }

    const wrapper = mount(ShoppingListPage, {
      props: {
        ss: { api: mockApi },
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    // Check items rendered
    expect(wrapper.text()).toContain('Pasta')
    expect(wrapper.text()).toContain('Milk')
    expect(wrapper.text()).toContain('500 g')

    // Toggle checkbox on Pasta
    const checkboxes = wrapper.findAll('input.item-checkbox')
    expect(checkboxes.length).toBe(2)
    await checkboxes[0].trigger('change')

    expect(mockApi.post).toHaveBeenCalledWith('/api/x/core-shopping-list/toggle', {
      key: 'pasta_g',
      checked: true,
    })

    // Add manual item
    const nameInput = wrapper.find('input.input-new-item')
    await nameInput.setValue('Avocados')
    const addBtn = wrapper.find('button.btn-add-item')
    await addBtn.trigger('submit')

    expect(mockApi.post).toHaveBeenCalledWith(
      '/api/x/core-shopping-list/items',
      expect.objectContaining({ name: 'Avocados' })
    )

    // Switch to Staples tab
    const staplesTabBtn = wrapper.find('button.tab-staples')
    await staplesTabBtn.trigger('click')

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 20))

    expect(wrapper.text()).toContain('Configured Staples')
    expect(wrapper.text()).toContain('Salt')
  })

  it('activates and registers route', () => {
    const mockSS = {
      route: vi.fn(),
      intent: { provider: vi.fn() },
    }

    activate(mockSS)
    expect(mockSS.route).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/shopping-list',
        name: 'shopping-list',
        component: ShoppingListPage,
      })
    )
  })
})

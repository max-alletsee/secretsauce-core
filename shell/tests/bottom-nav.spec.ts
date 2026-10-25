import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppBottomNav from '../src/components/AppBottomNav.vue'
import { mountWithUi } from './helpers/mountWithUi'

describe('AppBottomNav Component', () => {
  it('sorts routes by order and pins Settings last', async () => {
    const component = defineComponent({ template: '<p>Page</p>' })
    const routes = [
      { path: '/shopping-list', component, nav: { label: 'Shopping list', icon: 'shopping-cart', order: 30 } },
      { path: '/timeline', component, nav: { label: 'Timeline', icon: 'calendar', order: 5 } },
      { path: '/recipes', component, nav: { label: 'Recipes', icon: 'book', order: 10 } },
      { path: '/journal', component, nav: { label: 'Journal', icon: 'history', order: 15 } },
      { path: '/plugins', component, nav: { label: 'Plugins', icon: 'box', order: 50 } }, // should be excluded
    ]
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [...routes, { path: '/settings', component }],
    })
    await router.push('/timeline')
    const wrapper = mountWithUi(AppBottomNav, { props: { routes }, global: { plugins: [router] } })

    const links = wrapper.findAll('a')
    expect(links.map(a => a.text().trim())).toEqual([
      'Timeline',
      'Recipes',
      'Journal',
      'Shopping list',
      'Settings',
    ])

    const icons = wrapper.findAll('i')
    expect(icons.map(i => i.attributes('class'))).toEqual([
      'pi pi-calendar',
      'pi pi-book',
      'pi pi-history',
      'pi pi-shopping-cart',
      'pi pi-cog',
    ])

    expect(wrapper.find('nav').attributes('aria-label')).toBe('Mobile navigation')
    wrapper.unmount()
  })

  it('marks active link when on current route', async () => {
    const component = defineComponent({ template: '<p>Page</p>' })
    const routes = [
      { path: '/timeline', component, nav: { label: 'Timeline', icon: 'calendar', order: 5 } },
    ]
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [...routes, { path: '/settings', component }],
    })
    await router.push('/settings')
    const wrapper = mountWithUi(AppBottomNav, { props: { routes }, global: { plugins: [router] } })

    const activeLink = wrapper.find('.router-link-active')
    expect(activeLink.exists()).toBe(true)
    expect(activeLink.text()).toContain('Settings')
    wrapper.unmount()
  })
})

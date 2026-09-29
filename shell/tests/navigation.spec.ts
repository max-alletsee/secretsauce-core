import { expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppNav from '../src/components/AppNav.vue'
import { mountWithUi } from './helpers/mountWithUi'

it('sorts registry navigation and pins Settings beyond arbitrary plugin order', async () => {
  const component = defineComponent({ template: '<p>Page</p>' })
  const routes = [
    { path: '/late', component, nav: { label: 'Late plugin', icon: 'book', order: 5000 } },
    { path: '/early', component, nav: { label: 'Early plugin', icon: 'book', order: 1 } },
  ]
  const router = createRouter({ history: createMemoryHistory(), routes: [...routes, { path: '/settings', component }] })
  await router.push('/early')
  const wrapper = mountWithUi(AppNav, { props: { routes }, global: { plugins: [router] } })
  expect(wrapper.findAll('a').map(a => a.text())).toEqual(['Early plugin', 'Late plugin', 'Settings'])
  wrapper.unmount()
})

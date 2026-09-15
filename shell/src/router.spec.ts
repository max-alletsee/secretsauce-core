import { describe, it, expect } from 'vitest'
import { buildRouter } from './router'

describe('Router Configuration', () => {
  it('defines core routes and redirects / to /recipes', async () => {
    const router = buildRouter('/')
    router.addRoute({ path: '/recipes', component: { template: '<div>Recipes</div>' } })
    const routes = router.getRoutes()

    const paths = routes.map((r) => r.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/setup')
    expect(paths).toContain('/login')
    expect(paths).toContain('/settings')
    expect(paths).toContain('/plugins')
    expect(paths).toContain('/share')

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/recipes')
  })

  it('dynamically redirects / based on start page preference and active plugins', async () => {
    localStorage.setItem('secretsauce:default_start_page', '/timeline')
    const router = buildRouter('/')
    router.addRoute({ path: '/recipes', component: { template: '<div>Recipes</div>' } })
    router.addRoute({ path: '/timeline', component: { template: '<div>Timeline</div>' } })
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/timeline')

    localStorage.removeItem('secretsauce:default_start_page')
  })
})

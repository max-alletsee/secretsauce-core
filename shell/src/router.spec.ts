import { describe, it, expect } from 'vitest'
import { buildRouter } from './router'

describe('Router Configuration', () => {
  it('defines core routes and redirects / to /recipes', async () => {
    const router = buildRouter('/')
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
})

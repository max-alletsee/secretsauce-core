import { describe, it, expect } from 'vitest'
import { classify, type RequestClass } from './classify'

describe('Service Worker classify()', () => {
  const scope = new URL('https://example.com/app/')

  it('classifies navigation in scope as navigation', () => {
    const url = new URL('https://example.com/app/recipes/123')
    expect(classify(url, scope, 'GET', 'navigate')).toBe('navigation')
  })

  it('classifies static files as static', () => {
    const url = new URL('https://example.com/app/static/vendor/vue.js')
    expect(classify(url, scope, 'GET', 'script')).toBe('static')
  })

  it('classifies plugin UI bundles as plugin_bundle', () => {
    const url = new URL('https://example.com/app/api/plugins/shopping/ui.js?v=1.0.0')
    expect(classify(url, scope, 'GET', 'script')).toBe('plugin_bundle')
  })

  it('classifies assets as asset', () => {
    const url = new URL('https://example.com/app/api/assets/asset-123/file')
    expect(classify(url, scope, 'GET', 'image')).toBe('asset')
  })

  it('classifies normal GET api calls as api_cacheable', () => {
    const url = new URL('https://example.com/app/api/recipes?limit=20')
    expect(classify(url, scope, 'GET', '')).toBe('api_cacheable')
  })

  it('classifies stream, export, and non-GET as passthrough', () => {
    const stream = new URL('https://example.com/app/api/events/stream')
    expect(classify(stream, scope, 'GET', '')).toBe('passthrough')

    const exp = new URL('https://example.com/app/api/export')
    expect(classify(exp, scope, 'GET', '')).toBe('passthrough')

    const post = new URL('https://example.com/app/api/recipes')
    expect(classify(post, scope, 'POST', '')).toBe('passthrough')
  })
})

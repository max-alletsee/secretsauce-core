export type RequestClass =
  | 'navigation'
  | 'static'
  | 'plugin_bundle'
  | 'asset'
  | 'api_cacheable'
  | 'passthrough'

export function classify(
  url: URL,
  scope: URL,
  method: string = 'GET',
  mode: string = ''
): RequestClass {
  if (method !== 'GET') return 'passthrough'
  if (url.origin !== scope.origin) return 'passthrough'

  let path = url.pathname
  const scopePath = scope.pathname.endsWith('/') ? scope.pathname : `${scope.pathname}/`
  if (!path.startsWith(scopePath) && path !== scope.pathname) return 'passthrough'

  const rel = path.slice(scopePath.length)

  // Stream, export, health, sw.js pass through
  if (
    rel === 'api/events/stream' ||
    rel === 'api/export' ||
    rel === 'api/export/json' ||
    rel === 'api/health' ||
    rel === 'sw.js'
  ) {
    return 'passthrough'
  }

  // HTML navigations
  if (mode === 'navigate' || (!rel.startsWith('api/') && !rel.startsWith('static/'))) {
    return 'navigation'
  }

  // Static assets
  if (rel.startsWith('static/')) {
    return 'static'
  }

  // Plugin UI bundles & styles
  if (rel.startsWith('api/plugins/') && (rel.endsWith('/ui.js') || rel.endsWith('/ui.css'))) {
    return 'plugin_bundle'
  }

  // Asset files
  if (rel.startsWith('api/assets/') && rel.endsWith('/file')) {
    return 'asset'
  }

  // Other GET /api/**
  if (rel.startsWith('api/')) {
    return 'api_cacheable'
  }

  return 'passthrough'
}

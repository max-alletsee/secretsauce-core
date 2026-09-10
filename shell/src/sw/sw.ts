import { CacheExpiration } from 'workbox-expiration'
import { classify } from './classify'

declare const self: ServiceWorkerGlobalScope & {
  __SS_PRECACHE__?: { build: string; files: string[] }
}

const precacheInfo = self.__SS_PRECACHE__ || { build: 'dev', files: [] }
const SHELL_CACHE = `ss-shell-${precacheInfo.build}`
const PLUGINS_CACHE = 'ss-plugins'
const ASSETS_CACHE = 'ss-assets'
const API_CACHE = 'ss-api'

const pluginsExp = new CacheExpiration(PLUGINS_CACHE, { maxEntries: 50 })
const assetsExp = new CacheExpiration(ASSETS_CACHE, { maxEntries: 200 })
const apiExp = new CacheExpiration(API_CACHE, { maxEntries: 1000 })

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      if (precacheInfo.files.length > 0) {
        await cache.addAll(precacheInfo.files)
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      for (const name of names) {
        if (name.startsWith('ss-shell-') && name !== SHELL_CACHE) {
          await caches.delete(name)
        }
        if (name === API_CACHE) {
          await caches.delete(name)
        }
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'clear') {
    event.waitUntil(
      Promise.all([caches.delete(API_CACHE), caches.delete(ASSETS_CACHE)])
    )
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  const scope = new URL(self.registration.scope)
  const reqClass = classify(url, scope, req.method, req.mode)

  if (reqClass === 'passthrough') {
    return
  }

  if (reqClass === 'static') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE)
        const hit = await cache.match(req)
        if (hit) return hit
        const net = await fetch(req)
        if (net.ok) cache.put(req, net.clone())
        return net
      })()
    )
    return
  }

  if (reqClass === 'plugin_bundle') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PLUGINS_CACHE)
        const hit = await cache.match(req)
        if (hit) return hit
        const net = await fetch(req)
        if (net.ok) {
          await cache.put(req, net.clone())
          await pluginsExp.updateTimestamp(req.url)
        }
        return net
      })()
    )
    return
  }

  if (reqClass === 'asset') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS_CACHE)
        const hit = await cache.match(req)
        if (hit) return hit
        const net = await fetch(req)
        if (net.ok) {
          await cache.put(req, net.clone())
          await assetsExp.updateTimestamp(req.url)
        }
        return net
      })()
    )
    return
  }

  if (reqClass === 'navigation') {
    event.respondWith(
      (async () => {
        try {
          const timeoutPromise = new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          )
          const net = await Promise.race([fetch(req), timeoutPromise])
          if (net.ok) {
            const cache = await caches.open(SHELL_CACHE)
            cache.put(req, net.clone())
            return net
          }
        } catch {
          // fallback to cached navigation or cached index.html
        }
        const cache = await caches.open(SHELL_CACHE)
        const hit = (await cache.match(req)) || (await cache.match(scope.pathname))
        if (hit) return hit
        return new Response('<h1>Offline</h1><p>No saved page available yet.</p>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      })()
    )
    return
  }

  if (reqClass === 'api_cacheable') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE)
        if (!navigator.onLine) {
          const hit = await cache.match(req)
          if (hit) return hit
          return new Response(JSON.stringify({ error: { code: 'offline', message: 'Offline' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const timeoutPromise = new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          )
          const net = await Promise.race([fetch(req), timeoutPromise])
          if (net.ok) {
            await cache.put(req, net.clone())
            await apiExp.updateTimestamp(req.url)
            return net
          }
          return net
        } catch {
          const hit = await cache.match(req)
          if (hit) {
            const headers = new Headers(hit.headers)
            headers.set('X-SS-Cached-At', 'true')
            return new Response(hit.body, { status: hit.status, headers })
          }
          return new Response(JSON.stringify({ error: { code: 'offline', message: 'Offline' } }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      })()
    )
    return
  }
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { mount, flushPromises } from '@vue/test-utils'
import { createStreamClient } from '../src/stream'
import { createApiClient } from '../src/api'
import { createOutbox, retryDelayMs } from '../src/outbox'
import { createPluginLoader } from '../src/registries/plugins'
import { createAuthState, logout } from '../src/session'
import PluginManagerPage from '../src/pages/PluginManagerPage.vue'
import { ApiError, ConflictError, OfflineError, type ApiClient } from '@secretsauce/ui'

class FakeEventSource {
  static last: FakeEventSource | null = null
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  onmessage: ((e: MessageEvent) => void) | null = null
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) {
    FakeEventSource.last = this
  }
  addEventListener(name: string, fn: (e: MessageEvent) => void) {
    ;(this.listeners[name] ||= []).push(fn)
  }
  emit(name: string, data: unknown, lastEventId = '') {
    const event = { data: JSON.stringify(data), lastEventId } as MessageEvent
    for (const fn of this.listeners[name] || []) fn(event)
  }
  close() {}
}

describe('SSE client', () => {
  beforeEach(() => {
    ;(globalThis as any).EventSource = FakeEventSource
  })

  it('receives the named frames the server sends', () => {
    const client = createStreamClient('/api/events/stream', 'boot-1', vi.fn())
    const onRecipe = vi.fn()
    const onPush = vi.fn()
    client.on('recipe:*', onRecipe)
    client.on('timer:done', onPush)
    client.connect()

    const es = FakeEventSource.last!
    es.emit('hello', { kind: 'hello', boot_id: 'boot-1', seq: 4 })
    es.emit('event', { kind: 'event', seq: 5, name: 'recipe:created' }, '5')
    es.emit('push', { kind: 'push', name: 'timer:done', data: {}, plugin_id: 'p' })

    expect(client.online.value).toBe(true)
    expect(onRecipe).toHaveBeenCalledTimes(1)
    expect(onPush).toHaveBeenCalledTimes(1)

    client.connect()
    expect(FakeEventSource.last!.url).toContain('last_event_id=5')
  })
})

describe('API client', () => {
  afterEach(() => vi.restoreAllMocks())

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

  it('maps only conflict codes to ConflictError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      json(409, { error: { code: 'setup_required', message: 'Setup first' } })
    )
    const err: any = await createApiClient('/').get('/api/recipes').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).not.toBeInstanceOf(ConflictError)
    expect(err.code).toBe('setup_required')
  })

  it('accepts empty success bodies and falls back to detail messages', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('', { status: 200 }))
    await expect(createApiClient('/').post('/api/auth/logout')).resolves.toBeUndefined()

    globalThis.fetch = vi.fn().mockResolvedValue(json(400, { detail: 'Bad thing' }))
    await expect(createApiClient('/').get('/api/x')).rejects.toThrow('Bad thing')
  })

  it('times out hung requests as offline and reports 401s', async () => {
    globalThis.fetch = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        )
    ) as any
    const client = createApiClient('/', () => null, { timeoutMs: 20 })
    await expect(client.get('/api/slow')).rejects.toBeInstanceOf(OfflineError)

    const onUnauthorized = vi.fn()
    globalThis.fetch = vi.fn().mockResolvedValue(json(401, { error: { code: 'unauthorized', message: 'no' } }))
    await createApiClient('/', () => null, { onUnauthorized }).get('/api/recipes').catch(() => {})
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})

describe('Outbox', () => {
  beforeEach(() => {
    indexedDB = new IDBFactory()
  })

  it('backs off exponentially with a ceiling', () => {
    expect(retryDelayMs(1)).toBeGreaterThanOrEqual(1000)
    expect(retryDelayMs(2)).toBeGreaterThan(retryDelayMs(1) * 1.4)
    expect(retryDelayMs(20)).toBeLessThanOrEqual(5 * 60 * 1000)
  })

  it('opens its database once and schedules a retry after a server error', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open')
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    const api = { post: vi.fn().mockRejectedValue(new ApiError(503, 'unavailable', 'down')) }
    const outbox = createOutbox(api as unknown as ApiClient)
    await outbox.enqueue({ method: 'POST', path: '/api/recipes', body: {} })
    await outbox.flush()
    expect(openSpy).toHaveBeenCalledTimes(1)
    expect(outbox.pending.value).toBe(1)
    expect(setTimeoutSpy.mock.calls.some(([, ms]) => (ms as number) >= 1000)).toBe(true)
    setTimeoutSpy.mockRestore()
  })
})

describe('Plugin loader', () => {
  it('prefixes fallback bundle URLs with the base path and fetches bundles in parallel', async () => {
    const started: string[] = []
    let inFlight = 0
    let maxInFlight = 0
    const importer = vi.fn(async (url: string) => {
      started.push(url)
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 5))
      inFlight--
      return { default: vi.fn() }
    })
    const loader = createPluginLoader({
      basePath: '/sauce/',
      importModule: importer,
      makeSecretSauceUI: (id: string) => ({ pluginId: id }) as any,
    } as any)
    await loader.loadActivePlugins({
      get: async () =>
        [
          { id: 'a', ui: true, version: '1.0.0', state: 'active' },
          { id: 'b', ui_entry: '/sauce/api/plugins/b/ui.js?v=abc', state: 'active' },
        ] as any,
    })
    expect(started).toContain('/sauce/api/plugins/a/ui.js?v=1.0.0')
    expect(maxInFlight).toBe(2)
    expect([...loader.loadedPlugins].sort()).toEqual(['a', 'b'])
  })
})

describe('Plugin Manager', () => {
  it('lists plugins from the plain list the API returns and runs commands', async () => {
    const get = vi.fn().mockResolvedValue([
      { id: 'core-ratings', name: 'Ratings', state: 'active', enabled: true, commands: [{ id: 'rebuild', title: 'Rebuild' }] },
      { id: 'broken', name: 'Broken', state: 'errored', enabled: true, error: 'Traceback: boom', commands: [] },
    ])
    const post = vi.fn().mockResolvedValue({ job_id: 'job_1' })
    const wrapper = mount(PluginManagerPage, {
      global: { provide: { __SS_API__: { get, post } }, stubs: { Slot: true } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Ratings')
    expect(wrapper.text()).toContain('boom')
    await wrapper.find('[data-command="rebuild"]').trigger('click')
    expect(post).toHaveBeenCalledWith('/api/plugins/core-ratings/commands/rebuild')
  })
})

describe('Session', () => {
  it('caches a confirmed session until the API reports a 401', async () => {
    const get = vi.fn(async (path: string) =>
      path === '/api/setup' ? { needs_setup: false } : { authenticated: true }
    )
    const auth = createAuthState({ get } as any)
    expect(await auth.needsSetup()).toBe(false)
    expect(await auth.isAuthenticated()).toBe(true)
    expect(await auth.needsSetup()).toBe(false)
    expect(await auth.isAuthenticated()).toBe(true)
    expect(get).toHaveBeenCalledTimes(2)

    auth.invalidate()
    await auth.isAuthenticated()
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('logout clears household data even when offline', async () => {
    const postMessage = vi.fn()
    localStorage.setItem('ss-current-member', 'm1')
    localStorage.setItem('secretsauce:default_start_page', '/timeline')
    localStorage.setItem('unrelated', 'keep')
    const deleteDatabase = vi.fn()
    await logout({
      api: { post: vi.fn().mockRejectedValue(new OfflineError()) } as any,
      serviceWorker: { getRegistration: async () => ({ active: { postMessage } }) } as any,
      storage: localStorage,
      deleteDatabase,
    })
    expect(postMessage).toHaveBeenCalledWith({ type: 'clear' })
    expect(localStorage.getItem('ss-current-member')).toBeNull()
    expect(localStorage.getItem('secretsauce:default_start_page')).toBeNull()
    expect(localStorage.getItem('unrelated')).toBe('keep')
    expect(deleteDatabase).toHaveBeenCalledWith('ss-outbox')
  })
})

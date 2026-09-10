import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApiClient } from '../src/api'
import { ConflictError, OfflineError, ApiError } from '@secretsauce/ui'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixes BASE_PATH and includes X-Actor-Member header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    globalThis.fetch = fetchMock

    const client = createApiClient('/app/', () => 'member-42')
    const res = await client.get('/api/recipes', { q: 'pasta', limit: 10 })

    expect(res).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/app/api/recipes?q=pasta&limit=10')
    expect(init.headers['X-Actor-Member']).toBe('member-42')
    expect(init.credentials).toBe('same-origin')
  })

  it('throws ConflictError on 409 with details.current', async () => {
    const errorBody = {
      error: {
        code: 'conflict',
        message: 'Revision mismatch',
        details: { current: { id: 'r1', revision: 3 } },
      },
    }
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(errorBody), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    }))

    const client = createApiClient('/', () => null)
    await expect(client.patch('/api/recipes/r1', { title: 'New' })).rejects.toThrow(ConflictError)
  })

  it('throws OfflineError on 503 offline or fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const client = createApiClient('/', () => null)
    await expect(client.get('/api/health')).rejects.toThrow(OfflineError)
  })
})

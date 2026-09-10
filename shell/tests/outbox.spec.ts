import { describe, it, expect, vi, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { createOutbox } from '../src/outbox'
import { ConflictError, OfflineError, ApiError, type ApiClient } from '@secretsauce/ui'

describe('Outbox engine', () => {
  beforeEach(() => {
    indexedDB = new IDBFactory()
  })

  it('enqueues write, persists to IDB, and flushes successfully', async () => {
    const postMock = vi.fn().mockResolvedValue({ id: 'item-1', status: 'created' })
    const fakeApi = { post: postMock } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    const appliedSpy = vi.fn()
    outbox.on('applied', appliedSpy)

    const entryId = await outbox.enqueue({
      method: 'POST',
      path: '/api/recipes',
      body: { id: 'uuid-1', title: 'Soup' },
      tag: 'Create Soup'
    }, 'core-recipes', 'member-1')

    expect(entryId).toBeTruthy()
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(appliedSpy).toHaveBeenCalledTimes(1)
    expect(outbox.pending.value).toBe(0)
  })

  it('treats 409 POST with matching id as applied', async () => {
    const fakeApi = {
      post: vi.fn().mockRejectedValue(new ConflictError('Conflict', { id: 'uuid-1' }))
    } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    const appliedSpy = vi.fn()
    outbox.on('applied', appliedSpy)

    await outbox.enqueue({
      method: 'POST',
      path: '/api/recipes',
      body: { id: 'uuid-1' }
    }, 'core-recipes', 'member-1')

    expect(appliedSpy).toHaveBeenCalledTimes(1)
    expect(outbox.pending.value).toBe(0)
    expect(outbox.failed.value).toHaveLength(0)
  })

  it('moves other 4xx to failed entries and calls on failed', async () => {
    const fakeApi = {
      post: vi.fn().mockRejectedValue(new ApiError(422, 'validation', 'Invalid input'))
    } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    const failedSpy = vi.fn()
    outbox.on('failed', failedSpy)

    await outbox.enqueue({
      method: 'POST',
      path: '/api/recipes',
      body: { invalid: true }
    }, 'core-recipes', 'member-1')

    expect(failedSpy).toHaveBeenCalledTimes(1)
    expect(outbox.failed.value).toHaveLength(1)
    expect(outbox.pending.value).toBe(0)
  })

  it('stops flush on 401 without marking failed', async () => {
    const fakeApi = {
      post: vi.fn().mockRejectedValue(new ApiError(401, 'unauthorized', 'Login needed'))
    } as unknown as ApiClient

    const outbox = createOutbox(fakeApi)
    await outbox.enqueue({ method: 'POST', path: '/api/recipes' }, 'core-recipes', 'member-1')

    expect(outbox.pending.value).toBe(1)
    expect(outbox.failed.value).toHaveLength(0)
  })
})

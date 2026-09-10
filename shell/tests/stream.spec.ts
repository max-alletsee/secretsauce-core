import { describe, it, expect, vi } from 'vitest'
import { createStreamClient } from '../src/stream'

describe('StreamClient', () => {
  it('dispatches event and push messages to subscribers and tracks online ref', () => {
    const onMismatch = vi.fn()
    const client = createStreamClient('/api/events/stream', 'boot-1', onMismatch)

    const recipeHandler = vi.fn()
    const wildcardHandler = vi.fn()
    const pushHandler = vi.fn()

    client.on('recipe:created', recipeHandler)
    client.on('recipe:*', wildcardHandler)
    client.on('custom_push', pushHandler)

    // Simulate hello frame
    client.handleMessage({
      data: JSON.stringify({ kind: 'hello', boot_id: 'boot-1', version: '1.0.0' }),
    })
    expect(client.online.value).toBe(true)
    expect(onMismatch).not.toHaveBeenCalled()

    // Simulate event frame
    client.handleMessage({
      data: JSON.stringify({
        kind: 'event',
        seq: 10,
        name: 'recipe:created',
        entity_id: 'r1',
        origin: 'member',
      }),
    })

    expect(recipeHandler).toHaveBeenCalledTimes(1)
    expect(wildcardHandler).toHaveBeenCalledTimes(1)

    // Simulate push frame
    client.handleMessage({
      data: JSON.stringify({
        kind: 'push',
        name: 'custom_push',
        data: { test: 123 },
        plugin_id: 'plugin-x',
      }),
    })
    expect(pushHandler).toHaveBeenCalledTimes(1)
  })

  it('triggers onBootIdMismatch on hello frame with differing boot_id', () => {
    const onMismatch = vi.fn()
    const client = createStreamClient('/api/events/stream', 'boot-1', onMismatch)

    client.handleMessage({
      data: JSON.stringify({ kind: 'hello', boot_id: 'boot-2', version: '1.0.0' }),
    })
    expect(onMismatch).toHaveBeenCalledTimes(1)
  })
})

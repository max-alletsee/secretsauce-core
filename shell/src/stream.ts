import { ref, type Ref } from 'vue'
import type { StreamEvent, StreamPush } from '@secretsauce/ui'

export interface StreamClient {
  online: Ref<boolean>
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): () => void
  connect(): void
  disconnect(): void
  handleMessage(msg: { data: string; lastEventId?: string }): void
}

export function createStreamClient(
  streamUrl: string,
  currentBootId: string,
  onBootIdMismatch: () => void
): StreamClient {
  const online = ref(false)
  const handlers: { pattern: string; fn: (e: StreamEvent | StreamPush) => void }[] = []
  let eventSource: EventSource | null = null
  let lastEventId: string | null = null

  function handleMessage(msg: { data: string; lastEventId?: string }) {
    if (msg.lastEventId) {
      lastEventId = msg.lastEventId
    }

    let payload: any
    try {
      payload = JSON.parse(msg.data)
    } catch {
      return
    }

    if (payload.kind === 'hello') {
      online.value = true
      if (payload.boot_id && payload.boot_id !== currentBootId) {
        onBootIdMismatch()
      }
      return
    }

    const name = payload.name
    if (!name) return

    for (const item of handlers) {
      if (item.pattern === name) {
        item.fn(payload)
      } else if (item.pattern.endsWith(':*')) {
        const prefix = item.pattern.slice(0, -1)
        if (name.startsWith(prefix)) {
          item.fn(payload)
        }
      }
    }
  }

  function connect() {
    if (typeof EventSource === 'undefined') return
    disconnect()

    const url = new URL(
      streamUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    )
    if (lastEventId) {
      url.searchParams.set('last_event_id', lastEventId)
    }

    eventSource = new EventSource(url.toString(), { withCredentials: true })

    eventSource.onopen = () => {
      online.value = true
    }

    eventSource.onmessage = (event) => {
      handleMessage({ data: event.data, lastEventId: event.lastEventId })
    }

    eventSource.onerror = () => {
      online.value = false
    }
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    online.value = false
  }

  function on(name: string, fn: (e: StreamEvent | StreamPush) => void) {
    const entry = { pattern: name, fn }
    handlers.push(entry)
    return () => {
      const idx = handlers.indexOf(entry)
      if (idx !== -1) handlers.splice(idx, 1)
    }
  }

  return {
    online,
    on,
    connect,
    disconnect,
    handleMessage,
  }
}

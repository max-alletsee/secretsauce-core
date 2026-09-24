import { ref, type Ref } from 'vue'
import type { StreamEvent, StreamPush } from '@secretsauce/ui'

export interface StreamClient {
  online: Ref<boolean>
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): () => void
  connect(): void
  disconnect(): void
  handleMessage(msg: { data: string; lastEventId?: string }): void
}

// The server sends named SSE events (API reference, section 11); an EventSource
// only calls onmessage for unnamed ones, so each name needs its own listener.
const FRAME_NAMES = ['hello', 'event', 'push'] as const

export function createStreamClient(
  streamUrl: string,
  currentBootId: string,
  onBootIdMismatch: () => void
): StreamClient {
  const online = ref(false)
  const handlers: { pattern: string; fn: (e: StreamEvent | StreamPush) => void }[] = []
  let eventSource: EventSource | null = null
  let lastEventId: string | null = null

  function matches(pattern: string, name: string): boolean {
    if (pattern === '*' || pattern === name) return true
    return pattern.endsWith(':*') && name.startsWith(pattern.slice(0, -1))
  }

  function handleMessage(msg: { data: string; lastEventId?: string }) {
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

    // Only log events carry an id; pushes are not replayable.
    if (payload.kind === 'event' && msg.lastEventId) {
      lastEventId = msg.lastEventId
    }

    const name = payload.name
    if (!name) return
    for (const item of [...handlers]) {
      if (matches(item.pattern, name)) item.fn(payload)
    }
  }

  function connect() {
    if (typeof EventSource === 'undefined') return
    disconnect()

    const url = new URL(
      streamUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    )
    // The browser sends Last-Event-ID itself only on automatic reconnects.
    if (lastEventId) url.searchParams.set('last_event_id', lastEventId)

    const source = new EventSource(url.toString(), { withCredentials: true })
    eventSource = source
    for (const frame of FRAME_NAMES) {
      source.addEventListener(frame, (event) => {
        const message = event as MessageEvent
        handleMessage({ data: message.data, lastEventId: message.lastEventId })
      })
    }
    source.onopen = () => {
      online.value = true
    }
    source.onerror = () => {
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

  return { online, on, connect, disconnect, handleMessage }
}

import { openDB, type IDBPDatabase } from 'idb'
import { ref, type Ref } from 'vue'
import {
  type Outbox,
  type OutboxRequest,
  type OutboxEntry,
  type ApiClient,
  ConflictError,
  OfflineError,
  ApiError,
} from '@secretsauce/ui'

const DB_NAME = 'ss-outbox'
const STORE_NAME = 'queue'
const FAILED_STORE = 'failed'

interface OutboxDB {
  queue: {
    key: string
    value: OutboxEntry
    indexes: { created_at: string }
  }
  failed: {
    key: string
    value: OutboxEntry
  }
}

export const OUTBOX_DB_NAME = DB_NAME

const RETRY_BASE_MS = 1000
const RETRY_MAX_MS = 5 * 60 * 1000

/** Delay before retry number `attempt` (1-based) after a server or network failure. */
export function retryDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** Math.max(attempt - 1, 0), RETRY_MAX_MS)
}

function openOutboxDB(): Promise<IDBPDatabase<OutboxDB>> {
  return openDB<OutboxDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      store.createIndex('created_at', 'created_at')
      db.createObjectStore(FAILED_STORE, { keyPath: 'id' })
    },
  })
}

export function createOutbox(
  api: ApiClient,
  pluginIsActive: (pluginId: string) => boolean = () => true
): Outbox & {
  enqueue(req: OutboxRequest, pluginId?: string, actorMemberId?: string | null): Promise<string>
  flush(): Promise<void>
} {
  const pending = ref(0)
  const failed = ref<OutboxEntry[]>([])
  const appliedHandlers: ((entry: OutboxEntry, res: unknown) => void)[] = []
  const failedHandlers: ((entry: OutboxEntry, err: ApiError) => void)[] = []
  let isFlushing = false
  let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null
  let consecutiveFailures = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  // One connection per outbox; opening IndexedDB on every call is slow.
  function getDB(): Promise<IDBPDatabase<OutboxDB>> {
    if (!dbPromise) {
      dbPromise = openOutboxDB().catch((err) => {
        dbPromise = null
        throw err
      })
    }
    return dbPromise
  }

  function scheduleRetry() {
    if (retryTimer !== null) return
    consecutiveFailures += 1
    retryTimer = setTimeout(() => {
      retryTimer = null
      flush()
    }, retryDelayMs(consecutiveFailures))
  }

  async function refreshCounts() {
    const db = await getDB()
    pending.value = await db.count(STORE_NAME)
    failed.value = await db.getAll(FAILED_STORE)
  }

  refreshCounts()

  async function enqueue(
    req: OutboxRequest,
    pluginId: string = 'shell',
    actorMemberId: string | null = null
  ): Promise<string> {
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `outbox-${Date.now()}-${Math.random()}`
    const entry: OutboxEntry = {
      ...req,
      id,
      plugin_id: pluginId,
      actor_member_id: actorMemberId,
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null,
    }

    const db = await getDB()
    await db.put(STORE_NAME, entry)
    await refreshCounts()

    // Trigger flush
    await flush()
    return id
  }

  async function discard(entryId: string): Promise<void> {
    const db = await getDB()
    await db.delete(FAILED_STORE, entryId)
    await db.delete(STORE_NAME, entryId)
    await refreshCounts()
  }

  async function flush(): Promise<void> {
    if (isFlushing) return
    isFlushing = true

    try {
      const db = await getDB()
      const tx = db.transaction(STORE_NAME, 'readonly')
      const index = tx.store.index('created_at')
      const entries = await index.getAll()

      for (const entry of entries) {
        if (!pluginIsActive(entry.plugin_id)) {
          continue
        }

        try {
          let response: unknown
          if (entry.method === 'POST') {
            response = await api.post(entry.path, entry.body)
          } else if (entry.method === 'PATCH') {
            response = await api.patch(entry.path, entry.body)
          } else if (entry.method === 'PUT') {
            response = await api.put(entry.path, entry.body)
          } else if (entry.method === 'DELETE') {
            response = await api.delete(entry.path, entry.query)
          }

          // 2xx Success: delete from IDB and emit applied
          consecutiveFailures = 0
          await db.delete(STORE_NAME, entry.id)
          for (const handler of appliedHandlers) handler(entry, response)
        } catch (err: any) {
          // Rule 4: 409 POST matching id or group_id
          if (err instanceof ConflictError && entry.method === 'POST') {
            const bodyId = (entry.body as any)?.id || (entry.body as any)?.group_id
            const currentId = err.current?.id || err.current?.group_id
            if (bodyId && currentId && bodyId === currentId) {
              await db.delete(STORE_NAME, entry.id)
              for (const handler of appliedHandlers) handler(entry, err.current)
              continue
            }
          }

          // Rule 6: 401 Unauthorized -> stop flush, leave pending
          if (err instanceof ApiError && err.status === 401) {
            break
          }

          // Rule 7: Network / Offline error -> stop flush, leave pending, retry with backoff
          if (err instanceof OfflineError) {
            scheduleRetry()
            break
          }

          // Rule 7: 5xx Server Error -> retry up to 10 times
          if (err instanceof ApiError && err.status >= 500) {
            entry.attempts += 1
            entry.last_error = err.message
            if (entry.attempts >= 10) {
              await db.delete(STORE_NAME, entry.id)
              await db.put(FAILED_STORE, entry)
              for (const handler of failedHandlers) handler(entry, err)
            } else {
              await db.put(STORE_NAME, entry)
              scheduleRetry()
              break // stop flush
            }
            continue
          }

          // Rule 5: other 4xx -> mark failed, call failed handler, continue flush
          if (err instanceof ApiError) {
            entry.last_error = err.message
            await db.delete(STORE_NAME, entry.id)
            await db.put(FAILED_STORE, entry)
            for (const handler of failedHandlers) handler(entry, err)
            continue
          }

          // Unknown error
          break
        }
      }
    } finally {
      isFlushing = false
      await refreshCounts()
    }
  }

  // Periodic flush every 60s
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => flush())
    setInterval(() => {
      if (pending.value > 0) flush()
    }, 60000)
  }

  return {
    pending,
    failed,
    enqueue,
    discard,
    flush,
    on(kind: 'applied' | 'failed', handler: any) {
      if (kind === 'applied') appliedHandlers.push(handler)
      if (kind === 'failed') failedHandlers.push(handler)
    },
  }
}

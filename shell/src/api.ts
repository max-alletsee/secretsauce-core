import { type ApiClient, ApiError, ConflictError, OfflineError } from '@secretsauce/ui'

export interface ApiClientOptions {
  /** Abort requests that take longer; they surface as OfflineError. */
  timeoutMs?: number
  /** Uploads carry more data and get more time. */
  uploadTimeoutMs?: number
  /** Called when the server answers 401, e.g. after the session was revoked. */
  onUnauthorized?: () => void
}

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000

export function createApiClient(
  basePath: string = '/',
  getActorMemberId: () => string | null = () => null,
  options: ApiClientOptions = {}
): ApiClient {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const uploadTimeoutMs = options.uploadTimeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS

  function formatUrl(path: string, query?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const fullPath = `${normalizedBase}${cleanPath}`
    if (!query || Object.keys(query).length === 0) return fullPath

    const params = new URLSearchParams()
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined || val === null) continue
      if (Array.isArray(val)) {
        for (const item of val) params.append(key, String(item))
      } else {
        params.append(key, String(val))
      }
    }
    const qs = params.toString()
    return qs ? `${fullPath}?${qs}` : fullPath
  }

  async function readJson(response: Response): Promise<any> {
    const text = await response.text()
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      return undefined
    }
  }

  async function request<T>(
    method: string,
    path: string,
    opts: { body?: unknown; query?: Record<string, any>; isUpload?: boolean } = {}
  ): Promise<T> {
    const url = formatUrl(path, opts.query)
    const headers: Record<string, string> = {}
    const actorId = getActorMemberId()
    if (actorId) {
      headers['X-Actor-Member'] = actorId
    }

    let bodyData: BodyInit | undefined = undefined
    if (opts.isUpload && opts.body instanceof FormData) {
      bodyData = opts.body
    } else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      bodyData = JSON.stringify(opts.body)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), opts.isUpload ? uploadTimeoutMs : timeoutMs)
    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: bodyData,
        credentials: 'same-origin',
        signal: controller.signal,
      })
    } catch (err: any) {
      const timedOut = err?.name === 'AbortError'
      throw new OfflineError(timedOut ? 'Request timed out' : err?.message || 'Network request failed')
    } finally {
      clearTimeout(timer)
    }

    if (response.ok) {
      if (response.status === 204) return undefined as T
      return (await readJson(response)) as T
    }

    const errPayload = await readJson(response)
    const errCode = errPayload?.error?.code || 'unknown_error'
    const detail = typeof errPayload?.detail === 'string' ? errPayload.detail : undefined
    const errMsg = errPayload?.error?.message || detail || response.statusText

    if (response.status === 503 && errCode === 'offline') {
      throw new OfflineError(errMsg)
    }
    if (response.status === 401) {
      options.onUnauthorized?.()
    }
    // 409 also means setup_required; only a revision/id collision is a ConflictError.
    if (response.status === 409 && errCode === 'conflict') {
      throw new ConflictError(errMsg, errPayload?.error?.details?.current || {})
    }
    throw new ApiError(response.status, errCode, errMsg, errPayload?.error?.details)
  }

  return {
    get: <T>(path: string, query?: Record<string, any>) => request<T>('GET', path, { query }),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
    patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
    put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
    delete: async (path: string, query?: Record<string, any>) => {
      await request<void>('DELETE', path, { query })
    },
    upload: <T>(path: string, form: FormData) => request<T>('POST', path, { body: form, isUpload: true }),
  }
}

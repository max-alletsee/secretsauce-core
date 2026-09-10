import { type ApiClient, ApiError, ConflictError, OfflineError } from '@secretsauce/ui'

export function createApiClient(
  basePath: string = '/',
  getActorMemberId: () => string | null = () => null
): ApiClient {
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath

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

  async function request<T>(
    method: string,
    path: string,
    options: { body?: unknown; query?: Record<string, any>; isUpload?: boolean } = {}
  ): Promise<T> {
    const url = formatUrl(path, options.query)
    const headers: Record<string, string> = {}
    const actorId = getActorMemberId()
    if (actorId) {
      headers['X-Actor-Member'] = actorId
    }

    let bodyData: BodyInit | undefined = undefined
    if (options.isUpload && options.body instanceof FormData) {
      bodyData = options.body
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      bodyData = JSON.stringify(options.body)
    }

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers,
        body: bodyData,
        credentials: 'same-origin',
      })
    } catch (err: any) {
      throw new OfflineError(err?.message || 'Network request failed')
    }

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T
      }
      return (await response.json()) as T
    }

    let errPayload: any = null
    try {
      errPayload = await response.json()
    } catch {
      // not JSON
    }

    const errCode = errPayload?.error?.code || 'unknown_error'
    const errMsg = errPayload?.error?.message || response.statusText

    if (response.status === 503 && errCode === 'offline') {
      throw new OfflineError(errMsg)
    }

    if (response.status === 409) {
      const current = errPayload?.error?.details?.current || {}
      throw new ConflictError(errMsg, current)
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

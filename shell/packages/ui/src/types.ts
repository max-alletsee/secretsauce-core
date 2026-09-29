import type { Component, Ref } from 'vue'

export const API_VERSION = 1

export interface ConfirmOptions {
  header?: string
  message: string
  acceptLabel?: string
  rejectLabel?: string
  severity?: 'info' | 'success' | 'warn' | 'danger' | 'secondary'
}

export interface SecretSauceUI {
  pluginId: string
  navigate?(path: string): void
  route(def: RouteDef): void
  slot(name: string, component: Component, opts?: { order?: number }): void
  intent: { hub(def: IntentHub): void; provider(def: IntentProvider): void }
  settings: { section(def: { id: string; title: string; component: Component; order?: number }): void }
  on(name: string, handler: (e: StreamEvent | StreamPush) => void): void | (() => void)
  api: ApiClient
  url(path: string): string
  store: { currentMember: Ref<Member | null>; members: Ref<Member[]>; household: Ref<Household>; online: Ref<boolean> }
  outbox: Outbox
  i18n: { add(lang: string, messages: Record<string, string>): void }
  t(key: string, params?: Record<string, string | number>): string
  theme: { register(def: { id: string; label: string; preset: object }): void }
  notify(n: { level: 'info' | 'success' | 'warning' | 'error'; message: string }): void
  confirm(options: ConfirmOptions): Promise<boolean>
}

export interface RouteDef {
  path: string
  component: Component
  order?: number
  nav?: { label: string; icon?: string; order: number }
}

export interface ApiClient {
  get<T>(path: string, query?: Record<string, string | number | boolean | string[]>): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string, query?: Record<string, string | number>): Promise<void>
  upload<T>(path: string, form: FormData): Promise<T>
}

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class ConflictError extends ApiError {
  current: Record<string, unknown>
  constructor(message: string, current: Record<string, unknown>) {
    super(409, 'conflict', message, { current })
    this.name = 'ConflictError'
    this.current = current
  }
}

export class OfflineError extends ApiError {
  constructor(message: string = 'Network unavailable') {
    super(0, 'offline', message)
    this.name = 'OfflineError'
  }
}

export interface StreamEvent {
  kind: 'event'
  seq: number
  name: string
  entity_type: string | null
  entity_id: string | null
  revision: number | null
  actor_member_id: string | null
  origin: string
  created_at: string
}

export interface StreamPush {
  kind: 'push'
  name: string
  data: unknown
  plugin_id: string
}

export interface Member {
  id: string
  revision: number
  name: string
  avatar_color: string | null
  serving_ratio: number
  dietary_restrictions: string[]
  allergies: string[]
  disliked_ingredients: string[]
  favorite_cuisines: string[]
  preferred_language: string
}

export interface Household {
  household_name: string
  meal_types: { id: string; label: string }[]
  languages: { primary: string }
  units: 'metric' | 'us_customary'
}

export interface IntentHub {
  id: string
  title: string
}

export interface IntentProvider<C = unknown, R = unknown> {
  hub: string
  id: string
  title: string
  icon?: string
  order: number
  isAvailable?: (context: C) => boolean
  disabledReason?: (context: C) => string | null
  kind: 'ui' | 'headless'
  component?: Component
  execute?: (context: C) => Promise<R> | R
}

export interface OutboxRequest {
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  body?: unknown
  query?: Record<string, string | number>
  tag?: string
}

export interface OutboxEntry extends OutboxRequest {
  id: string
  plugin_id: string
  actor_member_id: string | null
  created_at: string
  attempts: number
  last_error: string | null
}

export interface Outbox {
  pending: Ref<number>
  failed: Ref<OutboxEntry[]>
  enqueue(req: OutboxRequest): Promise<string>
  discard(entryId: string): Promise<void>
  on(kind: 'applied', handler: (entry: OutboxEntry, response: unknown) => void): void
  on(kind: 'failed', handler: (entry: OutboxEntry, error: ApiError) => void): void
}

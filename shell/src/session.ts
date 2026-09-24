import type { ApiClient } from '@secretsauce/ui'
import { OUTBOX_DB_NAME } from './outbox'

/**
 * Setup and session status for the router guard.
 *
 * Positive answers are cached, so navigating does not cost two requests;
 * negative ones are re-checked (a login can happen at any moment). The API
 * client's 401 hook calls invalidate() when a session ends server-side.
 */
export function createAuthState(api: Pick<ApiClient, 'get'>) {
  let setupComplete = false
  let authenticated = false

  async function needsSetup(): Promise<boolean> {
    if (setupComplete) return false
    try {
      const status = await api.get<{ needs_setup?: boolean; setup_required?: boolean }>('/api/setup')
      const needs = Boolean(status?.needs_setup ?? status?.setup_required)
      setupComplete = !needs
      return needs
    } catch {
      return false // offline: let cached pages load
    }
  }

  async function isAuthenticated(): Promise<boolean> {
    if (authenticated) return true
    try {
      const session = await api.get<{ authenticated?: boolean }>('/api/auth/session')
      authenticated = Boolean(session?.authenticated)
    } catch {
      authenticated = false
    }
    return authenticated
  }

  return {
    needsSetup,
    isAuthenticated,
    markAuthenticated() {
      setupComplete = true
      authenticated = true
    },
    invalidate() {
      authenticated = false
    },
  }
}

export interface LogoutDeps {
  api: Pick<ApiClient, 'post'>
  serviceWorker?: Pick<ServiceWorkerContainer, 'getRegistration'> | null
  storage?: Storage | null
  deleteDatabase?: (name: string) => unknown
}

const HOUSEHOLD_STORAGE_PREFIXES = ['ss-', 'secretsauce:']

/**
 * Ends the session and removes everything the shell stored for the household
 * (spec 8.6): cached API responses and assets, queued writes, local settings.
 * Local data is cleared even when the server cannot be reached.
 */
export async function logout(deps: LogoutDeps): Promise<void> {
  try {
    await deps.api.post('/api/auth/logout')
  } catch {
    // Offline or already logged out: still clear this device.
  }

  try {
    const registration = await deps.serviceWorker?.getRegistration()
    registration?.active?.postMessage({ type: 'clear' })
  } catch {
    // No service worker in this context.
  }

  const storage = deps.storage
  if (storage) {
    const doomed: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && HOUSEHOLD_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) doomed.push(key)
    }
    doomed.forEach((key) => storage.removeItem(key))
  }

  deps.deleteDatabase?.(OUTBOX_DB_NAME)
}

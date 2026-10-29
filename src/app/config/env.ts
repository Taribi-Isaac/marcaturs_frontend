/**
 * Admin Control sign-in. `VITE_ADMIN_FRONTEND_URL` must be the same public origin
 * as backend `ADMIN_FRONTEND_URL`. Only an absolute http(s) origin is accepted.
 * A path, query, credential, or other scheme produces no link.
 */
export function resolveAdminLoginUrl(raw?: string): string | null {
  const value = (raw ?? import.meta.env.VITE_ADMIN_FRONTEND_URL)?.trim()
  if (!value) {
    return null
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }

  if (url.username || url.password || url.search || url.hash) {
    return null
  }

  if (url.pathname !== '/' && url.pathname !== '') {
    return null
  }

  return `${url.origin}/login`
}

export const appConfig = {
  appName: 'MarcatursHub',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  backendOrigin: import.meta.env.VITE_BACKEND_ORIGIN ?? 'http://localhost:8000',
} as const

export function resolveSanctumOrigin(): string {
  if (appConfig.apiBaseUrl.startsWith('http://') || appConfig.apiBaseUrl.startsWith('https://')) {
    return new URL(appConfig.apiBaseUrl).origin
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}

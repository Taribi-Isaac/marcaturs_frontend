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

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied'

const MEASUREMENT_ID = /^G-[A-Z0-9]{6,}$/

/** Accept only a GA4 measurement ID. GTM container IDs and blank values are rejected. */
export function measurementIdOrNull(raw: string | undefined | null): string | null {
  const value = raw?.trim() ?? ''
  if (!MEASUREMENT_ID.test(value)) return null
  return value
}

export function publicHostnameOrNull(origin: string | undefined | null): string | null {
  const value = origin?.trim() ?? ''
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password || url.search || url.hash) return null
    if (url.pathname !== '/' && url.pathname !== '') return null
    const host = url.hostname
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return null
    return host
  } catch {
    return null
  }
}

/**
 * The tag may be offered and loaded only on a production build whose hostname
 * matches the configured public origin. Local, test, and preview hosts stay quiet.
 */
export function analyticsHostConfigured(input: {
  measurementId: string | null
  prod: boolean
  hostname: string
  publicOrigin: string | undefined
}): boolean {
  if (!input.prod || !input.measurementId) return false
  const expected = publicHostnameOrNull(input.publicOrigin)
  if (!expected) return false
  return input.hostname === expected
}

/**
 * Public site origin for canonical / Open Graph URLs (MH-FE-023).
 *
 * Prefer `VITE_PUBLIC_ORIGIN` when set (staging/production builds).
 * Fall back to `window.location.origin` in the browser so local dev works
 * without inventing a production domain.
 */
export function getPublicOrigin(): string {
  const configured = (import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined)?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

/** Absolute URL for a same-origin path or already-absolute URL. */
export function toAbsolutePublicUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const origin = getPublicOrigin()
  if (!origin) return null
  if (pathOrUrl.startsWith('/')) return `${origin}${pathOrUrl}`
  return `${origin}/${pathOrUrl}`
}

export function canonicalUrlForPath(pathname: string, search = ''): string | null {
  const origin = getPublicOrigin()
  if (!origin) return null
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${origin}${path}${search}`
}

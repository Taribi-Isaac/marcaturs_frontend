const STATIC_SEGMENT = /^[a-z][a-z0-9-]{0,31}$/
/** Internal ids only. Longer digit runs are treated as phone-like and dropped. */
const NUMERIC_SEGMENT = /^[1-9][0-9]{0,8}$/

/** Pathname only. Query strings, hashes, payment tokens, private ids, and phone-like segments are removed. */
export function analyticsPath(input: string): string {
  let pathname = input
  try {
    const url = new URL(input, 'https://app.marcaturshub.com.ng')
    pathname = url.pathname
  } catch {
    return '/'
  }
  if (/^\/pay(?:\/|$)/i.test(pathname)) return '/pay'

  let decoded = pathname
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return '/'
  }
  if (decoded.includes('@') || decoded.includes('?') || decoded.includes('#')) return '/'

  const privateApp = decoded === '/app' || decoded.startsWith('/app/')
  const kept: string[] = []
  for (const segment of decoded.split('/')) {
    if (segment === '') continue
    if (STATIC_SEGMENT.test(segment)) {
      kept.push(segment)
      continue
    }
    if (!privateApp && NUMERIC_SEGMENT.test(segment)) {
      kept.push(segment)
      continue
    }
  }
  return kept.length === 0 ? '/' : `/${kept.join('/')}`
}

export function analyticsPageLocation(origin: string, path: string): string {
  const sanitized = analyticsPath(path)
  try {
    const url = new URL(origin)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return sanitized
    return `${url.origin}${sanitized}`
  } catch {
    return sanitized
  }
}

export function analyticsReferrer(referrer: string): string | undefined {
  const value = referrer.trim()
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    return `${url.origin}${analyticsPath(url.pathname)}`
  } catch {
    return undefined
  }
}

export function analyticsTitle(title: string): string | undefined {
  const value = title.replace(/\s+/g, ' ').trim()
  if (!value || value.length > 180) return undefined
  if (/[@]|token=|password=|email=/i.test(value)) return undefined
  if (/\d{7,}/.test(value) || /deal\s*#\s*\d+/i.test(value)) return undefined
  return value
}

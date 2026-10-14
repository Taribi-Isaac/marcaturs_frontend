import { appConfig } from '@/app/config/env'

export type CampaignCoverImage = {
  available: boolean
  url: string | null
  mime_type?: string | null
  size_bytes?: number | null
  original_filename?: string | null
}

/**
 * Browser URL for a backend cover stream.
 *
 * With an absolute API base (staging/production) the stream lives on the API host: absolute URLs
 * are kept and relative ones resolve against the API origin, because the static host does not
 * proxy /api. With a relative API base (local dev) the URL is rewritten to the same-origin
 * /api/v1 path so the Vite proxy forwards it with the session cookie.
 */
export function coverImageSrc(
  url: string | null | undefined,
  apiBaseUrl: string = appConfig.apiBaseUrl,
): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    try {
      return new URL(url, new URL(apiBaseUrl).origin).href
    } catch {
      return null
    }
  }
  try {
    const parsed = new URL(
      url,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    )
    const marker = '/api/v1/'
    const idx = parsed.pathname.indexOf(marker)
    if (idx >= 0) {
      return `${parsed.pathname.slice(idx)}${parsed.search}`
    }
  } catch {
    // keep original
  }
  return url
}

export const CAMPAIGN_COVER_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
export const CAMPAIGN_COVER_FORMAT_HINT = 'JPEG, PNG, or WebP'
/** Matches backend default CAMPAIGN_RESOURCE_MAX_FILE_KB (authoritative validation remains server-side). */
export const CAMPAIGN_COVER_MAX_KB_HINT = 20480

/** Changes when a cover is replaced, even though its download URL stays the same. */
export function coverVersion(cover: CampaignCoverImage | null | undefined): string {
  if (!cover) return ''
  return [cover.mime_type, cover.size_bytes, cover.original_filename].join('|')
}

/** Accessible alt for meaningful covers. */
export function campaignCoverAlt(title: string, available: boolean): string {
  return available ? `Cover image for ${title}` : ''
}

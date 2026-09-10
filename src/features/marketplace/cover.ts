export type CampaignCoverImage = {
  available: boolean
  url: string | null
  mime_type?: string | null
  size_bytes?: number | null
  original_filename?: string | null
}

/** Prefer same-origin /api/v1 paths so Vite proxy + cookies work for authenticated streams. */
export function coverImageSrc(url: string | null | undefined): string | null {
  if (!url) return null
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

/** Accessible alt for meaningful covers. */
export function campaignCoverAlt(title: string, available: boolean): string {
  return available ? `Cover image for ${title}` : ''
}

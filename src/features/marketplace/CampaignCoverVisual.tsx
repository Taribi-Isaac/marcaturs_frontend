import { useState } from 'react'
import type { CampaignCoverImage } from '@/features/marketplace/cover'
import { campaignCoverAlt, coverImageSrc, coverVersion } from '@/features/marketplace/cover'
import { useAuthenticatedCoverSrc } from '@/features/marketplace/useAuthenticatedCoverSrc'
import { useNearViewport } from '@/features/marketplace/useNearViewport'

type Props = {
  cover: CampaignCoverImage | null | undefined
  title: string
  categoryName?: string | null
  className?: string
  imgClassName?: string
  fallbackClassName?: string
  /** When true, cover images get a meaningful alt (cards/hero). List thumbs stay decorative. */
  meaningful?: boolean
  /**
   * Owner-only cover URLs (Business desk) are loaded with the session instead of a plain <img>,
   * and only once the cover approaches the viewport.
   */
  authenticated?: boolean
}

export function CampaignCoverVisual({
  cover,
  title,
  categoryName,
  className,
  imgClassName = 'campaign-cover__img',
  fallbackClassName = 'campaign-cover__fallback',
  meaningful = false,
  authenticated = false,
}: Props) {
  const resolved = cover?.available ? coverImageSrc(cover.url) : null
  const viewport = useNearViewport<HTMLDivElement>(authenticated)
  const owner = useAuthenticatedCoverSrc(
    authenticated && viewport.nearViewport ? resolved : null,
    coverVersion(cover),
  )
  const candidate = authenticated ? owner.src : resolved
  // Remember the URL that failed so a broken image falls back once, without retrying.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const src = candidate && candidate !== failedSrc ? candidate : null
  const label = categoryName?.trim() || 'Campaign'
  const available = Boolean(src)

  const ref = authenticated ? viewport.ref : undefined

  if (src) {
    return (
      <div ref={ref} className={className}>
        <img
          src={src}
          alt={meaningful ? campaignCoverAlt(title, available) : ''}
          className={imgClassName}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      </div>
    )
  }

  // Adjacent title already exists for card/list/featured banner compositions.
  const omitTitle =
    Boolean(fallbackClassName?.includes('fallback--thumb')) ||
    Boolean(fallbackClassName?.includes('fallback--card')) ||
    Boolean(fallbackClassName?.includes('fallback--featured'))

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <div className={fallbackClassName}>
        <span className="campaign-cover__fallback-kicker">{label}</span>
        {omitTitle ? null : <span className="campaign-cover__fallback-title">{title}</span>}
      </div>
    </div>
  )
}

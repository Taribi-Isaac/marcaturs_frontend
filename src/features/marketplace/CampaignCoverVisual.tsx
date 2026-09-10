import type { CampaignCoverImage } from '@/features/marketplace/cover'
import { campaignCoverAlt, coverImageSrc } from '@/features/marketplace/cover'

type Props = {
  cover: CampaignCoverImage | null | undefined
  title: string
  categoryName?: string | null
  className?: string
  imgClassName?: string
  fallbackClassName?: string
  /** When true, cover images get a meaningful alt (cards/hero). List thumbs stay decorative. */
  meaningful?: boolean
}

export function CampaignCoverVisual({
  cover,
  title,
  categoryName,
  className,
  imgClassName = 'campaign-cover__img',
  fallbackClassName = 'campaign-cover__fallback',
  meaningful = false,
}: Props) {
  const src = cover?.available ? coverImageSrc(cover.url) : null
  const label = categoryName?.trim() || 'Campaign'
  const available = Boolean(src)

  if (src) {
    return (
      <div className={className}>
        <img
          src={src}
          alt={meaningful ? campaignCoverAlt(title, available) : ''}
          className={imgClassName}
          loading="lazy"
          decoding="async"
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
    <div className={className} aria-hidden="true">
      <div className={fallbackClassName}>
        <span className="campaign-cover__fallback-kicker">{label}</span>
        {omitTitle ? null : <span className="campaign-cover__fallback-title">{title}</span>}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { CampaignCoverVisual } from '@/features/marketplace/CampaignCoverVisual'
import type { MarketplaceCampaignCard } from '@/features/marketplace/types'
import { businessDisplayName, formatCommission, formatMoney } from '@/features/marketplace/format'

export function CampaignCard({ campaign }: { campaign: MarketplaceCampaignCard }) {
  return (
    <Link
      to={`/campaigns/${campaign.id}`}
      className="card card--interactive card--link campaign-card"
    >
      <CampaignCoverVisual
        cover={campaign.cover_image}
        title={campaign.title}
        categoryName={campaign.category?.name}
        className="campaign-card__media"
        imgClassName="campaign-card__img"
        fallbackClassName="campaign-cover__fallback campaign-cover__fallback--card"
        meaningful
      />
      <div className="campaign-card__body">
        <div className="campaign-card__meta">
          {campaign.is_featured ? <span className="badge badge--accent">Featured</span> : null}
          {campaign.category ? (
            <span className="badge badge--neutral">{campaign.category.name}</span>
          ) : null}
          <span className="badge badge--neutral">{campaign.status}</span>
        </div>
        <p className="campaign-card__commission">{formatCommission(campaign)}</p>
        <h3 className="campaign-card__title">{campaign.title}</h3>
        <p className="campaign-card__product">
          {campaign.product_name || 'Product opportunity'} · {businessDisplayName(campaign)}
        </p>
        <div className="campaign-card__commercial">
          <span className="campaign-card__price">
            {campaign.price_amount
              ? formatMoney(campaign.price_amount, campaign.price_currency)
              : campaign.service_area || 'See offer details'}
          </span>
          <span className="campaign-card__cta">View offer →</span>
        </div>
      </div>
    </Link>
  )
}

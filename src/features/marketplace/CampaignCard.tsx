import { Link } from 'react-router-dom'
import type { MarketplaceCampaignCard } from '@/features/marketplace/types'
import { businessDisplayName, formatCommission, formatMoney } from '@/features/marketplace/format'

export function CampaignCard({ campaign }: { campaign: MarketplaceCampaignCard }) {
  return (
    <Link to={`/campaigns/${campaign.id}`} className="card card--interactive card--link">
      <div className="campaign-card__meta">
        {campaign.category ? (
          <span className="badge badge--neutral">{campaign.category.name}</span>
        ) : null}
        {campaign.is_featured ? <span className="badge">Featured</span> : null}
        <span className="badge badge--neutral">{campaign.status}</span>
      </div>
      <h3 className="campaign-card__title">{campaign.title}</h3>
      <p className="campaign-card__product">
        {campaign.product_name || 'Product opportunity'} · {businessDisplayName(campaign)}
      </p>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="campaign-card__commission">{formatCommission(campaign)}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          {campaign.price_amount
            ? formatMoney(campaign.price_amount, campaign.price_currency)
            : campaign.service_area || 'See details'}
        </span>
      </div>
    </Link>
  )
}

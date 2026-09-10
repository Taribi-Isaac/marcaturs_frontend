import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AmbassadorResourceImage } from '@/features/ambassador-deals/AmbassadorResourceImage'
import { campaignAllowsNewDeals } from '@/features/ambassador-deals/helpers'
import { useAuth } from '@/features/auth/authContext'
import { fetchMarketplaceCampaign } from '@/features/marketplace/api'
import { businessDisplayName, formatCommission, formatMoney } from '@/features/marketplace/format'
import { images } from '@/shared/content/images'
import { ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'

function Block({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null
  return (
    <div className="prose-block">
      <h3>{title}</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{body}</p>
    </div>
  )
}

export function CampaignDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const { user, status } = useAuth()
  const isParticipantSession = status === 'authenticated' || status === 'restricted'
  const isAmbassador = isParticipantSession && user?.role === 'AMBASSADOR'
  const isBusiness = isParticipantSession && user?.role === 'BUSINESS'
  const isGuest = status === 'unauthenticated' || status === 'unknown'

  const query = useQuery({
    queryKey: ['marketplace', 'campaign', id],
    queryFn: ({ signal }) => fetchMarketplaceCampaign(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState title="Campaign not found" />
  }

  if (query.isLoading) return <LoadingState label="Loading campaign…" />
  if (query.isError || !query.data) {
    return (
      <ErrorState title="Campaign unavailable">
        This opportunity may no longer be public, or the marketplace is temporarily offline.
      </ErrorState>
    )
  }

  const campaign = query.data
  const business = businessDisplayName(campaign)
  const eligible = campaignAllowsNewDeals(campaign.status)
  const imageResources = (campaign.marketing_resources || []).filter(
    (resource) => resource.type === 'image' || resource.mime_type?.startsWith('image/'),
  )
  const leadImage = imageResources[0]

  return (
    <>
      <PageMeta
        title={campaign.title}
        description={`${campaign.product_name || campaign.title} — ${formatCommission(campaign)}`}
      />
      <section className="campaign-visual-hero">
        <div className="campaign-visual-hero__media" aria-hidden={!leadImage}>
          {isAmbassador && leadImage ? (
            <AmbassadorResourceImage
              campaignId={campaign.id}
              resourceId={leadImage.id}
              title={leadImage.title}
              className="campaign-visual-hero__img"
            />
          ) : (
            <img src={images.business.src} alt="" className="campaign-visual-hero__img" />
          )}
          <div className="campaign-visual-hero__scrim" />
        </div>
        <div className="container campaign-visual-hero__content">
          <Link to="/discover" className="campaign-visual-hero__back">
            ← Discover
          </Link>
          <div className="row" style={{ marginBottom: '1rem' }}>
            {campaign.category ? (
              <span className="badge badge--neutral">{campaign.category.name}</span>
            ) : null}
            {campaign.is_featured ? <span className="badge badge--accent">Featured</span> : null}
            <span className="badge badge--neutral">{campaign.status}</span>
          </div>
          <h1>{campaign.title}</h1>
          <p className="campaign-visual-hero__lead">
            {campaign.product_name || 'Product opportunity'} from {business}.
          </p>
          <p className="campaign-visual-hero__commission">{formatCommission(campaign)}</p>
        </div>
      </section>

      <section className="section section--tight">
        <div className="container detail-grid">
          <div className="stack stack--lg">
            <div className="prose-block">
              <h3>About the offer</h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>
                {campaign.product_description || 'Details are provided by the publishing business.'}
              </p>
            </div>
            <Block title="Qualifying conditions" body={campaign.qualifying_conditions} />
            <Block title="Commission trigger" body={campaign.commission_trigger_description} />
            <Block title="Approved claims" body={campaign.approved_claims} />
            <Block title="Prohibited claims" body={campaign.prohibited_claims} />
            <Block title="Brand rules" body={campaign.brand_use_rules} />
            <Block
              title="Geographic restrictions"
              body={campaign.geographic_customer_restrictions}
            />
            <Block title="Refund / cancellation" body={campaign.refund_cancellation_rules} />
            <Block title="Approved copy" body={campaign.approved_copy} />
            <Block title="Campaign terms" body={campaign.terms} />
            {campaign.marketing_links?.length ? (
              <div className="prose-block">
                <h3>Marketing links</h3>
                <ul>
                  {campaign.marketing_links.map((link) => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noreferrer">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {isAmbassador && campaign.marketing_resources?.length ? (
              <div className="prose-block">
                <h3>Campaign resources</h3>
                <p style={{ color: 'var(--color-muted)' }}>
                  Downloadable assets for this opportunity. Storage paths are never exposed.
                </p>
                <ul className="resource-meta-list">
                  {campaign.marketing_resources.map((resource) => (
                    <li key={resource.id}>
                      <strong>{resource.title || resource.type}</strong>
                      <span className="campaign-row__meta"> · {resource.type}</span>
                    </li>
                  ))}
                </ul>
                {imageResources.length > 1 ? (
                  <div className="resource-image-grid">
                    {imageResources.slice(1, 4).map((resource) => (
                      <AmbassadorResourceImage
                        key={resource.id}
                        campaignId={campaign.id}
                        resourceId={resource.id}
                        title={resource.title}
                        className="resource-image-grid__img"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <aside className="detail-aside stack">
            <div className="card stack">
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Commission</p>
                <strong className="commission-hero__value" style={{ fontSize: '1.65rem' }}>
                  {formatCommission(campaign)}
                </strong>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Pricing</p>
                <strong>
                  {campaign.price_amount
                    ? formatMoney(campaign.price_amount, campaign.price_currency)
                    : 'See terms'}
                </strong>
              </div>
              {campaign.service_area ? (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Service area</p>
                  <strong>{campaign.service_area}</strong>
                </div>
              ) : null}
              {campaign.commission_payment_deadline_days ? (
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    Commission deadline
                  </p>
                  <strong>
                    {campaign.commission_payment_deadline_days} days after confirmation
                  </strong>
                </div>
              ) : null}
              <div className="alert alert--info">
                Customers pay the Business directly. Account identifiers stay on the Official
                Payment page — not on this public listing.
                {(campaign.payment_destination_name || campaign.payment_provider) && (
                  <p style={{ marginTop: '0.75rem' }}>
                    <strong>{campaign.payment_destination_name || 'Business destination'}</strong>
                    {campaign.payment_provider ? ` · ${campaign.payment_provider}` : ''}
                  </p>
                )}
              </div>

              {isAmbassador ? (
                eligible ? (
                  <>
                    <ButtonLink to={`/app/ambassador/deals/new?campaign=${campaign.id}`}>
                      Create Deal
                    </ButtonLink>
                    <p className="form-section__lead">
                      Get paid when the Business confirms your customer&apos;s payment.
                    </p>
                  </>
                ) : (
                  <div className="alert alert--warning">
                    New Deals are only available while this campaign is active or expiring. Current
                    status: {campaign.status}.
                  </div>
                )
              ) : null}

              {isBusiness ? (
                <div className="alert alert--info">
                  You&apos;re signed in as a Business. Deal creation is an Ambassador action.
                  <div style={{ marginTop: '0.75rem' }}>
                    <ButtonLink to="/app/business/campaigns" variant="secondary">
                      Open business campaigns
                    </ButtonLink>
                  </div>
                </div>
              ) : null}

              {isGuest ? (
                <>
                  <p className="form-section__lead">
                    Ambassadors create Deals from eligible campaigns. Guests can browse freely.
                  </p>
                  <ButtonLink to={`/login?next=${encodeURIComponent(`/campaigns/${campaign.id}`)}`}>
                    Sign in to create a Deal
                  </ButtonLink>
                  <ButtonLink to="/register?role=AMBASSADOR" variant="secondary">
                    Create ambassador account
                  </ButtonLink>
                </>
              ) : null}
            </div>
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
                {business}
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                Verification: {campaign.business.verification_status.replaceAll('_', ' ')}
              </p>
              {campaign.business.operating_location ? (
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                  {campaign.business.operating_location}
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </>
  )
}

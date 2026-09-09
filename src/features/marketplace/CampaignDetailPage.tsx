import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchMarketplaceCampaign } from '@/features/marketplace/api'
import { businessDisplayName, formatCommission, formatMoney } from '@/features/marketplace/format'
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

  return (
    <>
      <PageMeta
        title={campaign.title}
        description={`${campaign.product_name || campaign.title} — ${formatCommission(campaign)}`}
      />
      <section className="page-hero">
        <div className="container">
          <p style={{ marginBottom: '0.75rem' }}>
            <Link to="/discover">← Discover</Link>
          </p>
          <div className="row" style={{ marginBottom: '1rem' }}>
            {campaign.category ? (
              <span className="badge badge--neutral">{campaign.category.name}</span>
            ) : null}
            {campaign.is_featured ? <span className="badge">Featured</span> : null}
            <span className="badge badge--neutral">{campaign.status}</span>
          </div>
          <h1>{campaign.title}</h1>
          <p>
            {campaign.product_name || 'Product opportunity'} from {business}.{' '}
            {formatCommission(campaign)}.
          </p>
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
          </div>

          <aside className="detail-aside stack">
            <div className="card stack">
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Commission</p>
                <strong style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>
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
                Payment destination shown publicly is limited to destination name and provider.
                Account identifiers are not exposed here.
                {(campaign.payment_destination_name || campaign.payment_provider) && (
                  <p style={{ marginTop: '0.75rem' }}>
                    <strong>{campaign.payment_destination_name || 'Business destination'}</strong>
                    {campaign.payment_provider ? ` · ${campaign.payment_provider}` : ''}
                  </p>
                )}
              </div>
              <ButtonLink to="/register?role=AMBASSADOR">Create ambassador account</ButtonLink>
              <ButtonLink to="/login" variant="secondary">
                Sign in to participate
              </ButtonLink>
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

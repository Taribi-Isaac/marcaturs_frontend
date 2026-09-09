import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { formatMoney } from '@/features/marketplace/format'
import { ApiClientError } from '@/shared/api/errors'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchOfficialPaymentInformation } from './api'
import { CopyPaymentLinkButton } from './CopyPaymentLinkButton'
import { officialPaymentKeys } from './queryKeys'

export function OfficialPaymentPage() {
  const params = useParams()
  const token = params.token?.trim() || ''

  const query = useQuery({
    queryKey: officialPaymentKeys.byToken(token),
    queryFn: ({ signal }) => fetchOfficialPaymentInformation(token, signal),
    enabled: token.length > 0,
    retry: false,
  })

  if (!token) {
    return <ErrorState title="Payment information not found" />
  }

  if (query.isLoading) {
    return (
      <>
        <PageMeta title="Official payment" />
        <LoadingState label="Loading payment information…" />
      </>
    )
  }

  if (query.isError || !query.data) {
    const status = query.error instanceof ApiClientError ? query.error.status : 0
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: '40rem' }}>
          <ErrorState
            title={
              status === 404
                ? 'Payment information unavailable'
                : 'Could not load payment information'
            }
          >
            This link may be invalid, or the campaign is no longer open for customer payment.
          </ErrorState>
          <p style={{ marginTop: '1.5rem' }}>
            <Link to="/">Back to MarcatursHub</Link>
          </p>
        </div>
      </section>
    )
  }

  const data = query.data
  const business = data.business.trading_name || data.business.legal_name || 'Business'
  const product = data.campaign_version.product_name || data.campaign.title
  const destination = data.payment_destination

  return (
    <>
      <PageMeta
        title={`Pay ${business}`}
        description={`Official payment information for ${product}. Pay the business directly.`}
      />
      <section className="pay-page">
        <div className="container pay-page__inner">
          <p className="pay-page__brand">
            <Link to="/">MarcatursHub</Link>
          </p>

          <div className="alert alert--warning pay-page__boundary">
            <strong>Pay the business directly.</strong>
            <p>{data.financial_boundary.statement}</p>
            <p>
              <strong>MarcatursHub does not receive your payment.</strong>
            </p>
          </div>

          <header className="pay-page__header">
            <p className="eyebrow">Official payment information</p>
            <h1>{product}</h1>
            <p>
              From <strong>{business}</strong>
              {data.campaign.category ? ` · ${data.campaign.category.name}` : ''}
            </p>
          </header>

          {data.campaign_version.product_description ? (
            <section className="card stack">
              <h2>What you&apos;re buying</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{data.campaign_version.product_description}</p>
              {data.campaign_version.price_amount != null ? (
                <p>
                  <strong>
                    {formatMoney(
                      String(data.campaign_version.price_amount),
                      data.campaign_version.price_currency,
                    )}
                  </strong>
                  {data.campaign_version.service_area
                    ? ` · ${data.campaign_version.service_area}`
                    : ''}
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="card stack pay-destination">
            <h2>Where to pay</h2>
            <dl className="snapshot-grid">
              <div>
                <dt>Destination</dt>
                <dd>{destination.destination_name || '—'}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{destination.provider || '—'}</dd>
              </div>
              <div className="snapshot-grid__wide">
                <dt>Account</dt>
                <dd className="pay-account">{destination.account_identifier || '—'}</dd>
              </div>
            </dl>
            {destination.instructions ? (
              <div className="prose-block">
                <h3>Instructions</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{destination.instructions}</p>
              </div>
            ) : null}
            {destination.contact ? (
              <p>
                Contact: <strong>{destination.contact}</strong>
              </p>
            ) : null}
          </section>

          <section className="card stack">
            <h2>Share this page</h2>
            <p className="form-section__lead">
              Ambassadors can share this Official Payment link with customers. Payment details
              always load from the live published campaign version.
            </p>
            <CopyPaymentLinkButton
              shareUrl={data.share.share_url}
              sharePath={data.share.share_path}
            />
          </section>

          <p className="pay-page__footnote">
            MarcatursHub connects businesses and ambassadors. It does not guarantee this transaction
            or process customer purchase payments.
          </p>
        </div>
      </section>
    </>
  )
}

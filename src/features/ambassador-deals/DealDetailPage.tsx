import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { fetchMarketplaceCampaign } from '@/features/marketplace/api'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { cancelDeal, confirmCommissionReceived, fetchDeal, fetchPaymentEvidence } from './api'
import { CopyPaymentLinkButton } from './CopyPaymentLinkButton'
import { formatDateTime, formatDealCommission, formatMoney } from './format'
import { fieldErrorsFromApi } from './helpers'
import { PaymentEvidencePanel } from './PaymentEvidencePanel'
import { dealKeys } from './queryKeys'
import { buildDealTimeline, dealNextAction, dealStatusBadgeClass, dealStatusLabel } from './status'

export function DealDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [cancelFieldError, setCancelFieldError] = useState<string | null>(null)

  const dealQuery = useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: ({ signal }) => fetchDeal(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const evidenceQuery = useQuery({
    queryKey: dealKeys.evidence(id),
    queryFn: ({ signal }) => fetchPaymentEvidence(id, signal),
    enabled: Number.isFinite(id) && id > 0 && dealQuery.isSuccess,
  })

  const campaignId = dealQuery.data?.campaign.id
  const paymentShareQuery = useQuery({
    queryKey: ['marketplace', 'campaign', campaignId, 'payment-share'],
    queryFn: ({ signal }) => fetchMarketplaceCampaign(campaignId!, signal),
    enabled: Boolean(campaignId) && dealQuery.data?.status === 'payment_pending',
    retry: false,
  })

  const evidence = evidenceQuery.data ?? []
  const hasEvidence = evidence.length > 0
  const deal = dealQuery.data

  const next = useMemo(() => {
    if (!deal) return null
    return dealNextAction({
      status: deal.status,
      hasEvidence,
      commissionStatus: deal.commission?.status,
      isOverdue: deal.commission?.is_overdue,
    })
  }, [deal, hasEvidence])

  const timeline = useMemo(() => {
    if (!deal) return []
    return buildDealTimeline({
      status: deal.status,
      hasEvidence,
      commissionStatus: deal.commission?.status,
    })
  }, [deal, hasEvidence])

  const cancelMutation = useMutation({
    mutationFn: () => cancelDeal(id, cancelReason.trim()),
    onSuccess: async (updated) => {
      queryClient.setQueryData(dealKeys.detail(id), updated)
      await queryClient.invalidateQueries({ queryKey: dealKeys.list() })
      setShowCancel(false)
      setActionError(null)
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setActionError(err.message)
        setCancelFieldError(fieldErrorsFromApi(err).reason || null)
        if (err.status === 409) {
          void queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) })
        }
        return
      }
      setActionError('Could not cancel this Deal.')
    },
  })

  const confirmReceivedMutation = useMutation({
    mutationFn: (commissionId: number) => confirmCommissionReceived(commissionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: dealKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ['commissions'] }),
      ])
      setActionError(null)
    },
    onError: (err) => {
      setActionError(err instanceof ApiClientError ? err.message : 'Could not confirm receipt.')
      if (err instanceof ApiClientError && err.status === 409) {
        void queryClient.invalidateQueries({ queryKey: dealKeys.detail(id) })
      }
    },
  })

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState title="Deal not found" />
  }

  if (dealQuery.isLoading) return <LoadingState label="Loading deal…" />

  if (dealQuery.isError || !deal) {
    const status = dealQuery.error instanceof ApiClientError ? dealQuery.error.status : 0
    return (
      <ErrorState title={status === 404 ? 'Deal not found' : 'Could not load deal'}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void dealQuery.refetch()}
        >
          Retry
        </Button>
      </ErrorState>
    )
  }

  const official = paymentShareQuery.data?.official_payment
  const commission = deal.commission

  return (
    <>
      <PageMeta
        title={`Deal #${deal.id}`}
        description={`${deal.product_name || deal.campaign.title} — ${dealStatusLabel(deal.status)}`}
      />
      <div className="desk-page reveal">
        <p>
          <Link to="/app/ambassador/deals">← Deals</Link>
        </p>

        <header className="desk-header">
          <div>
            <div className="row" style={{ marginBottom: '0.75rem' }}>
              <span className={dealStatusBadgeClass(deal.status)}>
                {dealStatusLabel(deal.status)}
              </span>
              {deal.has_open_dispute ? (
                <span className="badge badge--danger">
                  Dispute open ({deal.open_dispute_count})
                </span>
              ) : null}
              {commission?.is_overdue ? (
                <span className="badge badge--danger">Commission overdue</span>
              ) : null}
            </div>
            <h1>{deal.product_name || deal.campaign.title}</h1>
            <p>
              Deal #{deal.id} · {deal.campaign.title} · Created {formatDateTime(deal.created_at)}
            </p>
          </div>
        </header>

        {next ? (
          <div className="card next-action-card">
            <p className="eyebrow">What&apos;s happening now</p>
            <h2>{next.title}</h2>
            <p>{next.body}</p>
          </div>
        ) : null}

        {actionError ? <div className="alert alert--danger">{actionError}</div> : null}

        <ol className="deal-timeline" aria-label="Deal progress">
          {timeline.map((stage) => (
            <li
              key={stage.key}
              className={[
                'deal-timeline__step',
                stage.done ? 'is-done' : '',
                stage.current ? 'is-current' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="deal-timeline__dot" aria-hidden />
              <span>{stage.label}</span>
            </li>
          ))}
        </ol>

        <div className="campaign-desk-grid">
          <div className="stack stack--lg">
            <section className="card stack">
              <h2>Deal snapshot</h2>
              <p className="form-section__lead">
                Historical commercial terms locked when this Deal was created — not the
                campaign&apos;s current marketplace values.
              </p>
              <dl className="snapshot-grid">
                <div>
                  <dt>Product</dt>
                  <dd>{deal.product_name || '—'}</dd>
                </div>
                <div>
                  <dt>Pricing</dt>
                  <dd>
                    {deal.price_amount != null
                      ? formatMoney(deal.price_amount, deal.price_currency)
                      : deal.pricing_method || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Commission</dt>
                  <dd>{formatDealCommission(deal)}</dd>
                </div>
                <div>
                  <dt>Trigger</dt>
                  <dd>
                    {deal.commission_trigger_description ||
                      deal.commission_trigger?.replaceAll('_', ' ') ||
                      '—'}
                  </dd>
                </div>
                <div>
                  <dt>Deadline</dt>
                  <dd>
                    {deal.commission_payment_deadline_days != null
                      ? `${deal.commission_payment_deadline_days} days after confirmation`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Expected transaction</dt>
                  <dd>
                    {deal.expected_transaction_amount != null
                      ? formatMoney(deal.expected_transaction_amount, deal.price_currency)
                      : '—'}
                  </dd>
                </div>
              </dl>
              {deal.qualifying_conditions ? (
                <div className="prose-block">
                  <h3>Qualifying conditions</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{deal.qualifying_conditions}</p>
                </div>
              ) : null}
              {deal.minimum_qualifying_amount != null ? (
                <p className="campaign-row__meta">
                  Minimum qualifying amount:{' '}
                  {formatMoney(deal.minimum_qualifying_amount, deal.price_currency)}
                </p>
              ) : null}
            </section>

            {deal.status === 'payment_pending' ? (
              <section className="card stack">
                <h2>Official payment information</h2>
                <p className="form-section__lead">
                  Share this link with your customer. They pay the Business directly — MarcatursHub
                  does not receive the purchase payment.
                </p>
                {official ? (
                  <>
                    <CopyPaymentLinkButton
                      shareUrl={official.share_url}
                      sharePath={official.share_path}
                    />
                    <ButtonLink to={official.share_path} variant="secondary">
                      Open payment page
                    </ButtonLink>
                  </>
                ) : paymentShareQuery.isLoading ? (
                  <LoadingState label="Loading payment link…" />
                ) : (
                  <div className="alert alert--warning">
                    Official payment information is unavailable for this campaign right now. It may
                    no longer be discoverable.
                  </div>
                )}
              </section>
            ) : null}

            <PaymentEvidencePanel
              dealId={deal.id}
              status={deal.status}
              evidence={evidence}
              currencyHint={deal.price_currency}
            />

            {commission ? (
              <section className="card stack">
                <h2>Commission</h2>
                <p className="form-section__lead">
                  The Business pays you directly. MarcatursHub tracks liability and status — it does
                  not auto-transfer commission in MVP.
                </p>
                <dl className="snapshot-grid">
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatMoney(commission.amount, commission.currency)}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      {commission.is_overdue ? 'Overdue' : commission.status}
                      {commission.due_at ? ` · due ${formatDateTime(commission.due_at)}` : ''}
                    </dd>
                  </div>
                </dl>
                {commission.status === 'paid' ? (
                  <Button
                    type="button"
                    onClick={() => confirmReceivedMutation.mutate(commission.id)}
                    disabled={confirmReceivedMutation.isPending}
                  >
                    {confirmReceivedMutation.isPending
                      ? 'Confirming…'
                      : 'Confirm commission received'}
                  </Button>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="detail-aside">
            <div className="card stack">
              <h3>Parties</h3>
              <div>
                <p className="eyebrow">Business</p>
                <strong>{deal.business.name || `Business #${deal.business.id}`}</strong>
              </div>
              <div>
                <p className="eyebrow">Ambassador</p>
                <strong>{deal.ambassador.name || 'You'}</strong>
              </div>
              <div>
                <p className="eyebrow">Campaign version</p>
                <strong>v{deal.campaign_version.version_number ?? '—'}</strong>
              </div>
              {deal.confirmed_at ? (
                <div>
                  <p className="eyebrow">Confirmed</p>
                  <strong>
                    {formatMoney(deal.confirmed_payment_amount, deal.price_currency)} ·{' '}
                    {formatDateTime(deal.confirmed_at)}
                  </strong>
                </div>
              ) : null}
              {deal.cancelled_at ? (
                <div>
                  <p className="eyebrow">Cancelled</p>
                  <strong>{formatDateTime(deal.cancelled_at)}</strong>
                </div>
              ) : null}
            </div>

            {deal.has_open_dispute ? (
              <div className="card stack">
                <h3>Disputes</h3>
                <p className="form-section__lead">
                  This Deal has {deal.open_dispute_count} open dispute
                  {deal.open_dispute_count === 1 ? '' : 's'}. Financial state is not changed here.
                </p>
                <ButtonLink to="/app/ambassador/disputes" variant="secondary">
                  Open disputes area
                </ButtonLink>
              </div>
            ) : null}

            {deal.status === 'payment_pending' ? (
              <div className="card stack">
                <h3>Cancel Deal</h3>
                <p className="form-section__lead">
                  Only available while payment is pending. Cancellation is terminal and does not
                  create financial mutation.
                </p>
                {!showCancel ? (
                  <Button type="button" variant="secondary" onClick={() => setShowCancel(true)}>
                    Cancel this Deal
                  </Button>
                ) : (
                  <form
                    className="stack"
                    onSubmit={(event) => {
                      event.preventDefault()
                      cancelMutation.mutate()
                    }}
                  >
                    <div className="field">
                      <label htmlFor="cancel-reason">Reason</label>
                      <textarea
                        id="cancel-reason"
                        required
                        rows={3}
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                      />
                      {cancelFieldError ? <p className="field-error">{cancelFieldError}</p> : null}
                    </div>
                    <div className="action-bar">
                      <Button type="submit" disabled={cancelMutation.isPending}>
                        {cancelMutation.isPending ? 'Cancelling…' : 'Confirm cancellation'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowCancel(false)}>
                        Keep Deal
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}

            <Button type="button" variant="ghost" onClick={() => navigate('/discover')}>
              Find another offer
            </Button>
          </aside>
        </div>
      </div>
    </>
  )
}

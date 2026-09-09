import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  formatDateTime,
  formatDealCommission,
  formatMoney,
} from '@/features/ambassador-deals/format'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import {
  buildDealTimeline,
  dealStatusBadgeClass,
  dealStatusLabel,
} from '@/features/ambassador-deals/status'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  cancelBusinessDeal,
  confirmDeal,
  fetchBusinessDeal,
  fetchDealEvidence,
  markCommissionPaid,
} from './api'
import { BusinessEvidencePanel } from './BusinessEvidencePanel'
import { ConfirmDialog } from './ConfirmDialog'
import { businessCommissionKeys, businessDealKeys } from './queryKeys'
import { businessNextAction, hasSubmittedEvidence } from './status'

export function BusinessDealDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmedAmount, setConfirmedAmount] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmFieldError, setConfirmFieldError] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelFieldError, setCancelFieldError] = useState<string | null>(null)
  const [paidRef, setPaidRef] = useState('')
  const [paidNote, setPaidNote] = useState('')

  const dealQuery = useQuery({
    queryKey: businessDealKeys.detail(id),
    queryFn: ({ signal }) => fetchBusinessDeal(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const evidenceQuery = useQuery({
    queryKey: businessDealKeys.evidence(id),
    queryFn: ({ signal }) => fetchDealEvidence(id, signal),
    enabled: Number.isFinite(id) && id > 0 && dealQuery.isSuccess,
  })

  const deal = dealQuery.data
  const evidence = evidenceQuery.data ?? []
  const submitted = hasSubmittedEvidence(evidence)

  const next = useMemo(() => {
    if (!deal) return null
    return businessNextAction({
      status: deal.status,
      hasSubmittedEvidence: submitted,
      commissionStatus: deal.commission?.status,
      isOverdue: deal.commission?.is_overdue,
    })
  }, [deal, submitted])

  const timeline = useMemo(() => {
    if (!deal) return []
    return buildDealTimeline({
      status: deal.status,
      hasEvidence: evidence.length > 0,
      commissionStatus: deal.commission?.status,
    })
  }, [deal, evidence.length])

  const needsAmount = deal?.commission_type === 'percentage'
  const canConfirm =
    deal?.status === 'payment_pending' &&
    submitted &&
    deal.commission_trigger === 'payment_confirmation'

  const refreshDealQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: businessDealKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: businessDealKeys.evidence(id) }),
      queryClient.invalidateQueries({ queryKey: businessDealKeys.all }),
      queryClient.invalidateQueries({ queryKey: businessCommissionKeys.list() }),
    ])
  }

  const confirmMutation = useMutation({
    mutationFn: () =>
      confirmDeal(id, {
        confirmed_payment_amount: needsAmount ? confirmedAmount.trim() : undefined,
      }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(businessDealKeys.detail(id), updated)
      setShowConfirm(false)
      setActionError(null)
      setConfirmFieldError(null)
      await refreshDealQueries()
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setActionError(err.message)
        setConfirmFieldError(fieldErrorsFromApi(err).confirmed_payment_amount || null)
        if (err.status === 409) void refreshDealQueries()
        return
      }
      setActionError('Could not confirm this payment.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelBusinessDeal(id, cancelReason.trim()),
    onSuccess: async (updated) => {
      queryClient.setQueryData(businessDealKeys.detail(id), updated)
      setShowCancel(false)
      setActionError(null)
      await refreshDealQueries()
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setActionError(err.message)
        setCancelFieldError(fieldErrorsFromApi(err).reason || null)
        if (err.status === 409) void refreshDealQueries()
        return
      }
      setActionError('Could not cancel this Deal.')
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (commissionId: number) =>
      markCommissionPaid(commissionId, {
        payment_reference: paidRef.trim() || undefined,
        payment_note: paidNote.trim() || undefined,
      }),
    onSuccess: async () => {
      setActionError(null)
      await refreshDealQueries()
    },
    onError: (err) => {
      setActionError(err instanceof ApiClientError ? err.message : 'Could not record payment.')
      if (err instanceof ApiClientError && err.status === 409) void refreshDealQueries()
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

  const commission = deal.commission

  return (
    <>
      <PageMeta
        title={`Deal #${deal.id}`}
        description={`${deal.product_name || deal.campaign.title} — ${dealStatusLabel(deal.status)}`}
      />
      <div className="desk-page reveal">
        <p>
          <Link to="/app/business/deals">← Deals</Link>
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
              Deal #{deal.id} · Created {formatDateTime(deal.created_at)}
            </p>
          </div>
        </header>

        {next ? (
          <div className="card next-action-card">
            <p className="eyebrow">What needs attention</p>
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
                Historical commercial terms locked when this Deal was created — not the campaign’s
                current marketplace values.
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
            </section>

            {evidenceQuery.isLoading ? <LoadingState label="Loading evidence…" /> : null}
            {evidenceQuery.isSuccess ? (
              <BusinessEvidencePanel
                deal={deal}
                evidence={evidence}
                canAct={deal.status === 'payment_pending'}
              />
            ) : null}

            {canConfirm ? (
              <section className="card stack">
                <h2>Confirm customer payment</h2>
                <p className="form-section__lead">
                  Confirm only when you have verified that the customer paid your business and the
                  transaction qualifies under the campaign terms.
                </p>
                <div className="alert alert--info">
                  Customers pay you directly. MarcatursHub does not receive or hold this purchase
                  payment. Confirmation seals the Deal and creates commission owed to the
                  Ambassador.
                </div>
                <Button type="button" onClick={() => setShowConfirm(true)}>
                  Confirm customer payment
                </Button>
              </section>
            ) : null}

            {commission ? (
              <section className="card stack">
                <h2>Commission owed to Ambassador</h2>
                <p className="form-section__lead">
                  After confirmation, you pay the Ambassador directly. MarcatursHub tracks liability
                  — it does not auto-transfer commission in MVP.
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
                {commission.status === 'due' ? (
                  <form
                    className="stack"
                    onSubmit={(event) => {
                      event.preventDefault()
                      markPaidMutation.mutate(commission.id)
                    }}
                  >
                    <p className="form-section__lead">
                      After you pay the Ambassador outside MarcatursHub, record that commission was
                      paid.
                    </p>
                    <div className="field">
                      <label htmlFor="paid-ref">Payment reference (optional)</label>
                      <input
                        id="paid-ref"
                        value={paidRef}
                        onChange={(event) => setPaidRef(event.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="paid-note">Note (optional)</label>
                      <textarea
                        id="paid-note"
                        rows={2}
                        value={paidNote}
                        onChange={(event) => setPaidNote(event.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={markPaidMutation.isPending}>
                      {markPaidMutation.isPending ? 'Recording…' : 'Record commission paid'}
                    </Button>
                  </form>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="detail-aside">
            <div className="card stack">
              <h3>Ambassador</h3>
              <strong>{deal.ambassador.name || `Ambassador #${deal.ambassador.id}`}</strong>
              <p className="form-section__lead">
                Opens the Business↔Ambassador conversation for this person. Chat is not owned by
                this Deal.
              </p>
              <ButtonLink
                to={`/app/business/messages?with=${deal.ambassador.id}`}
                variant="secondary"
                size="sm"
              >
                Message Ambassador
              </ButtonLink>
            </div>

            <div className="card stack">
              <h3>Campaign</h3>
              <strong>{deal.campaign.title}</strong>
              <p className="campaign-row__meta">
                Status {deal.campaign.status} · Snapshot version v
                {deal.campaign_version.version_number ?? '—'}
              </p>
              <ButtonLink
                to={`/app/business/campaigns/${deal.campaign.id}`}
                variant="secondary"
                size="sm"
              >
                Open campaign
              </ButtonLink>
            </div>

            {deal.confirmed_at ? (
              <div className="card stack">
                <h3>Confirmation</h3>
                <p>
                  Confirmed {formatDateTime(deal.confirmed_at)}
                  {deal.confirmed_payment_amount != null
                    ? ` · ${formatMoney(deal.confirmed_payment_amount, deal.price_currency)}`
                    : ''}
                </p>
              </div>
            ) : null}

            <div className="card stack">
              <h3>Disputes</h3>
              <p className="form-section__lead">
                {deal.has_open_dispute
                  ? `This Deal has ${deal.open_dispute_count} open dispute${deal.open_dispute_count === 1 ? '' : 's'}. Deal, dispute, and commission states remain separate.`
                  : 'Open a separate review case if this Deal has a commercial issue. This does not rename the Deal status or reverse payment.'}
              </p>
              <ButtonLink
                to={`/app/business/disputes?deal=${deal.id}`}
                variant="secondary"
                size="sm"
              >
                {deal.has_open_dispute ? 'Open disputes area' : 'Open a dispute'}
              </ButtonLink>
            </div>

            {deal.status === 'payment_pending' ? (
              <div className="card stack">
                <h3>Cancel Deal</h3>
                <p className="form-section__lead">
                  Only while payment is pending. Cancellation is terminal and does not reverse
                  money.
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
                      <label htmlFor="biz-cancel-reason">Reason</label>
                      <textarea
                        id="biz-cancel-reason"
                        required
                        minLength={3}
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
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm customer payment"
        confirmLabel="Seal Deal & create commission"
        busy={confirmMutation.isPending}
        onCancel={() => {
          if (!confirmMutation.isPending) setShowConfirm(false)
        }}
        onConfirm={() => confirmMutation.mutate()}
      >
        <p>
          You are confirming that the customer has paid your business and that this transaction
          qualifies under this campaign’s terms. This will seal the Deal and create the Ambassador’s
          commission liability.
        </p>
        <div className="alert alert--warning">
          MarcatursHub does not receive, hold, or transfer the customer payment or the commission.
          You pay the Ambassador directly after confirmation.
        </div>
        {needsAmount ? (
          <div className="field">
            <label htmlFor="confirmed-amount">Confirmed payment amount</label>
            <input
              id="confirmed-amount"
              inputMode="decimal"
              value={confirmedAmount}
              onChange={(event) => setConfirmedAmount(event.target.value)}
              placeholder={
                deal.expected_transaction_amount
                  ? String(deal.expected_transaction_amount)
                  : deal.price_amount
                    ? String(deal.price_amount)
                    : undefined
              }
            />
            <p className="form-section__lead">
              Required for percentage commission. The backend calculates the commission amount —
              this screen does not.
            </p>
            {confirmFieldError ? <p className="field-error">{confirmFieldError}</p> : null}
          </div>
        ) : (
          <p className="form-section__lead">
            Fixed commission from the Deal snapshot: {formatDealCommission(deal)}.
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}

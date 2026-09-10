import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatDateTime } from '@/features/ambassador-deals/format'
import {
  fetchBusinessCommission,
  fetchBusinessDeal,
  markCommissionPaid,
} from '@/features/business-deals/api'
import { ConfirmDialog } from '@/features/business-deals/ConfirmDialog'
import { businessCommissionKeys, businessDealKeys } from '@/features/business-deals/queryKeys'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  commissionStatusBadgeClass,
  commissionStatusLabel,
  commissionTypeLabel,
  formatMoney,
  overdueDurationLabel,
} from './format'

export function BusinessCommissionDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const queryClient = useQueryClient()
  const [paidRef, setPaidRef] = useState('')
  const [paidNote, setPaidNote] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const commissionQuery = useQuery({
    queryKey: businessCommissionKeys.detail(id),
    queryFn: ({ signal }) => fetchBusinessCommission(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const dealId = commissionQuery.data?.deal_id
  const dealQuery = useQuery({
    queryKey: businessDealKeys.detail(dealId ?? 0),
    queryFn: ({ signal }) => fetchBusinessDeal(dealId!, signal),
    enabled: Number.isFinite(dealId) && (dealId ?? 0) > 0,
  })

  const markPaidMutation = useMutation({
    mutationFn: () =>
      markCommissionPaid(id, {
        payment_reference: paidRef.trim() || undefined,
        payment_note: paidNote.trim() || undefined,
      }),
    onSuccess: async () => {
      setFormError(null)
      setShowConfirm(false)
      setPaidRef('')
      setPaidNote('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: businessCommissionKeys.all }),
        queryClient.invalidateQueries({ queryKey: businessDealKeys.all }),
      ])
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setFormError(err.message)
        return
      }
      setFormError('Could not record commission payment.')
    },
  })

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState title="Commission not found" />
  }

  if (commissionQuery.isLoading) {
    return <LoadingState label="Loading commission…" />
  }

  if (commissionQuery.isError || !commissionQuery.data) {
    const status =
      commissionQuery.error instanceof ApiClientError ? commissionQuery.error.status : 0
    return (
      <ErrorState title={status === 404 ? 'Commission not found' : 'Could not load commission'}>
        <ButtonLink to="/app/business/commissions" variant="secondary">
          Back to commissions
        </ButtonLink>
      </ErrorState>
    )
  }

  const commission = commissionQuery.data
  const deal = dealQuery.data
  const overdueLabel =
    commission.status === 'due' && commission.is_overdue
      ? overdueDurationLabel(commission.due_at)
      : null
  const canMarkPaid = commission.status === 'due'

  return (
    <>
      <PageMeta
        title={`Commission #${commission.id}`}
        description="Business → Ambassador commission obligation detail."
      />
      <div className="desk-page reveal">
        <p className="campaign-row__meta">
          <Link to="/app/business/commissions">← Commissions</Link>
        </p>

        <header className="desk-header">
          <div>
            <p className="eyebrow">Business → Ambassador obligation</p>
            <h1>Commission #{commission.id}</h1>
            <p>
              MarcatursHub tracks this liability. Payment happens directly between you and the
              Ambassador — not through the platform.
            </p>
          </div>
          <span className={commissionStatusBadgeClass(commission)}>
            {commissionStatusLabel(commission)}
          </span>
        </header>

        {overdueLabel ? (
          <div className="alert alert--warning" role="status">
            <strong>{overdueLabel}.</strong> Pay the Ambassador directly, then record the payment
            below. No automatic penalties apply in MarcatursHub.
          </div>
        ) : null}

        <div className="detail-grid">
          <div className="stack stack--lg">
            <section className="card stack">
              <h2>Commission snapshot</h2>
              <p className="commission-hero__value">
                {formatMoney(commission.amount, commission.currency)}
              </p>
              <p className="form-section__lead">{commissionTypeLabel(commission)}</p>
              <dl className="snapshot-grid">
                <div>
                  <dt>Status</dt>
                  <dd>{commissionStatusLabel(commission)}</dd>
                </div>
                <div>
                  <dt>Due</dt>
                  <dd>{commission.due_at ? formatDateTime(commission.due_at) : '—'}</dd>
                </div>
                <div>
                  <dt>Became due</dt>
                  <dd>
                    {commission.became_due_at ? formatDateTime(commission.became_due_at) : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>{commission.paid_at ? formatDateTime(commission.paid_at) : '—'}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>{commission.received_at ? formatDateTime(commission.received_at) : '—'}</dd>
                </div>
                <div>
                  <dt>Campaign version (snapshot)</dt>
                  <dd>#{commission.campaign_version_id ?? '—'}</dd>
                </div>
              </dl>
              {commission.payment_reference || commission.payment_note ? (
                <dl className="snapshot-grid">
                  {commission.payment_reference ? (
                    <div className="snapshot-grid__wide">
                      <dt>Payment reference</dt>
                      <dd>{commission.payment_reference}</dd>
                    </div>
                  ) : null}
                  {commission.payment_note ? (
                    <div className="snapshot-grid__wide">
                      <dt>Payment note</dt>
                      <dd>{commission.payment_note}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </section>

            {canMarkPaid ? (
              <section className="card stack" aria-labelledby="record-paid-heading">
                <h2 id="record-paid-heading">Record commission paid</h2>
                <p className="form-section__lead">
                  Record that you have paid this commission to the Ambassador. MarcatursHub does not
                  process or hold the payment.
                </p>
                <div className="field">
                  <label htmlFor="commission-paid-ref">Payment reference (optional)</label>
                  <input
                    id="commission-paid-ref"
                    value={paidRef}
                    onChange={(event) => setPaidRef(event.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label htmlFor="commission-paid-note">Note (optional)</label>
                  <textarea
                    id="commission-paid-note"
                    rows={3}
                    value={paidNote}
                    onChange={(event) => setPaidNote(event.target.value)}
                  />
                </div>
                {formError ? (
                  <p className="field-error" role="alert">
                    {formError}
                  </p>
                ) : null}
                <Button type="button" onClick={() => setShowConfirm(true)}>
                  Record commission paid
                </Button>
              </section>
            ) : null}

            {commission.status === 'paid' ? (
              <section className="card stack">
                <h2>Paid — awaiting Ambassador confirmation</h2>
                <p className="form-section__lead">
                  You marked this commission as paid. Only the Ambassador can confirm receipt. You
                  cannot mark it received from the Business desk.
                </p>
              </section>
            ) : null}

            {commission.status === 'received' ? (
              <EmptyState title="Commission settled">
                The Ambassador confirmed receipt. No further Business action is required on this
                obligation.
              </EmptyState>
            ) : null}
          </div>

          <aside className="detail-aside stack">
            <section className="card stack">
              <h3>Related Deal</h3>
              {dealQuery.isLoading ? <p className="campaign-row__meta">Loading Deal…</p> : null}
              {deal ? (
                <>
                  <strong>
                    Deal #{deal.id} · {deal.product_name || deal.campaign.title}
                  </strong>
                  <p className="campaign-row__meta">
                    Status {deal.status}
                    {deal.has_open_dispute ? ' · Open dispute' : ''}
                  </p>
                  <p className="form-section__lead">
                    Deal detail remains the source for evidence, confirmation, disputes, and
                    lifecycle context. Commission amounts here come from the sealed Deal snapshot —
                    not from the live Campaign.
                  </p>
                  <ButtonLink to={`/app/business/deals/${deal.id}`} variant="secondary" size="sm">
                    Open Deal
                  </ButtonLink>
                </>
              ) : (
                <>
                  <strong>Deal #{commission.deal_id}</strong>
                  <ButtonLink
                    to={`/app/business/deals/${commission.deal_id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Open Deal
                  </ButtonLink>
                </>
              )}
            </section>

            <section className="card stack">
              <h3>Ambassador</h3>
              <strong>
                {deal?.ambassador.name ||
                  (commission.ambassador
                    ? `Ambassador #${commission.ambassador.id}`
                    : 'Ambassador')}
              </strong>
              {deal ? (
                <ButtonLink
                  to={`/app/business/messages?with=${deal.ambassador.id}`}
                  variant="secondary"
                  size="sm"
                >
                  Message Ambassador
                </ButtonLink>
              ) : null}
            </section>

            {deal ? (
              <section className="card stack">
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
              </section>
            ) : null}

            {deal?.has_open_dispute ? (
              <section className="card stack">
                <h3>Open dispute</h3>
                <p className="form-section__lead">
                  This Deal has an open dispute. Dispute review is separate from commission status.
                </p>
                <ButtonLink to="/app/business/disputes" variant="secondary" size="sm">
                  Open disputes
                </ButtonLink>
              </section>
            ) : null}
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Record commission paid?"
        confirmLabel="Record payment"
        busy={markPaidMutation.isPending}
        onCancel={() => {
          if (!markPaidMutation.isPending) setShowConfirm(false)
        }}
        onConfirm={() => markPaidMutation.mutate()}
      >
        <p>
          Confirm that you have already paid{' '}
          <strong>{formatMoney(commission.amount, commission.currency)}</strong> to the Ambassador
          outside MarcatursHub.
        </p>
        <p className="form-section__lead">
          MarcatursHub does not process, hold, or transfer this commission. Recording payment only
          updates the commercial record.
        </p>
      </ConfirmDialog>
    </>
  )
}

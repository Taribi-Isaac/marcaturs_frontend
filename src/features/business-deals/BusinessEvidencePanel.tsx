import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { evidenceKindLabel } from '@/features/ambassador-deals/helpers'
import { formatDate, formatMoney } from '@/features/ambassador-deals/format'
import type { Deal, PaymentEvidence } from '@/features/ambassador-deals/types'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { evidenceDownloadUrl, rejectPaymentEvidence } from './api'
import { businessDealKeys } from './queryKeys'
import { rejectionReasonFromEvents } from './status'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'

type Props = {
  deal: Deal
  evidence: PaymentEvidence[]
  canAct: boolean
}

export function BusinessEvidencePanel({ deal, evidence, canAct }: Props) {
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const rejectMutation = useMutation({
    mutationFn: ({
      evidenceId,
      rejectionReason,
    }: {
      evidenceId: number
      rejectionReason: string
    }) => rejectPaymentEvidence(deal.id, evidenceId, rejectionReason),
    onSuccess: async () => {
      setRejectingId(null)
      setReason('')
      setError(null)
      setFieldError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: businessDealKeys.evidence(deal.id) }),
        queryClient.invalidateQueries({ queryKey: businessDealKeys.detail(deal.id) }),
        queryClient.invalidateQueries({ queryKey: businessDealKeys.all }),
      ])
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setError(err.message)
        setFieldError(fieldErrorsFromApi(err).reason || null)
        if (err.status === 409) {
          void queryClient.invalidateQueries({ queryKey: businessDealKeys.detail(deal.id) })
          void queryClient.invalidateQueries({ queryKey: businessDealKeys.evidence(deal.id) })
        }
        return
      }
      setError('Could not reject this evidence.')
    },
  })

  return (
    <section className="card stack stack--lg" aria-labelledby="biz-evidence-heading">
      <div>
        <h2 id="biz-evidence-heading">Payment evidence</h2>
        <p className="form-section__lead">
          Check what the Ambassador submitted as proof that the customer paid your business.
          Evidence is append-only — rejection leaves the Deal pending so new proof can be submitted.
        </p>
      </div>

      {evidence.length === 0 ? (
        <div className="alert alert--info">
          No payment evidence yet. Waiting for the Ambassador.
        </div>
      ) : (
        <ul className="evidence-list">
          {evidence.map((item) => {
            const reasonFromEvents = rejectionReasonFromEvents(deal.events, item.id)
            return (
              <li key={item.id} className="evidence-item">
                <div className="evidence-item__top">
                  <strong>{evidenceKindLabel(item.kind)}</strong>
                  <span
                    className={
                      item.status === 'rejected' ? 'badge badge--danger' : 'badge badge--warning'
                    }
                  >
                    {item.status === 'rejected' ? 'Rejected' : 'Submitted'}
                  </span>
                </div>
                <p className="campaign-row__meta">
                  {item.reference_number ? `Ref ${item.reference_number} · ` : ''}
                  {item.amount != null ? `${formatMoney(item.amount, item.currency)} · ` : ''}
                  {item.paid_on ? `Paid ${formatDate(item.paid_on)} · ` : ''}
                  Submitted {formatDate(item.submitted_at || item.created_at)}
                  {item.has_file && item.original_filename
                    ? ` · ${item.original_filename}`
                    : item.has_file
                      ? ' · File attached'
                      : ''}
                </p>
                {item.note ? <p style={{ whiteSpace: 'pre-wrap' }}>{item.note}</p> : null}
                {item.status === 'rejected' ? (
                  <p className="alert alert--warning" style={{ marginTop: '0.75rem' }}>
                    This evidence was rejected. The Deal remains payment pending.
                    {reasonFromEvents ? (
                      <>
                        {' '}
                        Reason: <strong>{reasonFromEvents}</strong>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <div className="action-bar" style={{ marginTop: '0.75rem' }}>
                  {item.has_file ? (
                    <a
                      className="btn btn--secondary btn--sm"
                      href={evidenceDownloadUrl(deal.id, item.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download evidence
                    </a>
                  ) : null}
                  {canAct && item.status === 'submitted' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRejectingId(item.id)
                        setReason('')
                        setError(null)
                        setFieldError(null)
                      }}
                    >
                      Reject this claim
                    </Button>
                  ) : null}
                </div>

                {rejectingId === item.id ? (
                  <form
                    className="stack"
                    style={{ marginTop: '1rem' }}
                    onSubmit={(event) => {
                      event.preventDefault()
                      rejectMutation.mutate({
                        evidenceId: item.id,
                        rejectionReason: reason.trim(),
                      })
                    }}
                  >
                    <div className="alert alert--info">
                      The Deal remains pending. The Ambassador can submit new evidence.
                    </div>
                    <div className="field">
                      <label htmlFor={`reject-reason-${item.id}`}>Rejection reason</label>
                      <textarea
                        id={`reject-reason-${item.id}`}
                        required
                        minLength={3}
                        rows={3}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                      {fieldError ? <p className="field-error">{fieldError}</p> : null}
                    </div>
                    {error ? <div className="alert alert--danger">{error}</div> : null}
                    <div className="action-bar">
                      <Button type="submit" disabled={rejectMutation.isPending}>
                        {rejectMutation.isPending ? 'Rejecting…' : 'Confirm rejection'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setRejectingId(null)}
                        disabled={rejectMutation.isPending}
                      >
                        Keep evidence
                      </Button>
                    </div>
                  </form>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

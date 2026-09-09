import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { submitPaymentEvidence } from './api'
import { formatDate, formatMoney } from './format'
import { evidenceKindLabel, fieldErrorsFromApi } from './helpers'
import { dealKeys } from './queryKeys'
import type { EvidenceKind, PaymentEvidence } from './types'

const KINDS: EvidenceKind[] = [
  'receipt',
  'transfer_confirmation',
  'transaction_screenshot',
  'transaction_reference',
  'other',
]

type Props = {
  dealId: number
  status: string
  evidence: PaymentEvidence[]
  currencyHint?: string | null
}

export function PaymentEvidencePanel({ dealId, status, evidence, currencyHint }: Props) {
  const queryClient = useQueryClient()
  const canSubmit = status === 'payment_pending'
  const [kind, setKind] = useState<EvidenceKind>('transaction_reference')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(currencyHint || 'NGN')
  const [paidOn, setPaidOn] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showForm, setShowForm] = useState(evidence.length === 0)

  const latestRejected = useMemo(
    () => evidence.find((item) => item.status === 'rejected'),
    [evidence],
  )
  const hasSubmitted = evidence.some((item) => item.status === 'submitted')

  const mutation = useMutation({
    mutationFn: () =>
      submitPaymentEvidence(dealId, {
        kind,
        reference_number: reference.trim() || undefined,
        amount: amount.trim() || undefined,
        currency: currency.trim() || undefined,
        paid_on: paidOn || undefined,
        note: note.trim() || undefined,
        file,
      }),
    onSuccess: async () => {
      setFormError(null)
      setFieldErrors({})
      setShowForm(false)
      setReference('')
      setAmount('')
      setNote('')
      setFile(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dealKeys.evidence(dealId) }),
        queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) }),
        queryClient.invalidateQueries({ queryKey: dealKeys.list() }),
      ])
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setFormError(err.message)
        setFieldErrors(fieldErrorsFromApi(err))
        if (err.status === 409) {
          void queryClient.invalidateQueries({ queryKey: dealKeys.detail(dealId) })
          void queryClient.invalidateQueries({ queryKey: dealKeys.evidence(dealId) })
        }
        return
      }
      setFormError('Could not submit payment evidence.')
    },
  })

  return (
    <section className="card stack stack--lg" aria-labelledby="evidence-heading">
      <div>
        <h2 id="evidence-heading">Payment evidence</h2>
        <p className="form-section__lead">
          The customer has paid the Business? Submit proof here. Uploading evidence does not verify
          payment or create commission liability — the Business reviews and confirms.
        </p>
      </div>

      {evidence.length === 0 ? (
        <div className="alert alert--info">
          No evidence yet. After your customer pays the Business, submit a reference, receipt, or
          screenshot.
        </div>
      ) : (
        <ul className="evidence-list">
          {evidence.map((item) => (
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
              </p>
              {item.note ? <p style={{ whiteSpace: 'pre-wrap' }}>{item.note}</p> : null}
              {item.status === 'rejected' ? (
                <p className="alert alert--warning" style={{ marginTop: '0.75rem' }}>
                  This evidence was rejected. The Deal stays payment pending — you can submit
                  another proof if needed.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {latestRejected && canSubmit ? (
        <p className="campaign-row__meta">
          Previous evidence was rejected. Submit a new record when you have updated proof.
        </p>
      ) : null}

      {canSubmit && (showForm || evidence.length === 0) ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault()
            setFormError(null)
            mutation.mutate()
          }}
        >
          <div className="field">
            <label htmlFor="evidence-kind">Evidence type</label>
            <select
              id="evidence-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as EvidenceKind)}
            >
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {evidenceKindLabel(value)}
                </option>
              ))}
            </select>
            {fieldErrors.kind ? <p className="field-error">{fieldErrors.kind}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="evidence-ref">Reference number</label>
            <input
              id="evidence-ref"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Bank or transfer reference"
            />
            {fieldErrors.reference_number ? (
              <p className="field-error">{fieldErrors.reference_number}</p>
            ) : null}
          </div>
          <div className="row">
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label htmlFor="evidence-amount">Amount</label>
              <input
                id="evidence-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {fieldErrors.amount ? <p className="field-error">{fieldErrors.amount}</p> : null}
            </div>
            <div className="field" style={{ flex: '0 1 100px' }}>
              <label htmlFor="evidence-currency">Currency</label>
              <input
                id="evidence-currency"
                value={currency}
                maxLength={3}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              />
              {fieldErrors.currency ? <p className="field-error">{fieldErrors.currency}</p> : null}
            </div>
            <div className="field" style={{ flex: '1 1 160px' }}>
              <label htmlFor="evidence-paid-on">Paid on</label>
              <input
                id="evidence-paid-on"
                type="date"
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
              />
              {fieldErrors.paid_on ? <p className="field-error">{fieldErrors.paid_on}</p> : null}
            </div>
          </div>
          <div className="field">
            <label htmlFor="evidence-note">Note</label>
            <textarea
              id="evidence-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {fieldErrors.note ? <p className="field-error">{fieldErrors.note}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="evidence-file">File</label>
            <input
              id="evidence-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {fieldErrors.file ? <p className="field-error">{fieldErrors.file}</p> : null}
          </div>
          {formError ? <div className="alert alert--danger">{formError}</div> : null}
          <div className="action-bar">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Submitting…' : 'Submit payment evidence'}
            </Button>
            {evidence.length > 0 ? (
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {canSubmit && !showForm && evidence.length > 0 ? (
        <div className="action-bar">
          <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
            {hasSubmitted ? 'Submit additional evidence' : 'Submit evidence'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

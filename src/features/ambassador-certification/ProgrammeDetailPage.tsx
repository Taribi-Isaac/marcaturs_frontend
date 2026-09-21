import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiClientError } from '@/shared/api/errors'
import { participantPaymentErrorMessage } from '@/shared/api/participantErrors'
import { images } from '@/shared/content/images'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  fetchEnrollments,
  fetchProgramme,
  initializePurchase,
  rememberPurchaseReference,
} from './api'
import { formatFeeMinor } from './cta'
import { certificationKeys } from './queryKeys'

export function ProgrammeDetailPage() {
  const { programmeId } = useParams()
  const id = Number(programmeId)
  const queryClient = useQueryClient()
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const programme = useQuery({
    queryKey: certificationKeys.programme(id),
    queryFn: ({ signal }) => fetchProgramme(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const enrollments = useQuery({
    queryKey: certificationKeys.enrollments(),
    queryFn: ({ signal }) => fetchEnrollments(signal),
  })

  const existingEnrollment = useMemo(
    () => (enrollments.data ?? []).find((row) => row.programme_id === id),
    [enrollments.data, id],
  )

  const purchase = useMutation({
    mutationFn: () => initializePurchase(id),
    onSuccess: (result) => {
      setError(null)
      rememberPurchaseReference(result.payment.reference)
      setNote(
        `Opening secure checkout for ${formatFeeMinor(result.payment.amount_minor, result.payment.currency)}. Complete payment, then return to confirm enrollment.`,
      )
      window.open(result.authorization_url, '_blank', 'noopener,noreferrer')
      void queryClient.invalidateQueries({ queryKey: certificationKeys.enrollments() })
    },
    onError: (err) => {
      setNote(null)
      if (err instanceof ApiClientError && err.status === 409) {
        setError(
          'You already have an enrollment or purchase in progress for this programme. Open Certification to continue.',
        )
        void queryClient.invalidateQueries({ queryKey: certificationKeys.enrollments() })
        return
      }
      setError(
        err instanceof ApiClientError
          ? participantPaymentErrorMessage(err)
          : 'Could not start purchase.',
      )
    },
  })

  if (!Number.isFinite(id) || id < 1) {
    return <ErrorState title="Programme not found" />
  }

  const version = programme.data?.current_published_version
  const feeLabel = version
    ? formatFeeMinor(version.fee_amount_minor, version.fee_currency)
    : null

  return (
    <>
      <PageMeta
        title={programme.data?.name ?? 'Programme'}
        description="Certification programme details and optional enrollment purchase."
      />
      <div className="desk-page reveal">
        <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>
          <Link to="/app/ambassador/certification/programmes">Programmes</Link>
        </p>

        {programme.isLoading ? <LoadingState label="Loading programme…" /> : null}
        {programme.isError ? (
          <ErrorState title="Could not load programme">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void programme.refetch()}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {programme.isSuccess ? (
          <div className="stack">
            <section className="programme-hero" aria-labelledby="programme-hero-title">
              <div className="programme-hero__media" aria-hidden>
                <img src={images.office.src} alt="" decoding="async" />
              </div>
              <div className="programme-hero__scrim" />
              <div className="programme-hero__content">
                <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  Ambassador Professional Certification
                </p>
                <h1 id="programme-hero-title">{programme.data.name}</h1>
                {programme.data.description ? <p>{programme.data.description}</p> : null}
                {feeLabel ? (
                  <p style={{ marginTop: '1rem', fontSize: '1.15rem', fontWeight: 600 }}>
                    One-time fee: {feeLabel}
                  </p>
                ) : null}
              </div>
            </section>

            <div className="grid-2" style={{ gap: '1.25rem', alignItems: 'start' }}>
              <section className="card stack">
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>What is included</h2>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--color-muted)' }}>
                  <li>Structured learning modules for the published programme version</li>
                  <li>Assessment after required lessons are complete</li>
                  <li>Certificate after a successful award</li>
                </ul>
                {programme.data.learning_objectives ? (
                  <div>
                    <h3 style={{ fontSize: '1rem' }}>Objectives</h3>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {programme.data.learning_objectives}
                    </p>
                  </div>
                ) : null}
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Optional programme. No income guarantee. Not identity verification.{' '}
                  <Link to="/terms">Terms</Link> · <Link to="/faq">FAQ</Link>
                </p>
              </section>

              <section className="card stack">
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Enrollment</h2>
                <dl className="settings-dl">
                  <div>
                    <dt>Published version</dt>
                    <dd>{version ? `Version ${version.version_number}` : 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>One-time fee</dt>
                    <dd>{feeLabel ?? '—'}</dd>
                  </div>
                </dl>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', margin: 0 }}>
                  Fee is set by the server for the current published version. Secure checkout via
                  Paystack.
                </p>

                {note ? (
                  <div className="alert alert--info" role="status">
                    {note}{' '}
                    <Link to="/app/ambassador/certification/purchase/return">Confirm payment</Link>
                  </div>
                ) : null}
                {error ? (
                  <div className="alert alert--danger" role="alert">
                    {error}
                  </div>
                ) : null}

                {existingEnrollment ? (
                  <>
                    <p role="status">
                      You already have an enrollment for this programme ({existingEnrollment.status}
                      ).
                    </p>
                    <ButtonLink
                      to={`/app/ambassador/certification/enrollments/${existingEnrollment.id}`}
                    >
                      Continue learning
                    </ButtonLink>
                  </>
                ) : (
                  <div className="inline-actions">
                    <Button
                      type="button"
                      disabled={purchase.isPending || !version}
                      onClick={() => purchase.mutate()}
                    >
                      {purchase.isPending ? 'Starting checkout…' : 'Pay and enroll'}
                    </Button>
                    <ButtonLink
                      to="/app/ambassador/certification/purchase/return"
                      variant="secondary"
                    >
                      Confirm payment
                    </ButtonLink>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

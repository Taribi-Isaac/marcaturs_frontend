import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { PageMeta } from '@/shared/ui/States'
import {
  clearRememberedPurchaseReference,
  readRememberedPurchaseReference,
  verifyPurchase,
} from './api'
import { certificationKeys } from './queryKeys'

export function PurchaseReturnPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [manualReference, setManualReference] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autoVerifiedRef = useRef<string | null>(null)

  const paystackStatus = useMemo(() => {
    const raw = (params.get('status') ?? params.get('payment_status') ?? '').toLowerCase()
    if (raw === 'cancelled' || raw === 'canceled' || raw === 'abandoned') return 'cancelled'
    if (raw === 'failed' || raw === 'failure') return 'failed'
    return null
  }, [params])

  const referenceFromQuery = useMemo(() => {
    const candidates = [
      params.get('reference'),
      params.get('trxref'),
      readRememberedPurchaseReference(),
    ]
    return candidates.find((value) => value && value.trim())?.trim() ?? null
  }, [params])

  const verify = useMutation({
    mutationFn: (reference: string) => verifyPurchase(reference),
    onSuccess: async (enrollment) => {
      clearRememberedPurchaseReference()
      setError(null)
      setMessage('Payment verified. Enrollment is now active.')
      await queryClient.invalidateQueries({ queryKey: certificationKeys.enrollments() })
      navigate(`/app/ambassador/certification/enrollments/${enrollment.id}`, { replace: true })
    },
    onError: (err) => {
      setMessage(null)
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not verify payment. Enrollment is not active until verification succeeds.',
      )
    },
  })

  useEffect(() => {
    if (!referenceFromQuery || paystackStatus === 'cancelled') {
      return
    }
    if (autoVerifiedRef.current === referenceFromQuery) {
      return
    }
    if (verify.isPending || verify.isSuccess) {
      return
    }
    autoVerifiedRef.current = referenceFromQuery
    verify.mutate(referenceFromQuery)
    // Auto-verify once per resolved reference (query or sessionStorage fallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referenceFromQuery, paystackStatus])

  return (
    <>
      <PageMeta
        title="Confirm certification payment"
        description="Verify Paystack payment before certification enrollment is treated as active."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Confirm payment</h1>
            <p>
              Enrollment becomes active only after MarcatursHub verifies the platform payment. Do
              not assume success from the Paystack redirect alone.
            </p>
          </div>
          <ButtonLink to="/app/ambassador/certification" variant="secondary">
            Certification hub
          </ButtonLink>
        </header>

        <section className="card stack">
          {paystackStatus === 'cancelled' ? (
            <div className="alert alert--warning" role="status">
              Checkout was cancelled. No enrollment was activated. You can return to the programme
              and try again when ready.
            </div>
          ) : null}
          {paystackStatus === 'failed' ? (
            <div className="alert alert--danger" role="alert">
              Payment appears to have failed. Enrollment stays inactive until MarcatursHub verifies
              a successful payment reference.
            </div>
          ) : null}
          {!referenceFromQuery && !manualReference && !paystackStatus ? (
            <div className="alert alert--info" role="status">
              No payment reference was found in the return URL or this browser session. Paste the
              Paystack reference below if you still have it, or restart checkout from the programme
              page.
            </div>
          ) : null}
          {verify.isPending ? <p role="status">Verifying payment with MarcatursHub…</p> : null}
          {message ? (
            <div className="alert alert--success" role="status">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="alert alert--danger" role="alert">
              {error}
            </div>
          ) : null}

          <label className="field">
            <span>Payment reference</span>
            <input
              value={manualReference || referenceFromQuery || ''}
              onChange={(event) => setManualReference(event.target.value)}
              placeholder="mh_cert_…"
              autoComplete="off"
            />
          </label>
          <div className="inline-actions">
            <Button
              type="button"
              disabled={verify.isPending}
              onClick={() => {
                const reference = (manualReference || referenceFromQuery || '').trim()
                if (!reference) {
                  setError('Enter the payment reference from checkout.')
                  return
                }
                verify.mutate(reference)
              }}
            >
              Verify payment
            </Button>
            <Link to="/app/ambassador/certification/programmes">Back to programmes</Link>
          </div>
        </section>
      </div>
    </>
  )
}

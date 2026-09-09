import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { canDeactivateCampaign, canSubmitCampaign, getCampaignStatusInfo } from './status'
import { deactivateCampaign, submitCampaign } from './api'
import type { BusinessCampaign } from './types'
import { businessCampaignKeys } from './queryKeys'

export function CampaignLifecycleActions({ campaign }: { campaign: BusinessCampaign }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.all })
  }

  const submit = useMutation({
    mutationFn: () => submitCampaign(campaign.id),
    onSuccess: async () => {
      setError(null)
      setSuccess('Campaign submitted for review.')
      await invalidate()
    },
    onError: (err) => {
      setSuccess(null)
      if (err instanceof ApiClientError) {
        setError(err.message)
        if (err.status === 409) void invalidate()
      } else {
        setError('Submission failed.')
      }
    },
  })

  const deactivate = useMutation({
    mutationFn: () => deactivateCampaign(campaign.id),
    onSuccess: async () => {
      setError(null)
      setSuccess('Campaign deactivated.')
      await invalidate()
    },
    onError: (err) => {
      setSuccess(null)
      if (err instanceof ApiClientError) {
        setError(err.message)
        if (err.status === 409) void invalidate()
      } else {
        setError('Deactivation failed.')
      }
    },
  })

  const canSubmit = canSubmitCampaign(campaign.status)
  const canDeactivate = canDeactivateCampaign(campaign.status)
  const publishedCurrent = campaign.current_version != null

  if (!canSubmit && !canDeactivate) {
    return (
      <div className="card stack">
        <h2 style={{ fontSize: '1.1rem' }}>Lifecycle actions</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          {getCampaignStatusInfo(campaign.status).next}
        </p>
      </div>
    )
  }

  return (
    <div className="card stack">
      <h2 style={{ fontSize: '1.1rem' }}>Lifecycle actions</h2>
      {canSubmit ? (
        <div className="stack stack--sm">
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Submit when you have a published commercial version and an assignable category. Approval
            and activation are handled by MarcatursHub — publishing a version does not go live by
            itself.
          </p>
          {!publishedCurrent ? (
            <div className="alert alert--info">Publish a commercial version before submitting.</div>
          ) : null}
          <Button
            onClick={() => {
              if (
                !window.confirm(
                  'Submit this campaign for review? Commercial terms will be locked while under review.',
                )
              ) {
                return
              }
              submit.mutate()
            }}
            disabled={submit.isPending || !publishedCurrent}
          >
            {submit.isPending ? 'Submitting…' : 'Submit for review'}
          </Button>
        </div>
      ) : null}
      {canDeactivate ? (
        <div className="stack stack--sm">
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Deactivation removes the campaign from marketplace discovery. Reactivation is not
            available from this desk.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (!window.confirm('Deactivate this campaign listing?')) return
              deactivate.mutate()
            }}
            disabled={deactivate.isPending}
          >
            {deactivate.isPending ? 'Deactivating…' : 'Deactivate listing'}
          </Button>
        </div>
      ) : null}
      {error ? (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="alert alert--success" role="status">
          {success}
        </div>
      ) : null}
    </div>
  )
}

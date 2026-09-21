import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { participantPaymentErrorMessage } from '@/shared/api/participantErrors'
import { Button } from '@/shared/ui/Button'
import { LoadingState } from '@/shared/ui/States'
import {
  fetchExtensionPackages,
  fetchFeaturedPackages,
  fetchFeaturedStatus,
  initializeExtension,
  initializeFeatured,
} from './api'
import { formatDateTime, formatMoneyMinor } from './format'
import { businessCampaignKeys } from './queryKeys'
import { canExtendCampaign, canFeatureCampaign } from './status'
import type { BusinessCampaign } from './types'

export function CampaignCommercialAddOns({ campaign }: { campaign: BusinessCampaign }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const showExtend = canExtendCampaign(campaign.status)
  const showFeature = canFeatureCampaign(campaign.status)
  const hasPublished = Boolean(campaign.current_version)

  const extensionPackages = useQuery({
    queryKey: businessCampaignKeys.extensionPackages(campaign.id),
    queryFn: ({ signal }) => fetchExtensionPackages(campaign.id, signal),
    enabled: showExtend,
  })

  const featuredPackages = useQuery({
    queryKey: businessCampaignKeys.featuredPackages(),
    queryFn: ({ signal }) => fetchFeaturedPackages(signal),
    enabled: showFeature,
  })

  const featured = useQuery({
    queryKey: businessCampaignKeys.featured(campaign.id),
    queryFn: ({ signal }) => fetchFeaturedStatus(campaign.id, signal),
    enabled: showFeature || campaign.status === 'active' || campaign.status === 'expiring',
  })

  const extend = useMutation({
    mutationFn: (packageId: number) => initializeExtension(campaign.id, packageId),
    onSuccess: (result) => {
      setError(null)
      setNote(
        'Opening Paystack checkout for a platform listing-extension fee (paid to MarcatursHub — not a customer payment). Complete payment, then return here and refresh.',
      )
      window.open(result.authorization_url, '_blank', 'noopener,noreferrer')
    },
    onError: (err) => {
      setNote(null)
      setError(
        err instanceof ApiClientError
          ? participantPaymentErrorMessage(err)
          : 'Could not start extension payment.',
      )
      if (err instanceof ApiClientError && err.status === 409) {
        void queryClient.invalidateQueries({ queryKey: businessCampaignKeys.detail(campaign.id) })
      }
    },
  })

  const feature = useMutation({
    mutationFn: (packageId: number) => initializeFeatured(campaign.id, packageId),
    onSuccess: async (result) => {
      setError(null)
      setNote(
        'Opening Paystack checkout for a Featured placement fee (platform fee to MarcatursHub).',
      )
      window.open(result.authorization_url, '_blank', 'noopener,noreferrer')
      await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.featured(campaign.id) })
    },
    onError: (err) => {
      setNote(null)
      setError(
        err instanceof ApiClientError
          ? participantPaymentErrorMessage(err)
          : 'Could not start Featured payment.',
      )
    },
  })

  if (!showExtend && !showFeature && !featured.data?.is_featured) {
    return null
  }

  return (
    <div className="card stack">
      <h2 style={{ fontSize: '1.15rem' }}>Listing add-ons</h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        Extension and Featured are optional platform fees paid to MarcatursHub. They are not
        customer purchase payments.
      </p>

      {featured.data?.is_featured ? (
        <div className="alert alert--success" role="status">
          Featured until {formatDateTime(featured.data.expires_at)}.
        </div>
      ) : null}

      {!hasPublished ? (
        <div className="alert alert--info">
          A published commercial version is required before extension or Featured purchases can
          apply.
        </div>
      ) : null}

      {showExtend ? (
        <div className="stack stack--sm">
          <strong>Extend listing</strong>
          {extensionPackages.isLoading ? <LoadingState label="Loading packages…" /> : null}
          {extensionPackages.data?.map((pkg) => (
            <div
              key={pkg.id}
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>
                {pkg.name} · {pkg.duration_days} days ·{' '}
                {formatMoneyMinor(pkg.amount_minor, pkg.currency)}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={!hasPublished || extend.isPending}
                onClick={() => extend.mutate(pkg.id)}
              >
                Pay &amp; extend
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {showFeature ? (
        <div className="stack stack--sm">
          <strong>Featured placement</strong>
          {featuredPackages.isLoading ? <LoadingState label="Loading packages…" /> : null}
          {featuredPackages.data?.map((pkg) => (
            <div
              key={pkg.id}
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>
                {pkg.name} · {pkg.duration_days} days ·{' '}
                {formatMoneyMinor(pkg.amount_minor, pkg.currency)}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={!hasPublished || feature.isPending}
                onClick={() => feature.mutate(pkg.id)}
              >
                Pay for Featured
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      ) : null}
      {note ? (
        <div className="alert alert--info" role="status">
          {note}
        </div>
      ) : null}
    </div>
  )
}

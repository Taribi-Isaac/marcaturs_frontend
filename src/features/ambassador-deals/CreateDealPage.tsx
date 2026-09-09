import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { fetchMarketplaceCampaign } from '@/features/marketplace/api'
import { businessDisplayName, formatCommission, formatMoney } from '@/features/marketplace/format'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { createDeal } from './api'
import { campaignAllowsNewDeals, fieldErrorsFromApi } from './helpers'
import { dealKeys } from './queryKeys'

export function CreateDealPage() {
  const [params] = useSearchParams()
  const campaignId = Number(params.get('campaign'))
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [expectedAmount, setExpectedAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const campaignQuery = useQuery({
    queryKey: ['marketplace', 'campaign', campaignId],
    queryFn: ({ signal }) => fetchMarketplaceCampaign(campaignId, signal),
    enabled: Number.isFinite(campaignId) && campaignId > 0,
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload: { campaign_id: number; expected_transaction_amount?: number } = {
        campaign_id: campaignId,
      }
      const trimmed = expectedAmount.trim()
      if (trimmed !== '') {
        payload.expected_transaction_amount = Number(trimmed)
      }
      return createDeal(payload)
    },
    onSuccess: async (deal) => {
      await queryClient.invalidateQueries({ queryKey: dealKeys.list() })
      queryClient.setQueryData(dealKeys.detail(deal.id), deal)
      navigate(`/app/ambassador/deals/${deal.id}`, { replace: true })
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setError(err.message)
        setFieldErrors(fieldErrorsFromApi(err))
        if (err.status === 409 || err.status === 422) {
          void campaignQuery.refetch()
        }
        return
      }
      setError('Could not create this Deal.')
    },
  })

  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return (
      <ErrorState title="Choose a campaign first">
        <ButtonLink to="/discover">Choose an offer worth selling</ButtonLink>
      </ErrorState>
    )
  }

  if (campaignQuery.isLoading) return <LoadingState label="Loading opportunity…" />
  if (campaignQuery.isError || !campaignQuery.data) {
    return (
      <ErrorState title="Campaign unavailable">
        This opportunity may no longer be public.
      </ErrorState>
    )
  }

  const campaign = campaignQuery.data
  const eligible = campaignAllowsNewDeals(campaign.status)
  const business = businessDisplayName(campaign)

  return (
    <>
      <PageMeta title="Create Deal" description="Choose this opportunity to sell." />
      <div className="desk-page reveal">
        <p>
          <Link to={`/campaigns/${campaign.id}`}>← {campaign.title}</Link>
        </p>
        <header className="desk-header">
          <div>
            <p className="eyebrow">Create Deal</p>
            <h1>I&apos;m choosing this opportunity to sell.</h1>
            <p>
              The Deal locks the campaign&apos;s currently published commercial version. Customers
              pay the Business directly — you never collect their money.
            </p>
          </div>
        </header>

        <div className="campaign-desk-grid">
          <section className="card stack stack--lg">
            <div>
              <p className="eyebrow">Campaign</p>
              <h2 style={{ fontSize: '1.75rem' }}>{campaign.title}</h2>
              <p className="campaign-row__meta">
                {campaign.product_name || 'Product'} · {business}
              </p>
            </div>
            <div className="commission-hero">
              <p className="eyebrow">Commission</p>
              <p className="commission-hero__value">{formatCommission(campaign)}</p>
              <p>
                {campaign.price_amount
                  ? `Listed ${formatMoney(campaign.price_amount, campaign.price_currency)}`
                  : 'See campaign pricing'}
              </p>
            </div>
            {campaign.qualifying_conditions ? (
              <div className="prose-block">
                <h3>Qualifying conditions</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{campaign.qualifying_conditions}</p>
              </div>
            ) : null}
            <div className="alert alert--info">
              <ul className="plain-list">
                <li>Customer pays the Business directly.</li>
                <li>You submit payment evidence after they pay.</li>
                <li>Commission becomes due only after Business confirmation.</li>
              </ul>
            </div>
          </section>

          <aside className="detail-aside">
            <form
              className="card stack"
              onSubmit={(event) => {
                event.preventDefault()
                if (!eligible) return
                setError(null)
                mutation.mutate()
              }}
            >
              <h2>Create Deal</h2>
              {!eligible ? (
                <div className="alert alert--warning">
                  This campaign is not currently eligible for new Deals ({campaign.status}).
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="expected-amount">Expected transaction amount (optional)</label>
                <input
                  id="expected-amount"
                  inputMode="decimal"
                  value={expectedAmount}
                  onChange={(event) => setExpectedAmount(event.target.value)}
                  placeholder={campaign.price_amount || undefined}
                />
                {fieldErrors.expected_transaction_amount ? (
                  <p className="field-error">{fieldErrors.expected_transaction_amount}</p>
                ) : null}
                {fieldErrors.campaign_id ? (
                  <p className="field-error">{fieldErrors.campaign_id}</p>
                ) : null}
              </div>
              {error ? <div className="alert alert--danger">{error}</div> : null}
              <Button type="submit" disabled={!eligible || mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create Deal'}
              </Button>
            </form>
          </aside>
        </div>
      </div>
    </>
  )
}

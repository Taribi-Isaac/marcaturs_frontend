import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTime, formatDealCommission } from '@/features/ambassador-deals/format'
import { dealStatusBadgeClass, dealStatusLabel } from '@/features/ambassador-deals/status'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchBusinessCommissions, fetchBusinessDeals, type CommissionListItem } from './api'
import { businessCommissionKeys, businessDealKeys } from './queryKeys'
import { businessDealAttention } from './status'

export function BusinessDealListPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const list = useQuery({
    queryKey: businessDealKeys.list(page),
    queryFn: ({ signal }) => fetchBusinessDeals(page, 50, signal),
  })

  const commissions = useQuery({
    queryKey: businessCommissionKeys.list(),
    queryFn: ({ signal }) => fetchBusinessCommissions(signal),
  })

  const commissionByDeal = useMemo(() => {
    const map = new Map<number, CommissionListItem>()
    for (const item of commissions.data?.items ?? []) {
      map.set(item.deal_id, item)
    }
    return map
  }, [commissions.data])

  const ranked = useMemo(() => {
    const items = [...(list.data?.items ?? [])]
    return items
      .map((deal) => {
        const commission = commissionByDeal.get(deal.id) ?? deal.commission
        const attention = businessDealAttention({
          status: deal.status,
          hasSubmittedEvidence: null,
          commissionStatus: commission?.status,
          isOverdue: commission?.is_overdue,
          hasOpenDispute: deal.has_open_dispute,
        })
        return { deal, attention, commission }
      })
      .sort((a, b) => a.attention.priority - b.attention.priority || b.deal.id - a.deal.id)
  }, [list.data, commissionByDeal])

  const lastPage = list.data?.pagination?.last_page ?? 1

  return (
    <>
      <PageMeta
        title="Deals"
        description="Review payment evidence and confirm qualifying customer payments."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Deals</h1>
            <p>
              Customers pay you directly. When an Ambassador submits proof, check the payment and
              confirm only if it qualifies — that seals the Deal and creates commission owed to the
              Ambassador.
            </p>
          </div>
        </header>

        <div className="alert alert--info">
          List filters for evidence and commission states are not yet supported by the Deal API.
          Attention labels use Deal status, open disputes, and linked commission records where
          available. Open a Deal to review payment evidence.
        </div>

        {list.isLoading ? <LoadingState label="Loading deals…" /> : null}
        {list.isError ? (
          <ErrorState title="Could not load deals">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: businessDealKeys.all })}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {list.isSuccess && ranked.length === 0 ? (
          <EmptyState title="No Deals yet">
            <p>
              Deals appear here when Ambassadors choose one of your published campaigns to sell.
            </p>
            <Link className="btn btn--secondary" to="/app/business/campaigns">
              Open campaigns
            </Link>
          </EmptyState>
        ) : null}

        {ranked.length > 0 ? (
          <div className="campaign-list">
            {ranked.map(({ deal, attention, commission }) => (
              <Link
                key={deal.id}
                to={`/app/business/deals/${deal.id}`}
                className={`card card--interactive campaign-row attention-row attention-row--${attention.tone}`}
              >
                <div className="campaign-row__top">
                  <div>
                    <p className={`attention-label attention-label--${attention.tone}`}>
                      {attention.label}
                    </p>
                    <h2>{deal.product_name || deal.campaign.title}</h2>
                    <p className="campaign-row__meta">
                      Deal #{deal.id} · {deal.campaign.title} ·{' '}
                      {deal.ambassador.name || `Ambassador #${deal.ambassador.id}`} ·{' '}
                      {formatDealCommission(deal)}
                    </p>
                  </div>
                  <span className={dealStatusBadgeClass(deal.status)}>
                    {dealStatusLabel(deal.status)}
                  </span>
                </div>
                <p className="campaign-row__meta">
                  Created {formatDateTime(deal.created_at)}
                  {deal.has_open_dispute ? ` · Dispute open (${deal.open_dispute_count})` : ''}
                  {commission
                    ? ` · Commission ${commission.is_overdue ? 'overdue' : commission.status}`
                    : ''}
                </p>
              </Link>
            ))}
          </div>
        ) : null}

        {list.isSuccess && lastPage > 1 ? (
          <div className="action-bar">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <span className="campaign-row__meta">
              Page {page} of {lastPage}
            </span>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={page >= lastPage}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}

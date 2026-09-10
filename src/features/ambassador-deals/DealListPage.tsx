import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchDeals } from './api'
import { formatDateTime, formatDealCommission } from './format'
import { dealKeys } from './queryKeys'
import { dealStatusBadgeClass, dealStatusLabel } from './status'

export function DealListPage() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: dealKeys.list(),
    queryFn: ({ signal }) => fetchDeals(signal),
  })

  return (
    <>
      <PageMeta title="Deals" description="Track your ambassador Deals and next actions." />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Deals</h1>
            <p>
              A Deal is the commercial record for one opportunity you choose to sell. Customers pay
              the Business directly — you submit proof, then earn when the Business confirms.
            </p>
          </div>
          <ButtonLink to="/discover">Choose an offer</ButtonLink>
        </header>

        {list.isLoading ? <LoadingState label="Loading deals…" /> : null}
        {list.isError ? (
          <ErrorState title="Could not load deals">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: dealKeys.list() })}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {list.isSuccess && list.data.items.length === 0 ? (
          <EmptyState title="No Deals yet">
            <p>
              Find a campaign worth promoting, create a Deal when a customer is ready, share the
              Official Payment link, and submit evidence after they pay the Business.
            </p>
            <ButtonLink to="/discover">Choose an offer worth selling</ButtonLink>
          </EmptyState>
        ) : null}

        {list.data && list.data.items.length > 0 ? (
          <div className="campaign-list">
            {list.data.items.map((deal) => (
              <Link
                key={deal.id}
                to={`/app/ambassador/deals/${deal.id}`}
                className="card card--interactive campaign-row"
              >
                <div className="campaign-row__top">
                  <div>
                    <h2>{deal.product_name || deal.campaign.title}</h2>
                    <p className="campaign-row__meta">
                      Deal #{deal.id} · {deal.campaign.title} · {formatDealCommission(deal)}
                    </p>
                  </div>
                  <span className={dealStatusBadgeClass(deal.status)}>
                    {dealStatusLabel(deal.status)}
                  </span>
                </div>
                <p className="campaign-row__meta">
                  Created {formatDateTime(deal.created_at)}
                  {deal.has_open_dispute ? ' · Open dispute' : ''}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

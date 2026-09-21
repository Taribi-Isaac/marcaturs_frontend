import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchCommissions } from './api'
import { formatDateTime, formatMoney } from './format'

export function EarningsPage() {
  const queryClient = useQueryClient()
  const list = useQuery({
    queryKey: ['commissions', 'list'],
    queryFn: ({ signal }) => fetchCommissions(signal),
  })

  return (
    <>
      <PageMeta
        title="Earnings"
        description="Get paid when the Business confirms your customer's payment."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Earnings</h1>
            <p>
              Get paid when the Business confirms your customer&apos;s payment.
            </p>
          </div>
          <ButtonLink to="/app/ambassador/deals" variant="secondary">
            View Deals
          </ButtonLink>
        </header>

        {list.isLoading ? <LoadingState label="Loading earnings…" /> : null}
        {list.isError ? (
          <ErrorState title="Could not load earnings">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void queryClient.invalidateQueries({ queryKey: ['commissions'] })}
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {list.isSuccess && list.data.items.length === 0 ? (
          <EmptyState title="No commission records yet">
            <p>
              Commission appears here after a Business confirms payment on one of your Deals. The
              Business pays you directly.
            </p>
            <ButtonLink to="/discover">Choose an offer worth selling</ButtonLink>
          </EmptyState>
        ) : null}

        {list.data && list.data.items.length > 0 ? (
          <div className="campaign-list">
            {list.data.items.map((item) => (
              <Link
                key={item.id}
                to={`/app/ambassador/deals/${item.deal_id}`}
                className="card card--interactive campaign-row"
              >
                <div className="campaign-row__top">
                  <div>
                    <h2>{formatMoney(item.amount, item.currency)}</h2>
                    <p className="campaign-row__meta">Deal #{item.deal_id}</p>
                  </div>
                  <span
                    className={
                      item.is_overdue
                        ? 'badge badge--danger'
                        : item.status === 'received'
                          ? 'badge badge--success'
                          : 'badge badge--warning'
                    }
                  >
                    {item.is_overdue ? 'Overdue' : item.status}
                  </span>
                </div>
                <p className="campaign-row__meta">
                  {item.due_at ? `Due ${formatDateTime(item.due_at)}` : 'No due date'}
                  {item.paid_at ? ` · Paid ${formatDateTime(item.paid_at)}` : ''}
                  {item.received_at ? ` · Received ${formatDateTime(item.received_at)}` : ''}
                  {item.status === 'paid' ? ' · Open the Deal to confirm you received payment' : ''}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </>
  )
}

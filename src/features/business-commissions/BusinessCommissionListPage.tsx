import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { fetchBusinessCommissions, type CommissionListItem } from '@/features/business-deals/api'
import { fetchBusinessDeals } from '@/features/business-deals/api'
import { businessCommissionKeys, businessDealKeys } from '@/features/business-deals/queryKeys'
import type { Deal } from '@/features/ambassador-deals/types'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  type CommissionFilter,
  commissionStatusBadgeClass,
  commissionStatusLabel,
  matchesCommissionFilter,
  overdueDurationLabel,
  summarizeCommissions,
  formatMoney,
} from './format'

type Enriched = CommissionListItem & {
  ambassadorName?: string
  campaignTitle?: string
  productName?: string | null
  hasOpenDispute?: boolean
}

function enrich(items: CommissionListItem[], deals: Deal[]): Enriched[] {
  const byId = new Map(deals.map((deal) => [deal.id, deal]))
  return items.map((item) => {
    const deal = byId.get(item.deal_id)
    return {
      ...item,
      ambassadorName: deal?.ambassador.name || undefined,
      campaignTitle: deal?.campaign.title,
      productName: deal?.product_name,
      hasOpenDispute: deal?.has_open_dispute,
    }
  })
}

const FILTERS: Array<{ value: CommissionFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due', label: 'Due' },
  { value: 'awaiting_receipt', label: 'Awaiting receipt' },
  { value: 'received', label: 'Received' },
]

export function BusinessCommissionListPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<CommissionFilter>('all')

  const list = useQuery({
    queryKey: businessCommissionKeys.list(),
    queryFn: ({ signal }) => fetchBusinessCommissions(signal, 1, 100),
  })

  const deals = useQuery({
    queryKey: businessDealKeys.list(1),
    queryFn: ({ signal }) => fetchBusinessDeals(1, 100, signal),
  })

  const enriched = useMemo(
    () => enrich(list.data?.items ?? [], deals.data?.items ?? []),
    [list.data, deals.data],
  )

  const summary = useMemo(() => summarizeCommissions(enriched), [enriched])
  const filtered = useMemo(
    () => enriched.filter((item) => matchesCommissionFilter(item, filter)),
    [enriched, filter],
  )

  const ranked = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const rank = (item: Enriched) => {
        if (item.status === 'due' && item.is_overdue) return 0
        if (item.status === 'due') return 1
        if (item.status === 'paid') return 2
        return 3
      }
      return rank(a) - rank(b) || b.id - a.id
    })
  }, [filtered])

  return (
    <>
      <PageMeta
        title="Commissions"
        description="Track Business → Ambassador commission obligations on MarcatursHub."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Commissions</h1>
            <p>
              Who you owe, how much, and what needs attention. These are Business → Ambassador
              obligations — MarcatursHub does not hold or transfer commission funds.
            </p>
          </div>
          <ButtonLink to="/app/business/deals" variant="secondary">
            Open Deals
          </ButtonLink>
        </header>

        {list.isLoading ? <LoadingState label="Loading commissions…" /> : null}
        {list.isError ? (
          <ErrorState title="Could not load commissions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: businessCommissionKeys.all })
              }
            >
              Retry
            </button>
          </ErrorState>
        ) : null}

        {list.isSuccess && enriched.length === 0 ? (
          <EmptyState title="No commissions yet">
            <p>
              Commission records appear after you confirm a qualifying customer payment on a Deal.
              You then pay the Ambassador directly and record that payment here or on the Deal.
            </p>
            <ButtonLink to="/app/business/deals">Review Deals</ButtonLink>
          </EmptyState>
        ) : null}

        {list.isSuccess && enriched.length > 0 ? (
          <>
            <section
              className="commission-summary"
              role="region"
              aria-label="Commission obligation summary"
            >
              <div className="commission-summary__item">
                <p className="commission-summary__label">Total due</p>
                <p className="commission-summary__value">{summary.dueTotalLabel}</p>
                <p className="campaign-row__meta">
                  {summary.dueCount} obligation{summary.dueCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="commission-summary__item commission-summary__item--overdue">
                <p className="commission-summary__label">Overdue</p>
                <p className="commission-summary__value">{summary.overdueTotalLabel}</p>
                <p className="campaign-row__meta">
                  {summary.overdueCount} need{summary.overdueCount === 1 ? 's' : ''} payment now
                </p>
              </div>
              <div className="commission-summary__item">
                <p className="commission-summary__label">Paid — awaiting receipt</p>
                <p className="commission-summary__value">{summary.paidTotalLabel}</p>
                <p className="campaign-row__meta">{summary.paidCount} waiting on Ambassador</p>
              </div>
              <div className="commission-summary__item">
                <p className="commission-summary__label">Received</p>
                <p className="commission-summary__value">{summary.receivedTotalLabel}</p>
                <p className="campaign-row__meta">
                  {summary.receivedCount} confirmed by Ambassador
                </p>
              </div>
            </section>

            <p className="form-section__lead">
              Totals are summed from your commission records in this list. They are not MarcatursHub
              platform revenue.
            </p>

            <div
              className="desk-toolbar commission-filters"
              role="toolbar"
              aria-label="Filter commissions"
            >
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`btn btn--sm${filter === option.value ? ' btn--primary' : ' btn--secondary'}`}
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {ranked.length === 0 ? (
              <EmptyState title="No commissions in this view">
                <p>Try another filter to see due, overdue, paid, or received obligations.</p>
              </EmptyState>
            ) : (
              <div className="campaign-list">
                {ranked.map((item) => {
                  const overdueLabel =
                    item.status === 'due' && item.is_overdue
                      ? overdueDurationLabel(item.due_at)
                      : null
                  return (
                    <Link
                      key={item.id}
                      to={`/app/business/commissions/${item.id}`}
                      className={`card card--interactive campaign-row attention-row${
                        item.status === 'due' && item.is_overdue
                          ? ' attention-row--danger'
                          : item.status === 'due'
                            ? ' attention-row--action'
                            : ''
                      }`}
                    >
                      <div className="campaign-row__top">
                        <div>
                          {item.status === 'due' && item.is_overdue ? (
                            <p className="attention-label attention-label--danger">Needs payment</p>
                          ) : item.status === 'due' ? (
                            <p className="attention-label attention-label--action">Due</p>
                          ) : item.status === 'paid' ? (
                            <p className="attention-label attention-label--wait">
                              Awaiting Ambassador receipt
                            </p>
                          ) : null}
                          <h2 className="commission-row__amount">
                            {formatMoney(item.amount, item.currency)}
                          </h2>
                          <p className="campaign-row__meta">
                            Commission #{item.id} · Deal #{item.deal_id}
                            {item.ambassadorName ? ` · ${item.ambassadorName}` : ''}
                          </p>
                        </div>
                        <span className={commissionStatusBadgeClass(item)}>
                          {commissionStatusLabel(item)}
                        </span>
                      </div>
                      <p className="campaign-row__meta">
                        {item.campaignTitle || item.productName || 'Deal snapshot product'}
                        {item.due_at ? ` · Due ${formatDateTime(item.due_at)}` : ''}
                        {overdueLabel ? ` · ${overdueLabel}` : ''}
                        {item.paid_at ? ` · Paid ${formatDateTime(item.paid_at)}` : ''}
                        {item.received_at ? ` · Received ${formatDateTime(item.received_at)}` : ''}
                        {item.hasOpenDispute ? ' · Open dispute on Deal' : ''}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  )
}

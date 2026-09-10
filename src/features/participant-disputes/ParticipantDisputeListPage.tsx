import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { UserRole } from '@/shared/types/auth'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { fetchBusinessDeals } from '@/features/business-deals/api'
import { fetchDeals } from '@/features/ambassador-deals/api'
import { fetchDisputeCategories, fetchDisputes } from './api'
import { DisputeCreateForm } from './DisputeCreateForm'
import { disputeKeys } from './queryKeys'
import {
  counterpartyLabel,
  disputeAttention,
  disputeStatusBadgeClass,
  disputeStatusLabel,
} from './status'

export function ParticipantDisputeListPage({ role }: { role: UserRole }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') || '1') || 1
  const initialDealId = params.get('deal') ? Number(params.get('deal')) : null

  const list = useQuery({
    queryKey: disputeKeys.list(page),
    queryFn: ({ signal }) => fetchDisputes(page, signal),
  })

  const categories = useQuery({
    queryKey: disputeKeys.categories(),
    queryFn: ({ signal }) => fetchDisputeCategories(signal),
  })

  const deals = useQuery({
    queryKey: [role === 'BUSINESS' ? 'business-deals' : 'deals', 'list', 'for-disputes'],
    queryFn: ({ signal }) =>
      role === 'BUSINESS' ? fetchBusinessDeals(1, 100, signal) : fetchDeals(signal),
  })

  const dealMap = new Map((deals.data?.items ?? []).map((deal) => [deal.id, deal]))
  const lastPage = list.data?.pagination?.last_page ?? 1

  return (
    <>
      <PageMeta
        title="Disputes"
        description="Participant dispute cases for Deals and commissions."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Disputes</h1>
            <p>
              Disputes are separate review cases. They do not rename a Deal status or automatically
              reverse payments, commissions, or settlements.
            </p>
          </div>
        </header>

        {categories.isSuccess ? (
          <DisputeCreateForm
            role={role}
            categories={categories.data}
            initialDealId={initialDealId}
            onCreated={async (disputeId, dealId) => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: disputeKeys.all }),
                queryClient.invalidateQueries({ queryKey: ['deals'] }),
                queryClient.invalidateQueries({ queryKey: ['business-deals'] }),
              ])
              navigate(
                `/${role === 'BUSINESS' ? 'app/business' : 'app/ambassador'}/disputes/${disputeId}?deal=${dealId}`,
              )
            }}
          />
        ) : categories.isLoading ? (
          <LoadingState label="Loading dispute form…" />
        ) : (
          <ErrorState title="Could not load dispute categories">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: disputeKeys.categories() })
              }
            >
              Retry
            </button>
          </ErrorState>
        )}

        <section className="card stack">
          <div>
            <h2>Case desk</h2>
            <p className="form-section__lead">
              Open and historical dispute cases linked to your Deals. Deal, dispute, and commission
              states remain separate.
            </p>
          </div>

          {list.isLoading ? <LoadingState label="Loading disputes…" /> : null}
          {list.isError ? (
            <ErrorState title="Could not load disputes">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => void queryClient.invalidateQueries({ queryKey: disputeKeys.all })}
              >
                Retry
              </button>
            </ErrorState>
          ) : null}

          {list.isSuccess && list.data.items.length === 0 ? (
            <EmptyState title="No disputes yet">
              No open cases. Open a dispute from a Deal only when confirmation, payment, or
              commission terms need formal review.
            </EmptyState>
          ) : null}

          {list.data && list.data.items.length > 0 ? (
            <div className="campaign-list">
              {list.data.items.map((dispute) => {
                const attention = disputeAttention(dispute.status, role)
                const relatedDeal = dealMap.get(dispute.deal_id)
                return (
                  <Link
                    key={dispute.id}
                    to={`/${role === 'BUSINESS' ? 'app/business' : 'app/ambassador'}/disputes/${dispute.id}`}
                    className={`card card--interactive campaign-row attention-row attention-row--${attention.tone}`}
                  >
                    <div className="campaign-row__top">
                      <div>
                        <p className={`attention-label attention-label--${attention.tone}`}>
                          {attention.title}
                        </p>
                        <h2>{dispute.reference}</h2>
                        <p className="campaign-row__meta">
                          Dispute #{dispute.id} · Deal #{dispute.deal_id}
                          {relatedDeal
                            ? ` · ${relatedDeal.product_name || relatedDeal.campaign.title}`
                            : ''}
                        </p>
                      </div>
                      <span className={disputeStatusBadgeClass(dispute.status)}>
                        {disputeStatusLabel(dispute.status)}
                      </span>
                    </div>
                    <p className="campaign-row__meta">
                      {dispute.category?.name || 'General dispute'} ·{' '}
                      {counterpartyLabel(dispute, role)}
                      {relatedDeal ? ` · Deal ${relatedDeal.status}` : ''}
                    </p>
                    <p className="campaign-row__meta">
                      Opened {formatDateTime(dispute.created_at)} · Updated{' '}
                      {formatDateTime(dispute.updated_at)}
                    </p>
                  </Link>
                )
              })}
            </div>
          ) : null}

          {list.isSuccess && lastPage > 1 ? (
            <div className="action-bar">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('page', String(Math.max(1, page - 1)))
                    return next
                  })
                }
              >
                Previous
              </Button>
              <span className="campaign-row__meta">
                Page {page} of {lastPage}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= lastPage}
                onClick={() =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('page', String(page + 1))
                    return next
                  })
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </>
  )
}

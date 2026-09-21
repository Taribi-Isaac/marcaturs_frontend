import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CertificationCtaBanner } from '@/features/ambassador-certification/CertificationCtaBanner'
import { useAuth } from '@/features/auth/authContext'
import { fetchConversations } from '@/features/participant-messages/api'
import { conversationKeys } from '@/features/participant-messages/queryKeys'
import { fetchVerificationStatus } from '@/features/participant-verification/api'
import { verificationKeys } from '@/features/participant-verification/queryKeys'
import {
  overallStatusBadgeClass,
  overallStatusLabel,
} from '@/features/participant-verification/status'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchCommissions, fetchDeals } from './api'
import { formatDateTime, formatMoney } from './format'
import { dealStatusBadgeClass, dealStatusLabel } from './status'

export function AmbassadorHomePage() {
  const { user } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'

  const deals = useQuery({
    queryKey: ['deals', 'list'],
    queryFn: ({ signal }) => fetchDeals(signal),
  })
  const commissions = useQuery({
    queryKey: ['commissions', 'list'],
    queryFn: ({ signal }) => fetchCommissions(signal),
  })
  const messages = useQuery({
    queryKey: conversationKeys.list(1),
    queryFn: ({ signal }) => fetchConversations(1, 5, signal),
  })
  const verification = useQuery({
    queryKey: verificationKeys.status(),
    queryFn: ({ signal }) => fetchVerificationStatus(signal),
    retry: false,
  })

  const activeDeals = useMemo(() => {
    if (!deals.isSuccess) return []
    return deals.data.items
      .filter((deal) => deal.status === 'payment_pending' || deal.status === 'sealed')
      .slice(0, 4)
  }, [deals])

  const openCommissions = useMemo(() => {
    if (!commissions.isSuccess) return []
    return commissions.data.items
      .filter((item) => item.status !== 'received')
      .slice(0, 3)
  }, [commissions])

  const showVerificationPrompt =
    verification.isSuccess &&
    ['NOT_STARTED', 'REJECTED', 'MORE_INFORMATION_REQUIRED'].includes(
      verification.data.overall_status,
    )

  return (
    <>
      <PageMeta
        title="Home"
        description="Ambassador workspace — opportunities, Deals, commissions, and messages."
      />
      <div className="desk-page reveal dashboard-page">
        <header className="desk-header dashboard-hero">
          <div>
            <p className="eyebrow">Ambassador workspace</p>
            <h1>Welcome back, {firstName}</h1>
            <p>Find campaigns worth promoting, manage active Deals, and keep commission follow-ups moving.</p>
          </div>
          <div className="dashboard-hero__actions">
            <ButtonLink to="/app/ambassador/discover">Browse campaigns</ButtonLink>
            <ButtonLink to="/app/ambassador/deals/new" variant="secondary">
              Create Deal
            </ButtonLink>
          </div>
        </header>

        <CertificationCtaBanner />

        {showVerificationPrompt ? (
          <div className="card dashboard-prompt">
            <div>
              <p className="eyebrow">Verification</p>
              <h2>Complete participant Verification</h2>
              <p>
                Separate from email confirmation. Submit checklist items when you are ready to build
                trust on the marketplace.
              </p>
            </div>
            <ButtonLink to="/app/ambassador/verification" variant="secondary">
              Open verification
            </ButtonLink>
          </div>
        ) : null}

        <section className="dashboard-section" aria-labelledby="ambassador-opportunities">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Marketplace</p>
              <h2 id="ambassador-opportunities">Opportunities</h2>
              <p>Live campaigns with clear commission terms.</p>
            </div>
            <ButtonLink to="/app/ambassador/discover" variant="secondary" size="sm">
              Open Discover
            </ButtonLink>
          </div>
          <div className="card dashboard-prompt">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Find an offer worth promoting</h3>
              <p style={{ margin: '0.35rem 0 0', color: 'var(--color-muted)' }}>
                Search Featured and active listings, then message the Business from an eligible
                Campaign when you need clarification.
              </p>
            </div>
            <ButtonLink to="/app/ambassador/discover">Browse now</ButtonLink>
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="ambassador-deals">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Pipeline</p>
              <h2 id="ambassador-deals">Active Deals</h2>
            </div>
            <ButtonLink to="/app/ambassador/deals" variant="secondary" size="sm">
              All Deals
            </ButtonLink>
          </div>
          {deals.isLoading ? <LoadingState label="Loading Deals…" /> : null}
          {deals.isError ? (
            <ErrorState title="Could not load Deals">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => void deals.refetch()}>
                Retry
              </button>
            </ErrorState>
          ) : null}
          {deals.isSuccess && activeDeals.length === 0 ? (
            <EmptyState title="No active Deals">
              <p>Create a Deal when a customer is ready under a published Campaign.</p>
              <ButtonLink to="/app/ambassador/discover">Find a campaign</ButtonLink>
            </EmptyState>
          ) : null}
          {activeDeals.length > 0 ? (
            <ul className="campaign-list">
              {activeDeals.map((deal) => (
                <li key={deal.id}>
                  <Link to={`/app/ambassador/deals/${deal.id}`} className="card card--interactive campaign-row">
                    <div className="campaign-row__top">
                      <div>
                        <h3>{deal.campaign?.title ?? `Deal #${deal.id}`}</h3>
                        <p className="campaign-row__meta">
                          Updated {formatDateTime(deal.updated_at)}
                        </p>
                      </div>
                      <span className={dealStatusBadgeClass(deal.status)}>
                        {dealStatusLabel(deal.status)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="grid-2 dashboard-split">
          <section className="dashboard-section" aria-labelledby="ambassador-earnings">
            <div className="dashboard-section__head">
              <div>
                <p className="eyebrow">Commission</p>
                <h2 id="ambassador-earnings">Earnings follow-up</h2>
              </div>
              <ButtonLink to="/app/ambassador/earnings" variant="secondary" size="sm">
                Earnings
              </ButtonLink>
            </div>
            {commissions.isLoading ? <LoadingState label="Loading earnings…" /> : null}
            {commissions.isSuccess && openCommissions.length === 0 ? (
              <EmptyState title="No open commission items">
                <p>Commission appears after a Business confirms qualifying payment.</p>
              </EmptyState>
            ) : null}
            {openCommissions.length > 0 ? (
              <ul className="campaign-list">
                {openCommissions.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/app/ambassador/deals/${item.deal_id}`}
                      className="card card--interactive campaign-row"
                    >
                      <div className="campaign-row__top">
                        <strong>{formatMoney(item.amount, item.currency)}</strong>
                        <span className={item.is_overdue ? 'badge badge--danger' : 'badge badge--warning'}>
                          {item.is_overdue ? 'Overdue' : item.status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="dashboard-section" aria-labelledby="ambassador-messages">
            <div className="dashboard-section__head">
              <div>
                <p className="eyebrow">Chat</p>
                <h2 id="ambassador-messages">Messages</h2>
              </div>
              <ButtonLink to="/app/ambassador/messages" variant="secondary" size="sm">
                Inbox
              </ButtonLink>
            </div>
            {messages.isLoading ? <LoadingState label="Loading messages…" /> : null}
            {messages.isSuccess && messages.data.items.length === 0 ? (
              <EmptyState title="No conversations yet">
                <p>
                  Start from an eligible Campaign with <strong>Message Business</strong> — no Business
                  ID required.
                </p>
              </EmptyState>
            ) : null}
            {messages.isSuccess && messages.data.items.length > 0 ? (
              <ul className="campaign-list">
                {messages.data.items.slice(0, 4).map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      to={`/app/ambassador/messages/${conversation.id}`}
                      className="card card--interactive campaign-row"
                    >
                      <strong>{conversation.counterpart?.name ?? `Conversation #${conversation.id}`}</strong>
                      <p className="campaign-row__meta">{formatDateTime(conversation.updated_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>

        {verification.isSuccess ? (
          <section className="dashboard-section" aria-labelledby="ambassador-verification-status">
            <div className="card dashboard-prompt">
              <div>
                <p className="eyebrow">Trust</p>
                <h2 id="ambassador-verification-status">Participant Verification</h2>
                <p style={{ margin: '0.35rem 0 0' }}>
                  Status:{' '}
                  <span className={overallStatusBadgeClass(verification.data.overall_status)}>
                    {overallStatusLabel(verification.data.overall_status)}
                  </span>
                </p>
              </div>
              <ButtonLink to="/app/ambassador/verification" variant="secondary">
                View details
              </ButtonLink>
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}

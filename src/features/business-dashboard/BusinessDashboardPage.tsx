import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { fetchBusinessCampaigns } from '@/features/business-campaigns/api'
import { businessCampaignKeys } from '@/features/business-campaigns/queryKeys'
import { fetchBusinessCommissions, fetchBusinessDeals } from '@/features/business-deals/api'
import { businessCommissionKeys, businessDealKeys } from '@/features/business-deals/queryKeys'
import { businessDealAttention } from '@/features/business-deals/status'
import { formatDateTime, formatDealCommission } from '@/features/ambassador-deals/format'
import { dealStatusBadgeClass, dealStatusLabel } from '@/features/ambassador-deals/status'
import { fetchDisputes } from '@/features/participant-disputes/api'
import { disputeKeys } from '@/features/participant-disputes/queryKeys'
import { disputeStatusBadgeClass, disputeStatusLabel } from '@/features/participant-disputes/status'
import { fetchNotifications } from '@/features/participant-notifications/api'
import { notificationKeys } from '@/features/participant-notifications/queryKeys'
import {
  notificationTitle,
  notificationTypeLabel,
} from '@/features/participant-notifications/presentation'
import { fetchVerificationStatus } from '@/features/participant-verification/api'
import { verificationKeys } from '@/features/participant-verification/queryKeys'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  buildAttentionItems,
  isOpenDisputeStatus,
  summarizeCampaigns,
  summarizeCommissionObligations,
  type AttentionItem,
} from './attention'

function SectionRetry({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <ErrorState title={label}>
      <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
        Try again
      </button>
    </ErrorState>
  )
}

function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <Link
      to={item.href}
      aria-label={`${item.cta}: ${item.title}`}
      className={`card card--interactive campaign-row attention-row attention-row--${item.tone} dashboard-attention__item`}
    >
      <div className="campaign-row__top">
        <div>
          <p className={`attention-label attention-label--${item.tone}`}>{item.label}</p>
          <h3 className="dashboard-attention__title">{item.title}</h3>
          <p className="campaign-row__meta">{item.detail}</p>
        </div>
        <span className="btn btn--secondary btn--sm" aria-hidden>
          {item.cta}
        </span>
      </div>
    </Link>
  )
}

export function BusinessDashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const campaigns = useQuery({
    queryKey: businessCampaignKeys.list(),
    queryFn: ({ signal }) => fetchBusinessCampaigns(signal),
  })

  const deals = useQuery({
    queryKey: businessDealKeys.list(1),
    queryFn: ({ signal }) => fetchBusinessDeals(1, 50, signal),
  })

  const commissions = useQuery({
    queryKey: businessCommissionKeys.list(),
    queryFn: ({ signal }) => fetchBusinessCommissions(signal, 1, 100),
  })

  const disputes = useQuery({
    queryKey: disputeKeys.list(1),
    queryFn: ({ signal }) => fetchDisputes(1, signal),
  })

  const notifications = useQuery({
    queryKey: notificationKeys.list(1),
    queryFn: ({ signal }) => fetchNotifications(1, 20, signal),
  })

  const verification = useQuery({
    queryKey: verificationKeys.status(),
    queryFn: ({ signal }) => fetchVerificationStatus(signal),
  })

  const attention = useMemo(
    () =>
      buildAttentionItems({
        commissions: commissions.isSuccess ? commissions.data.items : null,
        deals: deals.isSuccess ? deals.data.items : null,
        disputes: disputes.isSuccess ? disputes.data.items : null,
        campaigns: campaigns.isSuccess ? campaigns.data : null,
        notifications: notifications.isSuccess ? notifications.data.items : null,
      }),
    [commissions, deals, disputes, campaigns, notifications],
  )

  const campaignSummary = useMemo(
    () => (campaigns.isSuccess ? summarizeCampaigns(campaigns.data) : null),
    [campaigns],
  )

  const commissionSummary = useMemo(
    () => (commissions.isSuccess ? summarizeCommissionObligations(commissions.data.items) : null),
    [commissions],
  )

  const recentDeals = useMemo(() => {
    if (!deals.isSuccess) return []
    const commissionByDeal = new Map(
      (commissions.data?.items ?? []).map((item) => [item.deal_id, item]),
    )
    return [...deals.data.items]
      .map((deal) => {
        const commission = commissionByDeal.get(deal.id) ?? deal.commission
        const dealAttention = businessDealAttention({
          status: deal.status,
          hasSubmittedEvidence: null,
          commissionStatus: commission?.status,
          isOverdue: commission?.is_overdue,
          hasOpenDispute: deal.has_open_dispute,
        })
        return { deal, attention: dealAttention, commission }
      })
      .sort((a, b) => a.attention.priority - b.attention.priority || b.deal.id - a.deal.id)
      .slice(0, 5)
  }, [deals, commissions.data])

  const openDisputes = useMemo(() => {
    if (!disputes.isSuccess) return []
    return disputes.data.items.filter((d) => isOpenDisputeStatus(d.status)).slice(0, 3)
  }, [disputes])

  const recentNotifications = useMemo(() => {
    if (!notifications.isSuccess) return []
    return notifications.data.items.slice(0, 5)
  }, [notifications])

  const showVerificationPrompt =
    verification.isSuccess &&
    ['NOT_STARTED', 'REJECTED', 'MORE_INFORMATION_REQUIRED'].includes(
      verification.data.overall_status,
    )

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const domainsReady =
    campaigns.isSuccess ||
    deals.isSuccess ||
    commissions.isSuccess ||
    disputes.isSuccess ||
    notifications.isSuccess

  const attentionSourcesReady =
    campaigns.isSuccess && deals.isSuccess && commissions.isSuccess && disputes.isSuccess

  const attentionSourcesPartial =
    campaigns.isError || deals.isError || commissions.isError || disputes.isError

  const isBrandNew =
    campaigns.isSuccess &&
    deals.isSuccess &&
    commissions.isSuccess &&
    campaigns.data.length === 0 &&
    deals.data.items.length === 0 &&
    commissions.data.items.length === 0

  return (
    <>
      <PageMeta
        title="Dashboard"
        description="See what needs attention across campaigns, Deals, commissions, and disputes."
      />
      <div className="desk-page reveal dashboard-page">
        <header className="desk-header dashboard-hero">
          <div>
            <p className="eyebrow">Business workspace</p>
            <h1>Welcome back, {firstName}</h1>
            <p>
              Track the moments that matter — campaign listings, Ambassador Deals, commission
              obligations, and open cases. Desks below stay authoritative; this page points you to
              the next action.
            </p>
          </div>
          <div className="dashboard-hero__actions">
            <ButtonLink to="/app/business/campaigns/new">Create campaign</ButtonLink>
            <ButtonLink to="/discover" variant="secondary">
              Explore marketplace
            </ButtonLink>
          </div>
        </header>

        {user?.status === 'restricted' ? (
          <div className="alert alert--warning" role="status">
            Your account is restricted. Some marketplace actions may be unavailable until access is
            restored.
          </div>
        ) : null}

        {showVerificationPrompt ? (
          <div className="card dashboard-prompt">
            <div>
              <p className="eyebrow">Verification</p>
              <h2>Complete verification to unlock the next step</h2>
              <p>
                Submit participant-safe requirements so MarcatursHub can review your Business
                identity. Backend rules still decide what is unlocked.
              </p>
            </div>
            <ButtonLink to="/app/business/verification" variant="secondary">
              Open verification
            </ButtonLink>
          </div>
        ) : null}

        <section className="dashboard-section" aria-labelledby="attention-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Priority</p>
              <h2 id="attention-heading">What needs your attention</h2>
              <p>Ordered by operational urgency from certified records — not invented scores.</p>
            </div>
          </div>

          {!domainsReady &&
          (campaigns.isLoading ||
            deals.isLoading ||
            commissions.isLoading ||
            disputes.isLoading ||
            notifications.isLoading) ? (
            <LoadingState label="Gathering attention items…" />
          ) : null}

          {attentionSourcesReady && attention.length === 0 && !isBrandNew ? (
            <EmptyState title="Nothing urgent right now">
              <p>
                No overdue commissions, open disputes, Deals awaiting review, due payments, or
                campaign actions were found in the latest records.
              </p>
            </EmptyState>
          ) : null}

          {attentionSourcesPartial && attention.length === 0 && !isBrandNew ? (
            <div className="alert alert--warning" role="status">
              Some attention sources could not be loaded. Available sections below still work —
              retry any failed section individually.
            </div>
          ) : null}

          {isBrandNew && attention.length === 0 ? (
            <EmptyState title="Start with your first campaign">
              <p>
                Deals and commission obligations appear after Ambassadors create opportunities from
                eligible campaigns. Create a campaign, publish commercial terms, and submit for
                review.
              </p>
              <div className="row">
                <Link className="btn btn--primary" to="/app/business/campaigns/new">
                  Create campaign
                </Link>
                <Link className="btn btn--secondary" to="/app/business/settings">
                  Review profile
                </Link>
              </div>
            </EmptyState>
          ) : null}

          {attention.length > 0 ? (
            <div className="dashboard-attention" role="list">
              {attention.slice(0, 8).map((item) => (
                <div key={item.id} role="listitem">
                  <AttentionCard item={item} />
                </div>
              ))}
            </div>
          ) : null}

          {attention.length > 8 ? (
            <p className="campaign-row__meta">
              Showing the top 8 attention items. Open each desk for the full list.
            </p>
          ) : null}
        </section>

        <section className="dashboard-section" aria-labelledby="campaigns-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Listings</p>
              <h2 id="campaigns-heading">Campaigns</h2>
              <p>Active, submitted, and draft listings from your Campaign desk.</p>
            </div>
            <ButtonLink to="/app/business/campaigns" variant="secondary" size="sm">
              View campaigns
            </ButtonLink>
          </div>

          {campaigns.isLoading ? <LoadingState label="Loading campaigns…" /> : null}
          {campaigns.isError ? (
            <SectionRetry
              label="Campaign information unavailable"
              onRetry={() =>
                void queryClient.invalidateQueries({ queryKey: businessCampaignKeys.all })
              }
            />
          ) : null}
          {campaigns.isSuccess && campaignSummary ? (
            campaignSummary.total === 0 ? (
              <EmptyState title="No campaigns yet">
                <p>Create your first campaign to publish commercial terms for Ambassadors.</p>
                <Link className="btn btn--primary" to="/app/business/campaigns/new">
                  Create campaign
                </Link>
              </EmptyState>
            ) : (
              <div className="dashboard-stat-row" aria-label="Campaign counts">
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Active</p>
                  <p className="dashboard-stat__value">{campaignSummary.active}</p>
                </div>
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Submitted</p>
                  <p className="dashboard-stat__value">{campaignSummary.submitted}</p>
                </div>
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Draft</p>
                  <p className="dashboard-stat__value">{campaignSummary.draft}</p>
                </div>
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Expiring</p>
                  <p className="dashboard-stat__value">{campaignSummary.expiring}</p>
                </div>
              </div>
            )
          ) : null}
        </section>

        <section className="dashboard-section" aria-labelledby="deals-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Commercial moments</p>
              <h2 id="deals-heading">Recent Deals</h2>
              <p>Review payment evidence and seal qualifying customer payments.</p>
            </div>
            <ButtonLink to="/app/business/deals" variant="secondary" size="sm">
              View all Deals
            </ButtonLink>
          </div>

          {deals.isLoading ? <LoadingState label="Loading Deals…" /> : null}
          {deals.isError ? (
            <SectionRetry
              label="Deal information unavailable"
              onRetry={() => void queryClient.invalidateQueries({ queryKey: businessDealKeys.all })}
            />
          ) : null}
          {deals.isSuccess && recentDeals.length === 0 ? (
            <EmptyState title="No Deals yet">
              <p>
                Deals appear when Ambassadors create opportunities from your eligible marketplace
                campaigns.
              </p>
              <Link className="btn btn--secondary" to="/app/business/campaigns">
                Open campaigns
              </Link>
            </EmptyState>
          ) : null}
          {recentDeals.length > 0 ? (
            <div className="campaign-list">
              {recentDeals.map(({ deal, attention: dealAttention, commission }) => (
                <Link
                  key={deal.id}
                  to={`/app/business/deals/${deal.id}`}
                  className={`card card--interactive campaign-row attention-row attention-row--${dealAttention.tone}`}
                >
                  <div className="campaign-row__top">
                    <div>
                      <p className={`attention-label attention-label--${dealAttention.tone}`}>
                        {dealAttention.label}
                      </p>
                      <strong>{deal.product_name || deal.campaign.title}</strong>
                      <p className="campaign-row__meta">
                        {deal.ambassador.name} · {formatDateTime(deal.updated_at)}
                      </p>
                    </div>
                    <span className={dealStatusBadgeClass(deal.status)}>
                      {dealStatusLabel(deal.status)}
                    </span>
                  </div>
                  {commission ? (
                    <p className="campaign-row__meta">
                      Commission: {formatDealCommission(deal)} · {commission.status}
                      {commission.is_overdue ? ' (overdue)' : ''}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="dashboard-section" aria-labelledby="commissions-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Business → Ambassador</p>
              <h2 id="commissions-heading">Commission obligations</h2>
              <p>
                Keep Ambassador payments on track. These are Business-to-Ambassador commission
                obligations. MarcatursHub does not hold or automatically pay these funds.
              </p>
            </div>
            <ButtonLink to="/app/business/commissions" variant="secondary" size="sm">
              View commissions
            </ButtonLink>
          </div>

          {commissions.isLoading ? <LoadingState label="Loading commissions…" /> : null}
          {commissions.isError ? (
            <SectionRetry
              label="Commission information unavailable"
              onRetry={() =>
                void queryClient.invalidateQueries({ queryKey: businessCommissionKeys.all })
              }
            />
          ) : null}
          {commissions.isSuccess && commissionSummary ? (
            commissions.data.items.length === 0 ? (
              <EmptyState title="No commissions yet">
                <p>Commissions appear after qualifying Deals are sealed.</p>
                <Link className="btn btn--secondary" to="/app/business/deals">
                  Open Deals
                </Link>
              </EmptyState>
            ) : (
              <div className="dashboard-stat-row" aria-label="Commission obligation counts">
                <div className="dashboard-stat dashboard-stat--danger">
                  <p className="dashboard-stat__label">Overdue</p>
                  <p className="dashboard-stat__value">{commissionSummary.overdue}</p>
                </div>
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Due</p>
                  <p className="dashboard-stat__value">{commissionSummary.due}</p>
                </div>
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Awaiting receipt</p>
                  <p className="dashboard-stat__value">{commissionSummary.awaitingReceipt}</p>
                </div>
                <div className="dashboard-stat">
                  <p className="dashboard-stat__label">Received</p>
                  <p className="dashboard-stat__value">{commissionSummary.received}</p>
                </div>
              </div>
            )
          ) : null}
        </section>

        <section className="dashboard-section" aria-labelledby="disputes-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Cases</p>
              <h2 id="disputes-heading">Open disputes</h2>
              <p>Active review cases. Deal and commission status remain separate.</p>
            </div>
            <ButtonLink to="/app/business/disputes" variant="secondary" size="sm">
              View disputes
            </ButtonLink>
          </div>

          {disputes.isLoading ? <LoadingState label="Loading disputes…" /> : null}
          {disputes.isError ? (
            <SectionRetry
              label="Dispute information unavailable"
              onRetry={() => void queryClient.invalidateQueries({ queryKey: disputeKeys.all })}
            />
          ) : null}
          {disputes.isSuccess && openDisputes.length === 0 ? (
            <EmptyState title="No open cases">
              <p>No active disputes currently require your attention.</p>
            </EmptyState>
          ) : null}
          {openDisputes.length > 0 ? (
            <div className="campaign-list">
              {openDisputes.map((dispute) => (
                <Link
                  key={dispute.id}
                  to={`/app/business/disputes/${dispute.id}`}
                  className="card card--interactive campaign-row attention-row attention-row--action"
                >
                  <div className="campaign-row__top">
                    <div>
                      <p className="attention-label attention-label--action">Needs attention</p>
                      <strong>{dispute.reference || `Dispute #${dispute.id}`}</strong>
                      <p className="campaign-row__meta">Deal #{dispute.deal_id}</p>
                    </div>
                    <span className={disputeStatusBadgeClass(dispute.status)}>
                      {disputeStatusLabel(dispute.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="dashboard-section" aria-labelledby="activity-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Inbox</p>
              <h2 id="activity-heading">Recent notifications</h2>
              <p>Recent notices from certified notification records.</p>
            </div>
            <ButtonLink to="/app/business/notifications" variant="secondary" size="sm">
              View notifications
            </ButtonLink>
          </div>

          {notifications.isLoading ? <LoadingState label="Loading notifications…" /> : null}
          {notifications.isError ? (
            <SectionRetry
              label="Notification information unavailable"
              onRetry={() => void queryClient.invalidateQueries({ queryKey: notificationKeys.all })}
            />
          ) : null}
          {notifications.isSuccess && recentNotifications.length === 0 ? (
            <EmptyState title="No notifications yet">
              <p>Important Deal, commission, and dispute events will appear in your inbox.</p>
            </EmptyState>
          ) : null}
          {recentNotifications.length > 0 ? (
            <div className="campaign-list">
              {recentNotifications.map((notification) => (
                <Link
                  key={notification.id}
                  to="/app/business/notifications"
                  className="card card--interactive campaign-row"
                >
                  <div className="campaign-row__top">
                    <div>
                      <strong>{notificationTitle(notification)}</strong>
                      <p className="campaign-row__meta">
                        {notificationTypeLabel(notification.type)}
                        {notification.created_at
                          ? ` · ${formatDateTime(notification.created_at)}`
                          : ''}
                        {!notification.is_read ? ' · Unread' : ''}
                      </p>
                    </div>
                    {!notification.is_read ? (
                      <span className="badge badge--warning">Unread</span>
                    ) : (
                      <span className="badge badge--neutral">Read</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="dashboard-section" aria-labelledby="actions-heading">
          <div className="dashboard-section__head">
            <div>
              <p className="eyebrow">Next steps</p>
              <h2 id="actions-heading">Useful actions</h2>
            </div>
          </div>
          <div className="dashboard-actions">
            <Link
              className="card card--interactive dashboard-action"
              to="/app/business/campaigns/new"
            >
              <strong>Create campaign</strong>
              <p>Define product terms Ambassadors can sell.</p>
            </Link>
            <Link className="card card--interactive dashboard-action" to="/discover">
              <strong>Explore marketplace</strong>
              <p>See how listings appear publicly.</p>
            </Link>
            <Link className="card card--interactive dashboard-action" to="/app/business/messages">
              <strong>Messages</strong>
              <p>Open Deal conversations with Ambassadors.</p>
            </Link>
            <Link className="card card--interactive dashboard-action" to="/app/business/settings">
              <strong>Settings</strong>
              <p>Review Business profile and account details.</p>
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchBusinessCampaigns } from './api'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import { formatDateTime } from './format'
import { businessCampaignKeys } from './queryKeys'
import type { CampaignStatus } from './types'

const STATUS_FILTERS: Array<{ value: '' | CampaignStatus; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'deactivated', label: 'Deactivated' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'closed', label: 'Closed' },
]

export function CampaignListPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'' | CampaignStatus>('')

  const list = useQuery({
    queryKey: businessCampaignKeys.list(),
    queryFn: ({ signal }) => fetchBusinessCampaigns(signal),
  })

  const filtered = useMemo(() => {
    const items = list.data ?? []
    const needle = q.trim().toLowerCase()
    return items.filter((c) => {
      if (status && c.status !== status) return false
      if (!needle) return true
      return (
        c.title.toLowerCase().includes(needle) ||
        (c.category?.name ?? '').toLowerCase().includes(needle)
      )
    })
  }, [list.data, q, status])

  return (
    <>
      <PageMeta title="Campaigns" description="Manage your commission campaigns on MarcatursHub." />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Campaigns</h1>
            <p>
              Publish commission opportunities for ambassadors. Customers pay you directly —
              MarcatursHub does not hold customer money.
            </p>
          </div>
          <ButtonLink to="/app/business/campaigns/new">Create campaign</ButtonLink>
        </header>

        {list.isLoading ? <LoadingState label="Loading campaigns…" /> : null}
        {list.isError ? (
          <ErrorState title="Could not load campaigns">
            Refresh and try again. If the problem continues, check your connection.
          </ErrorState>
        ) : null}

        {list.isSuccess && list.data.length === 0 ? (
          <div className="card stack stack--lg" style={{ padding: 'var(--space-7)' }}>
            <h2>Create your first campaign</h2>
            <p style={{ color: 'var(--color-muted)', maxWidth: '36rem' }}>
              A campaign is a marketplace listing identity. You attach a commercial version with
              product, commission, and payment destination details, publish those terms, then submit
              for review. Prepare a clear product offer, commission economics, and how customers
              should pay you.
            </p>
            <ul style={{ color: 'var(--color-muted)', paddingLeft: '1.1rem' }}>
              <li>Product or service ambassadors will promote</li>
              <li>Commission rate or fixed amount and confirmation rules</li>
              <li>Official payment destination customers should use</li>
            </ul>
            <div>
              <ButtonLink to="/app/business/campaigns/new">Create campaign</ButtonLink>
            </div>
          </div>
        ) : null}

        {list.isSuccess && list.data.length > 0 ? (
          <>
            <div className="desk-toolbar">
              <div className="field">
                <label htmlFor="campaign-search">Search</label>
                <input
                  id="campaign-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Title or category"
                />
              </div>
              <div className="field">
                <label htmlFor="campaign-status">Status</label>
                <select
                  id="campaign-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as '' | CampaignStatus)}
                >
                  {STATUS_FILTERS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', alignSelf: 'center' }}>
                {filtered.length} of {list.data.length} campaign{list.data.length === 1 ? '' : 's'}
              </p>
            </div>

            {filtered.length === 0 ? (
              <EmptyState title="No matching campaigns">Try another search or status.</EmptyState>
            ) : (
              <div className="campaign-list">
                {filtered.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/app/business/campaigns/${campaign.id}`}
                    className="card card--interactive campaign-row"
                  >
                    <div className="campaign-row__top">
                      <div>
                        <h2>{campaign.title}</h2>
                        <p className="campaign-row__meta">
                          {campaign.category?.name ?? 'No category'}
                          {campaign.current_version
                            ? ` · Version ${campaign.current_version.version_number} (${campaign.current_version.status})`
                            : ' · No published version yet'}
                        </p>
                      </div>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                    <p className="campaign-row__meta">
                      Listing {formatDateTime(campaign.listing_starts_at)} →{' '}
                      {formatDateTime(campaign.listing_expires_at)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  )
}

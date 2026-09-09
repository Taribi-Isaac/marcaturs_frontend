import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/authContext'
import { fetchCategories, fetchMarketplaceCampaigns } from '@/features/marketplace/api'
import { CampaignCard } from '@/features/marketplace/CampaignCard'
import { images } from '@/shared/content/images'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta, SectionHeading } from '@/shared/ui/States'

type Props = {
  variant?: 'public' | 'ambassador'
}

export function DiscoverPage({ variant = 'public' }: Props) {
  const { user, status } = useAuth()
  const isAmbassador = status === 'authenticated' && user?.role === 'AMBASSADOR'
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [commissionType, setCommissionType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [page, setPage] = useState(1)

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => fetchCategories(signal),
  })

  const listParams = {
    q: q || undefined,
    category_id: categoryId === '' ? undefined : categoryId,
    commission_type: commissionType || undefined,
    status: statusFilter || undefined,
    featured: featuredOnly ? true : undefined,
    per_page: 12,
    page,
  }

  const list = useQuery({
    queryKey: ['marketplace', 'discover', listParams],
    queryFn: ({ signal }) => fetchMarketplaceCampaigns(listParams, signal),
  })

  const featured = useQuery({
    queryKey: ['marketplace', 'featured'],
    queryFn: ({ signal }) => fetchMarketplaceCampaigns({ featured: true, per_page: 6 }, signal),
  })

  const featuredIds = new Set((featured.data?.items ?? []).map((item) => item.id))
  const listItems = (list.data?.items ?? []).filter((item) =>
    featuredOnly ? true : !featuredIds.has(item.id),
  )

  const countLabel = useMemo(() => {
    const total = list.data?.pagination?.total ?? list.data?.items.length ?? 0
    return `${total} opportunit${total === 1 ? 'y' : 'ies'}`
  }, [list.data])

  const lastPage = list.data?.pagination?.last_page ?? 1

  return (
    <>
      <PageMeta
        title="Discover campaigns"
        description="Choose an offer worth selling on MarcatursHub."
      />
      <section
        className={`page-hero discover-hero${variant === 'ambassador' ? ' discover-hero--desk' : ''}`}
      >
        <div className="container">
          <SectionHeading as="h1" eyebrow="Marketplace" title="Choose an offer worth selling.">
            {isAmbassador
              ? 'Search live campaigns, review commission and qualification, then create a Deal when a customer is ready.'
              : 'Browse public commission opportunities. Sign in as an Ambassador to create Deals and earn when Businesses confirm payment.'}
          </SectionHeading>
          <form
            className="discover-filters"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setQ(draft.trim())
            }}
          >
            <div className="field" style={{ flex: '1 1 220px' }}>
              <label htmlFor="discover-q">Search</label>
              <input
                id="discover-q"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Solar kits, delivery, training…"
              />
            </div>
            <div className="field" style={{ flex: '1 1 160px' }}>
              <label htmlFor="discover-category">Category</label>
              <select
                id="discover-category"
                value={categoryId === '' ? '' : String(categoryId)}
                onChange={(event) => {
                  setPage(1)
                  setCategoryId(event.target.value ? Number(event.target.value) : '')
                }}
              >
                <option value="">All categories</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label htmlFor="discover-commission">Commission</label>
              <select
                id="discover-commission"
                value={commissionType}
                onChange={(event) => {
                  setPage(1)
                  setCommissionType(event.target.value)
                }}
              >
                <option value="">Any type</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label htmlFor="discover-status">Status</label>
              <select
                id="discover-status"
                value={statusFilter}
                onChange={(event) => {
                  setPage(1)
                  setStatusFilter(event.target.value)
                }}
              >
                <option value="">Active & expiring</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring</option>
              </select>
            </div>
            <div className="field field--checkbox">
              <label htmlFor="discover-featured">
                <input
                  id="discover-featured"
                  type="checkbox"
                  checked={featuredOnly}
                  onChange={(event) => {
                    setPage(1)
                    setFeaturedOnly(event.target.checked)
                  }}
                />
                Featured only
              </label>
            </div>
            <Button type="submit" style={{ alignSelf: 'end' }}>
              Search
            </Button>
          </form>
          <p style={{ marginTop: '1rem', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            {list.isSuccess ? countLabel : ' '}
          </p>
        </div>
      </section>

      {!featuredOnly && featured.data && featured.data.items.length > 0 ? (
        <section className="section section--tight">
          <div className="container">
            <div className="discover-featured">
              <div className="discover-featured__copy">
                <p className="eyebrow">Featured</p>
                <h2>Highlighted opportunities</h2>
                <p>Businesses that invested in Featured placement — still the same Deal model.</p>
              </div>
              <div className="discover-featured__visual" aria-hidden>
                <img src={images.ambassadors.src} alt="" />
              </div>
            </div>
            <div className="grid-3" style={{ marginTop: '1.5rem' }}>
              {featured.data.items.map((campaign) => (
                <CampaignCard key={`featured-${campaign.id}`} campaign={campaign} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section section--tight">
        <div className="container">
          {list.isLoading ? <LoadingState /> : null}
          {list.isError ? (
            <ErrorState title="Could not load campaigns">
              The marketplace API is unavailable right now.
            </ErrorState>
          ) : null}
          {list.data && list.data.items.length === 0 ? (
            <EmptyState title="No matching campaigns">Try another search or filter.</EmptyState>
          ) : null}
          {list.data && listItems.length > 0 ? (
            <div className="grid-3">
              {listItems.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : null}
          {list.isSuccess && lastPage > 1 ? (
            <div className="action-bar" style={{ marginTop: '1.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <span className="campaign-row__meta">
                Page {page} of {lastPage}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= lastPage}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
          {!isAmbassador && variant === 'public' ? (
            <div className="cta-band" style={{ marginTop: '2.5rem' }}>
              <h2>Ready to sell an offer?</h2>
              <p>
                Create an Ambassador account, choose a campaign, and create a Deal when your
                customer is ready to pay the Business.
              </p>
              <div className="row">
                <ButtonLink to="/register?role=AMBASSADOR" variant="on-dark">
                  Create ambassador account
                </ButtonLink>
                <ButtonLink to="/login" variant="on-dark-ghost">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          ) : null}
          {isAmbassador && variant === 'public' ? (
            <p style={{ marginTop: '2rem' }}>
              <Link to="/app/ambassador/deals">Go to your Deals →</Link>
            </p>
          ) : null}
        </div>
      </section>
    </>
  )
}

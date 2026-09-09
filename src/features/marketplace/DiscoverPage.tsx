import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { fetchMarketplaceCampaigns } from '@/features/marketplace/api'
import { CampaignCard } from '@/features/marketplace/CampaignCard'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta, SectionHeading } from '@/shared/ui/States'

export function DiscoverPage() {
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')

  const list = useQuery({
    queryKey: ['marketplace', 'discover', q],
    queryFn: ({ signal }) => fetchMarketplaceCampaigns({ q: q || undefined, per_page: 12 }, signal),
  })

  const countLabel = useMemo(() => {
    const total = list.data?.pagination?.total ?? list.data?.items.length ?? 0
    return `${total} opportunit${total === 1 ? 'y' : 'ies'}`
  }, [list.data])

  return (
    <>
      <PageMeta
        title="Discover campaigns"
        description="Browse public commission-based campaigns on MarcatursHub."
      />
      <section className="page-hero">
        <div className="container">
          <SectionHeading
            as="h1"
            eyebrow="Marketplace"
            title="Discover opportunities worth promoting."
          >
            Search public campaigns by product, category, or title. Sign in as an Ambassador to
            participate.
          </SectionHeading>
          <form
            className="row"
            onSubmit={(event) => {
              event.preventDefault()
              setQ(draft.trim())
            }}
          >
            <div className="field" style={{ flex: '1 1 240px' }}>
              <label htmlFor="discover-q">Search campaigns</label>
              <input
                id="discover-q"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Solar kits, delivery, training…"
              />
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
      <section className="section section--tight">
        <div className="container">
          {list.isLoading ? <LoadingState /> : null}
          {list.isError ? (
            <ErrorState title="Could not load campaigns">
              The marketplace API is unavailable right now.
            </ErrorState>
          ) : null}
          {list.data && list.data.items.length === 0 ? (
            <EmptyState title="No matching campaigns">Try another search term.</EmptyState>
          ) : null}
          {list.data && list.data.items.length > 0 ? (
            <div className="grid-3">
              {list.data.items.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </>
  )
}

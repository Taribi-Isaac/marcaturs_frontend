import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CampaignCard } from '@/features/marketplace/CampaignCard'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  CAMPAIGN_BOOKMARKS_QUERY_KEY,
  bookmarkActionError,
  fetchCampaignBookmarks,
  removeCampaignBookmark,
} from './api'
import { isDiscoverableBookmark, type CampaignBookmark } from './types'

const PAGE_SIZE = 12

export function SavedCampaignsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const list = useQuery({
    queryKey: [...CAMPAIGN_BOOKMARKS_QUERY_KEY, 'list', page],
    queryFn: ({ signal }) => fetchCampaignBookmarks({ page, per_page: PAGE_SIZE }, signal),
  })

  const remove = useMutation({
    mutationFn: (campaignId: number) => removeCampaignBookmark(campaignId),
    onMutate: () => {
      setActionError(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      setFeedback('Removed from saved campaigns.')
      await queryClient.invalidateQueries({ queryKey: CAMPAIGN_BOOKMARKS_QUERY_KEY })
    },
    onError: (error) => {
      setActionError(bookmarkActionError(error, 'remove'))
    },
  })

  const lastPage = list.data?.pagination?.last_page ?? 1

  return (
    <>
      <PageMeta title="Saved campaigns" description="Campaigns you saved on MarcatursHub." />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Saved campaigns</h1>
            <p>Campaigns you saved, newest first.</p>
          </div>
        </header>

        {list.isLoading ? <LoadingState label="Loading saved campaigns…" /> : null}
        {list.isError ? (
          <ErrorState title="Could not load saved campaigns">
            The saved campaigns list is unavailable right now.
          </ErrorState>
        ) : null}
        {feedback ? (
          <p className="form-section__lead" role="status">
            {feedback}
          </p>
        ) : null}
        {actionError ? (
          <p className="field-error" role="alert">
            {actionError}
          </p>
        ) : null}
        {list.data && list.data.items.length === 0 ? (
          <EmptyState title="You have not saved any campaigns." />
        ) : null}
        {list.data && list.data.items.length > 0 ? (
          <div className="grid-3">
            {list.data.items.map((bookmark) => (
              <SavedCampaignItem
                key={bookmark.campaign.id}
                bookmark={bookmark}
                pending={remove.isPending && remove.variables === bookmark.campaign.id}
                onRemove={() => remove.mutate(bookmark.campaign.id)}
              />
            ))}
          </div>
        ) : null}
        {list.isSuccess && lastPage > 1 ? (
          <div className="action-bar" style={{ marginTop: '1.5rem' }}>
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1 || list.isFetching}
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
              disabled={page >= lastPage || list.isFetching}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}

function SavedCampaignItem({
  bookmark,
  pending,
  onRemove,
}: {
  bookmark: CampaignBookmark
  pending: boolean
  onRemove: () => void
}) {
  const title = bookmark.campaign.title

  if (isDiscoverableBookmark(bookmark)) {
    return (
      <div className="stack stack--sm">
        <CampaignCard campaign={bookmark.campaign} />
        <Button
          type="button"
          variant="secondary"
          aria-label={`Remove ${title} from saved campaigns`}
          disabled={pending}
          onClick={onRemove}
        >
          {pending ? 'Removing…' : 'Remove'}
        </Button>
      </div>
    )
  }

  return (
    <article className="card stack stack--sm">
      <h2>{title}</h2>
      <p className="campaign-row__meta">Status: {bookmark.campaign.status.replaceAll('_', ' ')}</p>
      <p>No longer available.</p>
      <Button
        type="button"
        variant="secondary"
        aria-label={`Remove ${title} from saved campaigns`}
        disabled={pending}
        onClick={onRemove}
      >
        {pending ? 'Removing…' : 'Remove'}
      </Button>
    </article>
  )
}

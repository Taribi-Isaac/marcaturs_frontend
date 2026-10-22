import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import {
  CAMPAIGN_BOOKMARKS_QUERY_KEY,
  bookmarkActionError,
  campaignIsBookmarked,
  removeCampaignBookmark,
  saveCampaignBookmark,
} from './api'

export function CampaignBookmarkControl({
  campaignId,
  title,
}: {
  campaignId: number
  title: string
}) {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lookup = useQuery({
    queryKey: [...CAMPAIGN_BOOKMARKS_QUERY_KEY, 'contains', campaignId],
    queryFn: ({ signal }) => campaignIsBookmarked(campaignId, signal),
  })

  const save = useMutation({
    mutationFn: () => saveCampaignBookmark(campaignId),
    onMutate: () => {
      setError(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      setFeedback('Campaign saved.')
      await queryClient.invalidateQueries({ queryKey: CAMPAIGN_BOOKMARKS_QUERY_KEY })
    },
    onError: (mutationError) => {
      setError(bookmarkActionError(mutationError, 'save'))
    },
  })

  const remove = useMutation({
    mutationFn: () => removeCampaignBookmark(campaignId),
    onMutate: () => {
      setError(null)
      setFeedback(null)
    },
    onSuccess: async () => {
      setFeedback('Removed from saved campaigns.')
      await queryClient.invalidateQueries({ queryKey: CAMPAIGN_BOOKMARKS_QUERY_KEY })
    },
    onError: (mutationError) => {
      setError(bookmarkActionError(mutationError, 'remove'))
    },
  })

  if (lookup.isError) {
    return (
      <p className="field-error" role="alert">
        Could not check whether this campaign is saved.
      </p>
    )
  }

  const pending = lookup.isLoading || save.isPending || remove.isPending
  const bookmarked = lookup.data === true

  return (
    <div className="stack stack--sm">
      {bookmarked ? <p className="form-section__lead">Saved</p> : null}
      {bookmarked ? (
        <Button
          type="button"
          variant="secondary"
          aria-pressed={true}
          aria-label={`Remove ${title} from saved campaigns`}
          disabled={pending}
          onClick={() => remove.mutate()}
        >
          {remove.isPending ? 'Removing…' : 'Remove'}
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          aria-pressed={false}
          disabled={pending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save campaign'}
        </Button>
      )}
      {feedback ? (
        <p className="form-section__lead" role="status">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

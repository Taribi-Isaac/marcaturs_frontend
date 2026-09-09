import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { ErrorState, LoadingState } from '@/shared/ui/States'
import {
  createMarketingResource,
  deleteMarketingResource,
  fetchMarketingResources,
  marketingResourceDownloadUrl,
} from './api'
import { businessCampaignKeys } from './queryKeys'
import type { MarketingResourceType } from './types'

export function CampaignResourcesPanel({ campaignId }: { campaignId: number }) {
  const queryClient = useQueryClient()
  const [type, setType] = useState<MarketingResourceType>('image')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resources = useQuery({
    queryKey: businessCampaignKeys.resources(campaignId),
    queryFn: ({ signal }) => fetchMarketingResources(campaignId, signal),
  })

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a file')
      return createMarketingResource(campaignId, {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        file,
      })
    },
    onSuccess: async () => {
      setError(null)
      setTitle('')
      setDescription('')
      setFile(null)
      await queryClient.invalidateQueries({
        queryKey: businessCampaignKeys.resources(campaignId),
      })
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Upload failed.')
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => deleteMarketingResource(campaignId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: businessCampaignKeys.resources(campaignId),
      })
    },
    onError: (err) => {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed.')
    },
  })

  return (
    <div className="card stack">
      <h2 style={{ fontSize: '1.15rem' }}>Marketing resources</h2>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        Private assets for ambassadors. Uploads are authenticated; storage paths are not exposed.
      </p>

      {resources.isLoading ? <LoadingState label="Loading resources…" /> : null}
      {resources.isError ? <ErrorState title="Could not load resources" /> : null}

      {resources.data && resources.data.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>No resources yet.</p>
      ) : null}

      {resources.data && resources.data.length > 0 ? (
        <ul className="stack stack--sm" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {resources.data.map((item) => (
            <li
              key={item.id}
              className="row"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <strong>{item.title}</strong>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  {item.type} · {item.original_filename ?? item.mime_type}
                </p>
              </div>
              <div className="row">
                <a
                  className="btn btn--secondary btn--sm"
                  href={marketingResourceDownloadUrl(campaignId, item.id)}
                >
                  Download
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!window.confirm('Delete this resource?')) return
                    remove.mutate(item.id)
                  }}
                  disabled={remove.isPending}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) {
            setError('Title is required.')
            return
          }
          if (!file) {
            setError('Choose a file.')
            return
          }
          upload.mutate()
        }}
      >
        <div className="grid-2">
          <div className="field">
            <label htmlFor="resource-type">Type</label>
            <select
              id="resource-type"
              value={type}
              onChange={(e) => setType(e.target.value as MarketingResourceType)}
            >
              <option value="image">Image</option>
              <option value="flyer">Flyer</option>
              <option value="video">Video</option>
              <option value="brochure">Brochure</option>
              <option value="document">Document</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="resource-title">Title</label>
            <input id="resource-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="resource-description">Description (optional)</label>
          <input
            id="resource-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="resource-file">File</label>
          <input
            id="resource-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? 'Uploading…' : 'Upload resource'}
        </Button>
      </form>
      {error ? (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}

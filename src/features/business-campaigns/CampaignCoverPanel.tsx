import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import {
  CAMPAIGN_COVER_ACCEPT,
  CAMPAIGN_COVER_FORMAT_HINT,
  CAMPAIGN_COVER_MAX_KB_HINT,
  coverImageSrc,
  type CampaignCoverImage,
} from '@/features/marketplace/cover'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { deleteCampaignCover, uploadCampaignCover } from './api'
import { businessCampaignKeys } from './queryKeys'

type Props = {
  campaignId: number
  title: string
  cover: CampaignCoverImage | null | undefined
  /** When false, mutation controls are disabled (account/session restrictions). */
  canMutate?: boolean
}

export function CampaignCoverPanel({ campaignId, title, cover, canMutate = true }: Props) {
  const queryClient = useQueryClient()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const available = Boolean(cover?.available && cover.url)
  const previewSrc = localPreview || (available ? coverImageSrc(cover?.url) : null)

  async function refreshCampaign() {
    await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.detail(campaignId) })
    await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.list() })
  }

  const upload = useMutation({
    mutationFn: (file: File) => uploadCampaignCover(campaignId, file),
    onSuccess: async () => {
      setError(null)
      setOk(available ? 'Cover replaced.' : 'Cover uploaded.')
      setLocalPreview(null)
      if (inputRef.current) inputRef.current.value = ''
      await refreshCampaign()
    },
    onError: (err) => {
      setOk(null)
      setLocalPreview(null)
      if (err instanceof ApiClientError) {
        if (err.status === 403) {
          setError('You do not have permission to change this cover.')
          return
        }
        if (err.status === 429) {
          setError('Upload is temporarily limited. Wait a moment and try again.')
          return
        }
        if (err.status === 422 || err.status === 400) {
          setError(
            err.message || 'That file was rejected. Use JPEG, PNG, or WebP within the size limit.',
          )
          return
        }
        setError(err.message)
        return
      }
      setError('Cover upload failed.')
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteCampaignCover(campaignId),
    onSuccess: async () => {
      setError(null)
      setOk('Cover removed.')
      setLocalPreview(null)
      await refreshCampaign()
    },
    onError: (err) => {
      setOk(null)
      if (err instanceof ApiClientError) {
        if (err.status === 404) {
          setError('No cover to remove. Refreshing…')
          void refreshCampaign()
          return
        }
        setError(err.message)
        return
      }
      setError('Could not remove cover.')
    },
  })

  function onFileChosen(file: File | undefined) {
    setError(null)
    setOk(null)
    if (!file) return

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setError(`Unsupported file. Use ${CAMPAIGN_COVER_FORMAT_HINT}.`)
      return
    }
    if (file.size > CAMPAIGN_COVER_MAX_KB_HINT * 1024) {
      setError(`File looks larger than ${CAMPAIGN_COVER_MAX_KB_HINT} KB. Choose a smaller image.`)
      return
    }

    if (available && !window.confirm('Replace the current Campaign Cover?')) {
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    upload.mutate(file, {
      onSettled: () => {
        URL.revokeObjectURL(objectUrl)
      },
    })
  }

  const busy = upload.isPending || remove.isPending

  return (
    <section className="card stack campaign-cover-panel" aria-labelledby={`${inputId}-heading`}>
      <div>
        <h2 id={`${inputId}-heading`} style={{ fontSize: '1.15rem' }}>
          Campaign Cover
        </h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
          Primary marketplace image for this campaign. Separate from marketing resources and
          commercial versions — changing the cover does not create a new version.
        </p>
      </div>

      <div className="campaign-cover-panel__preview">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt={`Cover preview for ${title}`}
            className="campaign-cover-panel__img"
          />
        ) : (
          <div className="campaign-cover__fallback campaign-cover__fallback--panel" aria-hidden>
            <span className="campaign-cover__fallback-kicker">No cover yet</span>
            <span className="campaign-cover__fallback-title">{title}</span>
          </div>
        )}
      </div>

      <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
        {CAMPAIGN_COVER_FORMAT_HINT}. Max about {CAMPAIGN_COVER_MAX_KB_HINT} KB (server enforces the
        limit).
      </p>

      {ok ? (
        <p role="status" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>
          {ok}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field__error">
          {error}
        </p>
      ) : null}

      <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={CAMPAIGN_COVER_ACCEPT}
          className="visually-hidden"
          aria-label={available ? 'Choose replacement cover image' : 'Choose cover image'}
          disabled={!canMutate || busy}
          onChange={(event) => {
            onFileChosen(event.target.files?.[0])
          }}
        />
        <Button
          type="button"
          disabled={!canMutate || busy}
          aria-controls={inputId}
          onClick={() => inputRef.current?.click()}
        >
          {upload.isPending ? 'Uploading…' : available ? 'Replace cover' : 'Upload cover'}
        </Button>
        {available ? (
          <Button
            type="button"
            variant="ghost"
            disabled={!canMutate || busy}
            onClick={() => {
              if (!window.confirm('Remove this Campaign Cover? Marketing resources stay intact.')) {
                return
              }
              remove.mutate()
            }}
          >
            {remove.isPending ? 'Removing…' : 'Remove cover'}
          </Button>
        ) : null}
      </div>

      {!canMutate ? (
        <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
          Cover changes are unavailable for this account state.
        </p>
      ) : null}
    </section>
  )
}

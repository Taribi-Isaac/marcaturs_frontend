import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/authContext'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import {
  createCampaignVersion,
  fetchBusinessCampaign,
  fetchCampaignVersions,
  fetchCategories,
  updateCampaign,
} from './api'
import { CampaignCommercialAddOns } from './CampaignCommercialAddOns'
import { CampaignCoverPanel } from './CampaignCoverPanel'
import { CampaignLifecycleActions } from './CampaignLifecycleActions'
import { CampaignResourcesPanel } from './CampaignResourcesPanel'
import { CampaignStatusPanel } from './CampaignStatusBadge'
import { CampaignVersionEditor } from './CampaignVersionEditor'
import { fieldErrorsFromApi, formatDateTime } from './format'
import { businessCampaignKeys } from './queryKeys'
import { canEditCampaignShell, canMutateVersions, versionStatusLabel } from './status'

const shellSchema = z.object({
  title: z.string().trim().min(1).max(255),
  category_id: z.coerce.number().int().positive(),
})

type ShellValues = z.infer<typeof shellSchema>

export function BusinessCampaignDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const queryClient = useQueryClient()
  const { status: authStatus } = useAuth()
  const canMutateCover = authStatus === 'authenticated' || authStatus === 'restricted'
  const [tab, setTab] = useState<'overview' | 'version' | 'resources'>('overview')
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [shellError, setShellError] = useState<string | null>(null)
  const [shellOk, setShellOk] = useState<string | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)

  const campaignQuery = useQuery({
    queryKey: businessCampaignKeys.detail(id),
    queryFn: ({ signal }) => fetchBusinessCampaign(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const versionsQuery = useQuery({
    queryKey: businessCampaignKeys.versions(id),
    queryFn: ({ signal }) => fetchCampaignVersions(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const categoriesQuery = useQuery({
    queryKey: businessCampaignKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  })

  const campaign = campaignQuery.data
  const versions = useMemo(() => versionsQuery.data ?? [], [versionsQuery.data])

  const activeVersionNumber = useMemo(() => {
    if (selectedVersion != null) return selectedVersion
    const draft = versions.find((v) => v.status === 'draft')
    if (draft) return draft.version_number
    if (campaign?.current_version) return campaign.current_version.version_number
    return versions[versions.length - 1]?.version_number ?? null
  }, [selectedVersion, versions, campaign])

  const activeVersion = versions.find((v) => v.version_number === activeVersionNumber) ?? null
  const hasDraft = versions.some((v) => v.status === 'draft')

  const shellForm = useForm<ShellValues>({
    resolver: zodResolver(shellSchema),
    values: campaign
      ? { title: campaign.title, category_id: campaign.category?.id ?? 0 }
      : undefined,
  })

  const saveShell = useMutation({
    mutationFn: (values: ShellValues) => updateCampaign(id, values),
    onSuccess: async () => {
      setShellError(null)
      setShellOk('Campaign details updated.')
      await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.all })
    },
    onError: (err) => {
      setShellOk(null)
      if (err instanceof ApiClientError) {
        setShellError(err.message)
        const fields = fieldErrorsFromApi(err)
        for (const [key, message] of Object.entries(fields)) {
          if (key === 'title' || key === 'category_id') shellForm.setError(key, { message })
        }
        if (err.status === 409)
          void queryClient.invalidateQueries({ queryKey: businessCampaignKeys.detail(id) })
      } else {
        setShellError('Update failed.')
      }
    },
  })

  const createVersion = useMutation({
    mutationFn: () => createCampaignVersion(id, { product_name: campaign?.title }),
    onSuccess: async (version) => {
      setVersionError(null)
      setSelectedVersion(version.version_number)
      setTab('version')
      await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.versions(id) })
      await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.detail(id) })
    },
    onError: (err) => {
      setVersionError(err instanceof ApiClientError ? err.message : 'Could not create version.')
      if (err instanceof ApiClientError && err.status === 409) {
        void queryClient.invalidateQueries({ queryKey: businessCampaignKeys.versions(id) })
      }
    },
  })

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState title="Campaign not found" />
  }

  if (campaignQuery.isLoading) return <LoadingState label="Loading campaign…" />

  if (campaignQuery.isError || !campaign) {
    const status = campaignQuery.error instanceof ApiClientError ? campaignQuery.error.status : 0
    if (status === 404) {
      return (
        <ErrorState title="Campaign not found">
          This campaign does not exist or you do not own it.
        </ErrorState>
      )
    }
    if (status === 403) {
      return <ErrorState title="Access denied">You cannot manage this campaign.</ErrorState>
    }
    return <ErrorState title="Campaign unavailable">Try refreshing the page.</ErrorState>
  }

  const editableShell = canEditCampaignShell(campaign.status)
  const versionsAllowed = canMutateVersions(campaign.status)
  const versionReadOnly = !activeVersion || activeVersion.status === 'published' || !versionsAllowed

  return (
    <>
      <PageMeta
        title={campaign.title}
        description="Manage campaign lifecycle and commercial terms."
      />
      <div className="desk-page reveal">
        <p>
          <Link to="/app/business/campaigns">← Campaigns</Link>
        </p>

        <header className="desk-header">
          <div>
            <h1>{campaign.title}</h1>
            <p>
              {campaign.category?.name ?? 'Uncategorised'} · Updated{' '}
              {formatDateTime(campaign.updated_at)}
            </p>
          </div>
        </header>

        <div className="campaign-desk-grid">
          <div className="stack stack--lg">
            <div className="tabs" role="tablist" aria-label="Campaign sections">
              {(
                [
                  ['overview', 'Overview'],
                  ['version', 'Commercial version'],
                  ['resources', 'Resources'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'overview' ? (
              <div className="stack stack--lg">
                <CampaignCoverPanel
                  campaignId={id}
                  title={campaign.title}
                  cover={campaign.cover_image}
                  canMutate={canMutateCover}
                />
                <form
                  className="card stack"
                  onSubmit={shellForm.handleSubmit((values) => {
                    setShellOk(null)
                    setShellError(null)
                    saveShell.mutate(values)
                  })}
                >
                  <h2 style={{ fontSize: '1.15rem' }}>Campaign identity</h2>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                    Listing identity only. Commercial contract lives on the campaign version.
                  </p>
                  <div className="field">
                    <label htmlFor="shell-title">Title</label>
                    <input
                      id="shell-title"
                      disabled={!editableShell || saveShell.isPending}
                      {...shellForm.register('title')}
                    />
                    {shellForm.formState.errors.title ? (
                      <p className="field__error">{shellForm.formState.errors.title.message}</p>
                    ) : null}
                  </div>
                  <div className="field">
                    <label htmlFor="shell-category">Category</label>
                    <select
                      id="shell-category"
                      disabled={!editableShell || saveShell.isPending}
                      {...shellForm.register('category_id')}
                    >
                      <option value={0}>Select</option>
                      {(categoriesQuery.data ?? [])
                        .filter(
                          (c) => c.listing_status === 'allowed' || c.id === campaign.category?.id,
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {editableShell ? (
                    <Button type="submit" disabled={saveShell.isPending}>
                      {saveShell.isPending ? 'Saving…' : 'Save identity'}
                    </Button>
                  ) : (
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      Identity can only be edited while the campaign is in draft.
                    </p>
                  )}
                  {shellError ? (
                    <div className="alert alert--danger" role="alert">
                      {shellError}
                    </div>
                  ) : null}
                  {shellOk ? (
                    <div className="alert alert--success" role="status">
                      {shellOk}
                    </div>
                  ) : null}
                </form>

                <div className="card stack">
                  <h2 style={{ fontSize: '1.15rem' }}>Listing window</h2>
                  <p>
                    Starts: <strong>{formatDateTime(campaign.listing_starts_at)}</strong>
                  </p>
                  <p>
                    Expires: <strong>{formatDateTime(campaign.listing_expires_at)}</strong>
                  </p>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                    Listing dates are set when MarcatursHub activates an approved campaign.
                  </p>
                </div>
              </div>
            ) : null}

            {tab === 'version' ? (
              <div className="stack stack--lg">
                <div className="card stack">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.15rem' }}>Versions</h2>
                    {versionsAllowed && !hasDraft ? (
                      <Button
                        size="sm"
                        onClick={() => createVersion.mutate()}
                        disabled={createVersion.isPending}
                      >
                        {createVersion.isPending ? 'Creating…' : 'New draft version'}
                      </Button>
                    ) : null}
                  </div>
                  <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                    Campaign → Version → Published terms. Deals later snapshot the published version
                    in force at Deal creation. Only one draft version is allowed at a time.
                  </p>
                  {versionsQuery.isLoading ? <LoadingState label="Loading versions…" /> : null}
                  {versions.length === 0 ? (
                    <div className="stack">
                      <p>No commercial versions yet.</p>
                      {versionsAllowed ? (
                        <Button
                          onClick={() => createVersion.mutate()}
                          disabled={createVersion.isPending}
                        >
                          Create draft version
                        </Button>
                      ) : (
                        <p style={{ color: 'var(--color-muted)' }}>
                          Versions cannot be created while this campaign is {campaign.status}.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="stack stack--sm">
                      {versions.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="card"
                          style={{
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderColor:
                              v.version_number === activeVersionNumber
                                ? 'var(--color-primary)'
                                : undefined,
                          }}
                          onClick={() => setSelectedVersion(v.version_number)}
                        >
                          <strong>
                            Version {v.version_number} · {versionStatusLabel(v.status)}
                          </strong>
                          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                            {v.product_name || 'Untitled product'}
                            {v.published_at ? ` · Published ${formatDateTime(v.published_at)}` : ''}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                  {versionError ? (
                    <div className="alert alert--danger" role="alert">
                      {versionError}
                    </div>
                  ) : null}
                </div>

                {activeVersion ? (
                  <div className="card">
                    <CampaignVersionEditor
                      campaignId={id}
                      version={activeVersion}
                      readOnly={versionReadOnly}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === 'resources' ? <CampaignResourcesPanel campaignId={id} /> : null}
          </div>

          <aside className="detail-aside">
            <CampaignStatusPanel status={campaign.status} reviewReason={campaign.review_reason} />
            <CampaignLifecycleActions campaign={campaign} />
            <CampaignCommercialAddOns campaign={campaign} />
            <div className="card stack stack--sm">
              <h2 style={{ fontSize: '1.05rem' }}>Current published version</h2>
              {campaign.current_version ? (
                <p>
                  Version {campaign.current_version.version_number} (
                  {versionStatusLabel(campaign.current_version.status)})
                </p>
              ) : (
                <p style={{ color: 'var(--color-muted)' }}>None yet</p>
              )}
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                Version published ≠ campaign active.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

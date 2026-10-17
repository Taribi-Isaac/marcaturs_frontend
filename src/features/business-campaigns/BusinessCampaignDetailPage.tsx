import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
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
import { CampaignSetupChecklist } from './CampaignSetupChecklist'
import { CampaignStatusPanel } from './CampaignStatusBadge'
import { CampaignVersionEditor } from './CampaignVersionEditor'
import { categoryErrorFromApi, fieldErrorsFromApi, formatDateTime } from './format'
import { businessCampaignKeys } from './queryKeys'
import { canEditCampaignShell, canMutateVersions, versionStatusLabel } from './status'

const shellSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  category_id: z.coerce.number().int().positive('Choose a category'),
})

type ShellValues = z.infer<typeof shellSchema>
type DetailTab = 'overview' | 'version' | 'resources'

const UNSAVED_VERSION_WARNING =
  'You have unsaved changes to this draft version. Leave without saving? Your changes will be lost.'

export function BusinessCampaignDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const queryClient = useQueryClient()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const justCreated = Boolean((location.state as { created?: boolean } | null)?.created)
  const { status: authStatus } = useAuth()
  const canMutateCover = authStatus === 'authenticated' || authStatus === 'restricted'
  const [tab, setTab] = useState<DetailTab>(() =>
    searchParams.get('tab') === 'version' ? 'version' : 'overview',
  )
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [shellError, setShellError] = useState<string | null>(null)
  const [shellOk, setShellOk] = useState<string | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [versionDirty, setVersionDirty] = useState(false)

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

  const confirmLeaveDirtyVersion = () => !versionDirty || window.confirm(UNSAVED_VERSION_WARNING)

  const openTab = (next: DetailTab) => {
    if (next === tab) return
    if (tab === 'version' && !confirmLeaveDirtyVersion()) return
    setTab(next)
  }

  const selectVersion = (versionNumber: number) => {
    if (versionNumber === activeVersionNumber) return
    if (!confirmLeaveDirtyVersion()) return
    setSelectedVersion(versionNumber)
  }

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
        const fields = fieldErrorsFromApi(err)
        const categoryMessage = categoryErrorFromApi(err)
        if (categoryMessage) fields.category_id = categoryMessage
        let mapped = 0
        for (const [key, message] of Object.entries(fields)) {
          if (key === 'title' || key === 'category_id') {
            shellForm.setError(key, { message })
            mapped += 1
          }
        }
        setShellError(mapped > 0 ? null : err.message)
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
          <Link
            to="/app/business/campaigns"
            onClick={(event) => {
              if (!confirmLeaveDirtyVersion()) event.preventDefault()
            }}
          >
            ← Campaigns
          </Link>
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

        {justCreated ? (
          <div className="alert alert--success" role="status">
            Campaign draft created. Next, create a draft commercial version with pricing, commission
            and official payment details.
          </div>
        ) : null}

        <div className="campaign-desk-grid">
          <div className="stack stack--lg">
            <CampaignSetupChecklist campaign={campaign} versions={versions} onOpenTab={openTab} />
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
                  onClick={() => openTab(key)}
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
                  <div
                    className={`field${shellForm.formState.errors.title ? ' field--invalid' : ''}`}
                  >
                    <label htmlFor="shell-title">Title</label>
                    <input
                      id="shell-title"
                      disabled={!editableShell || saveShell.isPending}
                      aria-invalid={shellForm.formState.errors.title ? true : undefined}
                      aria-describedby={
                        shellForm.formState.errors.title ? 'shell-title-error' : undefined
                      }
                      {...shellForm.register('title')}
                    />
                    {shellForm.formState.errors.title ? (
                      <p id="shell-title-error" className="field__error">
                        {shellForm.formState.errors.title.message}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className={`field${shellForm.formState.errors.category_id ? ' field--invalid' : ''}`}
                  >
                    <label htmlFor="shell-category">Category</label>
                    <select
                      id="shell-category"
                      disabled={!editableShell || saveShell.isPending}
                      aria-invalid={shellForm.formState.errors.category_id ? true : undefined}
                      aria-describedby={
                        shellForm.formState.errors.category_id ? 'shell-category-error' : undefined
                      }
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
                    {shellForm.formState.errors.category_id ? (
                      <p id="shell-category-error" className="field__error">
                        {shellForm.formState.errors.category_id.message}
                      </p>
                    ) : null}
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
                      <p>
                        No commercial versions yet. Create a draft version to add pricing,
                        commission and official payment details. You can save it and come back at
                        any time.
                      </p>
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
                          onClick={() => selectVersion(v.version_number)}
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
                      onDirtyChange={setVersionDirty}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === 'resources' ? <CampaignResourcesPanel campaignId={id} /> : null}
          </div>

          <aside className="detail-aside">
            <CampaignStatusPanel status={campaign.status} reviewReason={campaign.review_reason} />
            <div id="campaign-lifecycle">
              <CampaignLifecycleActions campaign={campaign} />
            </div>
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

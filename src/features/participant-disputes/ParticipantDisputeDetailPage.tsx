import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import type { UserRole } from '@/shared/types/auth'
import { fetchBusinessDeal } from '@/features/business-deals/api'
import { fetchDeal } from '@/features/ambassador-deals/api'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { dealStatusBadgeClass, dealStatusLabel } from '@/features/ambassador-deals/status'
import { ApiClientError } from '@/shared/api/errors'
import { ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { disputeAttachmentDownloadUrl, fetchDispute } from './api'
import { DisputeAttachmentForm } from './DisputeAttachmentForm'
import { disputeKeys } from './queryKeys'
import {
  canUploadParticipantAttachment,
  counterpartyLabel,
  disputeAttention,
  disputeEventLabel,
  disputeStatusBadgeClass,
  disputeStatusLabel,
} from './status'

export function ParticipantDisputeDetailPage({ role }: { role: UserRole }) {
  const params = useParams()
  const id = Number(params.id)

  const disputeQuery = useQuery({
    queryKey: disputeKeys.detail(id),
    queryFn: ({ signal }) => fetchDispute(id, signal),
    enabled: Number.isFinite(id) && id > 0,
  })

  const relatedDealId = disputeQuery.data?.deal_id
  const dealQuery = useQuery({
    queryKey: [role === 'BUSINESS' ? 'business-deals' : 'deals', 'detail', relatedDealId],
    queryFn: ({ signal }) =>
      role === 'BUSINESS'
        ? fetchBusinessDeal(relatedDealId!, signal)
        : fetchDeal(relatedDealId!, signal),
    enabled: Boolean(relatedDealId),
    retry: false,
  })

  if (!Number.isFinite(id) || id <= 0) {
    return <ErrorState title="Dispute not found" />
  }
  if (disputeQuery.isLoading) return <LoadingState label="Loading dispute…" />
  if (disputeQuery.isError || !disputeQuery.data) {
    const status = disputeQuery.error instanceof ApiClientError ? disputeQuery.error.status : 0
    return (
      <ErrorState title={status === 404 ? 'Dispute not found' : 'Could not load dispute'}>
        This dispute may not be available to your account.
      </ErrorState>
    )
  }

  const dispute = disputeQuery.data
  const attention = disputeAttention(dispute.status, role)
  const deal = dealQuery.data ?? null
  const dealPath = `/${role === 'BUSINESS' ? 'app/business' : 'app/ambassador'}/deals/${dispute.deal_id}`

  return (
    <>
      <PageMeta
        title={dispute.reference}
        description={`Dispute ${dispute.reference} on Deal #${dispute.deal_id}.`}
      />
      <div className="desk-page reveal">
        <p>
          <Link to={`/${role === 'BUSINESS' ? 'app/business' : 'app/ambassador'}/disputes`}>
            ← Disputes
          </Link>
        </p>

        <header className="desk-header">
          <div>
            <div className="row" style={{ marginBottom: '0.75rem' }}>
              <span className={disputeStatusBadgeClass(dispute.status)}>
                {disputeStatusLabel(dispute.status)}
              </span>
            </div>
            <h1>{dispute.reference}</h1>
            <p>
              Dispute #{dispute.id} · Opened {formatDateTime(dispute.created_at)} · Updated{' '}
              {formatDateTime(dispute.updated_at)}
            </p>
          </div>
        </header>

        <div className={`card next-action-card attention-row attention-row--${attention.tone}`}>
          <p className="eyebrow">Case status</p>
          <h2>{attention.title}</h2>
          <p>{attention.body}</p>
        </div>

        <div className="campaign-desk-grid">
          <div className="stack stack--lg">
            <section className="card stack">
              <h2>Dispute information</h2>
              <dl className="snapshot-grid">
                <div>
                  <dt>Category</dt>
                  <dd>{dispute.category?.name || 'General dispute'}</dd>
                </div>
                <div>
                  <dt>Counterparty</dt>
                  <dd>{counterpartyLabel(dispute, role)}</dd>
                </div>
              </dl>
              <div className="prose-block">
                <h3>Description</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{dispute.description}</p>
              </div>
              {dispute.decision_notes ? (
                <div className="prose-block">
                  <h3>Resolution notes</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{dispute.decision_notes}</p>
                </div>
              ) : null}
              {dispute.action_notes ? (
                <div className="prose-block">
                  <h3>Outcome notes</h3>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{dispute.action_notes}</p>
                </div>
              ) : null}
            </section>

            <section className="card stack">
              <h2>Case timeline</h2>
              {dispute.events?.length ? (
                <ol className="case-timeline">
                  {dispute.events.map((event) => (
                    <li key={event.id} className="case-timeline__item">
                      <div className="case-timeline__top">
                        <strong>{disputeEventLabel(event.type)}</strong>
                        <span className="campaign-row__meta">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>
                      <p className="campaign-row__meta">
                        Status {event.previous_status || '—'} → {event.new_status}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="campaign-row__meta">No participant-visible timeline entries yet.</p>
              )}
            </section>

            <section className="card stack">
              <h2>Attachments</h2>
              <p className="form-section__lead">
                Private supporting files for this case. No storage paths or public URLs are exposed.
              </p>
              {dispute.attachments?.length ? (
                <ul className="evidence-list">
                  {dispute.attachments.map((attachment) => (
                    <li key={attachment.id} className="evidence-item">
                      <div className="evidence-item__top">
                        <strong>
                          {attachment.original_filename || `Attachment #${attachment.id}`}
                        </strong>
                        <span className="badge badge--neutral">Attachment</span>
                      </div>
                      <p className="campaign-row__meta">
                        {attachment.mime_type || 'File'}
                        {attachment.size_bytes
                          ? ` · ${Math.ceil(attachment.size_bytes / 1024)} KB`
                          : ''}
                        {' · '}Uploaded {formatDateTime(attachment.created_at)}
                      </p>
                      {attachment.note ? (
                        <p style={{ whiteSpace: 'pre-wrap' }}>{attachment.note}</p>
                      ) : null}
                      {attachment.has_file ? (
                        <a
                          className="btn btn--secondary btn--sm"
                          href={disputeAttachmentDownloadUrl(dispute.id, attachment.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download attachment
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="campaign-row__meta">No attachments have been uploaded yet.</p>
              )}
            </section>

            {canUploadParticipantAttachment(dispute) ? (
              <DisputeAttachmentForm disputeId={dispute.id} />
            ) : (
              <section className="card stack">
                <h2>Supporting files</h2>
                <p className="form-section__lead">
                  Participant attachment upload is not available in this dispute state.
                </p>
              </section>
            )}
          </div>

          <aside className="detail-aside">
            <section className="card stack">
              <h3>Related Deal</h3>
              <p className="campaign-row__meta">Deal #{dispute.deal_id}</p>
              {deal ? (
                <>
                  <strong>{deal.product_name || deal.campaign.title}</strong>
                  <p className="campaign-row__meta">{deal.campaign.title}</p>
                  <div className="row">
                    <span className={dealStatusBadgeClass(deal.status)}>
                      {dealStatusLabel(deal.status)}
                    </span>
                    {deal.commission ? (
                      <span
                        className={
                          deal.commission.is_overdue
                            ? 'badge badge--danger'
                            : 'badge badge--warning'
                        }
                      >
                        {deal.commission.is_overdue
                          ? 'Commission overdue'
                          : `Commission ${deal.commission.status}`}
                      </span>
                    ) : null}
                  </div>
                  <p className="campaign-row__meta">Open disputes: {deal.open_dispute_count}</p>
                </>
              ) : dealQuery.isLoading ? (
                <LoadingState label="Loading Deal context…" />
              ) : (
                <p className="campaign-row__meta">Deal context unavailable.</p>
              )}
              <ButtonLink to={dealPath} variant="secondary" size="sm">
                Open Deal
              </ButtonLink>
            </section>

            <section className="card stack">
              <h3>Case model</h3>
              <p className="form-section__lead">
                A dispute is a separate operational case. It does not rename the Deal status or
                automatically reverse payment, commission, or settlement.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDateTime } from '@/features/ambassador-deals/format'
import { ApiClientError } from '@/shared/api/errors'
import type { UserRole } from '@/shared/types/auth'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { fetchVerificationStatus } from './api'
import { verificationKeys } from './queryKeys'
import {
  canResubmit,
  canSubmitNew,
  needsAttention,
  overallStatusBadgeClass,
  overallStatusExplanation,
  overallStatusLabel,
  requiredProgress,
  requirementTypeLabel,
  submissionStatusBadgeClass,
  submissionStatusLabel,
} from './status'
import type { VerificationRequirementItem } from './types'
import { VerificationSubmissionForm } from './VerificationSubmissionForm'

type ParticipantRole = Extract<UserRole, 'BUSINESS' | 'AMBASSADOR'>

function verificationErrorTitle(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return 'Could not load verification'
  }
  if (error.status === 403 && /restricted/i.test(error.message)) {
    return 'Account restricted'
  }
  if (error.status === 403) {
    return 'Verification unavailable'
  }
  if (error.status === 404) {
    return 'Verification not found'
  }
  return 'Could not load verification'
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function RequirementCard({ item }: { item: VerificationRequirementItem }) {
  const { requirement, submission } = item
  const attention = needsAttention(item)
  const showSubmit = canSubmitNew(item)
  const showResubmit = canResubmit(item)

  return (
    <article
      className={`verification-requirement${attention ? ' verification-requirement--attention' : ''}`}
      aria-labelledby={`verification-req-${requirement.id}`}
    >
      <div className="verification-requirement__header">
        <div>
          <h3 id={`verification-req-${requirement.id}`}>{requirement.name}</h3>
          <p className="verification-requirement__meta">
            {requirement.is_required ? 'Required' : 'Optional'}
            {' · '}
            {requirementTypeLabel(requirement.requirement_type)}
          </p>
        </div>
        <span
          className={
            submission ? submissionStatusBadgeClass(submission.status) : 'badge badge--neutral'
          }
        >
          {submission ? submissionStatusLabel(submission.status) : 'Not submitted'}
        </span>
      </div>

      {requirement.description ? (
        <p className="form-section__lead">{requirement.description}</p>
      ) : null}

      {submission?.status === 'approved' ? (
        <p className="verification-requirement__complete" role="status">
          This requirement is approved. No further action is needed.
          {submission.submitted_at ? ` Submitted ${formatDateTime(submission.submitted_at)}.` : ''}
        </p>
      ) : null}

      {submission && (submission.status === 'pending' || submission.status === 'under_review') ? (
        <p className="verification-requirement__waiting" role="status">
          {submissionStatusLabel(submission.status)}.
          {submission.submitted_at
            ? ` Last submitted ${formatDateTime(submission.submitted_at)}.`
            : ''}
        </p>
      ) : null}

      {submission &&
      (submission.status === 'rejected' || submission.status === 'more_information_required') ? (
        <div className="verification-requirement__reason" role="status">
          <p>
            <strong>
              {submission.status === 'rejected'
                ? 'This submission was rejected.'
                : 'More information is required.'}
            </strong>
          </p>
          {submission.review_reason ? (
            <p>{submission.review_reason}</p>
          ) : (
            <p>
              Update your response using the form below. Detailed reviewer notes are not shared with
              participants.
            </p>
          )}
        </div>
      ) : null}

      {submission?.text_value && submission.status !== 'approved' ? (
        <div className="verification-requirement__current">
          <p className="eyebrow">Current response</p>
          <p>{submission.text_value}</p>
        </div>
      ) : null}

      {submission?.evidence && submission.evidence.length > 0 ? (
        <div className="verification-requirement__evidence">
          <p className="eyebrow">Uploaded file</p>
          <ul>
            {submission.evidence.map((file) => (
              <li key={file.id}>
                {file.original_filename}
                <span className="campaign-row__meta">
                  {' '}
                  · {file.mime_type} · {formatFileSize(file.size_bytes)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showSubmit ? <VerificationSubmissionForm item={item} mode="submit" /> : null}
      {showResubmit ? <VerificationSubmissionForm item={item} mode="resubmit" /> : null}
    </article>
  )
}

export function ParticipantVerificationPage({ role }: { role: ParticipantRole }) {
  const statusQuery = useQuery({
    queryKey: verificationKeys.status(),
    queryFn: ({ signal }) => fetchVerificationStatus(signal),
  })

  const items = statusQuery.data?.requirements ?? []
  const overall = statusQuery.data?.overall_status
  const progress = requiredProgress(items)
  const attentionCount = items.filter((item) => needsAttention(item)).length

  return (
    <>
      <PageMeta
        title="Verification"
        description="Submit and track account verification requirements."
      />
      <div className="desk-page reveal">
        <header className="desk-header">
          <div>
            <h1>Verification</h1>
            <p>
              Submit the checklist for your {role === 'BUSINESS' ? 'Business' : 'Ambassador'}{' '}
              account. This is separate from email verification.{' '}
              <Link to="/faq">Learn more</Link>
            </p>
          </div>
        </header>

        {statusQuery.isLoading ? <LoadingState label="Loading verification…" /> : null}

        {statusQuery.isError ? (
          <ErrorState title={verificationErrorTitle(statusQuery.error)}>
            <p>
              {statusQuery.error instanceof ApiClientError
                ? statusQuery.error.message
                : 'Verification could not be loaded right now.'}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void statusQuery.refetch()}
            >
              Retry
            </Button>
          </ErrorState>
        ) : null}

        {statusQuery.isSuccess && overall ? (
          <>
            <section
              className="card stack verification-overview"
              aria-labelledby="verification-overview"
            >
              <div className="verification-overview__top">
                <div>
                  <p className="eyebrow">Overall status</p>
                  <h2 id="verification-overview">{overallStatusLabel(overall)}</h2>
                </div>
                <span className={overallStatusBadgeClass(overall)}>
                  {overallStatusLabel(overall)}
                </span>
              </div>
              <p className="form-section__lead">
                {items.length === 0
                  ? 'Requirements are not configured for your role yet. This is not a rejection.'
                  : overallStatusExplanation(overall)}{' '}
                {items.length === 0 ? <Link to="/faq">Learn more</Link> : null}
              </p>
              {progress.total > 0 ? (
                <p className="verification-overview__progress" role="status">
                  Required progress: {progress.approved} of {progress.total} approved
                  {attentionCount > 0
                    ? ` · ${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention`
                    : ''}
                </p>
              ) : (
                <p className="verification-overview__progress" role="status">
                  {items.length === 0
                    ? 'No active verification checklist items are published for your role.'
                    : 'There are no active required verification items for your role right now.'}
                </p>
              )}
            </section>

            <section className="stack verification-list" aria-label="Verification requirements">
              <div>
                <h2>Requirements</h2>
                <p className="form-section__lead">
                  Items are shown in the order defined for your role. Optional requirements do not
                  block verified status.
                </p>
              </div>

              {items.length === 0 ? (
                <EmptyState title="No verification requirements configured">
                  There are no active verification requirements for your role right now. Account
                  email verification (Settings) is separate from this checklist. If you expected
                  items here, MarcatursHub operators still need to publish requirements for your
                  role.
                </EmptyState>
              ) : (
                <div className="verification-requirement-list">
                  {items.map((item) => (
                    <RequirementCard key={item.requirement.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </>
  )
}

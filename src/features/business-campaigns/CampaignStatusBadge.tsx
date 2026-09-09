import { getCampaignStatusInfo, type CampaignStatusInfo } from './status'
import type { CampaignStatus } from './types'

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const info = getCampaignStatusInfo(status)
  return <span className={info.badgeClass}>{info.label}</span>
}

export function CampaignStatusPanel({
  status,
  reviewReason,
}: {
  status: CampaignStatus
  reviewReason?: string | null
}) {
  const info: CampaignStatusInfo = getCampaignStatusInfo(status)
  return (
    <div className="card status-panel" aria-live="polite">
      <div className="status-panel__header">
        <CampaignStatusBadge status={status} />
        <strong>{info.label}</strong>
      </div>
      <p>{info.meaning}</p>
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        <strong style={{ color: 'var(--color-ink)' }}>Next: </strong>
        {info.next}
      </p>
      {reviewReason ? (
        <div className="alert alert--info" role="status">
          <strong>Review note: </strong>
          {reviewReason}
        </div>
      ) : null}
    </div>
  )
}

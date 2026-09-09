import type { CampaignStatus, VersionStatus } from './types'

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export type CampaignStatusInfo = {
  status: CampaignStatus
  label: string
  meaning: string
  next: string
  tone: StatusTone
  badgeClass: string
}

const map: Record<CampaignStatus, Omit<CampaignStatusInfo, 'status'>> = {
  draft: {
    label: 'Draft',
    meaning: 'This campaign is still being prepared. Only you can see it.',
    next: 'Add and publish commercial terms, then submit for review.',
    tone: 'neutral',
    badgeClass: 'badge badge--neutral',
  },
  submitted: {
    label: 'Submitted for review',
    meaning: 'Waiting for MarcatursHub review. Commercial terms are locked.',
    next: 'No editing while under review. Watch for approval or a request to revise.',
    tone: 'info',
    badgeClass: 'badge',
  },
  approved: {
    label: 'Approved',
    meaning: 'Review passed. Marketplace listing is not live until activation.',
    next: 'Waiting for MarcatursHub to activate the listing window.',
    tone: 'info',
    badgeClass: 'badge',
  },
  active: {
    label: 'Active',
    meaning: 'This campaign is live in the marketplace for ambassadors to discover.',
    next: 'You can deactivate the listing, manage resources, or purchase Featured / extension when eligible.',
    tone: 'success',
    badgeClass: 'badge badge--success',
  },
  expiring: {
    label: 'Expiring',
    meaning: 'The listing window is approaching its end.',
    next: 'Extend the listing with a platform fee package if you want to keep it live.',
    tone: 'warning',
    badgeClass: 'badge badge--warning',
  },
  expired: {
    label: 'Expired',
    meaning: 'The listing period has ended. The campaign is no longer publicly discoverable.',
    next: 'Purchase an extension package if you want to restore marketplace availability.',
    tone: 'neutral',
    badgeClass: 'badge badge--neutral',
  },
  deactivated: {
    label: 'Deactivated',
    meaning: 'You removed this campaign from the marketplace.',
    next: 'Reactivation is not available from this desk. Contact support if you need help.',
    tone: 'neutral',
    badgeClass: 'badge badge--neutral',
  },
  suspended: {
    label: 'Suspended',
    meaning: 'MarcatursHub suspended this campaign. Normal lifecycle actions are blocked.',
    next: 'Review any reason provided and wait for platform guidance.',
    tone: 'danger',
    badgeClass: 'badge badge--danger',
  },
  closed: {
    label: 'Closed',
    meaning: 'This campaign is permanently closed and read-only.',
    next: 'No further lifecycle actions are available.',
    tone: 'neutral',
    badgeClass: 'badge badge--neutral',
  },
}

export function getCampaignStatusInfo(status: CampaignStatus): CampaignStatusInfo {
  return { status, ...map[status] }
}

export function versionStatusLabel(status: VersionStatus): string {
  return status === 'published' ? 'Published' : 'Draft'
}

export function canEditCampaignShell(status: CampaignStatus): boolean {
  return status === 'draft'
}

export function canMutateVersions(status: CampaignStatus): boolean {
  return (
    status === 'draft' ||
    status === 'active' ||
    status === 'expiring' ||
    status === 'deactivated' ||
    status === 'expired'
  )
}

export function canSubmitCampaign(status: CampaignStatus): boolean {
  return status === 'draft'
}

export function canDeactivateCampaign(status: CampaignStatus): boolean {
  return status === 'active' || status === 'expiring'
}

export function canExtendCampaign(status: CampaignStatus): boolean {
  return status === 'active' || status === 'expiring' || status === 'expired'
}

export function canFeatureCampaign(status: CampaignStatus): boolean {
  return status === 'active' || status === 'expiring'
}

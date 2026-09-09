import { ApiClientError } from '@/shared/api/errors'

export function fieldErrorsFromApi(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError) || !error.details || typeof error.details !== 'object') {
    return {}
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(error.details as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0) {
      out[key] = String(value[0])
    } else if (typeof value === 'string') {
      out[key] = value
    }
  }
  return out
}

export function campaignAllowsNewDeals(status: string | null | undefined): boolean {
  return status === 'active' || status === 'expiring'
}

export function evidenceKindLabel(kind: string): string {
  switch (kind) {
    case 'receipt':
      return 'Receipt'
    case 'transfer_confirmation':
      return 'Transfer confirmation'
    case 'transaction_screenshot':
      return 'Transaction screenshot'
    case 'transaction_reference':
      return 'Transaction reference'
    case 'other':
      return 'Other'
    default:
      return kind
  }
}

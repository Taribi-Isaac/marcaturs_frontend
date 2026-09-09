import { ApiClientError } from '@/shared/api/errors'

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function formatMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n)) return String(amount)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'NGN',
      maximumFractionDigits: 2,
    }).format(n)
  } catch {
    return `${currency || 'NGN'} ${n}`
  }
}

export function formatMoneyMinor(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor / 100, currency)
}

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

export function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function optionalNumber(value: string | number | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

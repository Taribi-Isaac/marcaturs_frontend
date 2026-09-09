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

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}

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

export function formatDealCommission(deal: {
  commission_type: string | null
  commission_rate: string | number | null
  commission_amount: string | number | null
  price_currency: string | null
}): string {
  if (deal.commission_type === 'percentage' && deal.commission_rate != null) {
    return `${deal.commission_rate}% commission`
  }
  if (deal.commission_type === 'fixed' && deal.commission_amount != null) {
    return `${formatMoney(deal.commission_amount, deal.price_currency)} commission`
  }
  return 'Commission per Deal terms'
}

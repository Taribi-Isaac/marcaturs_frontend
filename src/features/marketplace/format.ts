import type { MarketplaceCampaignCard } from './types'

export function formatCommission(campaign: MarketplaceCampaignCard): string {
  if (campaign.commission_type === 'percentage' && campaign.commission_rate) {
    const rate = Number(campaign.commission_rate)
    return `${Number.isFinite(rate) ? rate : campaign.commission_rate}% commission`
  }

  if (campaign.commission_type === 'fixed' && campaign.commission_amount) {
    return `${formatMoney(campaign.commission_amount, campaign.price_currency)} commission`
  }

  return 'Commission terms available'
}

export function formatMoney(amount: string | null, currency: string | null): string {
  if (!amount) return '—'
  const value = Number(amount)
  const code = currency || 'NGN'
  if (!Number.isFinite(value)) return `${code} ${amount}`
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${code} ${amount}`
  }
}

export function businessDisplayName(campaign: MarketplaceCampaignCard): string {
  return campaign.business.trading_name || campaign.business.legal_name || 'Verified business'
}

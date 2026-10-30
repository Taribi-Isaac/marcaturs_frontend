const EVENT_FIELDS = {
  sign_up_start: ['account_role'],
  sign_up: ['method', 'account_role'],
  login: ['method'],
  view_campaign: ['campaign_id'],
  start_deal: ['campaign_id'],
  create_campaign: ['campaign_id'],
  page_view: ['page_title', 'page_location', 'page_path', 'page_referrer'],
} as const

export type AnalyticsEventName = keyof typeof EVENT_FIELDS

export type AnalyticsParams = Record<string, string>

const ROLE = /^(BUSINESS|AMBASSADOR)$/
const NUMERIC_ID = /^[1-9][0-9]{0,8}$/

export function allowedEventParams(
  name: AnalyticsEventName,
  params: Record<string, string | number | undefined | null>,
): AnalyticsParams {
  const allowed = new Set<string>(EVENT_FIELDS[name])
  const next: AnalyticsParams = {}
  for (const [key, value] of Object.entries(params)) {
    if (!allowed.has(key) || value == null) continue
    const text = String(value).trim()
    if (!text) continue
    if (key === 'account_role' && !ROLE.test(text)) continue
    if ((key === 'item_id' || key === 'campaign_id') && !NUMERIC_ID.test(text)) continue
    if (key === 'method' && text !== 'email') continue
    if (key === 'page_path' || key === 'page_location' || key === 'page_referrer') {
      if (text.includes('?') || text.includes('#') || text.includes('@')) continue
    }
    next[key] = text
  }
  return next
}

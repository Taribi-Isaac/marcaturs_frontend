import type { AnalyticsEventName } from './events'
import { allowedEventParams } from './events'
import { installGtag, sendGtagEvent } from './gtag'
import { isCollectionAllowed, readAnalyticsEnv } from './runtime'
import { analyticsPageLocation, analyticsPath, analyticsReferrer, analyticsTitle } from './sanitize'

let lastPageKey: string | null = null
let lastCampaignViewId: string | null = null

function emit(name: AnalyticsEventName, params: Record<string, string | number | undefined | null>): void {
  try {
    if (!isCollectionAllowed()) return
    const measurementId = readAnalyticsEnv().measurementId
    if (!measurementId) return
    const safe = allowedEventParams(name, params)
    installGtag(measurementId)
    sendGtagEvent(name, safe)
  } catch {
    // Analytics must never interrupt registration, login, or navigation.
  }
}

export function resetAnalyticsTrackingForTests(): void {
  lastPageKey = null
  lastCampaignViewId = null
}

export function trackPageView(input: {
  key: string
  pathname: string
  title: string
  referrer: string
  origin: string
}): void {
  if (!isCollectionAllowed()) return
  const pagePath = analyticsPath(input.pathname)
  const signature = `${input.key}|${pagePath}`
  if (signature === lastPageKey) return
  lastPageKey = signature
  emit('page_view', {
    page_path: pagePath,
    page_location: analyticsPageLocation(input.origin, pagePath),
    page_title: analyticsTitle(input.title),
    page_referrer: analyticsReferrer(input.referrer),
  })
}

export function trackSignUpStart(role: string): void {
  emit('sign_up_start', { account_role: role })
}

export function trackSignUp(role: string): void {
  emit('sign_up', { method: 'email', account_role: role })
}

export function trackLogin(): void {
  emit('login', { method: 'email' })
}

export function trackCampaignView(campaignId: number): void {
  if (!isCollectionAllowed()) return
  const itemId = String(campaignId)
  if (lastCampaignViewId === itemId) return
  lastCampaignViewId = itemId
  emit('view_campaign', { campaign_id: itemId })
}

export function trackDealStart(campaignId: number): void {
  emit('start_deal', { campaign_id: String(campaignId) })
}

export function trackCampaignCreate(campaignId: number): void {
  emit('create_campaign', { campaign_id: String(campaignId) })
}

import type { AnalyticsConsent } from './config'
import { disableGtag } from './gtag'

export const ANALYTICS_CONSENT_KEY = 'mh-analytics-consent'

/** Per hostname, so a choice on one site is not reused on another. */
export function analyticsConsentStorageKey(): string {
  const host = typeof window === 'undefined' ? '' : window.location.hostname
  return host ? `${ANALYTICS_CONSENT_KEY}@${host}` : ANALYTICS_CONSENT_KEY
}

const listeners = new Set<() => void>()

function readStored(): AnalyticsConsent {
  try {
    const value = window.localStorage.getItem(analyticsConsentStorageKey())
    if (value === 'granted' || value === 'denied') return value
  } catch {
    return 'denied'
  }
  return 'unknown'
}

export function getAnalyticsConsent(): AnalyticsConsent {
  return readStored()
}

export function setAnalyticsConsent(next: Exclude<AnalyticsConsent, 'unknown'>): void {
  try {
    window.localStorage.setItem(analyticsConsentStorageKey(), next)
  } catch {
    // Storage can be blocked. Treat a failed grant as no permission to load the tag.
    if (next === 'granted') return
  }
  if (next === 'denied') {
    disableGtag()
    clearAnalyticsCookies()
  }
  listeners.forEach((listener) => listener())
}

export function subscribeAnalyticsConsent(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function clearAnalyticsCookies(): void {
  try {
    const names = document.cookie
      .split(';')
      .map((part) => part.split('=')[0]?.trim() ?? '')
      .filter((name) => name === '_ga' || name.startsWith('_ga_'))
    for (const name of names) {
      document.cookie = `${name}=; Max-Age=0; path=/`
    }
  } catch {
    // Cookie access can throw in locked-down browsers. The app continues.
  }
}

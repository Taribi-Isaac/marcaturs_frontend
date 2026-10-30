import { analyticsHostConfigured, measurementIdOrNull } from './config'
import { getAnalyticsConsent } from './consent'

export function readAnalyticsEnv(): {
  measurementId: string | null
  prod: boolean
  hostname: string
  publicOrigin: string | undefined
  consent: ReturnType<typeof getAnalyticsConsent>
} {
  return {
    measurementId: measurementIdOrNull(import.meta.env.VITE_GA_MEASUREMENT_ID),
    prod: import.meta.env.PROD,
    hostname: typeof window === 'undefined' ? '' : window.location.hostname,
    publicOrigin: import.meta.env.VITE_PUBLIC_ORIGIN,
    consent: typeof window === 'undefined' ? 'unknown' : getAnalyticsConsent(),
  }
}

export function isAnalyticsConfigured(): boolean {
  const env = readAnalyticsEnv()
  return analyticsHostConfigured(env)
}

export function isCollectionAllowed(): boolean {
  const env = readAnalyticsEnv()
  return analyticsHostConfigured(env) && env.consent === 'granted'
}

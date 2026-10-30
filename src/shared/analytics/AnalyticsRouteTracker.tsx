import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { getAnalyticsConsent, subscribeAnalyticsConsent } from './consent'
import { isAnalyticsConfigured } from './runtime'
import { trackPageView } from './track'

/**
 * One page_view for each history entry: the first load, in-app navigations,
 * and back/forward. React Router's location key identifies the entry, so a
 * repeated effect for the same entry does not send a second hit.
 * The tag loads only after consent. Query strings are never included.
 * The tracker stays unmounted until this build is allowed to offer analytics.
 */
export function AnalyticsRouteTracker() {
  if (!isAnalyticsConfigured()) return null
  return <AnalyticsRouteTrackerInner />
}

function AnalyticsRouteTrackerInner() {
  const location = useLocation()
  const consent = useSyncExternalStore(
    subscribeAnalyticsConsent,
    getAnalyticsConsent,
    () => 'unknown' as const,
  )

  useEffect(() => {
    trackPageView({
      key: location.key,
      pathname: location.pathname,
      title: document.title,
      referrer: document.referrer,
      origin: window.location.origin,
    })
  }, [consent, location.key, location.pathname])

  return null
}

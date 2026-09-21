import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyPrivateRouteDefaults, setRobotsContent } from './documentHead'
import { classifyRoute } from './routePolicy'

/**
 * Applies route-level robots defaults for private / non-indexable paths.
 * Public pages rely on PageMeta for titles/canonicals.
 */
export function SeoRouteSync() {
  const location = useLocation()

  useLayoutEffect(() => {
    const policy = classifyRoute(location.pathname)
    if (!policy.indexable) {
      applyPrivateRouteDefaults()
    } else {
      // Ensure public shells are not left with a stale noindex from a prior private view
      // until PageMeta runs; PageMeta will set index,follow + canonical.
      setRobotsContent('index, follow')
    }
  }, [location.pathname])

  return null
}

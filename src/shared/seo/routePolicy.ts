/**
 * Indexability policy for participant SPA routes (MH-FE-023).
 *
 * Foundational documents do not prescribe technical SEO rules; this policy
 * mirrors the actual public vs authenticated architecture.
 */

export type RouteIndexPolicy = {
  /** Whether search engines may index this path when content is public. */
  indexable: boolean
  /** Short reason for tests/docs. */
  reason: string
}

const INDEXABLE_EXACT = new Set([
  '/',
  '/discover',
  '/how-it-works',
  '/for-businesses',
  '/for-ambassadors',
  '/about',
  '/contact',
  '/faq',
  '/terms',
  '/privacy',
])

/**
 * Classify a pathname (no origin). Query strings are ignored for policy.
 */
export function classifyRoute(pathname: string): RouteIndexPolicy {
  const path = pathname.split('?')[0] || '/'

  if (path === '/app' || path.startsWith('/app/')) {
    return { indexable: false, reason: 'authenticated_application' }
  }

  if (path.startsWith('/pay/')) {
    return { indexable: false, reason: 'payment_token_surface' }
  }

  if (
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password'
  ) {
    return { indexable: false, reason: 'authentication_flow' }
  }

  if (path === '/forbidden' || path === '/account-blocked') {
    return { indexable: false, reason: 'utility_error_surface' }
  }

  if (INDEXABLE_EXACT.has(path)) {
    return { indexable: true, reason: 'public_marketing_or_marketplace' }
  }

  // Public campaign detail: /campaigns/:id (numeric id)
  if (/^\/campaigns\/\d+$/.test(path)) {
    return { indexable: true, reason: 'public_campaign_detail' }
  }

  // Unknown public-shell paths (e.g. 404) — do not invite indexing.
  return { indexable: false, reason: 'unknown_or_not_found' }
}

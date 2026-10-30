/**
 * Public sitemap and Organization metadata for the participant site.
 *
 * Campaign URLs come only from the public marketplace index, which already
 * applies the discoverable scope (active or expiring, published version,
 * assignable category, active business account). Private routes are not listed.
 */

export const PUBLIC_SITEMAP_PATHS = [
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
] as const

/** Product-confirmed profiles. Keep in step with `socialLinks.ts`. */
export const OFFICIAL_SAME_AS = [
  'https://www.facebook.com/marcaturshub',
  'https://www.instagram.com/marcaturshub',
  'https://www.linkedin.com/company/marcaturshub',
  'https://www.tiktok.com/@marcaturshub',
  'https://x.com/MarcatursHub',
  'https://www.youtube.com/channel/UCfY4uW6OeOoZNMF1TOkaTBw',
] as const

export const ORGANIZATION_DESCRIPTION =
  'MarcatursHub connects businesses with independent ambassadors who promote products on commission. Customers pay businesses directly.'

/** Bare http(s) origin. A path, query, credential, or trailing slash is rejected. */
export function publicOriginOrNull(raw: string | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password || url.search || url.hash) return null
  if (url.pathname !== '/' && url.pathname !== '') return null

  return url.origin
}

export function uniqueCampaignIds(ids: readonly number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].sort((a, b) => a - b)
}

export function buildSitemapXml(origin: string, campaignIds: readonly number[]): string {
  const paths = [
    ...PUBLIC_SITEMAP_PATHS,
    ...uniqueCampaignIds(campaignIds).map((id) => `/campaigns/${id}`),
  ]
  const body = paths
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

export function withSitemapLine(robots: string, origin: string): string {
  const line = `Sitemap: ${origin}/sitemap.xml`
  const without = robots.replace(/^Sitemap:.*(?:\r?\n)?/gm, '')
  return `${without.trimEnd()}\n\n${line}\n`
}

export function organizationJsonLd(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MarcatursHub',
    url: `${origin}/`,
    description: ORGANIZATION_DESCRIPTION,
    sameAs: [...OFFICIAL_SAME_AS],
  }
}

export function readMarketplacePage(body: unknown): { ids: number[]; lastPage: number } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as {
    success?: unknown
    data?: unknown
    meta?: { pagination?: { last_page?: unknown } }
  }
  if (record.success !== true || !Array.isArray(record.data)) return null

  const ids: number[] = []
  for (const row of record.data) {
    if (!row || typeof row !== 'object') continue
    const id = (row as { id?: unknown }).id
    if (typeof id === 'number' && Number.isInteger(id) && id > 0) ids.push(id)
  }

  const last = record.meta?.pagination?.last_page
  const lastPage = typeof last === 'number' && Number.isInteger(last) && last >= 1 ? last : 1
  return { ids, lastPage }
}

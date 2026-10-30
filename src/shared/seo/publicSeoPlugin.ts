import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import {
  buildSitemapXml,
  organizationJsonLd,
  publicOriginOrNull,
  readMarketplacePage,
  uniqueCampaignIds,
  withSitemapLine,
} from './publicSitemap'

const MAX_PAGES = 20

async function discoverableCampaignIds(apiBase: string | undefined): Promise<number[]> {
  const base = apiBase?.trim().replace(/\/$/, '')
  if (!base) return []

  const ids: number[] = []
  let page = 1
  let lastPage = 1

  while (page <= lastPage && page <= MAX_PAGES) {
    const url = new URL(`${base}/marketplace/campaigns`)
    url.searchParams.set('per_page', '100')
    url.searchParams.set('page', String(page))

    let response: Response
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } })
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error'
      throw new Error(
        `[public-seo] Marketplace sitemap fetch failed (${reason}). Refusing to publish a sitemap that treats this failure as zero campaigns.`,
      )
    }

    if (!response.ok) {
      throw new Error(
        `[public-seo] Marketplace sitemap fetch returned HTTP ${response.status}. Refusing to publish a sitemap that treats this failure as zero campaigns.`,
      )
    }

    const parsed = readMarketplacePage(await response.json())
    if (!parsed) {
      throw new Error(
        '[public-seo] Marketplace sitemap response was not the public index shape. Refusing to publish a sitemap that treats this failure as zero campaigns.',
      )
    }

    ids.push(...parsed.ids)
    lastPage = parsed.lastPage
    page += 1
  }

  return uniqueCampaignIds(ids)
}

/**
 * When `VITE_PUBLIC_ORIGIN` is a bare origin, write sitemap.xml, declare it in
 * robots.txt, and add Organization JSON-LD. Local builds without that variable
 * keep the previous shell.
 */
export function publicSeoPlugin(): Plugin {
  let outDir = path.resolve('dist')

  return {
    name: 'mh-public-seo',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    transformIndexHtml(html) {
      const origin = publicOriginOrNull(process.env.VITE_PUBLIC_ORIGIN)
      if (!origin) return html
      const json = JSON.stringify(organizationJsonLd(origin)).replace(/</g, '\\u003c')
      const tag = `    <script type="application/ld+json">${json}</script>\n`
      return html.replace('</head>', `${tag}  </head>`)
    },
    async closeBundle() {
      const origin = publicOriginOrNull(process.env.VITE_PUBLIC_ORIGIN)
      if (!origin) return

      const ids = await discoverableCampaignIds(process.env.VITE_API_BASE_URL)
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(origin, ids))

      const robotsPath = path.join(outDir, 'robots.txt')
      if (!fs.existsSync(robotsPath)) return
      const robots = fs.readFileSync(robotsPath, 'utf8')
      fs.writeFileSync(robotsPath, withSitemapLine(robots, origin))
    },
  }
}

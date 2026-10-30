import { describe, expect, it } from 'vitest'
import { companySocialLinks } from '@/app/config/socialLinks'
import { classifyRoute } from './routePolicy'
import {
  OFFICIAL_SAME_AS,
  PUBLIC_SITEMAP_PATHS,
  buildSitemapXml,
  organizationJsonLd,
  publicOriginOrNull,
  readMarketplacePage,
  withSitemapLine,
} from './publicSitemap'

describe('public sitemap', () => {
  it('accepts only a bare origin', () => {
    expect(publicOriginOrNull('https://app.example.test')).toBe('https://app.example.test')
    expect(publicOriginOrNull('https://app.example.test/')).toBe('https://app.example.test')
    expect(publicOriginOrNull('https://app.example.test/discover')).toBeNull()
    expect(publicOriginOrNull('https://user:secret@app.example.test')).toBeNull()
    expect(publicOriginOrNull('javascript:alert(1)')).toBeNull()
    expect(publicOriginOrNull('')).toBeNull()
  })

  it('lists the public marketing routes and no private routes', () => {
    for (const path of PUBLIC_SITEMAP_PATHS) {
      expect(classifyRoute(path).indexable).toBe(true)
    }

    const xml = buildSitemapXml('https://app.example.test', [12, 3, 12, 0, -1, 1.5])
    expect(xml).toContain('https://app.example.test/')
    expect(xml).toContain('https://app.example.test/discover')
    expect(xml).toContain('https://app.example.test/campaigns/3')
    expect(xml).toContain('https://app.example.test/campaigns/12')
    expect(xml).not.toContain('/campaigns/0')
    expect(xml).not.toContain('/campaigns/1.5')
    expect(xml).not.toContain('/app/')
    expect(xml).not.toContain('/login')
    expect(xml).not.toContain('/pay/')
    expect(xml).not.toContain('/discover?')
    expect(xml.match(/<loc>/g)).toHaveLength(PUBLIC_SITEMAP_PATHS.length + 2)
  })

  it('adds one sitemap declaration to robots.txt', () => {
    const robots = withSitemapLine('User-agent: *\nDisallow: /app/\n', 'https://app.example.test')
    expect(robots).toContain('Sitemap: https://app.example.test/sitemap.xml')
    expect(robots.match(/Sitemap:/g)).toHaveLength(1)
    const replaced = withSitemapLine(robots, 'https://staging.example.test')
    expect(replaced).toContain('Sitemap: https://staging.example.test/sitemap.xml')
    expect(replaced).not.toContain('app.example.test')
  })

  it('reads discoverable campaign ids from the public marketplace page', () => {
    expect(
      readMarketplacePage({
        success: true,
        data: [{ id: 9 }, { id: '4' }, { title: 'missing' }, null],
        meta: { pagination: { last_page: 2 } },
      }),
    ).toEqual({ ids: [9], lastPage: 2 })
    expect(
      readMarketplacePage({
        success: true,
        data: [],
        meta: { pagination: { last_page: 1 } },
      }),
    ).toEqual({ ids: [], lastPage: 1 })
    expect(readMarketplacePage({ success: false, data: [] })).toBeNull()
  })

  it('describes the organization without an offer or a price', () => {
    const data = organizationJsonLd('https://app.example.test')
    expect(data['@type']).toBe('Organization')
    expect(data.url).toBe('https://app.example.test/')
    expect(data.sameAs).toEqual([...OFFICIAL_SAME_AS])
    expect(data).not.toHaveProperty('price')
    expect(JSON.stringify(data)).not.toContain('"@type":"Offer"')
    expect(JSON.stringify(data)).not.toContain('"@type":"Product"')
    expect(companySocialLinks.map((link) => link.href).sort()).toEqual([...OFFICIAL_SAME_AS].sort())
  })
})

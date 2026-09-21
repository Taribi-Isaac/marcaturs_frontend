import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyDocumentHead, applyPrivateRouteDefaults } from './documentHead'

describe('documentHead (MH-FE-023)', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.title = ''
    vi.stubEnv('VITE_PUBLIC_ORIGIN', 'https://public.example')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sets title, description, canonical, robots, and OG for indexable pages', () => {
    applyDocumentHead({
      title: 'Discover campaigns',
      description: 'Browse commission opportunities.',
      indexable: true,
      pathname: '/discover',
      imageUrl: '/covers/a.jpg',
    })

    expect(document.title).toBe('Discover campaigns · MarcatursHub')
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Browse commission opportunities.',
    )
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    )
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://public.example/discover',
    )
    expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe(
      'https://public.example/discover',
    )
    expect(document.head.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      'https://public.example/covers/a.jpg',
    )
  })

  it('forces noindex and strips canonical/social tags for private defaults', () => {
    applyDocumentHead({
      title: 'Discover campaigns',
      description: 'Public copy',
      indexable: true,
      pathname: '/discover',
      imageUrl: '/covers/a.jpg',
    })

    applyPrivateRouteDefaults()

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:image"]')).toBeNull()
    expect(document.head.querySelector('meta[property="og:url"]')).toBeNull()
  })

  it('does not write description or OG payload when indexable is false', () => {
    applyDocumentHead({
      title: 'Deal 99',
      description: 'Secret deal terms and commission amounts',
      indexable: false,
      pathname: '/app/ambassador/deals/99',
    })

    expect(document.title).toBe('Deal 99 · MarcatursHub')
    expect(document.head.querySelector('meta[name="description"]')).toBeNull()
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )
    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull()
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
  })
})

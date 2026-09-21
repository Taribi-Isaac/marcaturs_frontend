import { afterEach, describe, expect, it, vi } from 'vitest'
import { canonicalUrlForPath, getPublicOrigin, toAbsolutePublicUrl } from './publicOrigin'

describe('publicOrigin (MH-FE-023)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers VITE_PUBLIC_ORIGIN when configured', () => {
    vi.stubEnv('VITE_PUBLIC_ORIGIN', 'https://example.test/')
    expect(getPublicOrigin()).toBe('https://example.test')
    expect(canonicalUrlForPath('/discover')).toBe('https://example.test/discover')
    expect(toAbsolutePublicUrl('/img/cover.jpg')).toBe('https://example.test/img/cover.jpg')
  })

  it('leaves absolute URLs unchanged', () => {
    expect(toAbsolutePublicUrl('https://cdn.example/cover.png')).toBe(
      'https://cdn.example/cover.png',
    )
  })

  it('returns null for empty image paths', () => {
    expect(toAbsolutePublicUrl(null)).toBeNull()
    expect(toAbsolutePublicUrl('')).toBeNull()
  })
})

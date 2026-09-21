import { describe, expect, it } from 'vitest'
import { classifyRoute } from './routePolicy'

describe('classifyRoute (MH-FE-023)', () => {
  it('marks public marketing and marketplace paths indexable', () => {
    for (const path of [
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
      '/campaigns/82',
    ]) {
      expect(classifyRoute(path).indexable).toBe(true)
    }
  })

  it('marks authenticated application paths non-indexable', () => {
    for (const path of [
      '/app',
      '/app/business',
      '/app/business/deals/9',
      '/app/ambassador/certification/programmes',
      '/app/ambassador/certification/enrollments/1/assessment',
      '/app/ambassador/settings',
    ]) {
      expect(classifyRoute(path)).toMatchObject({
        indexable: false,
        reason: 'authenticated_application',
      })
    }
  })

  it('marks auth, pay, and utility paths non-indexable', () => {
    expect(classifyRoute('/login').reason).toBe('authentication_flow')
    expect(classifyRoute('/register').indexable).toBe(false)
    expect(classifyRoute('/forgot-password').indexable).toBe(false)
    expect(classifyRoute('/reset-password').indexable).toBe(false)
    expect(classifyRoute('/pay/abc-token').reason).toBe('payment_token_surface')
    expect(classifyRoute('/forbidden').indexable).toBe(false)
    expect(classifyRoute('/account-blocked').indexable).toBe(false)
  })

  it('does not treat non-numeric campaign paths as public campaign detail', () => {
    expect(classifyRoute('/campaigns/new').indexable).toBe(false)
    expect(classifyRoute('/campaigns/abc').indexable).toBe(false)
  })

  it('ignores query strings for policy', () => {
    expect(classifyRoute('/discover?page=2').indexable).toBe(true)
    expect(classifyRoute('/app/business/deals?tab=open').indexable).toBe(false)
  })
})

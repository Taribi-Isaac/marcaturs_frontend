import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./runtime', () => ({
  isCollectionAllowed: vi.fn(() => true),
  readAnalyticsEnv: () => ({ measurementId: 'G-TESTONLY1' }),
}))

vi.mock('./gtag', () => ({
  installGtag: vi.fn(),
  sendGtagEvent: vi.fn(),
}))

import { sendGtagEvent } from './gtag'
import { isCollectionAllowed } from './runtime'
import { resetAnalyticsTrackingForTests, trackCampaignView, trackPageView } from './track'

describe('page views', () => {
  beforeEach(() => {
    resetAnalyticsTrackingForTests()
    vi.mocked(sendGtagEvent).mockClear()
    vi.mocked(isCollectionAllowed).mockReturnValue(true)
  })

  it('sends one hit per history key and strips the query string', () => {
    const input = {
      key: 'first',
      pathname: '/discover?token=abc&email=ada@example.com',
      title: 'Discover campaigns · MarcatursHub',
      referrer: 'https://news.example/story?token=secret',
      origin: 'https://app.marcaturshub.com.ng',
    }
    trackPageView(input)
    trackPageView(input)
    expect(sendGtagEvent).toHaveBeenCalledTimes(1)
    expect(sendGtagEvent).toHaveBeenCalledWith(
      'page_view',
      expect.objectContaining({
        page_path: '/discover',
        page_location: 'https://app.marcaturshub.com.ng/discover',
        page_referrer: 'https://news.example/story',
      }),
    )
    const params = vi.mocked(sendGtagEvent).mock.calls[0]?.[1] ?? {}
    expect(JSON.stringify(params)).not.toContain('token')
    expect(JSON.stringify(params)).not.toContain('ada@')
  })

  it('sends again for a later visit to the same path', () => {
    trackPageView({
      key: 'home-1',
      pathname: '/',
      title: 'Home',
      referrer: '',
      origin: 'https://app.marcaturshub.com.ng',
    })
    trackPageView({
      key: 'discover',
      pathname: '/discover',
      title: 'Discover',
      referrer: '',
      origin: 'https://app.marcaturshub.com.ng',
    })
    trackPageView({
      key: 'home-2',
      pathname: '/',
      title: 'Home',
      referrer: '',
      origin: 'https://app.marcaturshub.com.ng',
    })
    expect(sendGtagEvent).toHaveBeenCalledTimes(3)
  })

  it('does not send while consent or the host gate is closed', () => {
    vi.mocked(isCollectionAllowed).mockReturnValue(false)
    trackPageView({
      key: 'closed',
      pathname: '/discover',
      title: 'Discover',
      referrer: '',
      origin: 'https://app.marcaturshub.com.ng',
    })
    expect(sendGtagEvent).not.toHaveBeenCalled()
  })

  it('records a campaign view once until a different campaign is opened', () => {
    trackCampaignView(82)
    trackCampaignView(82)
    trackCampaignView(83)
    expect(sendGtagEvent).toHaveBeenNthCalledWith(1, 'view_campaign', { campaign_id: '82' })
    expect(sendGtagEvent).toHaveBeenNthCalledWith(2, 'view_campaign', { campaign_id: '83' })
    expect(JSON.stringify(vi.mocked(sendGtagEvent).mock.calls)).not.toContain('price')
  })
})

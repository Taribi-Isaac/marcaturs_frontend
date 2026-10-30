import { afterEach, describe, expect, it } from 'vitest'
import { disableGtag, installGtag } from './gtag'

describe('gtag install', () => {
  afterEach(() => {
    document.head.querySelectorAll('script[data-mh-ga]').forEach((node) => node.remove())
    delete window.gtag
    delete window.dataLayer
  })

  it('inserts one GA4 script and does not use the production measurement id in tests', () => {
    installGtag('G-TESTONLY1')
    installGtag('G-TESTONLY1')
    const scripts = document.head.querySelectorAll('script[data-mh-ga]')
    expect(scripts).toHaveLength(1)
    expect(scripts[0]?.getAttribute('src')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-TESTONLY1',
    )
    expect(document.head.innerHTML).not.toContain('G-X3V7CW4V7V')
    expect(window.dataLayer).toEqual(
      expect.arrayContaining([
        ['consent', 'default', expect.objectContaining({ analytics_storage: 'denied' })],
        [
          'config',
          'G-TESTONLY1',
          {
            send_page_view: false,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
          },
        ],
      ]),
    )
  })

  it('records a denial and survives a script error', () => {
    installGtag('G-TESTONLY1')
    const script = document.head.querySelector('script[data-mh-ga]')
    expect(() => script?.dispatchEvent(new Event('error'))).not.toThrow()
    disableGtag()
    expect(window.dataLayer?.at(-1)).toEqual([
      'consent',
      'update',
      expect.objectContaining({ analytics_storage: 'denied' }),
    ])
    expect(() => window.gtag?.('event', 'login', { method: 'email' })).not.toThrow()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import {
  ANALYTICS_CONSENT_KEY,
  analyticsConsentStorageKey,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from './consent'

describe('consent storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps a choice on this hostname and ignores another hostname', () => {
    window.localStorage.setItem(`${ANALYTICS_CONSENT_KEY}@app.marcaturshub.com.ng`, 'granted')
    expect(getAnalyticsConsent()).toBe('unknown')

    setAnalyticsConsent('denied')
    expect(window.localStorage.getItem(analyticsConsentStorageKey())).toBe('denied')
    expect(analyticsConsentStorageKey()).toBe(`${ANALYTICS_CONSENT_KEY}@${window.location.hostname}`)
    expect(window.location.hostname).not.toBe('app.marcaturshub.com.ng')

    setAnalyticsConsent('granted')
    expect(getAnalyticsConsent()).toBe('granted')
  })
})

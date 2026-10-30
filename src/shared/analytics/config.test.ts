import { describe, expect, it } from 'vitest'
import { analyticsHostConfigured, measurementIdOrNull, publicHostnameOrNull } from './config'

describe('measurement id', () => {
  it('accepts a GA4 measurement id and rejects containers and blanks', () => {
    expect(measurementIdOrNull('G-X3V7CW4V7V')).toBe('G-X3V7CW4V7V')
    expect(measurementIdOrNull(' G-TESTONLY1 ')).toBe('G-TESTONLY1')
    expect(measurementIdOrNull('GTM-ABC123')).toBeNull()
    expect(measurementIdOrNull('UA-123')).toBeNull()
    expect(measurementIdOrNull('')).toBeNull()
    expect(measurementIdOrNull(undefined)).toBeNull()
  })
})

describe('analytics host', () => {
  const origin = 'https://app.marcaturshub.com.ng'

  it('allows only the production host after a production build', () => {
    expect(
      analyticsHostConfigured({
        measurementId: 'G-TESTONLY1',
        prod: true,
        hostname: 'app.marcaturshub.com.ng',
        publicOrigin: origin,
      }),
    ).toBe(true)
  })

  it('stays off for local development, tests, and a missing id', () => {
    expect(
      analyticsHostConfigured({
        measurementId: 'G-TESTONLY1',
        prod: false,
        hostname: 'app.marcaturshub.com.ng',
        publicOrigin: origin,
      }),
    ).toBe(false)
    expect(
      analyticsHostConfigured({
        measurementId: 'G-TESTONLY1',
        prod: true,
        hostname: 'localhost',
        publicOrigin: origin,
      }),
    ).toBe(false)
    expect(
      analyticsHostConfigured({
        measurementId: null,
        prod: true,
        hostname: 'app.marcaturshub.com.ng',
        publicOrigin: origin,
      }),
    ).toBe(false)
    expect(publicHostnameOrNull('http://localhost:5180')).toBeNull()
  })
})

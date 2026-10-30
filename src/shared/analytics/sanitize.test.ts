import { describe, expect, it } from 'vitest'
import { analyticsPageLocation, analyticsPath, analyticsReferrer, analyticsTitle } from './sanitize'

describe('analytics paths', () => {
  it('drops query strings, hashes, payment tokens, and email-like segments', () => {
    expect(analyticsPath('/discover?token=abc&email=a@b.c#pay')).toBe('/discover')
    expect(analyticsPath('https://app.marcaturshub.com.ng/reset-password?token=secret')).toBe(
      '/reset-password',
    )
    expect(analyticsPath('/pay/sekret-token')).toBe('/pay')
    expect(analyticsPath('/campaigns/82')).toBe('/campaigns/82')
    expect(analyticsPath('/app/ambassador/deals/82')).toBe('/app/ambassador/deals')
    expect(analyticsPath('/app/ambassador/messages/550e8400-e29b-41d4-a716-446655440000')).toBe(
      '/app/ambassador/messages',
    )
    expect(analyticsPath('/contact/08031234567')).toBe('/contact')
    expect(analyticsPath('/users/a@b.c')).toBe('/')
  })

  it('does not put the raw href into the page location or referrer', () => {
    const location = analyticsPageLocation(
      'https://app.marcaturshub.com.ng',
      '/pay/sekret?token=abc',
    )
    expect(location).toBe('https://app.marcaturshub.com.ng/pay')
    expect(location).not.toContain('sekret')
    expect(location).not.toContain('token')
    expect(analyticsReferrer('https://news.example/story?utm_email=a@b.c')).toBe(
      'https://news.example/story',
    )
    expect(analyticsReferrer('https://user:secret@news.example/a?token=1')).toBe(
      'https://news.example/a',
    )
    expect(analyticsTitle('Ada <a@b.c>')).toBeUndefined()
    expect(analyticsTitle('Call 08031234567')).toBeUndefined()
    expect(analyticsTitle('Deal #15 · MarcatursHub')).toBeUndefined()
    expect(analyticsTitle('Discover campaigns · MarcatursHub')).toBe(
      'Discover campaigns · MarcatursHub',
    )
  })
})

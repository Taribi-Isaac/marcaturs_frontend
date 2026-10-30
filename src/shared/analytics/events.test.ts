import { describe, expect, it } from 'vitest'
import { allowedEventParams } from './events'

describe('analytics payloads', () => {
  it('keeps recommended fields and drops identity, payment, and token fields', () => {
    expect(
      allowedEventParams('login', {
        method: 'email',
        email: 'ada@example.com',
        password: 'secret',
        token: 'abc',
      }),
    ).toEqual({ method: 'email' })

    expect(
      allowedEventParams('sign_up', {
        method: 'email',
        account_role: 'AMBASSADOR',
        name: 'Ada',
        email: 'ada@example.com',
      }),
    ).toEqual({ method: 'email', account_role: 'AMBASSADOR' })

    expect(
      allowedEventParams('view_campaign', {
        campaign_id: '82',
        item_name: 'Solar kit',
        price: '250000',
      }),
    ).toEqual({ campaign_id: '82' })

    expect(
      allowedEventParams('start_deal', {
        campaign_id: '82',
        expected_transaction_amount: '5000',
        evidence: 'receipt',
      }),
    ).toEqual({ campaign_id: '82' })

    expect(allowedEventParams('page_view', { page_path: '/pay?token=abc' })).toEqual({})
    expect(allowedEventParams('sign_up', { account_role: 'ADMIN' })).toEqual({})
  })
})

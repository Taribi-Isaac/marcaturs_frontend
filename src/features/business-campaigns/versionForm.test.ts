import { describe, expect, it } from 'vitest'
import {
  AMOUNT_ERROR,
  COMMISSION_DEADLINE_MAX_DAYS,
  DAYS_ERROR,
  PERCENTAGE_ERROR,
  buildVersionPayload,
  checkPublishable,
  formPathForServerKey,
  friendlyServerFieldMessage,
  isFieldApplicable,
  isRequiredToPublish,
  parseAmount,
  parsePercentage,
  parseWholeDays,
  type VersionFormValues,
} from './versionForm'

function completeValues(overrides: Partial<VersionFormValues> = {}): VersionFormValues {
  return {
    product_name: 'Solar kit',
    product_description: '',
    pricing_method: 'fixed',
    price_amount: '250,000',
    price_currency: 'NGN',
    service_area: '',
    commission_type: 'percentage',
    commission_rate: '10',
    commission_amount: '',
    commission_trigger: 'payment_confirmation',
    commission_trigger_description: '',
    commission_payment_deadline_days: '7',
    minimum_qualifying_amount: '',
    qualifying_conditions: '',
    refund_cancellation_rules: 'No refunds after install',
    approved_claims: '',
    prohibited_claims: '',
    brand_use_rules: '',
    geographic_customer_restrictions: '',
    approved_copy: '',
    marketing_links: [],
    payment_destination_name: 'Ada Solar Ltd',
    payment_provider: 'GTBank',
    payment_account_identifier: '0123456789',
    payment_instructions: 'Use your full name as narration',
    payment_contact: '',
    terms: '',
    ...overrides,
  }
}

describe('parseAmount', () => {
  it.each([
    ['250000', 250000],
    ['250,000', 250000],
    ['₦250,000.50', 250000.5],
    ['₦ 1,250,000', 1250000],
    ['NGN 5,000', 5000],
    ['5000.75', 5000.75],
    ['0', 0],
  ])('accepts %s', (raw, expected) => {
    expect(parseAmount(raw)).toEqual({ ok: true, value: expected })
  })

  it('treats empty input as no value', () => {
    expect(parseAmount('')).toEqual({ ok: true, value: null })
    expect(parseAmount('   ')).toEqual({ ok: true, value: null })
  })

  it.each(['abc', '10%', '7 days', '25,00', '1,2345', '-500', '250 000', '₦'])(
    'rejects %s instead of returning null',
    (raw) => {
      expect(parseAmount(raw)).toEqual({ ok: false, message: AMOUNT_ERROR })
    },
  )
})

describe('parsePercentage', () => {
  it.each([
    ['10', 10],
    ['10%', 10],
    ['7.5 %', 7.5],
    ['100', 100],
  ])('accepts %s', (raw, expected) => {
    expect(parsePercentage(raw)).toEqual({ ok: true, value: expected })
  })

  it('treats empty input as no value', () => {
    expect(parsePercentage('')).toEqual({ ok: true, value: null })
  })

  it.each(['abc', '₦250,000.50', '250,000', '101', '7 days', '-5'])('rejects %s', (raw) => {
    expect(parsePercentage(raw)).toEqual({ ok: false, message: PERCENTAGE_ERROR })
  })
})

describe('parseWholeDays', () => {
  it.each([
    ['1', 1],
    ['2', 2],
    ['3', 3],
    ['4', 4],
    ['5', 5],
    ['6', 6],
    ['7', 7],
    ['7 days', 7],
    ['1 day', 1],
  ])('accepts %s', (raw, expected) => {
    expect(parseWholeDays(raw)).toEqual({ ok: true, value: expected })
  })

  it('treats empty input as no value', () => {
    expect(parseWholeDays('')).toEqual({ ok: true, value: null })
  })

  it.each(['abc', '0', '8', '30', '365', '-1', '7.5', '10%', '₦250,000.50', 'seven days'])(
    'rejects %s',
    (raw) => {
      expect(parseWholeDays(raw)).toEqual({ ok: false, message: DAYS_ERROR })
    },
  )

  it('states the platform range in the error', () => {
    expect(COMMISSION_DEADLINE_MAX_DAYS).toBe(7)
    expect(DAYS_ERROR).toBe('Commission payment deadline must be between 1 and 7 days.')
  })
})

describe('conditional rules', () => {
  it('requires price amount only for fixed pricing', () => {
    expect(isRequiredToPublish('price_amount', completeValues({ pricing_method: 'fixed' }))).toBe(
      true,
    )
    expect(isRequiredToPublish('price_amount', completeValues({ pricing_method: 'other' }))).toBe(
      false,
    )
    expect(isFieldApplicable('price_amount', completeValues({ pricing_method: 'quote' }))).toBe(
      false,
    )
  })

  it('switches commission rate and amount with the commission type', () => {
    const pct = completeValues({ commission_type: 'percentage' })
    const fixed = completeValues({ commission_type: 'fixed' })
    expect(isRequiredToPublish('commission_rate', pct)).toBe(true)
    expect(isFieldApplicable('commission_amount', pct)).toBe(false)
    expect(isRequiredToPublish('commission_amount', fixed)).toBe(true)
    expect(isFieldApplicable('commission_rate', fixed)).toBe(false)
  })

  it('keeps payment contact optional', () => {
    expect(isRequiredToPublish('payment_contact', completeValues())).toBe(false)
  })
})

describe('buildVersionPayload', () => {
  it('sends formatted money as numbers', () => {
    const { payload, errors } = buildVersionPayload(
      completeValues({ price_amount: '₦250,000.50', minimum_qualifying_amount: '10,000' }),
    )
    expect(errors).toEqual({})
    expect(payload.price_amount).toBe(250000.5)
    expect(payload.minimum_qualifying_amount).toBe(10000)
    expect(payload.commission_payment_deadline_days).toBe(7)
  })

  it('reports invalid numbers instead of sending null', () => {
    const { errors } = buildVersionPayload(
      completeValues({ price_amount: 'abc', commission_payment_deadline_days: 'soon' }),
    )
    expect(errors.price_amount).toBe(AMOUNT_ERROR)
    expect(errors.commission_payment_deadline_days).toBe(DAYS_ERROR)
  })

  it('clears obsolete conditional values', () => {
    const { payload } = buildVersionPayload(
      completeValues({
        pricing_method: 'quote',
        price_amount: '250,000',
        commission_type: 'fixed',
        commission_rate: '10',
        commission_amount: '5,000',
        commission_trigger: 'payment_confirmation',
        commission_trigger_description: 'Old description',
      }),
    )
    expect(payload.price_amount).toBeNull()
    expect(payload.commission_rate).toBeNull()
    expect(payload.commission_amount).toBe(5000)
    expect(payload.commission_trigger_description).toBeNull()
  })

  it('does not validate values of fields that no longer apply', () => {
    const { errors, payload } = buildVersionPayload(
      completeValues({
        commission_type: 'fixed',
        commission_rate: 'abc',
        commission_amount: '500',
      }),
    )
    expect(errors).toEqual({})
    expect(payload.commission_rate).toBeNull()
  })
})

describe('checkPublishable', () => {
  it('passes a complete version', () => {
    expect(checkPublishable(completeValues())).toEqual({})
  })

  it('lists every missing always-required field', () => {
    const errors = checkPublishable(
      completeValues({
        product_name: '',
        pricing_method: '',
        commission_type: '',
        commission_trigger: '',
        commission_payment_deadline_days: '',
        refund_cancellation_rules: '',
        payment_destination_name: '',
        payment_provider: '',
        payment_account_identifier: '',
        payment_instructions: '',
      }),
    )
    expect(Object.keys(errors).sort()).toEqual(
      [
        'commission_payment_deadline_days',
        'commission_trigger',
        'commission_type',
        'payment_account_identifier',
        'payment_destination_name',
        'payment_instructions',
        'payment_provider',
        'pricing_method',
        'product_name',
        'refund_cancellation_rules',
      ].sort(),
    )
    expect(errors.payment_account_identifier).toBe(
      'Account number or payment ID is required to publish.',
    )
  })

  it('applies conditional requirements', () => {
    expect(checkPublishable(completeValues({ price_amount: '' })).price_amount).toMatch(
      /required to publish/,
    )
    expect(checkPublishable(completeValues({ pricing_method: 'quote', price_amount: '' }))).toEqual(
      {},
    )
    expect(
      checkPublishable(completeValues({ commission_type: 'fixed', commission_amount: '' }))
        .commission_amount,
    ).toMatch(/required to publish/)
    expect(
      checkPublishable(completeValues({ commission_trigger: 'other' }))
        .commission_trigger_description,
    ).toMatch(/required to publish/)
  })

  it('reports invalid numbers ahead of missing values', () => {
    expect(
      checkPublishable(completeValues({ commission_rate: '10 percent' })).commission_rate,
    ).toBe(PERCENTAGE_ERROR)
  })
})

describe('server error helpers', () => {
  it('maps marketing link keys to the url input', () => {
    expect(formPathForServerKey('marketing_links.2')).toBe('marketing_links.2.url')
    expect(formPathForServerKey('payment_provider')).toBe('payment_provider')
  })

  it('replaces column-named required messages with the on-screen label', () => {
    expect(
      friendlyServerFieldMessage(
        'payment_destination_name',
        'The payment destination name field is required.',
      ),
    ).toBe('Account name is required to publish.')
    expect(
      friendlyServerFieldMessage(
        'price_currency',
        'The price currency field must be 3 characters.',
      ),
    ).toBe('The price currency field must be 3 characters.')
  })

  it('shows the 1–7 day rule for server deadline range errors', () => {
    expect(
      friendlyServerFieldMessage(
        'commission_payment_deadline_days',
        'The commission payment deadline days field must not be greater than 7.',
      ),
    ).toBe(DAYS_ERROR)
    expect(
      friendlyServerFieldMessage(
        'commission_payment_deadline_days',
        'The commission payment deadline days field is required.',
      ),
    ).toBe('Commission payment deadline (days) is required to publish.')
  })
})

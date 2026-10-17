import { z } from 'zod'
import type { CampaignVersion, CampaignVersionInput } from './types'

export const versionFormSchema = z.object({
  product_name: z.string().max(255),
  product_description: z.string().max(10000),
  pricing_method: z.enum(['', 'fixed', 'quote', 'other']),
  price_amount: z.string(),
  price_currency: z.string().max(3),
  service_area: z.string().max(255),
  commission_type: z.enum(['', 'percentage', 'fixed']),
  commission_rate: z.string(),
  commission_amount: z.string(),
  commission_trigger: z.enum(['', 'payment_confirmation', 'other']),
  commission_trigger_description: z.string().max(255),
  commission_payment_deadline_days: z.string(),
  minimum_qualifying_amount: z.string(),
  qualifying_conditions: z.string().max(10000),
  refund_cancellation_rules: z.string().max(10000),
  approved_claims: z.string().max(10000),
  prohibited_claims: z.string().max(10000),
  brand_use_rules: z.string().max(10000),
  geographic_customer_restrictions: z.string().max(10000),
  approved_copy: z.string().max(10000),
  marketing_links: z.array(z.object({ url: z.string() })),
  payment_destination_name: z.string().max(255),
  payment_provider: z.string().max(255),
  payment_account_identifier: z.string().max(255),
  payment_instructions: z.string().max(10000),
  payment_contact: z.string().max(255),
  terms: z.string().max(20000),
})

export type VersionFormValues = z.infer<typeof versionFormSchema>
export type VersionFieldName = Exclude<keyof VersionFormValues, 'marketing_links'>

/** Form order, used to order the error summary. */
export const VERSION_FIELD_ORDER: VersionFieldName[] = [
  'product_name',
  'service_area',
  'product_description',
  'pricing_method',
  'price_currency',
  'price_amount',
  'commission_type',
  'commission_trigger',
  'commission_rate',
  'commission_amount',
  'commission_payment_deadline_days',
  'minimum_qualifying_amount',
  'commission_trigger_description',
  'qualifying_conditions',
  'refund_cancellation_rules',
  'approved_claims',
  'prohibited_claims',
  'brand_use_rules',
  'geographic_customer_restrictions',
  'approved_copy',
  'terms',
  'payment_destination_name',
  'payment_provider',
  'payment_account_identifier',
  'payment_contact',
  'payment_instructions',
]

export const VERSION_FIELD_LABELS: Record<VersionFieldName, string> = {
  product_name: 'Product / service name',
  service_area: 'Service area',
  product_description: 'Product description',
  pricing_method: 'Pricing method',
  price_currency: 'Currency',
  price_amount: 'Price amount',
  commission_type: 'Commission type',
  commission_trigger: 'Commission trigger',
  commission_rate: 'Commission rate (%)',
  commission_amount: 'Commission amount',
  commission_payment_deadline_days: 'Commission payment deadline (days)',
  minimum_qualifying_amount: 'Minimum qualifying amount',
  commission_trigger_description: 'Trigger description',
  qualifying_conditions: 'Qualifying conditions',
  refund_cancellation_rules: 'Refund / cancellation rules',
  approved_claims: 'Approved claims',
  prohibited_claims: 'Prohibited claims',
  brand_use_rules: 'Brand-use rules',
  geographic_customer_restrictions: 'Geographic / customer restrictions',
  approved_copy: 'Approved copy',
  terms: 'Terms',
  payment_destination_name: 'Account name',
  payment_provider: 'Bank or payment provider',
  payment_account_identifier: 'Account number or payment ID',
  payment_contact: 'Contact for payment questions',
  payment_instructions: 'Payment instructions',
}

/** Mirrors the always-required rules in CampaignVersionService::assertPublishable. */
const ALWAYS_REQUIRED_TO_PUBLISH: VersionFieldName[] = [
  'product_name',
  'pricing_method',
  'commission_type',
  'commission_trigger',
  'commission_payment_deadline_days',
  'refund_cancellation_rules',
  'payment_destination_name',
  'payment_provider',
  'payment_account_identifier',
  'payment_instructions',
]

type ConditionValues = Pick<
  VersionFormValues,
  'pricing_method' | 'commission_type' | 'commission_trigger'
>

/** Whether a conditional field applies to the current commercial configuration. */
export function isFieldApplicable(name: VersionFieldName, values: ConditionValues): boolean {
  switch (name) {
    case 'price_amount':
      return values.pricing_method === 'fixed' || values.pricing_method === 'other'
    case 'commission_rate':
      return values.commission_type === 'percentage'
    case 'commission_amount':
      return values.commission_type === 'fixed'
    case 'commission_trigger_description':
      return values.commission_trigger === 'other'
    default:
      return true
  }
}

export function isRequiredToPublish(name: VersionFieldName, values: ConditionValues): boolean {
  if (ALWAYS_REQUIRED_TO_PUBLISH.includes(name)) return true
  switch (name) {
    case 'price_amount':
      return values.pricing_method === 'fixed'
    case 'commission_rate':
      return values.commission_type === 'percentage'
    case 'commission_amount':
      return values.commission_type === 'fixed'
    case 'commission_trigger_description':
      return values.commission_trigger === 'other'
    default:
      return false
  }
}

export type NumberParseResult = { ok: true; value: number | null } | { ok: false; message: string }

const PLAIN_NUMBER = /^\d+(\.\d+)?$/
const GROUPED_NUMBER = /^\d{1,3}(,\d{3})+(\.\d+)?$/

export const AMOUNT_ERROR = 'Enter a valid amount, for example 250,000 or 250000.50.'
export const PERCENTAGE_ERROR = 'Enter a percentage between 0 and 100, for example 10 or 7.5.'
/** Platform commission payment ceiling (SoT §7.2); the API enforces the same maximum. */
export const COMMISSION_DEADLINE_MAX_DAYS = 7
export const DAYS_ERROR = `Commission payment deadline must be between 1 and ${COMMISSION_DEADLINE_MAX_DAYS} days.`

/** Money: optional ₦ / NGN prefix and correctly grouped thousands separators. */
export function parseAmount(raw: string | null | undefined): NumberParseResult {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return { ok: true, value: null }
  const unprefixed = trimmed.replace(/^(₦|NGN|N)\s*/i, '')
  if (!PLAIN_NUMBER.test(unprefixed) && !GROUPED_NUMBER.test(unprefixed)) {
    return { ok: false, message: AMOUNT_ERROR }
  }
  return { ok: true, value: Number(unprefixed.replace(/,/g, '')) }
}

/** Percentage: plain number with an optional trailing "%", within 0–100. */
export function parsePercentage(raw: string | null | undefined): NumberParseResult {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return { ok: true, value: null }
  const unsuffixed = trimmed.replace(/\s*%$/, '')
  if (!PLAIN_NUMBER.test(unsuffixed)) return { ok: false, message: PERCENTAGE_ERROR }
  const value = Number(unsuffixed)
  if (value > 100) return { ok: false, message: PERCENTAGE_ERROR }
  return { ok: true, value }
}

/** Day count: whole number with an optional "day(s)" suffix, within 1–7. */
export function parseWholeDays(raw: string | null | undefined): NumberParseResult {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return { ok: true, value: null }
  const match = /^(\d+)(\s*days?)?$/i.exec(trimmed)
  if (!match) return { ok: false, message: DAYS_ERROR }
  const value = Number(match[1])
  if (value < 1 || value > COMMISSION_DEADLINE_MAX_DAYS) return { ok: false, message: DAYS_ERROR }
  return { ok: true, value }
}

const NUMERIC_PARSERS = {
  price_amount: parseAmount,
  commission_rate: parsePercentage,
  commission_amount: parseAmount,
  commission_payment_deadline_days: parseWholeDays,
  minimum_qualifying_amount: parseAmount,
} as const

type NumericField = keyof typeof NUMERIC_PARSERS

function textOrNull(value: string | undefined | null): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

function numberString(value: string | number | null | undefined): string {
  return value != null ? String(value) : ''
}

export function toVersionFormValues(version: CampaignVersion): VersionFormValues {
  return {
    product_name: version.product_name ?? '',
    product_description: version.product_description ?? '',
    pricing_method: version.pricing_method ?? '',
    price_amount: numberString(version.price_amount),
    price_currency: version.price_currency ?? 'NGN',
    service_area: version.service_area ?? '',
    commission_type: version.commission_type ?? '',
    commission_rate: numberString(version.commission_rate),
    commission_amount: numberString(version.commission_amount),
    commission_trigger: version.commission_trigger ?? '',
    commission_trigger_description: version.commission_trigger_description ?? '',
    commission_payment_deadline_days: numberString(version.commission_payment_deadline_days),
    minimum_qualifying_amount: numberString(version.minimum_qualifying_amount),
    qualifying_conditions: version.qualifying_conditions ?? '',
    refund_cancellation_rules: version.refund_cancellation_rules ?? '',
    approved_claims: version.approved_claims ?? '',
    prohibited_claims: version.prohibited_claims ?? '',
    brand_use_rules: version.brand_use_rules ?? '',
    geographic_customer_restrictions: version.geographic_customer_restrictions ?? '',
    approved_copy: version.approved_copy ?? '',
    marketing_links: (version.marketing_links ?? []).map((url) => ({ url })),
    payment_destination_name: version.payment_destination_name ?? '',
    payment_provider: version.payment_provider ?? '',
    payment_account_identifier: version.payment_account_identifier ?? '',
    payment_instructions: version.payment_instructions ?? '',
    payment_contact: version.payment_contact ?? '',
    terms: version.terms ?? '',
  }
}

export type VersionFieldErrors = Partial<Record<VersionFieldName, string>>

/**
 * Builds the draft PATCH payload. Conditional fields that no longer apply are sent as null so
 * obsolete values do not stay attached to the draft. Numeric input that cannot be parsed is
 * reported as a field error instead of being sent as null.
 */
export function buildVersionPayload(values: VersionFormValues): {
  payload: CampaignVersionInput
  errors: VersionFieldErrors
} {
  const errors: VersionFieldErrors = {}
  const numbers: Partial<Record<NumericField, number | null>> = {}

  for (const field of Object.keys(NUMERIC_PARSERS) as NumericField[]) {
    if (!isFieldApplicable(field, values)) {
      numbers[field] = null
      continue
    }
    const result = NUMERIC_PARSERS[field](values[field])
    if (result.ok) {
      numbers[field] = result.value
    } else {
      errors[field] = result.message
    }
  }

  const payload: CampaignVersionInput = {
    product_name: textOrNull(values.product_name),
    product_description: textOrNull(values.product_description),
    pricing_method: values.pricing_method || null,
    price_amount: numbers.price_amount ?? null,
    price_currency: textOrNull(values.price_currency)?.toUpperCase() ?? null,
    service_area: textOrNull(values.service_area),
    commission_type: values.commission_type || null,
    commission_rate: numbers.commission_rate ?? null,
    commission_amount: numbers.commission_amount ?? null,
    commission_trigger: values.commission_trigger || null,
    commission_trigger_description: isFieldApplicable('commission_trigger_description', values)
      ? textOrNull(values.commission_trigger_description)
      : null,
    commission_payment_deadline_days: numbers.commission_payment_deadline_days ?? null,
    minimum_qualifying_amount: numbers.minimum_qualifying_amount ?? null,
    qualifying_conditions: textOrNull(values.qualifying_conditions),
    refund_cancellation_rules: textOrNull(values.refund_cancellation_rules),
    approved_claims: textOrNull(values.approved_claims),
    prohibited_claims: textOrNull(values.prohibited_claims),
    brand_use_rules: textOrNull(values.brand_use_rules),
    geographic_customer_restrictions: textOrNull(values.geographic_customer_restrictions),
    approved_copy: textOrNull(values.approved_copy),
    marketing_links: values.marketing_links.map((l) => l.url.trim()).filter(Boolean),
    payment_destination_name: textOrNull(values.payment_destination_name),
    payment_provider: textOrNull(values.payment_provider),
    payment_account_identifier: textOrNull(values.payment_account_identifier),
    payment_instructions: textOrNull(values.payment_instructions),
    payment_contact: textOrNull(values.payment_contact),
    terms: textOrNull(values.terms),
  }

  return { payload, errors }
}

export function requiredToPublishMessage(name: VersionFieldName): string {
  return `${VERSION_FIELD_LABELS[name]} is required to publish.`
}

/**
 * Immediate feedback before publishing. The server remains authoritative and runs the same
 * required-field rules again.
 */
export function checkPublishable(values: VersionFormValues): VersionFieldErrors {
  const { errors } = buildVersionPayload(values)
  for (const name of VERSION_FIELD_ORDER) {
    if (errors[name] || !isRequiredToPublish(name, values)) continue
    if ((values[name] ?? '').trim() === '') {
      errors[name] = requiredToPublishMessage(name)
    }
  }
  return errors
}

/** Maps a server error key to the form field path (`marketing_links.0` → `marketing_links.0.url`). */
export function formPathForServerKey(key: string): string {
  return /^marketing_links\.\d+$/.test(key) ? `${key}.url` : key
}

export function isVersionFieldName(key: string): key is VersionFieldName {
  return key in VERSION_FIELD_LABELS
}

/** Laravel's default messages name the database column; show the on-screen wording instead. */
export function friendlyServerFieldMessage(key: string, message: string): string {
  if (isVersionFieldName(key) && /\bfield is required\b/i.test(message)) {
    return requiredToPublishMessage(key)
  }
  if (key === 'commission_payment_deadline_days') return DAYS_ERROR
  return message
}

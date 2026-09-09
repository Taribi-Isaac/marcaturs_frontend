import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { publishCampaignVersion, updateCampaignVersion } from './api'
import { emptyToNull, fieldErrorsFromApi, optionalNumber } from './format'
import { businessCampaignKeys } from './queryKeys'
import type { CampaignVersion } from './types'

const schema = z.object({
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

type FormValues = z.infer<typeof schema>

function toFormValues(version: CampaignVersion): FormValues {
  return {
    product_name: version.product_name ?? '',
    product_description: version.product_description ?? '',
    pricing_method: version.pricing_method ?? '',
    price_amount: version.price_amount != null ? String(version.price_amount) : '',
    price_currency: version.price_currency ?? 'NGN',
    service_area: version.service_area ?? '',
    commission_type: version.commission_type ?? '',
    commission_rate: version.commission_rate != null ? String(version.commission_rate) : '',
    commission_amount: version.commission_amount != null ? String(version.commission_amount) : '',
    commission_trigger: version.commission_trigger ?? '',
    commission_trigger_description: version.commission_trigger_description ?? '',
    commission_payment_deadline_days:
      version.commission_payment_deadline_days != null
        ? String(version.commission_payment_deadline_days)
        : '',
    minimum_qualifying_amount:
      version.minimum_qualifying_amount != null ? String(version.minimum_qualifying_amount) : '',
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

function toPayload(values: FormValues) {
  const links = values.marketing_links.map((l) => l.url.trim()).filter(Boolean)
  return {
    product_name: emptyToNull(values.product_name),
    product_description: emptyToNull(values.product_description),
    pricing_method: (emptyToNull(values.pricing_method) as FormValues['pricing_method']) || null,
    price_amount: optionalNumber(values.price_amount),
    price_currency: emptyToNull(values.price_currency)?.toUpperCase() ?? null,
    service_area: emptyToNull(values.service_area),
    commission_type: (emptyToNull(values.commission_type) as FormValues['commission_type']) || null,
    commission_rate: optionalNumber(values.commission_rate),
    commission_amount: optionalNumber(values.commission_amount),
    commission_trigger:
      (emptyToNull(values.commission_trigger) as FormValues['commission_trigger']) || null,
    commission_trigger_description: emptyToNull(values.commission_trigger_description),
    commission_payment_deadline_days: optionalNumber(values.commission_payment_deadline_days),
    minimum_qualifying_amount: optionalNumber(values.minimum_qualifying_amount),
    qualifying_conditions: emptyToNull(values.qualifying_conditions),
    refund_cancellation_rules: emptyToNull(values.refund_cancellation_rules),
    approved_claims: emptyToNull(values.approved_claims),
    prohibited_claims: emptyToNull(values.prohibited_claims),
    brand_use_rules: emptyToNull(values.brand_use_rules),
    geographic_customer_restrictions: emptyToNull(values.geographic_customer_restrictions),
    approved_copy: emptyToNull(values.approved_copy),
    marketing_links: links,
    payment_destination_name: emptyToNull(values.payment_destination_name),
    payment_provider: emptyToNull(values.payment_provider),
    payment_account_identifier: emptyToNull(values.payment_account_identifier),
    payment_instructions: emptyToNull(values.payment_instructions),
    payment_contact: emptyToNull(values.payment_contact),
    terms: emptyToNull(values.terms),
  }
}

export function CampaignVersionEditor({
  campaignId,
  version,
  readOnly,
}: {
  campaignId: number
  version: CampaignVersion
  readOnly: boolean
}) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(version),
  })

  const links = useFieldArray({ control: form.control, name: 'marketing_links' })

  useEffect(() => {
    form.reset(toFormValues(version))
  }, [version, form])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: businessCampaignKeys.detail(campaignId) }),
      queryClient.invalidateQueries({ queryKey: businessCampaignKeys.versions(campaignId) }),
      queryClient.invalidateQueries({ queryKey: businessCampaignKeys.list() }),
    ])
  }

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      updateCampaignVersion(campaignId, version.version_number, toPayload(values)),
    onSuccess: async () => {
      setError(null)
      setMessage('Draft version saved.')
      await invalidate()
    },
    onError: (err) => {
      setMessage(null)
      if (err instanceof ApiClientError) {
        setError(err.message)
        const fields = fieldErrorsFromApi(err)
        for (const [key, msg] of Object.entries(fields)) {
          // @ts-expect-error dynamic field keys from API
          form.setError(key, { message: msg })
        }
        if (err.status === 409) void invalidate()
      } else {
        setError('Save failed.')
      }
    },
  })

  const publish = useMutation({
    mutationFn: async () => {
      const values = form.getValues()
      await updateCampaignVersion(campaignId, version.version_number, toPayload(values))
      return publishCampaignVersion(campaignId, version.version_number)
    },
    onSuccess: async () => {
      setError(null)
      setMessage(
        'Commercial version published. This freezes terms. The campaign is not marketplace-active until submitted, approved, and activated.',
      )
      await invalidate()
    },
    onError: (err) => {
      setMessage(null)
      if (err instanceof ApiClientError) {
        setError(err.message)
        const fields = fieldErrorsFromApi(err)
        for (const [key, msg] of Object.entries(fields)) {
          // @ts-expect-error dynamic field keys from API
          form.setError(key, { message: msg })
        }
        if (err.status === 409) void invalidate()
      } else {
        setError('Publish failed.')
      }
    },
  })

  const disabled = readOnly || save.isPending || publish.isPending

  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit((values) => {
        setMessage(null)
        setError(null)
        save.mutate(values)
      })}
    >
      {readOnly ? (
        <div className="alert alert--info">
          This version is published and immutable. Create a new draft version to change commercial
          terms when the campaign status allows it.
        </div>
      ) : (
        <div className="alert alert--info">
          Publishing freezes commercial terms for this version. It does not activate the campaign
          listing.
        </div>
      )}

      <section className="form-section">
        <h2>Product & pricing</h2>
        <p className="form-section__lead">What ambassadors will promote and how it is priced.</p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="product_name">Product / service name</label>
            <input id="product_name" disabled={disabled} {...form.register('product_name')} />
          </div>
          <div className="field">
            <label htmlFor="service_area">Service area</label>
            <input id="service_area" disabled={disabled} {...form.register('service_area')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="product_description">Product description</label>
          <textarea
            id="product_description"
            disabled={disabled}
            {...form.register('product_description')}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pricing_method">Pricing method</label>
            <select id="pricing_method" disabled={disabled} {...form.register('pricing_method')}>
              <option value="">Select</option>
              <option value="fixed">Fixed</option>
              <option value="quote">Quote</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="price_currency">Currency</label>
            <input
              id="price_currency"
              disabled={disabled}
              maxLength={3}
              {...form.register('price_currency')}
            />
          </div>
          <div className="field">
            <label htmlFor="price_amount">Price amount</label>
            <input id="price_amount" disabled={disabled} {...form.register('price_amount')} />
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2>Commission</h2>
        <p className="form-section__lead">
          Business → Ambassador settlement terms. MarcatursHub does not pay ambassadors.
        </p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="commission_type">Commission type</label>
            <select id="commission_type" disabled={disabled} {...form.register('commission_type')}>
              <option value="">Select</option>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="commission_trigger">Commission trigger</label>
            <select
              id="commission_trigger"
              disabled={disabled}
              {...form.register('commission_trigger')}
            >
              <option value="">Select</option>
              <option value="payment_confirmation">Payment confirmation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="commission_rate">Commission rate (%)</label>
            <input id="commission_rate" disabled={disabled} {...form.register('commission_rate')} />
          </div>
          <div className="field">
            <label htmlFor="commission_amount">Commission amount</label>
            <input
              id="commission_amount"
              disabled={disabled}
              {...form.register('commission_amount')}
            />
          </div>
          <div className="field">
            <label htmlFor="commission_payment_deadline_days">Payment deadline (days)</label>
            <input
              id="commission_payment_deadline_days"
              disabled={disabled}
              {...form.register('commission_payment_deadline_days')}
            />
          </div>
          <div className="field">
            <label htmlFor="minimum_qualifying_amount">Minimum qualifying amount</label>
            <input
              id="minimum_qualifying_amount"
              disabled={disabled}
              {...form.register('minimum_qualifying_amount')}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="commission_trigger_description">Trigger description</label>
          <input
            id="commission_trigger_description"
            disabled={disabled}
            {...form.register('commission_trigger_description')}
          />
        </div>
        <div className="field">
          <label htmlFor="qualifying_conditions">Qualifying conditions</label>
          <textarea
            id="qualifying_conditions"
            disabled={disabled}
            {...form.register('qualifying_conditions')}
          />
        </div>
      </section>

      <section className="form-section">
        <h2>Policies & claims</h2>
        {(
          [
            ['refund_cancellation_rules', 'Refund / cancellation rules'],
            ['approved_claims', 'Approved claims'],
            ['prohibited_claims', 'Prohibited claims'],
            ['brand_use_rules', 'Brand-use rules'],
            ['geographic_customer_restrictions', 'Geographic / customer restrictions'],
            ['approved_copy', 'Approved copy'],
            ['terms', 'Terms'],
          ] as const
        ).map(([name, label]) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <textarea id={name} disabled={disabled} {...form.register(name)} />
          </div>
        ))}
        <div className="stack stack--sm">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Marketing links</strong>
            {!readOnly ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => links.append({ url: '' })}
              >
                Add link
              </Button>
            ) : null}
          </div>
          {links.fields.map((field, index) => (
            <div className="row" key={field.id}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor={`link-${index}`}>URL</label>
                <input
                  id={`link-${index}`}
                  disabled={disabled}
                  {...form.register(`marketing_links.${index}.url`)}
                />
              </div>
              {!readOnly ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => links.remove(index)}
                  style={{ alignSelf: 'end' }}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="form-section">
        <h2>Payment destination</h2>
        <p className="form-section__lead">
          Where customers should pay you (Customer → Business). Never imply MarcatursHub processes
          the purchase.
        </p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="payment_destination_name">Destination name</label>
            <input
              id="payment_destination_name"
              disabled={disabled}
              {...form.register('payment_destination_name')}
            />
          </div>
          <div className="field">
            <label htmlFor="payment_provider">Provider</label>
            <input
              id="payment_provider"
              disabled={disabled}
              {...form.register('payment_provider')}
            />
          </div>
          <div className="field">
            <label htmlFor="payment_account_identifier">Account identifier</label>
            <input
              id="payment_account_identifier"
              disabled={disabled}
              autoComplete="off"
              {...form.register('payment_account_identifier')}
            />
          </div>
          <div className="field">
            <label htmlFor="payment_contact">Payment contact</label>
            <input id="payment_contact" disabled={disabled} {...form.register('payment_contact')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="payment_instructions">Payment instructions</label>
          <textarea
            id="payment_instructions"
            disabled={disabled}
            {...form.register('payment_instructions')}
          />
        </div>
      </section>

      {!readOnly ? (
        <div className="action-bar">
          <Button type="submit" disabled={disabled}>
            {save.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => {
              if (
                !window.confirm(
                  'Publish this commercial version? Terms will become immutable. The campaign will not go live until submitted, approved, and activated.',
                )
              ) {
                return
              }
              setMessage(null)
              setError(null)
              publish.mutate()
            }}
          >
            {publish.isPending ? 'Publishing…' : 'Publish version'}
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert--danger" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="alert alert--success" role="status">
          {message}
        </div>
      ) : null}
    </form>
  )
}

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useForm, useFieldArray, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { publishCampaignVersion, updateCampaignVersion } from './api'
import { fieldErrorsFromApi } from './format'
import { businessCampaignKeys } from './queryKeys'
import type { CampaignVersion, CampaignVersionInput } from './types'
import {
  VERSION_FIELD_LABELS,
  VERSION_FIELD_ORDER,
  buildVersionPayload,
  checkPublishable,
  formPathForServerKey,
  friendlyServerFieldMessage,
  isFieldApplicable,
  isRequiredToPublish,
  toVersionFormValues,
  versionFormSchema,
  type VersionFieldErrors,
  type VersionFieldName,
  type VersionFormValues,
} from './versionForm'

type FormPath = FieldPath<VersionFormValues>
type SummaryContext = 'publish' | 'save'
type SummaryItem = { path: string; inputId: string; label: string; message: string }

type FieldA11y = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

function VersionField({
  id,
  label,
  requirement,
  helper,
  error,
  className,
  children,
}: {
  id: string
  label: string
  requirement?: 'required' | 'optional'
  helper?: string
  error?: string
  className?: string
  children: (a11y: FieldA11y) => ReactNode
}) {
  const helpId = helper ? `${id}-help` : null
  const errorId = error ? `${id}-error` : null
  const describedBy = [helpId, errorId].filter(Boolean).join(' ')
  return (
    <div className={['field', error ? 'field--invalid' : '', className].filter(Boolean).join(' ')}>
      <label htmlFor={id}>
        {label}
        {requirement === 'required' ? (
          <>
            <span className="field__required" aria-hidden="true">
              {' '}
              *
            </span>
            <span className="visually-hidden"> (required to publish)</span>
          </>
        ) : null}
        {requirement === 'optional' ? <span className="field__optional"> (optional)</span> : null}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {helper ? (
        <p id={helpId ?? undefined} className="field__help">
          {helper}
        </p>
      ) : null}
      {error ? (
        <p id={errorId ?? undefined} className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const CONDITIONAL_DEPENDENTS: Partial<Record<VersionFieldName, VersionFieldName[]>> = {
  pricing_method: ['price_amount'],
  commission_type: ['commission_rate', 'commission_amount'],
  commission_trigger: ['commission_trigger_description'],
}

export function CampaignVersionEditor({
  campaignId,
  version,
  readOnly,
  onDirtyChange,
}: {
  campaignId: number
  version: CampaignVersion
  readOnly: boolean
  onDirtyChange?: (dirty: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summaryContext, setSummaryContext] = useState<SummaryContext | null>(null)
  const [summaryFocusRequest, setSummaryFocusRequest] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)

  const form = useForm<VersionFormValues>({
    resolver: zodResolver(versionFormSchema),
    defaultValues: toVersionFormValues(version),
  })

  const links = useFieldArray({ control: form.control, name: 'marketing_links' })

  useEffect(() => {
    form.reset(toVersionFormValues(version))
  }, [version, form])

  const dirty = !readOnly && form.formState.isDirty

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (summaryFocusRequest > 0) summaryRef.current?.focus()
  }, [summaryFocusRequest])

  const pricingMethod = useWatch({ control: form.control, name: 'pricing_method' })
  const commissionType = useWatch({ control: form.control, name: 'commission_type' })
  const commissionTrigger = useWatch({ control: form.control, name: 'commission_trigger' })
  const conditions = {
    pricing_method: pricingMethod,
    commission_type: commissionType,
    commission_trigger: commissionTrigger,
  }

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: businessCampaignKeys.detail(campaignId) }),
      queryClient.invalidateQueries({ queryKey: businessCampaignKeys.versions(campaignId) }),
      queryClient.invalidateQueries({ queryKey: businessCampaignKeys.list() }),
    ])
  }

  const showFieldErrors = (
    errors: VersionFieldErrors | Record<string, string>,
    context: SummaryContext,
  ) => {
    for (const [path, msg] of Object.entries(errors)) {
      if (msg) form.setError(path as FormPath, { type: 'manual', message: msg })
    }
    setSummaryContext(context)
    setSummaryFocusRequest((n) => n + 1)
  }

  const handleServerError = (err: unknown, context: SummaryContext, fallback: string) => {
    setMessage(null)
    if (!(err instanceof ApiClientError)) {
      setError(fallback)
      return
    }
    const mapped: Record<string, string> = {}
    const unmapped: string[] = []
    for (const [key, msg] of Object.entries(fieldErrorsFromApi(err))) {
      const path = formPathForServerKey(key)
      if (path.startsWith('marketing_links.') || path in VERSION_FIELD_LABELS) {
        mapped[path] = friendlyServerFieldMessage(key, msg)
      } else {
        unmapped.push(msg)
      }
    }
    if (Object.keys(mapped).length > 0) {
      setError(unmapped.length > 0 ? unmapped.join(' ') : null)
      showFieldErrors(mapped, context)
    } else {
      setError(unmapped.length > 0 ? unmapped.join(' ') : err.message)
    }
    if (err.status === 409) void invalidate()
  }

  const resetFeedback = () => {
    setMessage(null)
    setError(null)
    setSummaryContext(null)
    form.clearErrors()
  }

  const save = useMutation({
    mutationFn: (payload: CampaignVersionInput) =>
      updateCampaignVersion(campaignId, version.version_number, payload),
    onSuccess: async () => {
      setError(null)
      setMessage('Draft version saved.')
      form.reset(form.getValues())
      await invalidate()
    },
    onError: (err) => handleServerError(err, 'save', 'Save failed.'),
  })

  const publish = useMutation({
    mutationFn: async (payload: CampaignVersionInput) => {
      await updateCampaignVersion(campaignId, version.version_number, payload)
      form.reset(form.getValues(), { keepErrors: true })
      return publishCampaignVersion(campaignId, version.version_number)
    },
    onSuccess: async () => {
      setError(null)
      setMessage(
        'Commercial version published. This freezes terms. The campaign is not marketplace-active until submitted, approved, and activated.',
      )
      form.reset(form.getValues())
      await invalidate()
    },
    onError: (err) => handleServerError(err, 'publish', 'Publish failed.'),
  })

  const attemptPublish = async () => {
    resetFeedback()
    const schemaValid = await form.trigger()
    const values = form.getValues()
    const publishErrors = checkPublishable(values)
    if (!schemaValid || Object.keys(publishErrors).length > 0) {
      showFieldErrors(publishErrors, 'publish')
      return
    }
    if (
      !window.confirm(
        'Publish this commercial version? Terms will become immutable. The campaign will not go live until submitted, approved, and activated.',
      )
    ) {
      return
    }
    publish.mutate(buildVersionPayload(values).payload)
  }

  const register = (name: VersionFieldName) =>
    form.register(name, {
      onChange: () => {
        form.clearErrors([name, ...(CONDITIONAL_DEPENDENTS[name] ?? [])])
      },
    })

  const fieldError = (name: VersionFieldName): string | undefined =>
    form.formState.errors[name]?.message

  const requirement = (name: VersionFieldName): 'required' | undefined =>
    !readOnly && isRequiredToPublish(name, conditions) ? 'required' : undefined

  const summaryItems: SummaryItem[] = []
  for (const name of VERSION_FIELD_ORDER) {
    const msg = fieldError(name)
    if (msg) {
      summaryItems.push({
        path: name,
        inputId: name,
        label: VERSION_FIELD_LABELS[name],
        message: msg,
      })
    }
  }
  links.fields.forEach((_, index) => {
    const msg = form.formState.errors.marketing_links?.[index]?.url?.message
    if (msg) {
      summaryItems.push({
        path: `marketing_links.${index}.url`,
        inputId: `link-${index}`,
        label: `Marketing link ${index + 1}`,
        message: msg,
      })
    }
  })

  const showSummary = summaryContext !== null && summaryItems.length > 0
  const disabled = readOnly || save.isPending || publish.isPending

  const textInput = (
    name: VersionFieldName,
    opts: { helper?: string; autoComplete?: string } = {},
  ) => (
    <VersionField
      id={name}
      label={VERSION_FIELD_LABELS[name]}
      requirement={requirement(name)}
      helper={readOnly ? undefined : opts.helper}
      error={fieldError(name)}
    >
      {(a11y) => (
        <input {...a11y} disabled={disabled} autoComplete={opts.autoComplete} {...register(name)} />
      )}
    </VersionField>
  )

  const numberInput = (name: VersionFieldName, helper: string, label?: string) => (
    <VersionField
      id={name}
      label={label ?? VERSION_FIELD_LABELS[name]}
      requirement={requirement(name)}
      helper={readOnly ? undefined : helper}
      error={fieldError(name)}
    >
      {(a11y) => <input {...a11y} inputMode="decimal" disabled={disabled} {...register(name)} />}
    </VersionField>
  )

  const textArea = (name: VersionFieldName, helper?: string) => (
    <VersionField
      id={name}
      label={VERSION_FIELD_LABELS[name]}
      requirement={requirement(name)}
      helper={readOnly ? undefined : helper}
      error={fieldError(name)}
    >
      {(a11y) => <textarea {...a11y} disabled={disabled} {...register(name)} />}
    </VersionField>
  )

  return (
    <form
      className="stack"
      noValidate
      onSubmit={form.handleSubmit(
        (values) => {
          resetFeedback()
          const { payload, errors } = buildVersionPayload(values)
          if (Object.keys(errors).length > 0) {
            showFieldErrors(errors, 'save')
            return
          }
          save.mutate(payload)
        },
        () => {
          setMessage(null)
          setSummaryContext('save')
          setSummaryFocusRequest((n) => n + 1)
        },
      )}
    >
      {readOnly ? (
        <div className="alert alert--info">
          This version is published and immutable. Create a new draft version to change commercial
          terms when the campaign status allows it.
        </div>
      ) : (
        <div className="alert alert--info">
          Publishing freezes commercial terms for this version. It does not activate the campaign
          listing. Fields marked <span aria-hidden="true">*</span>
          <span className="visually-hidden">as required</span> are required to publish — you can
          save a draft at any time.
        </div>
      )}

      {showSummary ? (
        <div
          ref={summaryRef}
          className="alert alert--danger error-summary"
          role="alert"
          tabIndex={-1}
          aria-labelledby="version-error-summary-title"
        >
          <p id="version-error-summary-title" className="error-summary__title">
            {summaryContext === 'publish'
              ? 'Some details need attention before publishing.'
              : 'Some details need attention before saving.'}
          </p>
          <ul className="error-summary__list">
            {summaryItems.map((item) => (
              <li key={item.path}>
                <a
                  href={`#${item.inputId}`}
                  onClick={(event) => {
                    event.preventDefault()
                    document.getElementById(item.inputId)?.focus()
                  }}
                >
                  {item.label}
                </a>
                : {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="form-section">
        <h2>Product & pricing</h2>
        <p className="form-section__lead">What ambassadors will promote and how it is priced.</p>
        <div className="grid-2">
          {textInput('product_name')}
          {textInput('service_area')}
        </div>
        {textArea('product_description')}
        <div className="grid-2">
          <VersionField
            id="pricing_method"
            label={VERSION_FIELD_LABELS.pricing_method}
            requirement={requirement('pricing_method')}
            error={fieldError('pricing_method')}
          >
            {(a11y) => (
              <select {...a11y} disabled={disabled} {...register('pricing_method')}>
                <option value="">Select</option>
                <option value="fixed">Fixed</option>
                <option value="quote">Quote</option>
                <option value="other">Other</option>
              </select>
            )}
          </VersionField>
          <VersionField
            id="price_currency"
            label={VERSION_FIELD_LABELS.price_currency}
            error={fieldError('price_currency')}
          >
            {(a11y) => (
              <input {...a11y} disabled={disabled} maxLength={3} {...register('price_currency')} />
            )}
          </VersionField>
          {isFieldApplicable('price_amount', conditions) ? (
            <VersionField
              id="price_amount"
              label={VERSION_FIELD_LABELS.price_amount}
              requirement={
                readOnly ? undefined : pricingMethod === 'fixed' ? 'required' : 'optional'
              }
              helper={readOnly ? undefined : 'For example 250,000 or 250000.50.'}
              error={fieldError('price_amount')}
            >
              {(a11y) => (
                <input
                  {...a11y}
                  inputMode="decimal"
                  disabled={disabled}
                  {...register('price_amount')}
                />
              )}
            </VersionField>
          ) : null}
        </div>
        {pricingMethod === 'quote' && !readOnly ? (
          <p className="field__help">Quote pricing: customers agree a price with you directly.</p>
        ) : null}
      </section>

      <section className="form-section">
        <h2>Commission</h2>
        <p className="form-section__lead">
          Business → Ambassador settlement terms. MarcatursHub does not pay ambassadors.
        </p>
        <div className="grid-2">
          <VersionField
            id="commission_type"
            label={VERSION_FIELD_LABELS.commission_type}
            requirement={requirement('commission_type')}
            error={fieldError('commission_type')}
          >
            {(a11y) => (
              <select {...a11y} disabled={disabled} {...register('commission_type')}>
                <option value="">Select</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed</option>
              </select>
            )}
          </VersionField>
          <VersionField
            id="commission_trigger"
            label={VERSION_FIELD_LABELS.commission_trigger}
            requirement={requirement('commission_trigger')}
            error={fieldError('commission_trigger')}
          >
            {(a11y) => (
              <select {...a11y} disabled={disabled} {...register('commission_trigger')}>
                <option value="">Select</option>
                <option value="payment_confirmation">Payment confirmation</option>
                <option value="other">Other</option>
              </select>
            )}
          </VersionField>
          {isFieldApplicable('commission_rate', conditions)
            ? numberInput('commission_rate', 'For example 10 for 10% of the qualifying payment.')
            : null}
          {isFieldApplicable('commission_amount', conditions)
            ? numberInput(
                'commission_amount',
                'Fixed amount per qualifying sale, for example 5,000.',
              )
            : null}
          {numberInput(
            'commission_payment_deadline_days',
            'Calendar days you have to pay commission after confirming the customer’s payment: 1 to 7. Seven days is the platform maximum.',
          )}
          {numberInput(
            'minimum_qualifying_amount',
            'Optional. Smallest customer payment that earns commission.',
          )}
        </div>
        {isFieldApplicable('commission_trigger_description', conditions)
          ? textInput('commission_trigger_description', {
              helper: 'Describe exactly when commission becomes due.',
            })
          : null}
        {textArea('qualifying_conditions')}
      </section>

      <section className="form-section">
        <h2>Policies & claims</h2>
        {textArea('refund_cancellation_rules')}
        {textArea('approved_claims')}
        {textArea('prohibited_claims')}
        {textArea('brand_use_rules')}
        {textArea('geographic_customer_restrictions')}
        {textArea('approved_copy')}
        {textArea('terms')}
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
          {links.fields.map((field, index) => {
            const linkError = form.formState.errors.marketing_links?.[index]?.url?.message
            return (
              <div className="row" key={field.id}>
                <VersionField
                  id={`link-${index}`}
                  label="URL"
                  error={linkError}
                  className="field--grow"
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      disabled={disabled}
                      {...form.register(`marketing_links.${index}.url`, {
                        onChange: () => form.clearErrors(`marketing_links.${index}.url`),
                      })}
                    />
                  )}
                </VersionField>
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
            )
          })}
        </div>
      </section>

      <section className="form-section">
        <h2>Official payment details</h2>
        <p className="form-section__lead">
          Where customers pay your business directly. MarcatursHub does not receive or hold this
          payment.
        </p>
        <div className="grid-2">
          {textInput('payment_destination_name', {
            helper: 'Name exactly as it appears on the account.',
          })}
          {textInput('payment_provider', {
            helper:
              'For example GTBank, Access Bank, Moniepoint, OPay, or another payment provider.',
          })}
          {textInput('payment_account_identifier', {
            helper: 'Bank account number, wallet or merchant ID, or another payment identifier.',
            autoComplete: 'off',
          })}
          <VersionField
            id="payment_contact"
            label={VERSION_FIELD_LABELS.payment_contact}
            requirement={readOnly ? undefined : 'optional'}
            helper={
              readOnly
                ? undefined
                : 'Phone number or email customers can use for payment questions.'
            }
            error={fieldError('payment_contact')}
          >
            {(a11y) => <input {...a11y} disabled={disabled} {...register('payment_contact')} />}
          </VersionField>
        </div>
        {textArea(
          'payment_instructions',
          'For example: Use your full name as the transfer narration.',
        )}
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
            onClick={() => void attemptPublish()}
          >
            {publish.isPending ? 'Publishing…' : 'Publish version'}
          </Button>
        </div>
      ) : null}

      {showSummary ? (
        <p className="field__error">
          Some details need attention — see the list at the top of this form.
        </p>
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

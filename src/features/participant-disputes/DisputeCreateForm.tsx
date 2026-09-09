import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { UserRole } from '@/shared/types/auth'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import { createDispute } from './api'
import { disputeKeys } from './queryKeys'
import type { DisputeCategory } from './types'

const schema = z.object({
  deal_id: z.coerce.number().int().positive('Choose a Deal'),
  category_id: z.coerce.number().int().positive('Choose a dispute category'),
  description: z
    .string()
    .min(10, 'Describe the issue in at least 10 characters')
    .max(5000, 'Keep the description within 5000 characters'),
})

type FormValues = z.infer<typeof schema>

export function DisputeCreateForm({
  role,
  categories,
  initialDealId,
  onCreated,
}: {
  role: UserRole
  categories: DisputeCategory[]
  initialDealId?: number | null
  onCreated: (disputeId: number, dealId: number) => void
}) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deal_id: initialDealId ?? undefined,
      category_id: undefined,
      description: '',
    },
  })

  useEffect(() => {
    if (initialDealId) {
      form.setValue('deal_id', initialDealId)
    }
  }, [form, initialDealId])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [categories],
  )

  const mutation = useMutation({
    mutationFn: async (values: FormValues) =>
      createDispute(values.deal_id, {
        category_id: values.category_id,
        description: values.description.trim(),
      }),
    onSuccess: async (dispute, values) => {
      setFormError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: disputeKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['deals'] }),
        queryClient.invalidateQueries({ queryKey: ['business-deals'] }),
      ])
      onCreated(dispute.id, values.deal_id)
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setFormError(error.message)
        const fields = fieldErrorsFromApi(error)
        if (fields.category_id) form.setError('category_id', { message: fields.category_id })
        if (fields.description) form.setError('description', { message: fields.description })
        if (fields.deal_id) form.setError('deal_id', { message: fields.deal_id })
        return
      }
      setFormError('Could not open dispute.')
    },
  })

  return (
    <form
      className="card stack"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        mutation.mutate(values)
      })}
    >
      <h2>Open a dispute</h2>
      <p className="form-section__lead">
        Opening a dispute creates a review case concerning this Deal. It does not automatically
        change the Deal status or reverse any payment.
      </p>
      <div className="field">
        <label htmlFor={`${role}-dispute-deal`}>Deal ID</label>
        <input id={`${role}-dispute-deal`} inputMode="numeric" {...form.register('deal_id')} />
        {form.formState.errors.deal_id ? (
          <p className="field-error">{form.formState.errors.deal_id.message}</p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={`${role}-dispute-category`}>Category</label>
        <select id={`${role}-dispute-category`} defaultValue="" {...form.register('category_id')}>
          <option value="" disabled>
            Select a category
          </option>
          {sortedCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {form.formState.errors.category_id ? (
          <p className="field-error">{form.formState.errors.category_id.message}</p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor={`${role}-dispute-description`}>What happened?</label>
        <textarea
          id={`${role}-dispute-description`}
          rows={5}
          {...form.register('description')}
          placeholder={
            role === 'BUSINESS'
              ? 'Describe the commercial issue you need reviewed.'
              : 'Describe the issue affecting this Deal or commission.'
          }
        />
        {form.formState.errors.description ? (
          <p className="field-error">{form.formState.errors.description.message}</p>
        ) : null}
      </div>
      {formError ? <div className="alert alert--danger">{formError}</div> : null}
      <div className="action-bar">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Opening…' : 'Open dispute'}
        </Button>
      </div>
    </form>
  )
}

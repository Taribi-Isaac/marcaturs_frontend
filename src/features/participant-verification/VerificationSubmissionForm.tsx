import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { createVerificationSubmission, resubmitVerificationSubmission } from './api'
import { verificationKeys } from './queryKeys'
import { requirementTypeLabel } from './status'
import type { VerificationRequirementItem } from './types'
import { VERIFICATION_EVIDENCE_ACCEPT, VERIFICATION_MAX_EVIDENCE_KB } from './types'

type Props = {
  item: VerificationRequirementItem
  mode: 'submit' | 'resubmit'
}

function buildSchema(
  requirementType: VerificationRequirementItem['requirement']['requirement_type'],
) {
  const needsFile = requirementType === 'document'
  const needsText = requirementType !== 'document'

  return z
    .object({
      text_value: z.string().max(5000, 'Keep the response within 5000 characters').optional(),
      evidence: z.any().optional(),
    })
    .superRefine((values, ctx) => {
      const text = values.text_value?.trim() ?? ''
      const files = values.evidence
      const hasFile = files instanceof FileList && files.length > 0

      if (needsText && !text) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a response for this requirement.',
          path: ['text_value'],
        })
      }

      if (requirementType === 'email' && text) {
        const emailOk = z.string().email().safeParse(text).success
        if (!emailOk) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter a valid email address.',
            path: ['text_value'],
          })
        }
      }

      if (needsFile && !hasFile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose a document to upload.',
          path: ['evidence'],
        })
      }

      if (hasFile) {
        const file = (files as FileList)[0]!
        const maxBytes = VERIFICATION_MAX_EVIDENCE_KB * 1024
        if (file.size > maxBytes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `File must be ${VERIFICATION_MAX_EVIDENCE_KB} KB or smaller.`,
            path: ['evidence'],
          })
        }
      }
    })
}

type FormValues = {
  text_value?: string
  evidence?: FileList
}

export function VerificationSubmissionForm({ item, mode }: Props) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const requirement = item.requirement
  const schema = useMemo(
    () => buildSchema(requirement.requirement_type),
    [requirement.requirement_type],
  )
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text_value: item.submission?.text_value ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const text = values.text_value?.trim() || undefined
      const file =
        values.evidence instanceof FileList && values.evidence.length > 0
          ? values.evidence[0]
          : undefined

      if (mode === 'submit') {
        return createVerificationSubmission({
          requirement_id: requirement.id,
          text_value: text,
          evidence: file,
        })
      }

      if (!item.submission) {
        throw new ApiClientError({
          code: 'conflict',
          message: 'This submission is no longer available to update.',
          status: 409,
        })
      }

      return resubmitVerificationSubmission(item.submission.id, {
        text_value: text,
        evidence: file,
      })
    },
    onSuccess: async () => {
      setFormError(null)
      form.reset({ text_value: '' })
      await queryClient.invalidateQueries({ queryKey: verificationKeys.all })
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setFormError(error.message)
        const fields = fieldErrorsFromApi(error)
        if (fields.text_value) form.setError('text_value', { message: fields.text_value })
        if (fields.evidence) form.setError('evidence', { message: fields.evidence })
        if (fields.requirement_id) setFormError(fields.requirement_id)
        if (error.status === 409) {
          void queryClient.invalidateQueries({ queryKey: verificationKeys.all })
        }
        return
      }
      setFormError('Could not save this verification submission.')
    },
  })

  const isDocument = requirement.requirement_type === 'document'
  const inputId = `verification-${requirement.id}-${mode}`

  return (
    <form
      className="verification-submit stack"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        mutation.mutate(values)
      })}
      noValidate
    >
      <p className="form-section__lead">
        {mode === 'resubmit'
          ? 'Resubmitting replaces the current submission for this requirement and returns it to pending review.'
          : `${requirementTypeLabel(requirement.requirement_type)}. Evidence stays private and is only reviewed by MarcatursHub.`}
      </p>

      {!isDocument ? (
        <div className="field">
          <label htmlFor={`${inputId}-text`}>
            {requirement.requirement_type === 'email'
              ? 'Email'
              : requirement.requirement_type === 'phone'
                ? 'Phone'
                : 'Response'}
          </label>
          {requirement.requirement_type === 'text' || requirement.requirement_type === 'other' ? (
            <textarea
              id={`${inputId}-text`}
              rows={3}
              maxLength={5000}
              disabled={mutation.isPending}
              {...form.register('text_value')}
            />
          ) : (
            <input
              id={`${inputId}-text`}
              type={requirement.requirement_type === 'email' ? 'email' : 'text'}
              maxLength={5000}
              disabled={mutation.isPending}
              {...form.register('text_value')}
            />
          )}
          {form.formState.errors.text_value ? (
            <p className="field-error" role="alert">
              {String(form.formState.errors.text_value.message)}
            </p>
          ) : null}
        </div>
      ) : null}

      {isDocument ? (
        <div className="field">
          <label htmlFor={`${inputId}-file`}>Document</label>
          <input
            id={`${inputId}-file`}
            type="file"
            accept={VERIFICATION_EVIDENCE_ACCEPT}
            disabled={mutation.isPending}
            {...form.register('evidence')}
          />
          <p className="campaign-row__meta">
            PDF or image (JPEG, PNG, WebP). Maximum {VERIFICATION_MAX_EVIDENCE_KB} KB.
          </p>
          {form.formState.errors.evidence ? (
            <p className="field-error" role="alert">
              {String(form.formState.errors.evidence.message)}
            </p>
          ) : null}
        </div>
      ) : null}

      {formError ? (
        <div className="alert alert--danger" role="alert">
          {formError}
        </div>
      ) : null}

      <div className="action-bar">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? mode === 'resubmit'
              ? 'Resubmitting…'
              : 'Submitting…'
            : mode === 'resubmit'
              ? 'Resubmit for review'
              : 'Submit for review'}
        </Button>
      </div>
    </form>
  )
}

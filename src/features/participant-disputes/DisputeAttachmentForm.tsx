import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import { uploadDisputeAttachment } from './api'
import { disputeKeys } from './queryKeys'

const schema = z.object({
  file: z.any().refine((value) => value instanceof FileList && value.length > 0, 'Choose a file'),
  note: z.string().max(500, 'Keep the note within 500 characters').optional(),
})

type FormValues = z.infer<typeof schema>

export function DisputeAttachmentForm({ disputeId }: { disputeId: number }) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { note: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) =>
      uploadDisputeAttachment(disputeId, {
        file: values.file[0],
        note: values.note?.trim() || undefined,
      }),
    onSuccess: async () => {
      setFormError(null)
      form.reset({ note: '' })
      await queryClient.invalidateQueries({ queryKey: disputeKeys.detail(disputeId) })
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setFormError(error.message)
        const fields = fieldErrorsFromApi(error)
        if (fields.file) form.setError('file', { message: fields.file })
        if (fields.note) form.setError('note', { message: fields.note })
        if (error.status === 409) {
          void queryClient.invalidateQueries({ queryKey: disputeKeys.detail(disputeId) })
        }
        return
      }
      setFormError('Could not upload attachment.')
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
      <h2>Upload supporting file</h2>
      <p className="form-section__lead">
        Use private files only. Upload is authenticated and available only while this dispute state
        accepts participant attachments.
      </p>
      <div className="field">
        <label htmlFor="dispute-file">File</label>
        <input
          id="dispute-file"
          type="file"
          accept=".pdf,.jpeg,.jpg,.png,.webp,image/*"
          {...form.register('file')}
        />
        {form.formState.errors.file ? (
          <p className="field-error">{String(form.formState.errors.file.message)}</p>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="dispute-note">Note</label>
        <textarea id="dispute-note" rows={3} {...form.register('note')} />
        {form.formState.errors.note ? (
          <p className="field-error">{form.formState.errors.note.message}</p>
        ) : null}
      </div>
      {formError ? <div className="alert alert--danger">{formError}</div> : null}
      <div className="action-bar">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Uploading…' : 'Upload attachment'}
        </Button>
      </div>
    </form>
  )
}

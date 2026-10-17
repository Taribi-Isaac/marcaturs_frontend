import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ApiClientError } from '@/shared/api/errors'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { ErrorState, LoadingState, PageMeta } from '@/shared/ui/States'
import { createCampaign, fetchCategories } from './api'
import { categoryErrorFromApi, fieldErrorsFromApi } from './format'
import { businessCampaignKeys } from './queryKeys'

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  category_id: z.coerce.number().int().positive('Choose a category'),
})

type FormValues = z.infer<typeof schema>

export function CampaignCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)

  const categories = useQuery({
    queryKey: businessCampaignKeys.categories(),
    queryFn: ({ signal }) => fetchCategories(signal),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', category_id: 0 },
  })

  const create = useMutation({
    mutationFn: createCampaign,
    onSuccess: async (campaign) => {
      await queryClient.invalidateQueries({ queryKey: businessCampaignKeys.list() })
      navigate(`/app/business/campaigns/${campaign.id}?tab=version`, {
        replace: true,
        state: { created: true },
      })
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        const fields = fieldErrorsFromApi(error)
        const categoryMessage = categoryErrorFromApi(error)
        if (categoryMessage) fields.category_id = categoryMessage
        let mapped = 0
        for (const [key, message] of Object.entries(fields)) {
          if (key === 'title' || key === 'category_id') {
            form.setError(key, { message })
            mapped += 1
          }
        }
        setFormError(mapped > 0 ? null : error.message)
      } else {
        setFormError('Could not create campaign.')
      }
    },
  })

  const assignable = (categories.data ?? []).filter((c) => c.listing_status === 'allowed')

  return (
    <>
      <PageMeta title="Create campaign" description="Start a new draft campaign listing." />
      <div className="desk-page reveal">
        <p>
          <Link to="/app/business/campaigns">← Campaigns</Link>
        </p>
        <header className="desk-header">
          <div>
            <h1>Create campaign</h1>
            <p>
              Start with listing identity only. Commercial terms live on a campaign version you
              create next.
            </p>
          </div>
        </header>

        {categories.isLoading ? <LoadingState label="Loading categories…" /> : null}
        {categories.isError ? (
          <ErrorState title="Categories unavailable">Try again shortly.</ErrorState>
        ) : null}

        {categories.isSuccess ? (
          <form
            className="card stack"
            onSubmit={form.handleSubmit((values) => {
              setFormError(null)
              create.mutate({ title: values.title, category_id: values.category_id })
            })}
          >
            {formError ? (
              <div className="alert alert--danger" role="alert">
                {formError}
              </div>
            ) : null}
            <div className={`field${form.formState.errors.title ? ' field--invalid' : ''}`}>
              <label htmlFor="campaign-title">Campaign title</label>
              <input
                id="campaign-title"
                aria-invalid={form.formState.errors.title ? true : undefined}
                aria-describedby={form.formState.errors.title ? 'campaign-title-error' : undefined}
                {...form.register('title')}
              />
              {form.formState.errors.title ? (
                <p id="campaign-title-error" className="field__error">
                  {form.formState.errors.title.message}
                </p>
              ) : null}
            </div>
            <div className={`field${form.formState.errors.category_id ? ' field--invalid' : ''}`}>
              <label htmlFor="campaign-category">Category</label>
              <select
                id="campaign-category"
                aria-invalid={form.formState.errors.category_id ? true : undefined}
                aria-describedby={
                  form.formState.errors.category_id ? 'campaign-category-error' : undefined
                }
                {...form.register('category_id')}
              >
                <option value={0}>Select a category</option>
                {assignable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.category_id ? (
                <p id="campaign-category-error" className="field__error">
                  {form.formState.errors.category_id.message}
                </p>
              ) : null}
            </div>
            <div className="action-bar">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create draft'}
              </Button>
              <ButtonLink to="/app/business/campaigns" variant="secondary">
                Cancel
              </ButtonLink>
            </div>
          </form>
        ) : null}
      </div>
    </>
  )
}

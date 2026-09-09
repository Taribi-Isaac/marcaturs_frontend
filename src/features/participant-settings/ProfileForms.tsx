import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { fieldErrorsFromApi } from '@/features/ambassador-deals/helpers'
import { ApiClientError } from '@/shared/api/errors'
import { Button } from '@/shared/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/shared/ui/States'
import {
  createAmbassadorProfile,
  createBusinessProfile,
  fetchAmbassadorProfile,
  fetchBusinessProfile,
  updateAmbassadorProfile,
  updateBusinessProfile,
} from './api'
import { formatTagList, parseTagList } from './presentation'
import { settingsKeys } from './queryKeys'
import type { AmbassadorProfile, BusinessProfile } from './types'

const businessSchema = z.object({
  legal_name: z.string().trim().min(1, 'Legal name is required.').max(255),
  trading_name: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  operating_location: z.string().max(255).optional(),
  contact_email: z
    .string()
    .max(255)
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Enter a valid contact email.',
    }),
  contact_phone: z.string().max(32).optional(),
  website: z.string().max(255).optional(),
})

const ambassadorSchema = z.object({
  display_name: z.string().trim().min(1, 'Display name is required.').max(255),
  profile_description: z.string().max(5000).optional(),
  location: z.string().max(255).optional(),
  skills: z.string().optional(),
  marketing_interests: z.string().optional(),
  experience: z.string().max(5000).optional(),
})

type BusinessFormValues = z.infer<typeof businessSchema>
type AmbassadorFormValues = z.infer<typeof ambassadorSchema>

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed ? trimmed : null
}

export function BusinessProfileSection({ restricted }: { restricted: boolean }) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const profile = useQuery({
    queryKey: settingsKeys.businessProfile(),
    queryFn: ({ signal }) => fetchBusinessProfile(signal),
    enabled: !restricted,
    retry: false,
  })

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      legal_name: '',
      trading_name: '',
      description: '',
      category: '',
      address: '',
      operating_location: '',
      contact_email: '',
      contact_phone: '',
      website: '',
    },
  })

  useEffect(() => {
    if (!profile.data) return
    form.reset({
      legal_name: profile.data.legal_name ?? '',
      trading_name: profile.data.trading_name ?? '',
      description: profile.data.description ?? '',
      category: profile.data.category ?? '',
      address: profile.data.address ?? '',
      operating_location: profile.data.operating_location ?? '',
      contact_email: profile.data.contact_email ?? '',
      contact_phone: profile.data.contact_phone ?? '',
      website: profile.data.website ?? '',
    })
  }, [profile.data, form])

  const missing =
    profile.isError && profile.error instanceof ApiClientError && profile.error.status === 404
  const forbidden =
    restricted ||
    (profile.isError && profile.error instanceof ApiClientError && profile.error.status === 403)

  const mutation = useMutation({
    mutationFn: async (values: BusinessFormValues) => {
      const payload = {
        legal_name: values.legal_name.trim(),
        trading_name: emptyToNull(values.trading_name),
        description: emptyToNull(values.description),
        category: emptyToNull(values.category),
        address: emptyToNull(values.address),
        operating_location: emptyToNull(values.operating_location),
        contact_email: emptyToNull(values.contact_email),
        contact_phone: emptyToNull(values.contact_phone),
        website: emptyToNull(values.website),
      }
      if (missing) return createBusinessProfile(payload)
      return updateBusinessProfile(payload)
    },
    onSuccess: async (data: BusinessProfile) => {
      setFormError(null)
      setSuccess(missing ? 'Business profile created.' : 'Business profile updated.')
      queryClient.setQueryData(settingsKeys.businessProfile(), data)
      await queryClient.invalidateQueries({ queryKey: settingsKeys.businessProfile() })
    },
    onError: (error) => {
      setSuccess(null)
      if (error instanceof ApiClientError) {
        setFormError(error.message)
        const fields = fieldErrorsFromApi(error)
        for (const [key, message] of Object.entries(fields)) {
          form.setError(key as keyof BusinessFormValues, { message })
        }
        if (error.status === 409) {
          void queryClient.invalidateQueries({ queryKey: settingsKeys.businessProfile() })
        }
        return
      }
      setFormError('Could not save your business profile.')
    },
  })

  if (forbidden) {
    return (
      <p className="form-section__lead" role="status">
        Profile editing is unavailable while your account is restricted. Account identity and
        password settings remain available.
      </p>
    )
  }

  if (profile.isLoading) return <LoadingState label="Loading business profile…" />

  if (profile.isError && !missing) {
    return (
      <ErrorState title="Could not load business profile">
        <Button type="button" variant="secondary" size="sm" onClick={() => void profile.refetch()}>
          Retry
        </Button>
      </ErrorState>
    )
  }

  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        setSuccess(null)
        mutation.mutate(values)
      })}
      noValidate
    >
      {missing ? (
        <EmptyState title="No business profile yet">
          Create your Business profile to complete marketplace identity details. This is separate
          from your account email and name.
        </EmptyState>
      ) : (
        <p className="form-section__lead">
          Marketplace profile details for your Business. Account email and display name are managed
          separately above.
        </p>
      )}

      {(
        [
          ['legal_name', 'Legal name', 'input'],
          ['trading_name', 'Trading name', 'input'],
          ['description', 'Description', 'textarea'],
          ['category', 'Category', 'input'],
          ['address', 'Address', 'textarea'],
          ['operating_location', 'Operating location', 'input'],
          ['contact_email', 'Contact email', 'input'],
          ['contact_phone', 'Contact phone', 'input'],
          ['website', 'Website', 'input'],
        ] as const
      ).map(([name, label, kind]) => (
        <div className="field" key={name}>
          <label htmlFor={`business-${name}`}>{label}</label>
          {kind === 'textarea' ? (
            <textarea
              id={`business-${name}`}
              rows={name === 'description' ? 4 : 2}
              disabled={mutation.isPending}
              aria-invalid={form.formState.errors[name] ? true : undefined}
              {...form.register(name)}
            />
          ) : (
            <input
              id={`business-${name}`}
              type={name === 'contact_email' ? 'email' : 'text'}
              disabled={mutation.isPending}
              aria-invalid={form.formState.errors[name] ? true : undefined}
              {...form.register(name)}
            />
          )}
          {form.formState.errors[name] ? (
            <p className="field-error" role="alert">
              {String(form.formState.errors[name]?.message)}
            </p>
          ) : null}
        </div>
      ))}

      {formError ? (
        <div className="alert alert--danger" role="alert">
          {formError}
        </div>
      ) : null}
      {success ? (
        <div className="alert alert--success" role="status">
          {success}
        </div>
      ) : null}

      <div className="action-bar">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Saving…'
            : missing
              ? 'Create business profile'
              : 'Save business profile'}
        </Button>
      </div>
    </form>
  )
}

export function AmbassadorProfileSection({ restricted }: { restricted: boolean }) {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const profile = useQuery({
    queryKey: settingsKeys.ambassadorProfile(),
    queryFn: ({ signal }) => fetchAmbassadorProfile(signal),
    enabled: !restricted,
    retry: false,
  })

  const form = useForm<AmbassadorFormValues>({
    resolver: zodResolver(ambassadorSchema),
    defaultValues: {
      display_name: '',
      profile_description: '',
      location: '',
      skills: '',
      marketing_interests: '',
      experience: '',
    },
  })

  useEffect(() => {
    if (!profile.data) return
    form.reset({
      display_name: profile.data.display_name ?? '',
      profile_description: profile.data.profile_description ?? '',
      location: profile.data.location ?? '',
      skills: formatTagList(profile.data.skills),
      marketing_interests: formatTagList(profile.data.marketing_interests),
      experience: profile.data.experience ?? '',
    })
  }, [profile.data, form])

  const missing =
    profile.isError && profile.error instanceof ApiClientError && profile.error.status === 404
  const forbidden =
    restricted ||
    (profile.isError && profile.error instanceof ApiClientError && profile.error.status === 403)

  const mutation = useMutation({
    mutationFn: async (values: AmbassadorFormValues) => {
      const payload = {
        display_name: values.display_name.trim(),
        profile_description: emptyToNull(values.profile_description),
        location: emptyToNull(values.location),
        skills: parseTagList(values.skills ?? ''),
        marketing_interests: parseTagList(values.marketing_interests ?? ''),
        experience: emptyToNull(values.experience),
      }
      if (missing) return createAmbassadorProfile(payload)
      return updateAmbassadorProfile(payload)
    },
    onSuccess: async (data: AmbassadorProfile) => {
      setFormError(null)
      setSuccess(missing ? 'Ambassador profile created.' : 'Ambassador profile updated.')
      queryClient.setQueryData(settingsKeys.ambassadorProfile(), data)
      await queryClient.invalidateQueries({ queryKey: settingsKeys.ambassadorProfile() })
    },
    onError: (error) => {
      setSuccess(null)
      if (error instanceof ApiClientError) {
        setFormError(error.message)
        const fields = fieldErrorsFromApi(error)
        for (const [key, message] of Object.entries(fields)) {
          form.setError(key as keyof AmbassadorFormValues, { message })
        }
        if (error.status === 409) {
          void queryClient.invalidateQueries({ queryKey: settingsKeys.ambassadorProfile() })
        }
        return
      }
      setFormError('Could not save your ambassador profile.')
    },
  })

  if (forbidden) {
    return (
      <p className="form-section__lead" role="status">
        Profile editing is unavailable while your account is restricted. Account identity and
        password settings remain available.
      </p>
    )
  }

  if (profile.isLoading) return <LoadingState label="Loading ambassador profile…" />

  if (profile.isError && !missing) {
    return (
      <ErrorState title="Could not load ambassador profile">
        <Button type="button" variant="secondary" size="sm" onClick={() => void profile.refetch()}>
          Retry
        </Button>
      </ErrorState>
    )
  }

  return (
    <form
      className="stack"
      onSubmit={form.handleSubmit((values) => {
        setFormError(null)
        setSuccess(null)
        mutation.mutate(values)
      })}
      noValidate
    >
      {missing ? (
        <EmptyState title="No ambassador profile yet">
          Create your Ambassador profile. This is separate from your account email and name.
        </EmptyState>
      ) : (
        <p className="form-section__lead">
          Marketplace profile for Ambassadors. Skills and interests are comma-separated lists.
        </p>
      )}

      <div className="field">
        <label htmlFor="ambassador-display_name">Display name</label>
        <input
          id="ambassador-display_name"
          disabled={mutation.isPending}
          aria-invalid={form.formState.errors.display_name ? true : undefined}
          {...form.register('display_name')}
        />
        {form.formState.errors.display_name ? (
          <p className="field-error" role="alert">
            {form.formState.errors.display_name.message}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="ambassador-profile_description">Profile description</label>
        <textarea
          id="ambassador-profile_description"
          rows={4}
          disabled={mutation.isPending}
          {...form.register('profile_description')}
        />
      </div>

      <div className="field">
        <label htmlFor="ambassador-location">Location</label>
        <input
          id="ambassador-location"
          disabled={mutation.isPending}
          {...form.register('location')}
        />
      </div>

      <div className="field">
        <label htmlFor="ambassador-skills">Skills</label>
        <textarea
          id="ambassador-skills"
          rows={2}
          disabled={mutation.isPending}
          placeholder="e.g. Solar sales, Field marketing"
          {...form.register('skills')}
        />
      </div>

      <div className="field">
        <label htmlFor="ambassador-marketing_interests">Marketing interests</label>
        <textarea
          id="ambassador-marketing_interests"
          rows={2}
          disabled={mutation.isPending}
          {...form.register('marketing_interests')}
        />
      </div>

      <div className="field">
        <label htmlFor="ambassador-experience">Experience</label>
        <textarea
          id="ambassador-experience"
          rows={4}
          disabled={mutation.isPending}
          {...form.register('experience')}
        />
      </div>

      {formError ? (
        <div className="alert alert--danger" role="alert">
          {formError}
        </div>
      ) : null}
      {success ? (
        <div className="alert alert--success" role="status">
          {success}
        </div>
      ) : null}

      <div className="action-bar">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Saving…'
            : missing
              ? 'Create ambassador profile'
              : 'Save ambassador profile'}
        </Button>
      </div>
    </form>
  )
}

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type { AuthUser } from '@/shared/types/auth'
import type { AmbassadorProfile, BusinessProfile } from './types'

const businessUser: AuthUser = {
  id: 1,
  name: 'Ada Solar',
  email: 'business.solar@demo.marcaturshub.test',
  role: 'BUSINESS',
  status: 'active',
  email_verified_at: '2026-09-01T10:00:00+00:00',
  last_login_at: '2026-09-09T12:00:00+00:00',
  created_at: '2026-09-01T09:00:00+00:00',
}

const ambassadorUser: AuthUser = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR',
  status: 'active',
  email_verified_at: '2026-09-01T10:00:00+00:00',
  last_login_at: '2026-09-09T12:00:00+00:00',
  created_at: '2026-09-01T09:00:00+00:00',
}

const restrictedBusiness: AuthUser = {
  ...businessUser,
  id: 3,
  name: 'Restricted Biz',
  email: 'business.edu@demo.marcaturshub.test',
  status: 'restricted',
}

function makeBusinessProfile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    id: 10,
    legal_name: 'Ada Solar Ventures Ltd',
    trading_name: 'Ada Solar',
    description: 'Solar installations',
    category: 'Solar & Energy',
    address: 'Lagos',
    operating_location: 'Lagos',
    contact_email: 'ops@adasolar.test',
    contact_phone: '+2348000000000',
    website: 'https://adasolar.test',
    social_links: {},
    created_at: '2026-09-01T09:00:00+00:00',
    updated_at: '2026-09-09T09:00:00+00:00',
    ...overrides,
  }
}

function makeAmbassadorProfile(overrides: Partial<AmbassadorProfile> = {}): AmbassadorProfile {
  return {
    id: 20,
    display_name: 'Ada Okonkwo',
    profile_description: 'Field ambassador',
    location: 'Lagos',
    skills: ['Solar sales'],
    marketing_interests: ['Energy'],
    experience: '5 years',
    created_at: '2026-09-01T09:00:00+00:00',
    updated_at: '2026-09-09T09:00:00+00:00',
    ...overrides,
  }
}

let me: AuthUser | null = null
let businessProfile: BusinessProfile | null = makeBusinessProfile()
let ambassadorProfile: AmbassadorProfile | null = makeAmbassadorProfile()
let businessProfileFailure = 0
let changePasswordFailure = 0
let lastPasswordBody: Record<string, string> | null = null
let lastBusinessPatch: Record<string, unknown> | null = null
let overallStatus = 'VERIFIED'

const server = setupServer(
  http.get('/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get('/api/v1/auth/me', () => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: me })
  }),
  http.post('/api/v1/auth/logout', () => {
    me = null
    return HttpResponse.json({ success: true, data: null })
  }),
  http.get('/api/v1/businesses/me', () => {
    if (!me || me.role !== 'BUSINESS') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden.' } },
        { status: 403 },
      )
    }
    if (me.status === 'restricted' || businessProfileFailure === 403) {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden.' } },
        { status: 403 },
      )
    }
    if (!businessProfile) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found.' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: businessProfile })
  }),
  http.patch('/api/v1/businesses/me', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    lastBusinessPatch = body
    if (businessProfileFailure === 400) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Validation failed.',
            details: { legal_name: ['The legal name field is required.'] },
          },
        },
        { status: 400 },
      )
    }
    businessProfile = makeBusinessProfile({
      ...businessProfile!,
      legal_name: String(body.legal_name ?? businessProfile!.legal_name),
      trading_name: (body.trading_name as string | null) ?? null,
      description: (body.description as string | null) ?? null,
    })
    return HttpResponse.json({ success: true, data: businessProfile })
  }),
  http.post('/api/v1/businesses/me', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    businessProfile = makeBusinessProfile({
      legal_name: String(body.legal_name),
      trading_name: (body.trading_name as string | null) ?? null,
    })
    return HttpResponse.json({ success: true, data: businessProfile }, { status: 201 })
  }),
  http.get('/api/v1/ambassadors/me', () => {
    if (!me || me.role !== 'AMBASSADOR') {
      return HttpResponse.json(
        { success: false, error: { code: 'forbidden', message: 'Forbidden.' } },
        { status: 403 },
      )
    }
    if (!ambassadorProfile) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found.' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: ambassadorProfile })
  }),
  http.patch('/api/v1/ambassadors/me', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    ambassadorProfile = makeAmbassadorProfile({
      ...ambassadorProfile!,
      display_name: String(body.display_name ?? ambassadorProfile!.display_name),
      location: (body.location as string | null) ?? null,
      skills: (body.skills as string[]) ?? [],
    })
    return HttpResponse.json({ success: true, data: ambassadorProfile })
  }),
  http.post('/api/v1/auth/change-password', async ({ request }) => {
    const body = (await request.json()) as Record<string, string>
    lastPasswordBody = body
    if (changePasswordFailure === 400) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'The current password is incorrect.',
            details: { current_password: ['The current password is incorrect.'] },
          },
        },
        { status: 400 },
      )
    }
    if (changePasswordFailure === 429) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'rate_limited', message: 'Too many password change attempts.' },
        },
        { status: 429 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: { message: 'Your password has been changed.' },
    })
  }),
  http.get('/api/v1/verification/status', () => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: { overall_status: overallStatus, requirements: [] },
    })
  }),
)

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <AppRouter />
    </AppProviders>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  me = null
  businessProfile = makeBusinessProfile()
  ambassadorProfile = makeAmbassadorProfile()
  businessProfileFailure = 0
  changePasswordFailure = 0
  lastPasswordBody = null
  lastBusinessPatch = null
  overallStatus = 'VERIFIED'
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())

describe('MH-FE-P09 participant settings', () => {
  it('loads Business Settings with safe account information', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getAllByText('Ada Solar').length).toBeGreaterThan(0)
    expect(screen.getByText(businessUser.email)).toBeInTheDocument()
    const account = screen.getByRole('heading', { name: 'Account' }).closest('section')!
    expect(within(account).getByText('Business')).toBeInTheDocument()
    expect(within(account).getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText(/password hash/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/remember_token/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Bearer/)).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/business/settings')
  })

  it('loads Ambassador Settings with role-specific profile fields', async () => {
    me = ambassadorUser
    renderApp('/app/ambassador/settings')
    expect(await screen.findByLabelText('Display name')).toHaveValue('Ada Okonkwo')
    expect(screen.getByLabelText('Skills')).toHaveValue('Solar sales')
    expect(screen.getByLabelText('Marketing interests')).toHaveValue('Energy')
    expect(window.location.pathname).toBe('/app/ambassador/settings')
  })

  it('renders Business profile certified fields and saves updates', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    expect(await screen.findByLabelText('Legal name')).toHaveValue('Ada Solar Ventures Ltd')
    expect(screen.getByLabelText('Trading name')).toHaveValue('Ada Solar')
    expect(screen.getByLabelText('Contact email')).toHaveValue('ops@adasolar.test')

    await userEvent.clear(screen.getByLabelText('Trading name'))
    await userEvent.type(screen.getByLabelText('Trading name'), 'Ada Solar NG')
    await userEvent.click(screen.getByRole('button', { name: /save business profile/i }))

    await waitFor(() => expect(lastBusinessPatch?.trading_name).toBe('Ada Solar NG'))
    expect(await screen.findByText(/business profile updated/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Trading name')).toHaveValue('Ada Solar NG')
  })

  it('shows server validation errors for profile save', async () => {
    me = businessUser
    businessProfileFailure = 400
    renderApp('/app/business/settings')
    await screen.findByLabelText('Legal name')
    await userEvent.click(screen.getByRole('button', { name: /save business profile/i }))
    expect(await screen.findByText(/legal name field is required/i)).toBeInTheDocument()
  })

  it('renders change-password form and succeeds', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    await screen.findByLabelText('Current password')
    await userEvent.type(screen.getByLabelText('Current password'), 'DemoPass123!')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass123!')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPass123!')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(lastPasswordBody).toEqual({
        current_password: 'DemoPass123!',
        password: 'NewPass123!',
        password_confirmation: 'NewPass123!',
      })
    })
    expect(await screen.findByText(/your password has been changed/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveValue('')
  })

  it('handles wrong current password and retains typed values', async () => {
    me = businessUser
    changePasswordFailure = 400
    renderApp('/app/business/settings')
    await userEvent.type(await screen.findByLabelText('Current password'), 'WrongPass1!')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass123!')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPass123!')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findAllByText(/current password is incorrect/i)).not.toHaveLength(0)
    expect(screen.getByLabelText('Current password')).toHaveValue('WrongPass1!')
    expect(screen.getByLabelText('New password')).toHaveValue('NewPass123!')
  })

  it('validates password mismatch client-side', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    await userEvent.type(await screen.findByLabelText('Current password'), 'DemoPass123!')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass123!')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different1!')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/password confirmation does not match/i)).toBeInTheDocument()
    expect(lastPasswordBody).toBeNull()
  })

  it('handles 429 rate limiting on password change', async () => {
    me = businessUser
    changePasswordFailure = 429
    renderApp('/app/business/settings')
    await userEvent.type(await screen.findByLabelText('Current password'), 'DemoPass123!')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass123!')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPass123!')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/too many password change attempts/i)).toBeInTheDocument()
  })

  it('never persists credentials to browser storage', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    await userEvent.type(await screen.findByLabelText('Current password'), 'DemoPass123!')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPass123!')
    expect(JSON.stringify(localStorage)).not.toMatch(/DemoPass|NewPass/)
    expect(JSON.stringify(sessionStorage)).not.toMatch(/DemoPass|NewPass/)
    expect(window.location.href).not.toMatch(/password|DemoPass|token=/i)
  })

  it('shows restricted account status and hides unsupported profile controls', async () => {
    me = restrictedBusiness
    renderApp('/app/business/settings')
    expect(await screen.findByText('Restricted')).toBeInTheDocument()
    expect(
      screen.getByText(/profile editing is unavailable while your account is restricted/i),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Legal name')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toBeInTheDocument()
  })

  it('links to Verification from the summary', async () => {
    me = businessUser
    overallStatus = 'PENDING'
    renderApp('/app/business/settings')
    expect(await screen.findByText('Pending review')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /open verification/i })
    expect(link).toHaveAttribute('href', '/app/business/verification')
  })

  it('keeps Business and Ambassador shells separate', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    await screen.findByRole('heading', { name: 'Settings' })
    expect(screen.getByLabelText('Business navigation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Ambassador navigation')).not.toBeInTheDocument()

    cleanup()
    me = ambassadorUser
    renderApp('/app/ambassador/settings')
    await screen.findByRole('heading', { name: 'Settings' })
    expect(screen.getByLabelText('Ambassador navigation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Business navigation')).not.toBeInTheDocument()
  })

  it('supports show/hide password controls', async () => {
    me = businessUser
    renderApp('/app/business/settings')
    const current = await screen.findByLabelText('Current password')
    expect(current).toHaveAttribute('type', 'password')
    const section = screen.getByRole('heading', { name: 'Security' }).closest('section')!
    await userEvent.click(within(section).getByRole('button', { name: /show current password/i }))
    expect(current).toHaveAttribute('type', 'text')
  })
})

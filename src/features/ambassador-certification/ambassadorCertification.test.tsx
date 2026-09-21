import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import { deriveCtaState } from './cta'

const ambassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR' as const,
  status: 'active' as const,
}

const programme = {
  id: 10,
  name: 'NON-PRODUCTION Ambassador Professional Certification',
  description: 'Optional professional development programme.',
  learning_objectives: 'Learn platform standards.',
  status: 'published',
  current_published_version_id: 21,
  current_published_version: {
    id: 21,
    programme_id: 10,
    version_number: 1,
    status: 'published',
    fee_amount_minor: 2500000,
    fee_currency: 'NGN',
    published_at: '2026-09-01T00:00:00+00:00',
  },
  created_at: '2026-09-01T00:00:00+00:00',
}

const uncertifiedProfile = {
  id: 5,
  display_name: 'Ada',
  profile_description: null,
  location: null,
  skills: [],
  marketing_interests: [],
  experience: null,
  certification: { is_certified: false, label: null, awards: [] },
  created_at: null,
  updated_at: null,
}

const certifiedProfile = {
  ...uncertifiedProfile,
  certification: {
    is_certified: true,
    label: 'Certified MarcatursHub Ambassador',
    awards: [
      {
        id: 1,
        programme_id: 10,
        programme_version_id: 21,
        programme_name: 'NON-PRODUCTION Ambassador Professional Certification',
        programme_version_number: 1,
        awarded_at: '2026-09-10T00:00:00+00:00',
        certificate_id: 3,
      },
    ],
  },
}

let me: typeof ambassador | null = null
let profilePayload: typeof uncertifiedProfile | typeof certifiedProfile = uncertifiedProfile
let programmesPayload = [programme]
let enrollmentsPayload: unknown[] = []
let certificatesPayload: unknown[] = []
let initializeCalled = false
let verifyCalled = false
let initializeFailure: { status: number; message: string } | null = null

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
  http.get('/api/v1/ambassadors/me', () =>
    HttpResponse.json({ success: true, data: profilePayload }),
  ),
  http.get('/api/v1/certification/programmes', () =>
    HttpResponse.json({ success: true, data: programmesPayload }),
  ),
  http.get('/api/v1/certification/programmes/:id', ({ params }) => {
    if (Number(params.id) !== programme.id) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found.' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: programme })
  }),
  http.get('/api/v1/certification/enrollments', () =>
    HttpResponse.json({ success: true, data: enrollmentsPayload }),
  ),
  http.get('/api/v1/certification/certificates', () =>
    HttpResponse.json({ success: true, data: certificatesPayload }),
  ),
  http.post('/api/v1/certification/programmes/:id/purchase/initialize', async () => {
    initializeCalled = true
    if (initializeFailure) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'service_unavailable',
            message: initializeFailure.message,
          },
        },
        { status: initializeFailure.status },
      )
    }
    return HttpResponse.json(
      {
        success: true,
        data: {
          authorization_url: 'https://checkout.paystack.test/cert',
          access_code: 'access_demo',
          payment: {
            id: 99,
            reference: 'mh_cert_demo',
            amount_minor: 2500000,
            currency: 'NGN',
            status: 'pending',
          },
        },
      },
      { status: 201 },
    )
  }),
  http.post('/api/v1/certification/purchases/verify', async ({ request }) => {
    verifyCalled = true
    const body = (await request.json()) as { reference?: string }
    if (body.reference !== 'mh_cert_demo') {
      return HttpResponse.json(
        { success: false, error: { code: 'business_validation', message: 'Invalid reference.' } },
        { status: 422 },
      )
    }
    return HttpResponse.json({
      success: true,
      data: {
        id: 44,
        status: 'active',
        programme_id: 10,
        programme_version_id: 21,
        programme: { id: 10, name: programme.name, status: 'published' },
        programme_version: { id: 21, version_number: 1, status: 'published' },
        fee_amount_minor: 2500000,
        fee_currency: 'NGN',
        enrolled_at: '2026-09-15T00:00:00+00:00',
        created_at: '2026-09-15T00:00:00+00:00',
      },
    })
  }),
  http.get('/api/v1/certification/enrollments/:id/curriculum', () =>
    HttpResponse.json({
      success: true,
      data: {
        enrollment: {
          id: 44,
          status: 'active',
          programme_id: 10,
          programme_version_id: 21,
          programme: { id: 10, name: programme.name, status: 'published' },
          programme_version: { id: 21, version_number: 1, status: 'published' },
          fee_amount_minor: 2500000,
          fee_currency: 'NGN',
          enrolled_at: '2026-09-15T00:00:00+00:00',
          created_at: '2026-09-15T00:00:00+00:00',
        },
        programme_version: {
          id: 21,
          programme_id: 10,
          version_number: 1,
          status: 'published',
        },
        modules: [],
        assessment_eligibility: {
          eligible: false,
          required_lessons: 0,
          completed_required_lessons: 0,
          optional_lessons: 0,
          completed_optional_lessons: 0,
        },
      },
    }),
  ),
  http.get('/api/v1/marketplace/campaigns', () =>
    HttpResponse.json({ success: true, data: [] }),
  ),
  http.get('/api/v1/categories', () => HttpResponse.json({ success: true, data: [] })),
  http.get('/api/v1/verification/status', () =>
    HttpResponse.json({
      success: true,
      data: { overall_status: 'not_started', requirements: [] },
    }),
  ),
)

function renderApp(path = '/app/ambassador/certification') {
  window.history.pushState({}, '', path)
  const queryClient = createQueryClient()
  return render(
    <AppProviders queryClient={queryClient}>
      <AppRouter />
    </AppProviders>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
  me = ambassador
  profilePayload = uncertifiedProfile
  programmesPayload = [programme]
  enrollmentsPayload = []
  certificatesPayload = []
  initializeCalled = false
  verifyCalled = false
  initializeFailure = null
})
afterAll(() => server.close())

beforeEach(() => {
  me = ambassador
  sessionStorage.clear()
})

describe('deriveCtaState', () => {
  it('derives explore, learning, assessment-ready, and certified states', () => {
    expect(deriveCtaState({ certification: uncertifiedProfile.certification })).toBe('explore')
    expect(
      deriveCtaState({
        certification: uncertifiedProfile.certification,
        enrollments: [{ id: 1, status: 'active' } as never],
        eligibilityByEnrollmentId: { 1: { eligible: false } as never },
      }),
    ).toBe('continue_learning')
    expect(
      deriveCtaState({
        certification: uncertifiedProfile.certification,
        enrollments: [{ id: 1, status: 'active' } as never],
        eligibilityByEnrollmentId: { 1: { eligible: true } as never },
      }),
    ).toBe('assessment_ready')
    expect(deriveCtaState({ certification: certifiedProfile.certification })).toBe('certified')
  })
})

describe('Ambassador certification frontend', () => {
  it('shows optional certification nav and hub empty enrollments', async () => {
    renderApp('/app/ambassador/certification')
    expect(await screen.findByRole('link', { name: 'Certification' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Certification', level: 1 })).toBeInTheDocument()
    expect(await screen.findByText(/no enrollments yet/i)).toBeInTheDocument()
  })

  it('renders programme catalogue and empty state', async () => {
    renderApp('/app/ambassador/certification/programmes')
    expect(
      await screen.findByRole('heading', { name: programme.name }),
    ).toBeInTheDocument()
    expect(screen.getByText(/NGN/i)).toBeInTheDocument()

    programmesPayload = []
    cleanup()
    renderApp('/app/ambassador/certification/programmes')
    expect(await screen.findByText(/no programmes available/i)).toBeInTheDocument()
  })

  it('shows server fee on programme detail and starts checkout without client price override', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderApp('/app/ambassador/certification/programmes/10')
    expect(await screen.findByRole('heading', { name: programme.name })).toBeInTheDocument()
    expect(screen.getAllByText(/One-time fee/i).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /pay and enroll/i }))
    await waitFor(() => expect(initializeCalled).toBe(true))
    expect(openSpy).toHaveBeenCalledWith(
      'https://checkout.paystack.test/cert',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('maps payment configuration failures to participant-safe copy', async () => {
    initializeFailure = {
      status: 503,
      message: 'Platform payments are not configured.',
    }
    renderApp('/app/ambassador/certification/programmes/10')
    await userEvent.click(await screen.findByRole('button', { name: /pay and enroll/i }))
    expect(
      await screen.findByText(/payments are temporarily unavailable/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/platform payments are not configured/i)).not.toBeInTheDocument()
  })

  it('verifies purchase before treating enrollment as active', async () => {
    window.history.pushState({}, '', '/app/ambassador/certification/purchase/return?reference=mh_cert_demo')
    renderApp('/app/ambassador/certification/purchase/return?reference=mh_cert_demo')
    await waitFor(() => expect(verifyCalled).toBe(true))
    expect(await screen.findByRole('heading', { name: programme.name })).toBeInTheDocument()
  })

  it('surfaces cancelled checkout without auto-verify', async () => {
    verifyCalled = false
    window.history.pushState(
      {},
      '',
      '/app/ambassador/certification/purchase/return?status=cancelled&reference=mh_cert_cancelled',
    )
    renderApp('/app/ambassador/certification/purchase/return?status=cancelled&reference=mh_cert_cancelled')
    expect(await screen.findByText(/Checkout was cancelled/i)).toBeInTheDocument()
    await waitFor(() => expect(verifyCalled).toBe(false))
  })

  it('explains missing payment reference on return', async () => {
    window.history.pushState({}, '', '/app/ambassador/certification/purchase/return')
    renderApp('/app/ambassador/certification/purchase/return')
    expect(
      await screen.findByText(/No payment reference was found/i),
    ).toBeInTheDocument()
  })

  it('shows certified profile representation on settings', async () => {
    profilePayload = certifiedProfile
    renderApp('/app/ambassador/settings')
    expect(await screen.findByRole('heading', { name: 'Certification', level: 2 })).toBeInTheDocument()
    expect(
      await screen.findByText(/Certified MarcatursHub Ambassador/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Version 1/i)).toBeInTheDocument()
  })

  it('shows certificate unavailable state without storage paths', async () => {
    profilePayload = certifiedProfile
    certificatesPayload = [
      {
        id: 3,
        award_id: 1,
        certificate_number: 'mhcert_demo',
        status: 'issued',
        issued_at: '2026-09-10T00:00:00+00:00',
        recipient_name: 'Ada',
        programme_name: programme.name,
        programme_version_number: 1,
        issuer_name: 'MarcatursHub',
        artifact_status: 'pending_generation',
        artifact_generated_at: null,
        artifact_available: false,
      },
    ]
    renderApp('/app/ambassador/certification/certificates')
    expect(await screen.findByText(/PDF is not ready yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/artifact_path|sensitive\//i)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Certification is determined by the Award/i),
    ).toBeInTheDocument()
  })

  it('keeps certification optional messaging on discover CTA', async () => {
    renderApp('/app/ambassador')
    expect(
      await screen.findByText(/Ambassador Professional Certification/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Equip yourself with the skills and knowledge to become a successful Ambassador/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Optional · no income guarantee · not identity verification/i)).toBeInTheDocument()
  })
})

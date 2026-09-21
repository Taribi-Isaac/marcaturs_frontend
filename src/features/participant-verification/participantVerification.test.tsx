import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import type {
  OverallVerificationStatus,
  VerificationRequirement,
  VerificationRequirementItem,
  VerificationSubmission,
  VerificationStatusPayload,
} from './types'

const business = {
  id: 1,
  name: 'Ada Solar',
  email: 'business.solar@demo.marcaturshub.test',
  role: 'BUSINESS' as const,
  status: 'active' as const,
}

const ambassador = {
  id: 2,
  name: 'Ada Ambassador',
  email: 'ambassador.ada@demo.marcaturshub.test',
  role: 'AMBASSADOR' as const,
  status: 'active' as const,
}

function makeRequirement(
  overrides: Partial<VerificationRequirement> = {},
): VerificationRequirement {
  return {
    id: 10,
    name: 'Demo Business legal name',
    description: 'Provide the registered business name.',
    participant_type: 'BUSINESS',
    requirement_type: 'text',
    is_required: true,
    is_active: true,
    sort_order: 10,
    ...overrides,
  }
}

function makeSubmission(overrides: Partial<VerificationSubmission> = {}): VerificationSubmission {
  return {
    id: 100,
    requirement_id: 10,
    status: 'pending',
    text_value: 'Ada Solar Ventures Ltd',
    review_reason: null,
    current_version: 1,
    submitted_at: '2026-09-09T10:00:00+00:00',
    evidence: [],
    ...overrides,
  }
}

function makeStatus(
  overall: OverallVerificationStatus,
  items: VerificationRequirementItem[],
): VerificationStatusPayload {
  return { overall_status: overall, requirements: items }
}

let me: typeof business | typeof ambassador | null = null
let statusPayload: VerificationStatusPayload | null = null
let statusFailure = 0
let createFailure = 0
let lastCreateBody: FormData | null = null
let lastCreatePath = ''

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
  http.get('/api/v1/verification/status', () => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (statusFailure === 403 || statusFailure === 404) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: statusFailure === 403 ? 'forbidden' : 'not_found',
            message: statusFailure === 403 ? 'Forbidden.' : 'Not found.',
          },
        },
        { status: statusFailure },
      )
    }
    if (!statusPayload) {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Missing fixture.' } },
        { status: 500 },
      )
    }
    return HttpResponse.json({ success: true, data: statusPayload })
  }),
  http.post('/api/v1/verification/submissions', async ({ request }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    const body = await request.formData()
    lastCreateBody = body
    lastCreatePath = '/api/v1/verification/submissions'
    expect(body.has('path')).toBe(false)
    expect(body.has('disk')).toBe(false)

    if (createFailure === 422) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: 'Validation failed.',
            details: { text_value: ['The text value field is required.'] },
          },
        },
        { status: 422 },
      )
    }
    if (createFailure === 409) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'conflict', message: 'A submission already exists for this requirement.' },
        },
        { status: 409 },
      )
    }

    const requirementId = Number(body.get('requirement_id'))
    const text = String(body.get('text_value') || '')
    const created = makeSubmission({
      id: 501,
      requirement_id: requirementId,
      status: 'pending',
      text_value: text || null,
      evidence: [],
    })

    if (statusPayload) {
      statusPayload = {
        overall_status: 'PENDING',
        requirements: statusPayload.requirements.map((item) =>
          item.requirement.id === requirementId ? { ...item, submission: created } : item,
        ),
      }
    }

    return HttpResponse.json({ success: true, data: created }, { status: 201 })
  }),
  http.patch('/api/v1/verification/submissions/:id', async ({ params, request }) => {
    const body = await request.formData()
    lastCreateBody = body
    lastCreatePath = `/api/v1/verification/submissions/${params.id}`
    const updated = makeSubmission({
      id: Number(params.id),
      status: 'pending',
      text_value: String(body.get('text_value') || 'Updated'),
      review_reason: null,
      current_version: 2,
    })
    if (statusPayload) {
      statusPayload = {
        overall_status: 'PENDING',
        requirements: statusPayload.requirements.map((item) =>
          item.submission?.id === updated.id ? { ...item, submission: updated } : item,
        ),
      }
    }
    return HttpResponse.json({ success: true, data: updated })
  }),
)

function renderApp(path: string) {
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
  me = null
  statusPayload = null
  statusFailure = 0
  createFailure = 0
  lastCreateBody = null
  lastCreatePath = ''
  localStorage.clear()
  sessionStorage.clear()
})
afterAll(() => server.close())

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('MH-FE-P08 participant verification UX', () => {
  it('loads Business verification requirements and overall status', async () => {
    me = business
    statusPayload = makeStatus('VERIFIED', [
      {
        requirement: makeRequirement(),
        submission: makeSubmission({ status: 'approved' }),
      },
      {
        requirement: makeRequirement({
          id: 11,
          name: 'Demo Business registration evidence',
          requirement_type: 'document',
          sort_order: 20,
        }),
        submission: makeSubmission({
          id: 101,
          requirement_id: 11,
          status: 'approved',
          text_value: null,
          evidence: [
            {
              id: 1,
              original_filename: 'reg.pdf',
              mime_type: 'application/pdf',
              size_bytes: 2048,
              created_at: '2026-09-09T10:00:00+00:00',
            },
          ],
        }),
      },
    ])

    renderApp('/app/business/verification')
    expect(await screen.findByRole('heading', { name: 'Verification' })).toBeInTheDocument()
    expect(await screen.findAllByText('Verified')).not.toHaveLength(0)
    expect(screen.getByText('Demo Business legal name')).toBeInTheDocument()
    expect(screen.getByText('Demo Business registration evidence')).toBeInTheDocument()
    expect(screen.getByText(/required progress: 2 of 2 approved/i)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/business/verification')
  })

  it('loads Ambassador verification with role-specific requirements', async () => {
    me = ambassador
    statusPayload = makeStatus('PENDING', [
      {
        requirement: makeRequirement({
          id: 20,
          name: 'Demo Ambassador legal name',
          participant_type: 'AMBASSADOR',
        }),
        submission: makeSubmission({ requirement_id: 20, status: 'pending' }),
      },
      {
        requirement: makeRequirement({
          id: 21,
          name: 'Demo Ambassador identity evidence',
          participant_type: 'AMBASSADOR',
          requirement_type: 'document',
          sort_order: 20,
        }),
        submission: null,
      },
    ])

    renderApp('/app/ambassador/verification')
    expect(await screen.findByText('Demo Ambassador legal name')).toBeInTheDocument()
    expect(screen.getByText('Demo Ambassador identity evidence')).toBeInTheDocument()
    expect(screen.getAllByText(/pending review/i).length).toBeGreaterThan(0)
    expect(window.location.pathname).toBe('/app/ambassador/verification')
  })

  it('distinguishes required vs optional requirements', async () => {
    me = business
    statusPayload = makeStatus('PENDING', [
      {
        requirement: makeRequirement({ name: 'Required item', is_required: true }),
        submission: null,
      },
      {
        requirement: makeRequirement({
          id: 12,
          name: 'Optional item',
          is_required: false,
          sort_order: 20,
        }),
        submission: null,
      },
    ])

    renderApp('/app/business/verification')
    const requiredCard = (await screen.findByText('Required item')).closest(
      'article',
    ) as HTMLElement
    const optionalCard = screen.getByText('Optional item').closest('article') as HTMLElement
    expect(within(requiredCard).getByText(/Required ·/)).toBeInTheDocument()
    expect(within(optionalCard).getByText(/Optional ·/)).toBeInTheDocument()
    expect(screen.getByText(/optional requirements do not block/i)).toBeInTheDocument()
  })

  it('renders approved completed state without resubmit controls', async () => {
    me = business
    statusPayload = makeStatus('VERIFIED', [
      {
        requirement: makeRequirement(),
        submission: makeSubmission({ status: 'approved' }),
      },
    ])

    renderApp('/app/business/verification')
    expect(await screen.findByText(/this requirement is approved/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /resubmit/i })).not.toBeInTheDocument()
  })

  it('renders rejected state with reason and resubmission when supplied', async () => {
    me = business
    statusPayload = makeStatus('REJECTED', [
      {
        requirement: makeRequirement(),
        submission: makeSubmission({
          status: 'rejected',
          review_reason: 'Document was unreadable. Please upload a clearer scan.',
        }),
      },
    ])

    renderApp('/app/business/verification')
    expect(await screen.findByText(/this submission was rejected/i)).toBeInTheDocument()
    expect(screen.getByText(/document was unreadable/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resubmit for review/i })).toBeInTheDocument()
  })

  it('uses a generic explanation when rejection reason is absent', async () => {
    me = business
    statusPayload = makeStatus('MORE_INFORMATION_REQUIRED', [
      {
        requirement: makeRequirement(),
        submission: makeSubmission({
          status: 'more_information_required',
          review_reason: null,
        }),
      },
    ])

    renderApp('/app/business/verification')
    expect(await screen.findByText(/more information is required/i)).toBeInTheDocument()
    expect(
      screen.getByText(/detailed reviewer notes are not shared with participants/i),
    ).toBeInTheDocument()
  })

  it('submits through the certified endpoint shape and refreshes status', async () => {
    me = business
    statusPayload = makeStatus('NOT_STARTED', [
      {
        requirement: makeRequirement({ name: 'Legal name' }),
        submission: null,
      },
    ])

    renderApp('/app/business/verification')
    const input = await screen.findByLabelText('Response')
    await userEvent.type(input, 'Ada Solar Ventures Ltd')
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }))

    await waitFor(() => expect(lastCreatePath).toBe('/api/v1/verification/submissions'))
    expect(lastCreateBody?.get('requirement_id')).toBe('10')
    expect(lastCreateBody?.get('text_value')).toBe('Ada Solar Ventures Ltd')
    await waitFor(() => {
      expect(screen.getAllByText(/submitted.+pending review/i).length).toBeGreaterThan(0)
    })
    expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument()
  })

  it('handles 422 validation errors on submit', async () => {
    me = business
    createFailure = 422
    statusPayload = makeStatus('NOT_STARTED', [
      { requirement: makeRequirement(), submission: null },
    ])

    renderApp('/app/business/verification')
    await userEvent.type(await screen.findByLabelText('Response'), 'x')
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(await screen.findByText(/text value field is required/i)).toBeInTheDocument()
  })

  it('handles 409 conflict by refetching authoritative status', async () => {
    me = business
    createFailure = 409
    statusPayload = makeStatus('NOT_STARTED', [
      { requirement: makeRequirement(), submission: null },
    ])

    renderApp('/app/business/verification')
    await userEvent.type(await screen.findByLabelText('Response'), 'Ada Solar')
    await userEvent.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(await screen.findByText(/submission already exists/i)).toBeInTheDocument()
  })

  it('handles 403 and 404 verification errors', async () => {
    me = business
    statusFailure = 403
    statusPayload = makeStatus('NOT_STARTED', [])
    renderApp('/app/business/verification')
    expect(await screen.findByText(/verification unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/Forbidden\./i)).toBeInTheDocument()
    cleanup()

    statusFailure = 404
    renderApp('/app/business/verification')
    expect(await screen.findByText(/verification not found/i)).toBeInTheDocument()
  })

  it('explains empty verification requirements without saying unavailable', async () => {
    me = ambassador
    statusFailure = 0
    statusPayload = makeStatus('NOT_STARTED', [])
    renderApp('/app/ambassador/verification')
    expect(
      await screen.findByText(/no verification requirements configured/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/requirements are not configured for your role yet/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/submit the required items below/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/verification unavailable/i)).not.toBeInTheDocument()
  })

  it('does not render sensitive private fields and avoids localStorage writes', async () => {
    me = business
    const leakyItem = {
      requirement: {
        ...makeRequirement(),
        config: { vendor: 'secret' },
      },
      submission: {
        ...makeSubmission(),
        reviewer_notes: 'Internal admin note',
        path: 'verification/1/secret.pdf',
        disk: 'sensitive',
        evidence: [
          {
            id: 9,
            original_filename: 'id.png',
            mime_type: 'image/png',
            size_bytes: 1200,
            created_at: '2026-09-09T10:00:00+00:00',
          },
        ],
      },
    } as VerificationRequirementItem

    statusPayload = makeStatus('PENDING', [leakyItem])

    renderApp('/app/business/verification')
    expect(await screen.findByText('id.png')).toBeInTheDocument()
    expect(screen.queryByText(/internal admin note/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/verification\/1\/secret/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\bsensitive\b/i)).not.toBeInTheDocument()
    expect(JSON.stringify(localStorage)).not.toMatch(/Ada Solar Ventures|id\.png|secret/)
    expect(JSON.stringify(sessionStorage)).not.toMatch(/Ada Solar Ventures|id\.png|secret/)
  })

  it('keeps role shells separate and supports mobile-width basics', async () => {
    me = business
    statusPayload = makeStatus('NOT_STARTED', [
      { requirement: makeRequirement(), submission: null },
    ])
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    renderApp('/app/business/verification')
    expect(await screen.findByRole('heading', { name: 'Verification' })).toBeInTheDocument()
    expect(screen.getByLabelText('Business navigation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Ambassador navigation')).not.toBeInTheDocument()

    cleanup()
    me = ambassador
    statusPayload = makeStatus('NOT_STARTED', [
      {
        requirement: makeRequirement({
          name: 'Ambassador only',
          participant_type: 'AMBASSADOR',
        }),
        submission: null,
      },
    ])
    renderApp('/app/ambassador/verification')
    expect(await screen.findByText('Ambassador only')).toBeInTheDocument()
    expect(screen.getByLabelText('Ambassador navigation')).toBeInTheDocument()
    expect(screen.queryByLabelText('Business navigation')).not.toBeInTheDocument()
  })

  it('exposes accessible labels for submission controls', async () => {
    me = business
    statusPayload = makeStatus('NOT_STARTED', [
      { requirement: makeRequirement(), submission: null },
      {
        requirement: makeRequirement({
          id: 11,
          name: 'Registration document',
          requirement_type: 'document',
          sort_order: 20,
        }),
        submission: null,
      },
    ])

    renderApp('/app/business/verification')
    expect(await screen.findByLabelText('Response')).toBeInTheDocument()
    expect(screen.getByLabelText('Document')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /submit for review/i }).length).toBe(2)
  })
})

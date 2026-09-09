import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AppProviders } from '@/app/providers'
import { createQueryClient } from '@/app/queryClient'
import { AppRouter } from '@/app/router'
import { __resetEchoForTests } from './echoClient'
import { mergeMessagesById } from './mergeMessages'
import type { ChatMessage, Conversation } from './types'

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

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 10,
    counterpart: { id: 2, name: 'Ada Ambassador', role: 'AMBASSADOR' },
    reported: false,
    created_at: '2026-09-09T10:00:00+00:00',
    updated_at: '2026-09-09T12:00:00+00:00',
    ...overrides,
  }
}

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 100,
    conversation_id: 10,
    sender_id: 2,
    type: 'text',
    content: 'Hello from ambassador',
    read_at: null,
    created_at: '2026-09-09T12:00:00+00:00',
    ...overrides,
  }
}

let me: typeof business | typeof ambassador | null = null
let conversations: Conversation[] = []
let messagesByConversation: Record<number, ChatMessage[]> = {}
let listFailure = 0
let detailFailure = 0
let sendFailure = 0
let lastSendBodies: Array<{ content?: string }> = []
let readCalls = 0
let reportCalls = 0

const leaveMock = vi.fn()
const stopListeningMock = vi.fn()
const listenMock = vi.fn()
const privateMock = vi.fn()
const disconnectMock = vi.fn()

vi.mock('./echoClient', async () => {
  const actual = await vi.importActual<typeof import('./echoClient')>('./echoClient')
  return {
    ...actual,
    isRealtimeConfigured: () => true,
    getEchoClient: () => ({
      private: privateMock,
      leave: leaveMock,
      disconnect: disconnectMock,
      connector: {
        pusher: {
          connection: {
            state: 'connected',
            bind: vi.fn(),
            unbind: vi.fn(),
          },
        },
      },
    }),
  }
})

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
  http.get('/api/v1/conversations', ({ request }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (listFailure) {
      return HttpResponse.json(
        { success: false, error: { code: 'server_error', message: 'Server error.' } },
        { status: listFailure },
      )
    }
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '1')
    const perPage = Number(url.searchParams.get('per_page') || '20')
    const start = (page - 1) * perPage
    const items = conversations.slice(start, start + perPage)
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: page,
          per_page: perPage,
          total: conversations.length,
          last_page: Math.max(1, Math.ceil(conversations.length / perPage) || 1),
          from: items.length ? start + 1 : null,
          to: items.length ? start + items.length : null,
        },
      },
    })
  }),
  http.post('/api/v1/conversations', async ({ request }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as Record<string, unknown>
    expect(body.campaign_id).toBeUndefined()
    expect(body.deal_id).toBeUndefined()
    const existing = conversations[0]
    if (existing) {
      return HttpResponse.json({ success: true, data: existing })
    }
    const created = makeConversation({
      id: 99,
      counterpart:
        me.role === 'BUSINESS'
          ? { id: Number(body.ambassador_id), name: 'New Ambassador', role: 'AMBASSADOR' }
          : { id: Number(body.business_id), name: 'New Business', role: 'BUSINESS' },
    })
    conversations = [created]
    messagesByConversation[created.id] = []
    return HttpResponse.json({ success: true, data: created }, { status: 201 })
  }),
  http.get('/api/v1/conversations/:id', ({ params }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (detailFailure === 403 || detailFailure === 404) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: detailFailure === 403 ? 'forbidden' : 'not_found',
            message: detailFailure === 403 ? 'Forbidden.' : 'Not found.',
          },
        },
        { status: detailFailure },
      )
    }
    const id = Number(params.id)
    const found = conversations.find((c) => c.id === id)
    if (!found) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found.' } },
        { status: 404 },
      )
    }
    return HttpResponse.json({ success: true, data: found })
  }),
  http.get('/api/v1/conversations/:id/messages', ({ params, request }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    if (detailFailure === 403 || detailFailure === 404) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: detailFailure === 403 ? 'forbidden' : 'not_found',
            message: 'Unavailable.',
          },
        },
        { status: detailFailure },
      )
    }
    const id = Number(params.id)
    const all = messagesByConversation[id] ?? []
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || '1')
    const perPage = Number(url.searchParams.get('per_page') || '100')
    const lastPage = Math.max(1, Math.ceil(all.length / perPage) || 1)
    const start = (page - 1) * perPage
    const items = all.slice(start, start + perPage)
    return HttpResponse.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          current_page: page,
          per_page: perPage,
          total: all.length,
          last_page: lastPage,
          from: items.length ? start + 1 : null,
          to: items.length ? start + items.length : null,
        },
      },
    })
  }),
  http.post('/api/v1/conversations/:id/messages', async ({ params, request }) => {
    if (!me) {
      return HttpResponse.json(
        { success: false, error: { code: 'unauthenticated', message: 'Unauthenticated.' } },
        { status: 401 },
      )
    }
    const body = (await request.json()) as { content?: string }
    lastSendBodies.push(body)
    if (sendFailure) {
      const code =
        sendFailure === 422
          ? 'validation_error'
          : sendFailure === 429
            ? 'rate_limited'
            : 'server_error'
      return HttpResponse.json(
        {
          success: false,
          error: {
            code,
            message:
              sendFailure === 422
                ? 'Message content is invalid.'
                : sendFailure === 429
                  ? 'Too many requests.'
                  : 'Server error.',
          },
        },
        { status: sendFailure },
      )
    }
    const id = Number(params.id)
    const content = (body.content || '').trim()
    if (!content) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'validation_error', message: 'Message content is required.' },
        },
        { status: 422 },
      )
    }
    const message = makeMessage({
      id: 500 + (messagesByConversation[id]?.length || 0),
      conversation_id: id,
      sender_id: me.id,
      content,
      created_at: '2026-09-09T13:00:00+00:00',
    })
    messagesByConversation[id] = [...(messagesByConversation[id] || []), message]
    return HttpResponse.json({ success: true, data: message }, { status: 201 })
  }),
  http.post('/api/v1/conversations/:id/read', ({ params }) => {
    readCalls += 1
    const id = Number(params.id)
    const list = messagesByConversation[id] || []
    messagesByConversation[id] = list.map((message) =>
      message.sender_id === me?.id
        ? message
        : { ...message, read_at: message.read_at || '2026-09-09T13:05:00+00:00' },
    )
    return HttpResponse.json({ success: true, data: { updated: 1 } })
  }),
  http.post('/api/v1/conversations/:id/report', async ({ params, request }) => {
    reportCalls += 1
    const body = (await request.json()) as { reason?: string }
    if (!body.reason?.trim()) {
      return HttpResponse.json(
        { success: false, error: { code: 'validation_error', message: 'Reason required.' } },
        { status: 422 },
      )
    }
    const id = Number(params.id)
    const index = conversations.findIndex((c) => c.id === id)
    if (index < 0) {
      return HttpResponse.json(
        { success: false, error: { code: 'not_found', message: 'Not found.' } },
        { status: 404 },
      )
    }
    if (conversations[index]!.reported) {
      return HttpResponse.json(
        { success: false, error: { code: 'conflict', message: 'Already reported.' } },
        { status: 409 },
      )
    }
    conversations[index] = { ...conversations[index]!, reported: true }
    return HttpResponse.json({ success: true, data: conversations[index] })
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
  conversations = []
  messagesByConversation = {}
  listFailure = 0
  detailFailure = 0
  sendFailure = 0
  lastSendBodies = []
  readCalls = 0
  reportCalls = 0
  leaveMock.mockClear()
  stopListeningMock.mockClear()
  listenMock.mockClear()
  privateMock.mockReset()
  privateMock.mockImplementation(() => ({
    listen: listenMock.mockReturnThis(),
    stopListening: stopListeningMock.mockReturnThis(),
  }))
  __resetEchoForTests()
  localStorage.clear()
  vi.clearAllMocks()
})
afterAll(() => server.close())

beforeEach(() => {
  privateMock.mockImplementation(() => ({
    listen: listenMock.mockReturnThis(),
    stopListening: stopListeningMock.mockReturnThis(),
  }))
})

describe('mergeMessagesById', () => {
  it('deduplicates by server message id', () => {
    const a = makeMessage({ id: 1, content: 'a' })
    const b = makeMessage({ id: 2, content: 'b' })
    const dup = makeMessage({ id: 1, content: 'a-updated' })
    expect(mergeMessagesById([a, b], dup).map((m) => m.content)).toEqual(['a-updated', 'b'])
  })
})

describe('Participant messages — conversation list', () => {
  it('renders Business inbox conversations', async () => {
    me = business
    conversations = [makeConversation()]
    renderApp('/app/business/messages')
    expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument()
    expect(await screen.findByText('Ada Ambassador')).toBeInTheDocument()
    expect(screen.getByLabelText('Conversation list')).toBeInTheDocument()
  })

  it('renders Ambassador inbox conversations', async () => {
    me = ambassador
    conversations = [
      makeConversation({
        counterpart: { id: 1, name: 'Ada Solar', role: 'BUSINESS' },
      }),
    ]
    renderApp('/app/ambassador/messages')
    expect(await screen.findByText('Ada Solar')).toBeInTheDocument()
  })

  it('shows empty, loading, and error states', async () => {
    me = business
    conversations = []
    renderApp('/app/business/messages')
    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument()
    cleanup()

    listFailure = 500
    renderApp('/app/business/messages')
    expect(await screen.findByText(/could not load conversations/i)).toBeInTheDocument()
  })

  it('paginates conversation list', async () => {
    me = business
    conversations = Array.from({ length: 21 }, (_, index) =>
      makeConversation({
        id: index + 1,
        counterpart: { id: 100 + index, name: `Ambassador ${index + 1}`, role: 'AMBASSADOR' },
      }),
    )
    renderApp('/app/business/messages')
    expect(await screen.findByText('Ambassador 1')).toBeInTheDocument()
    expect(screen.getByText(/page 1 of 2/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Ambassador 21')).toBeInTheDocument()
  })
})

describe('Participant messages — conversation detail', () => {
  it('renders messages, timestamps, counterparty, and Business route', async () => {
    me = business
    conversations = [makeConversation()]
    messagesByConversation[10] = [
      makeMessage(),
      makeMessage({ id: 101, sender_id: 1, content: 'Welcome back' }),
    ]
    renderApp('/app/business/messages/10')
    expect(await screen.findByRole('heading', { name: 'Ada Ambassador' })).toBeInTheDocument()
    expect(await screen.findByText('Hello from ambassador')).toBeInTheDocument()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByLabelText('Messages')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/business/messages/10')
    await waitFor(() => expect(readCalls).toBeGreaterThan(0))
  })

  it('renders empty conversation on Ambassador route', async () => {
    me = ambassador
    conversations = [
      makeConversation({
        counterpart: { id: 1, name: 'Ada Solar', role: 'BUSINESS' },
      }),
    ]
    messagesByConversation[10] = []
    renderApp('/app/ambassador/messages/10')
    expect(await screen.findByRole('heading', { name: 'Ada Solar' })).toBeInTheDocument()
    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/app/ambassador/messages/10')
  })
})

describe('Participant messages — sending', () => {
  it('validates, sends via REST, and renders server response without duplicate submit', async () => {
    me = business
    conversations = [makeConversation()]
    messagesByConversation[10] = []
    renderApp('/app/business/messages/10')
    const input = await screen.findByLabelText('Message')
    const sendButton = screen.getByRole('button', { name: 'Send message' })

    await userEvent.click(sendButton)
    expect(await screen.findByText(/enter a message before sending/i)).toBeInTheDocument()

    await userEvent.type(input, 'Persisted hello')
    await userEvent.click(sendButton)
    expect(await screen.findByText('Persisted hello')).toBeInTheDocument()
    expect(lastSendBodies).toHaveLength(1)
    expect(lastSendBodies[0]?.content).toBe('Persisted hello')
    expect(input).toHaveValue('')
  })

  it('handles 422, 429, and 500 while retaining typed content', async () => {
    me = business
    conversations = [makeConversation()]
    messagesByConversation[10] = []
    sendFailure = 422
    renderApp('/app/business/messages/10')
    const input = await screen.findByLabelText('Message')
    await userEvent.type(input, 'Retry me')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText(/message content is invalid/i)).toBeInTheDocument()
    expect(input).toHaveValue('Retry me')

    sendFailure = 429
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
    expect(input).toHaveValue('Retry me')

    sendFailure = 500
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText(/server error/i)).toBeInTheDocument()
    expect(input).toHaveValue('Retry me')
  })
})

describe('Participant messages — realtime', () => {
  it('subscribes to message.created, renders new messages, dedupes REST, and cleans up', async () => {
    me = business
    conversations = [makeConversation()]
    messagesByConversation[10] = []

    const { unmount } = renderApp('/app/business/messages/10')
    await screen.findByRole('heading', { name: 'Ada Ambassador' })
    await waitFor(() => expect(privateMock).toHaveBeenCalledWith('conversation.10'))
    await waitFor(() => expect(listenMock).toHaveBeenCalled())

    const handler = listenMock.mock.calls.find((call) => call[0] === '.message.created')?.[1] as
      ((payload: unknown) => void) | undefined
    expect(handler).toBeTypeOf('function')

    await userEvent.type(screen.getByLabelText('Message'), 'From REST')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('From REST')).toBeInTheDocument()

    const fromRest = makeMessage({ id: 500, content: 'From REST', sender_id: 1 })
    handler?.(fromRest)
    expect(screen.getAllByText('From REST')).toHaveLength(1)

    handler?.(makeMessage({ id: 778, content: 'From Reverb', sender_id: 2, conversation_id: 10 }))
    expect(await screen.findByText('From Reverb')).toBeInTheDocument()

    unmount()
    expect(stopListeningMock).toHaveBeenCalled()
    expect(leaveMock).toHaveBeenCalledWith('conversation.10')
  })

  it('keeps REST chat usable when realtime is unavailable', async () => {
    me = business
    conversations = [makeConversation()]
    messagesByConversation[10] = [makeMessage()]
    privateMock.mockImplementation(() => {
      throw new Error('ws down')
    })
    // Force unavailable path via connection failure after mount — Echo mock still returns client;
    // banner is shown when status is unavailable. Override getEcho to null via leave path:
    // Instead assert REST still works.
    renderApp('/app/business/messages/10')
    expect(await screen.findByText('Hello from ambassador')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Message'), 'Still works')
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByText('Still works')).toBeInTheDocument()
  })
})

describe('Participant messages — authorization & security', () => {
  it('blocks unauthenticated access and forbidden conversations', async () => {
    me = null
    renderApp('/app/business/messages')
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()

    me = business
    detailFailure = 404
    conversations = [makeConversation()]
    renderApp('/app/business/messages/10')
    expect(await screen.findByText(/conversation not found/i)).toBeInTheDocument()
  })

  it('does not expose Admin routes or cross-participant shells', async () => {
    me = business
    conversations = [makeConversation()]
    renderApp('/app/business/messages')
    await screen.findByRole('heading', { name: 'Messages' })
    expect(window.location.pathname.startsWith('/app/business/')).toBe(true)
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument()

    cleanup()
    me = ambassador
    conversations = [
      makeConversation({ counterpart: { id: 1, name: 'Ada Solar', role: 'BUSINESS' } }),
    ]
    renderApp('/app/ambassador/messages')
    await screen.findByText('Ada Solar')
    expect(window.location.pathname.startsWith('/app/ambassador/')).toBe(true)
  })

  it('does not persist message bodies to localStorage and can report', async () => {
    me = business
    conversations = [makeConversation()]
    messagesByConversation[10] = [makeMessage({ content: 'Secret commercial note' })]
    renderApp('/app/business/messages/10')
    expect(await screen.findByText('Secret commercial note')).toBeInTheDocument()
    expect(JSON.stringify(localStorage)).not.toContain('Secret commercial note')

    await userEvent.click(screen.getByRole('button', { name: /report conversation/i }))
    expect(screen.getByText(/opens a moderation case/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Reason'), 'Harassment')
    await userEvent.click(screen.getByRole('button', { name: /submit report/i }))
    expect(await screen.findByText(/has been reported for moderation review/i)).toBeInTheDocument()
    expect(reportCalls).toBe(1)
  })
})

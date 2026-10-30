import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'

vi.mock('./runtime', () => ({
  isCollectionAllowed: vi.fn(() => true),
  readAnalyticsEnv: () => ({ measurementId: 'G-TESTONLY1' }),
  isAnalyticsConfigured: () => true,
}))

vi.mock('./gtag', () => ({
  installGtag: vi.fn(),
  sendGtagEvent: vi.fn(),
}))

import { AnalyticsRouteTracker } from './AnalyticsRouteTracker'
import { sendGtagEvent } from './gtag'
import { resetAnalyticsTrackingForTests } from './track'

function Harness() {
  const navigate = useNavigate()
  return (
    <>
      <AnalyticsRouteTracker />
      <Link to="/about">About</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <Routes>
        <Route path="/discover" element={<h1>Discover</h1>} />
        <Route path="/about" element={<h1>About</h1>} />
      </Routes>
    </>
  )
}

describe('route tracking', () => {
  beforeEach(() => {
    resetAnalyticsTrackingForTests()
    vi.mocked(sendGtagEvent).mockClear()
    document.title = 'Discover campaigns · MarcatursHub'
  })

  afterEach(() => {
    cleanup()
  })

  it('tracks the first load, an internal navigation, and back without a duplicate', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/discover?token=secret&email=ada@example.com']}>
        <Harness />
      </MemoryRouter>,
    )

    expect(sendGtagEvent).toHaveBeenCalledTimes(1)
    expect(sendGtagEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({ page_path: '/discover' }),
    )

    await user.click(screen.getByRole('link', { name: 'About' }))
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(sendGtagEvent).toHaveBeenCalledTimes(2)
    expect(sendGtagEvent).toHaveBeenLastCalledWith(
      'page_view',
      expect.objectContaining({ page_path: '/about' }),
    )

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: 'Discover' })).toBeInTheDocument()
    expect(sendGtagEvent).toHaveBeenCalledTimes(3)
    const serialized = JSON.stringify(vi.mocked(sendGtagEvent).mock.calls)
    expect(serialized).not.toContain('token')
    expect(serialized).not.toContain('ada@')
    expect(serialized).not.toContain('G-X3V7CW4V7V')
  })
})

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ANALYTICS_CONSENT_KEY, analyticsConsentStorageKey } from './consent'

vi.mock('./runtime', () => ({
  isAnalyticsConfigured: vi.fn(() => true),
  isCollectionAllowed: vi.fn(() => false),
}))

import { AnalyticsConsentBanner } from './AnalyticsConsentBanner'
import { isAnalyticsConfigured } from './runtime'

describe('analytics consent', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(isAnalyticsConfigured).mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  it('does not load a tag before a choice, and does not load one when analytics is not configured', async () => {
    const user = userEvent.setup()
    const { unmount } = render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    )
    expect(screen.getByRole('dialog', { name: 'Optional analytics' })).toBeInTheDocument()
    expect(document.querySelector('script[data-mh-ga]')).toBeNull()

    await user.click(screen.getByRole('button', { name: "Don't allow" }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(analyticsConsentStorageKey())).toBe('denied')
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull()
    expect(document.querySelector('script[data-mh-ga]')).toBeNull()
    unmount()

    vi.mocked(isAnalyticsConfigured).mockReturnValue(false)
    window.localStorage.clear()
    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stores allow without inserting the production tag from the banner', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AnalyticsConsentBanner />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Allow' }))
    expect(window.localStorage.getItem(analyticsConsentStorageKey())).toBe('granted')
    expect(document.head.innerHTML).not.toContain('G-X3V7CW4V7V')
    expect(document.querySelector('script[data-mh-ga]')).toBeNull()
  })
})

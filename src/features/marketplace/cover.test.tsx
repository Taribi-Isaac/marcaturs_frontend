import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { CampaignCoverPanel } from '@/features/business-campaigns/CampaignCoverPanel'
import { CampaignCoverVisual } from '@/features/marketplace/CampaignCoverVisual'
import { coverImageSrc, type CampaignCoverImage } from '@/features/marketplace/cover'
import { toAbsolutePublicUrl } from '@/shared/seo/publicOrigin'
import {
  installIntersectionObserver,
  observedElements,
  observerRootMargins,
  scrollIntoView,
} from '@/test/intersectionObserver'

const PROD_API = 'https://api.marcaturshub.com.ng/api/v1'
const PUBLIC_COVER = 'https://api.marcaturshub.com.ng/api/v1/marketplace/campaigns/7/cover'

function imageResponse(type = 'image/jpeg', status = 200) {
  return new Response('cover-bytes', { status, headers: { 'Content-Type': type } })
}

function ownerCover(id: number): CampaignCoverImage {
  return {
    available: true,
    url: `http://localhost:8000/api/v1/campaigns/${id}/cover/download`,
    mime_type: 'image/jpeg',
    size_bytes: 2048,
    original_filename: 'cover.jpg',
  }
}

let objectUrlCount = 0
let createObjectURL: MockInstance<typeof URL.createObjectURL>
let revokeObjectURL: MockInstance<typeof URL.revokeObjectURL>
let fetchSpy: MockInstance<typeof fetch>

beforeEach(() => {
  objectUrlCount = 0
  createObjectURL = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation(() => `blob:cover-${++objectUrlCount}`)
  revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  fetchSpy = vi.spyOn(globalThis, 'fetch')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function requestedUrls() {
  return fetchSpy.mock.calls.map(([input]) => String(input))
}

describe('coverImageSrc', () => {
  it('keeps absolute cover URLs on the API host when the API base is absolute', () => {
    expect(coverImageSrc(PUBLIC_COVER, PROD_API)).toBe(PUBLIC_COVER)
    expect(coverImageSrc(`${PUBLIC_COVER}?v=3`, PROD_API)).toBe(`${PUBLIC_COVER}?v=3`)
  })

  it('resolves relative cover URLs against the API origin, not the page origin', () => {
    expect(coverImageSrc('/api/v1/campaigns/9/cover/download', PROD_API)).toBe(
      'https://api.marcaturshub.com.ng/api/v1/campaigns/9/cover/download',
    )
  })

  it('rewrites to the same-origin /api/v1 path for the dev proxy when the API base is relative', () => {
    expect(
      coverImageSrc('http://localhost:8000/api/v1/marketplace/campaigns/7/cover?v=3', '/api/v1'),
    ).toBe('/api/v1/marketplace/campaigns/7/cover?v=3')
  })

  it('returns null for missing URLs', () => {
    expect(coverImageSrc(null, PROD_API)).toBeNull()
    expect(coverImageSrc('', '/api/v1')).toBeNull()
  })

  it('gives share previews an absolute API URL in production', () => {
    expect(toAbsolutePublicUrl(coverImageSrc(PUBLIC_COVER, PROD_API))).toBe(PUBLIC_COVER)
  })
})

describe('CampaignCoverVisual', () => {
  it('renders the resolved cover and falls back once when the image fails', () => {
    const cover = { available: true, url: PUBLIC_COVER }
    const { container, rerender } = render(
      <CampaignCoverVisual cover={cover} title="Solar" categoryName="Energy" meaningful />,
    )

    const img = screen.getByRole('img', { name: 'Cover image for Solar' })
    expect(img).toHaveAttribute('src', '/api/v1/marketplace/campaigns/7/cover')

    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Energy')).toBeInTheDocument()

    rerender(<CampaignCoverVisual cover={cover} title="Solar" categoryName="Energy" meaningful />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('tries a different cover URL after an earlier failure', () => {
    const { container, rerender } = render(
      <CampaignCoverVisual cover={{ available: true, url: PUBLIC_COVER }} title="Solar" />,
    )
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()

    rerender(
      <CampaignCoverVisual
        cover={{ available: true, url: PUBLIC_COVER.replace('/7/', '/8/') }}
        title="Solar"
      />,
    )
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      '/api/v1/marketplace/campaigns/8/cover',
    )
  })

  it('keeps list thumbnails decorative', () => {
    const { container } = render(
      <CampaignCoverVisual cover={{ available: true, url: PUBLIC_COVER }} title="Solar" />,
    )
    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('loads owner covers with credentials and shows them through an object URL', async () => {
    fetchSpy.mockResolvedValue(imageResponse())
    const { container, unmount } = render(
      <CampaignCoverVisual cover={ownerCover(9)} title="Owner" authenticated />,
    )

    await waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1')
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/campaigns/9/cover/download',
      expect.objectContaining({ credentials: 'include' }),
    )

    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cover-1')
  })

  it('falls back when the owner cover response is not an image', async () => {
    fetchSpy.mockResolvedValue(imageResponse('text/html'))
    const { container } = render(
      <CampaignCoverVisual
        cover={ownerCover(9)}
        title="Owner"
        categoryName="Energy"
        authenticated
      />,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    await screen.findByText('Energy')
    expect(container.querySelector('img')).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('falls back when the owner cover request is rejected', async () => {
    fetchSpy.mockResolvedValue(imageResponse('application/json', 403))
    const { container } = render(
      <CampaignCoverVisual cover={ownerCover(9)} title="Owner" authenticated />,
    )

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(container.querySelector('img')).toBeNull()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('ignores a slow response for a campaign that is no longer shown', async () => {
    const resolvers: Array<(response: Response) => void> = []
    fetchSpy.mockImplementation(() => new Promise<Response>((resolve) => resolvers.push(resolve)))

    const { container, rerender } = render(
      <CampaignCoverVisual cover={ownerCover(1)} title="First" authenticated />,
    )
    rerender(<CampaignCoverVisual cover={ownerCover(2)} title="Second" authenticated />)
    await waitFor(() => expect(resolvers).toHaveLength(2))

    resolvers[1]!(imageResponse())
    await waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1')
    })
    resolvers[0]!(imageResponse())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })
})

describe('CampaignCoverVisual owner covers near the viewport', () => {
  beforeEach(() => {
    installIntersectionObserver()
  })

  function ownerThumb(id: number, title = `Campaign ${id}`) {
    return (
      <CampaignCoverVisual
        cover={ownerCover(id)}
        title={title}
        categoryName={`Category ${id}`}
        className="thumb"
        authenticated
      />
    )
  }

  it('does not download an off-screen cover until it approaches the viewport', async () => {
    fetchSpy.mockResolvedValue(imageResponse())
    const { container } = render(ownerThumb(9))
    const thumb = container.querySelector('.thumb')!

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(container.querySelector('img')).toBeNull()
    expect(observedElements()).toEqual([thumb])
    expect(observerRootMargins()).toEqual(['200px 0px'])

    scrollIntoView(thumb)

    await waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1')
    })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/campaigns/9/cover/download',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(observedElements()).toEqual([])
  })

  it('requests each cover once, as rows scroll into view', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(imageResponse()))
    const rows = () => [1, 2, 3].map((id) => <div key={id}>{ownerThumb(id)}</div>)
    const { container, rerender } = render(<>{rows()}</>)
    const thumbs = [...container.querySelectorAll('.thumb')]

    expect(fetchSpy).not.toHaveBeenCalled()

    scrollIntoView(thumbs[0]!)
    scrollIntoView(thumbs[2]!)
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(2))
    expect(requestedUrls()).toEqual([
      '/api/v1/campaigns/1/cover/download',
      '/api/v1/campaigns/3/cover/download',
    ])

    scrollIntoView(thumbs[0]!)
    rerender(<>{rows()}</>)
    expect(fetchSpy).toHaveBeenCalledTimes(2)

    scrollIntoView(thumbs[1]!)
    await waitFor(() => expect(container.querySelectorAll('img')).toHaveLength(3))
    expect(requestedUrls()).toEqual([
      '/api/v1/campaigns/1/cover/download',
      '/api/v1/campaigns/3/cover/download',
      '/api/v1/campaigns/2/cover/download',
    ])
  })

  it('cleans up observers, in-flight requests and object URLs on unmount', async () => {
    const signals = new Map<string, AbortSignal>()
    fetchSpy.mockImplementation((input, init) => {
      signals.set(String(input), init!.signal!)
      return String(input).includes('/2/')
        ? new Promise<Response>(() => undefined)
        : Promise.resolve(imageResponse())
    })
    const { container, unmount } = render(
      <>
        {[1, 2, 3].map((id) => (
          <div key={id}>{ownerThumb(id)}</div>
        ))}
      </>,
    )
    const thumbs = [...container.querySelectorAll('.thumb')]

    scrollIntoView(thumbs[0]!)
    scrollIntoView(thumbs[1]!)
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1'),
    )
    expect(observedElements()).toEqual([thumbs[2]])

    unmount()

    expect(observedElements()).toEqual([])
    expect(signals.get('/api/v1/campaigns/2/cover/download')!.aborted).toBe(true)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cover-1')
    expect(requestedUrls()).not.toContain('/api/v1/campaigns/3/cover/download')
  })

  it('shows the newer campaign when a row changes before an older response arrives', async () => {
    const resolvers = new Map<string, (response: Response) => void>()
    fetchSpy.mockImplementation(
      (input) => new Promise<Response>((resolve) => resolvers.set(String(input), resolve)),
    )
    const { container, rerender } = render(ownerThumb(1, 'Row'))
    scrollIntoView(container.querySelector('.thumb')!)
    await waitFor(() => expect(resolvers.size).toBe(1))

    rerender(ownerThumb(2, 'Row'))
    await waitFor(() => expect(resolvers.size).toBe(2))

    resolvers.get('/api/v1/campaigns/2/cover/download')!(imageResponse())
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1'),
    )
    resolvers.get('/api/v1/campaigns/1/cover/download')!(imageResponse())
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1')
    expect(createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('revokes the previous cover when a visible row switches campaigns', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve(imageResponse()))
    const { container, rerender } = render(ownerThumb(1, 'Row'))
    scrollIntoView(container.querySelector('.thumb')!)
    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1'),
    )

    rerender(ownerThumb(2, 'Row'))

    await waitFor(() =>
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-2'),
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cover-1')
    expect(requestedUrls()).toEqual([
      '/api/v1/campaigns/1/cover/download',
      '/api/v1/campaigns/2/cover/download',
    ])
  })

  it('keeps the placeholder when a visible cover fails or is not an image', async () => {
    fetchSpy.mockImplementation((input) =>
      Promise.resolve(
        String(input).includes('/1/')
          ? imageResponse('application/json', 500)
          : imageResponse('text/html'),
      ),
    )
    const { container } = render(
      <>
        {[1, 2].map((id) => (
          <div key={id}>{ownerThumb(id)}</div>
        ))}
      </>,
    )
    const thumbs = [...container.querySelectorAll('.thumb')]

    scrollIntoView(thumbs[0]!)
    scrollIntoView(thumbs[1]!)

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Category 1')).toBeInTheDocument()
    expect(screen.getByText('Category 2')).toBeInTheDocument()
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('loads immediately when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    fetchSpy.mockResolvedValue(imageResponse())
    const { container } = render(ownerThumb(9))

    await waitFor(() => {
      expect(container.querySelector('img')).toHaveAttribute('src', 'blob:cover-1')
    })
    expect(requestedUrls()).toEqual(['/api/v1/campaigns/9/cover/download'])
  })

  it('leaves public covers to the browser without observing them', () => {
    render(<CampaignCoverVisual cover={{ available: true, url: PUBLIC_COVER }} title="Solar" />)

    expect(observedElements()).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      '/api/v1/marketplace/campaigns/7/cover',
    )
  })
})

describe('Business CampaignCoverPanel', () => {
  function withQueryClient(children: ReactNode) {
    return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  }

  it('shows the stored cover loaded through the authenticated download', async () => {
    fetchSpy.mockResolvedValue(imageResponse('image/png'))
    const { unmount } = render(
      withQueryClient(<CampaignCoverPanel campaignId={9} title="Offer" cover={ownerCover(9)} />),
    )

    expect(screen.getByText('Loading cover…')).toBeInTheDocument()
    const img = await screen.findByRole('img', { name: 'Cover preview for Offer' })
    expect(img).toHaveAttribute('src', 'blob:cover-1')

    unmount()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cover-1')
  })

  it('shows the cover fallback instead of a broken image when loading fails', async () => {
    fetchSpy.mockResolvedValue(imageResponse('application/json', 404))
    render(
      withQueryClient(<CampaignCoverPanel campaignId={9} title="Offer" cover={ownerCover(9)} />),
    )

    expect(await screen.findByText('Cover preview unavailable')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Cover preview for Offer' })).toBeNull()
  })

  it('falls back when the stored image cannot be decoded', async () => {
    fetchSpy.mockResolvedValue(imageResponse('image/png'))
    render(
      withQueryClient(<CampaignCoverPanel campaignId={9} title="Offer" cover={ownerCover(9)} />),
    )

    fireEvent.error(await screen.findByRole('img', { name: 'Cover preview for Offer' }))
    expect(screen.getByText('Cover preview unavailable')).toBeInTheDocument()
  })
})

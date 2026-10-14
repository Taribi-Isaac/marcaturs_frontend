import { useEffect, useState } from 'react'

export type AuthenticatedCoverState =
  | { status: 'idle'; src: null }
  | { status: 'loading'; src: null }
  | { status: 'ready'; src: string }
  | { status: 'failed'; src: null }

type Loaded = { key: string; src: string | null }

/**
 * Owner cover downloads require the session, so they are fetched with credentials and shown
 * through an object URL instead of relying on an <img> request carrying the session.
 * `version` forces a reload when the cover is replaced behind an unchanged URL.
 */
export function useAuthenticatedCoverSrc(
  url: string | null,
  version = '',
): AuthenticatedCoverState {
  const key = url ? `${url}#${version}` : null
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!url || !key) return

    const controller = new AbortController()
    let objectUrl: string | null = null

    async function load(requestUrl: string, requestKey: string) {
      try {
        const response = await fetch(requestUrl, {
          credentials: 'include',
          cache: 'no-store',
          headers: { Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest' },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('cover request failed')
        const blob = await response.blob()
        if (!blob.type.toLowerCase().startsWith('image/')) throw new Error('cover is not an image')
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setLoaded({ key: requestKey, src: objectUrl })
      } catch {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, src: null })
      }
    }

    void load(url, key)

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, key])

  if (!key) return { status: 'idle', src: null }
  if (!loaded || loaded.key !== key) return { status: 'loading', src: null }
  return loaded.src ? { status: 'ready', src: loaded.src } : { status: 'failed', src: null }
}

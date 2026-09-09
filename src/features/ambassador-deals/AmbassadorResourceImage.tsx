import { useEffect, useState } from 'react'
import { marketplaceResourceDownloadUrl } from '@/features/ambassador-deals/api'

type Props = {
  campaignId: number
  resourceId: number
  title?: string | null
  className?: string
}

/** Authenticated ambassador image download — never exposes storage keys. */
export function AmbassadorResourceImage({ campaignId, resourceId, title, className }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(marketplaceResourceDownloadUrl(campaignId, resourceId), {
          credentials: 'include',
          headers: { Accept: '*/*', 'X-Requested-With': 'XMLHttpRequest' },
        })
        if (!response.ok) throw new Error('download failed')
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) {
          if (!cancelled) setFailed(true)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setSrc(objectUrl)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [campaignId, resourceId])

  if (failed || !src) {
    return null
  }

  return (
    <img
      className={className}
      src={src}
      alt={title || 'Campaign marketing resource'}
      loading="lazy"
    />
  )
}

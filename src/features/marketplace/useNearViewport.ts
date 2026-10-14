import { useEffect, useState } from 'react'

/**
 * Reports whether an element has come within `rootMargin` of the viewport. Once reached it stays
 * reached, so scrolling away neither discards nor re-requests what was already loaded. Without
 * IntersectionObserver support the element counts as reached, so content still loads.
 */
export function useNearViewport<T extends Element>(enabled: boolean, rootMargin = '200px 0px') {
  const [node, setNode] = useState<T | null>(null)
  const [reached, setReached] = useState(false)
  const supported = typeof IntersectionObserver === 'function'

  useEffect(() => {
    if (!enabled || !supported || reached || !node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReached(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)

    return () => observer.disconnect()
  }, [enabled, supported, reached, node, rootMargin])

  return { ref: setNode, nearViewport: enabled && (!supported || reached) }
}
